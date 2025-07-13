const gameRegistry = require('./games/game-registry');
const path = require('path');

class Tournament {
  constructor(dependencies) {
    this.fileService = dependencies.fileService;
    this.randomService = dependencies.randomService;
    this.tournaments = new Map();
  }

  async createTournament(name, options = {}) {
    if (this.tournaments.has(name)) {
      throw new Error(`Tournament '${name}' already exists`);
    }

    const tournament = {
      id: this.generateId(),
      name,
      createdAt: new Date().toISOString(),
      status: 'created',
      participants: [],
      matches: [],
      standings: [],
      settings: {
        gameType: options.gameType || 'higher-lower',
        maxRounds: options.maxRounds || 10,
        matchType: options.matchType || 'round-robin',
        ...options
      }
    };

    this.tournaments.set(name, tournament);
    await this.saveTournament(tournament);
    
    return tournament;
  }

  async loadTournament(name) {
    const filePath = this.fileService.getDataPath(`${name}.json`);
    const data = await this.fileService.readJson(filePath);
    
    if (!data) {
      throw new Error(`Tournament '${name}' not found`);
    }
    
    this.tournaments.set(name, data);
    return data;
  }

  async saveTournament(tournament) {
    const filePath = this.fileService.getDataPath(`${tournament.name}.json`);
    await this.fileService.writeJson(filePath, tournament);
  }

  async addParticipant(tournamentName, botName, botPath) {
    const tournament = this.tournaments.get(tournamentName) || await this.loadTournament(tournamentName);
    
    if (tournament.participants.some(p => p.name === botName)) {
      throw new Error(`Participant '${botName}' already exists in tournament`);
    }

    const participant = {
      id: this.generateId(),
      name: botName,
      botPath,
      addedAt: new Date().toISOString(),
      stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalScore: 0
      }
    };

    tournament.participants.push(participant);
    await this.saveTournament(tournament);
    
    return participant;
  }

  async removeParticipant(tournamentName, botName) {
    const tournament = this.tournaments.get(tournamentName) || await this.loadTournament(tournamentName);
    
    const index = tournament.participants.findIndex(p => p.name === botName);
    if (index === -1) {
      throw new Error(`Participant '${botName}' not found in tournament`);
    }

    tournament.participants.splice(index, 1);
    await this.saveTournament(tournament);
    
    return true;
  }

  async runMatch(tournamentName, participant1Name, participant2Name) {
    const tournament = this.tournaments.get(tournamentName) || await this.loadTournament(tournamentName);
    
    const p1 = tournament.participants.find(p => p.name === participant1Name);
    const p2 = tournament.participants.find(p => p.name === participant2Name);
    
    if (!p1 || !p2) {
      throw new Error('One or both participants not found in tournament');
    }

    const bot1 = await this.loadBot(p1.botPath);
    const bot2 = await this.loadBot(p2.botPath);
    
    const players = [
      { name: p1.name, bot: bot1 },
      { name: p2.name, bot: bot2 }
    ];

    const dependencies = {
      randomService: this.randomService,
      fileService: this.fileService
    };
    const game = gameRegistry.createGame(tournament.settings.gameType, dependencies, players);
    
    const gameStart = new Date().toISOString();
    bot1.onGameStart({ tournament: tournamentName, opponent: p2.name });
    bot2.onGameStart({ tournament: tournamentName, opponent: p1.name });
    
    const gameResult = await game.playFullGame();
    const gameEnd = new Date().toISOString();
    
    bot1.onGameEnd(gameResult.gameResult);
    bot2.onGameEnd(gameResult.gameResult);

    const match = {
      id: this.generateId(),
      tournament: tournamentName,
      participants: [p1.name, p2.name],
      startTime: gameStart,
      endTime: gameEnd,
      result: gameResult.gameResult,
      rounds: gameResult.roundResults
    };

    tournament.matches.push(match);
    this.updateParticipantStats(tournament, match);
    await this.saveTournament(tournament);
    
    return match;
  }

  async runRound(tournamentName) {
    const tournament = this.tournaments.get(tournamentName) || await this.loadTournament(tournamentName);
    
    if (tournament.participants.length < 2) {
      throw new Error('Need at least 2 participants to run a round');
    }

    const matchups = this.generateMatchups(tournament.participants);
    const results = [];

    for (const matchup of matchups) {
      const match = await this.runMatch(tournamentName, matchup[0].name, matchup[1].name);
      results.push(match);
    }

    return results;
  }

  generateMatchups(participants) {
    const matchups = [];
    
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matchups.push([participants[i], participants[j]]);
      }
    }
    
    return matchups;
  }

  updateParticipantStats(tournament, match) {
    const winner = match.result.winner;
    const players = match.result.players;
    
    players.forEach(player => {
      const participant = tournament.participants.find(p => p.name === player.name);
      if (participant) {
        participant.stats.gamesPlayed++;
        participant.stats.totalScore += player.score;
        
        if (winner && winner.name === player.name) {
          participant.stats.wins++;
        } else if (winner) {
          participant.stats.losses++;
        } else {
          participant.stats.draws++;
        }
      }
    });
  }

  async getStandings(tournamentName) {
    const tournament = this.tournaments.get(tournamentName) || await this.loadTournament(tournamentName);
    
    const standings = tournament.participants
      .map(p => ({
        name: p.name,
        gamesPlayed: p.stats.gamesPlayed,
        wins: p.stats.wins,
        losses: p.stats.losses,
        draws: p.stats.draws,
        totalScore: p.stats.totalScore,
        winRate: p.stats.gamesPlayed > 0 ? (p.stats.wins / p.stats.gamesPlayed) : 0,
        avgScore: p.stats.gamesPlayed > 0 ? (p.stats.totalScore / p.stats.gamesPlayed) : 0
      }))
      .sort((a, b) => {
        if (a.winRate !== b.winRate) return b.winRate - a.winRate;
        if (a.avgScore !== b.avgScore) return b.avgScore - a.avgScore;
        return b.wins - a.wins;
      });

    return standings;
  }

  async getTournamentList() {
    const files = await this.fileService.listFiles(this.fileService.getDataPath(''), '.json');
    const tournaments = [];
    
    for (const file of files) {
      try {
        const tournament = await this.loadTournament(path.basename(file, '.json'));
        tournaments.push({
          name: tournament.name,
          createdAt: tournament.createdAt,
          status: tournament.status,
          participants: tournament.participants.length,
          matches: tournament.matches.length
        });
      } catch (error) {
        console.warn(`Error loading tournament ${file}:`, error.message);
      }
    }
    
    return tournaments;
  }

  async deleteTournament(tournamentName) {
    const filePath = this.fileService.getDataPath(`${tournamentName}.json`);
    await this.fileService.delete(filePath);
    this.tournaments.delete(tournamentName);
  }

  async loadBot(botPath) {
    delete require.cache[require.resolve(botPath)];
    const BotClass = require(botPath);
    const dependencies = {
      randomService: this.randomService,
      fileService: this.fileService
    };
    return new BotClass(path.basename(botPath, '.js'), dependencies);
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = Tournament;