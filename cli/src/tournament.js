const gameRegistry = require('./games/game-registry');
const path = require('path');

class Tournament {
  constructor(dependencies) {
    this.fileService = dependencies.fileService;
    this.randomService = dependencies.randomService;
    this.tournaments = new Map();
  }

  /**
   * Detect tournament mode based on game type naming convention
   * Games ending with "-many" = free-for-all, others = round-robin
   * Special case: blackjack always uses free-for-all because all players play against the bank
   */
  detectTournamentMode(gameType) {
    if (gameType === 'blackjack') {
      return 'free-for-all';
    }
    return gameType.endsWith('-many') ? 'free-for-all' : 'round-robin';
  }

  async createTournament(name, options = {}) {
    if (this.tournaments.has(name)) {
      throw new Error(`Tournament '${name}' already exists`);
    }

    if (!options.gameType) {
      throw new Error('Game type is required. Use: tournament games to see available types');
    }

    // Auto-detect tournament mode based on game type naming convention
    const detectedMatchType = this.detectTournamentMode(options.gameType);

    const tournament = {
      id: this.generateId(),
      name,
      createdAt: new Date().toISOString(),
      status: 'created',
      participants: [],
      matches: [],
      standings: [],
      settings: {
        gameType: options.gameType,
        maxRounds: options.maxRounds || 10,
        matchType: detectedMatchType,
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
        disqualifications: 0,
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

  /**
   * Run a free-for-all match with all participants in a single game
   */
  async runFreeForAllMatch(tournamentName) {
    const tournament = this.tournaments.get(tournamentName) || await this.loadTournament(tournamentName);
    
    if (tournament.participants.length < 2) {
      throw new Error('Need at least 2 participants to run a free-for-all match');
    }

    // Load all bots and create players array
    const players = [];
    for (const participant of tournament.participants) {
      const bot = await this.loadBot(participant.botPath);
      players.push({ name: participant.name, bot: bot });
    }

    const dependencies = {
      randomService: this.randomService,
      fileService: this.fileService
    };
    const game = gameRegistry.createGame(tournament.settings.gameType, dependencies, players);
    
    const gameStart = new Date().toISOString();
    
    // Notify all bots that the game is starting
    players.forEach(player => {
      const opponents = players.filter(p => p.name !== player.name).map(p => p.name);
      player.bot.onGameStart({ tournament: tournamentName, opponents: opponents });
    });
    
    const gameResult = await game.playFullGame();
    const gameEnd = new Date().toISOString();
    
    // Notify all bots that the game has ended
    players.forEach(player => {
      player.bot.onGameEnd(gameResult.gameResult);
    });

    const match = {
      id: this.generateId(),
      tournament: tournamentName,
      participants: players.map(p => p.name),
      startTime: gameStart,
      endTime: gameEnd,
      result: gameResult.gameResult,
      rounds: gameResult.roundResults,
      matchType: 'free-for-all'
    };

    tournament.matches.push(match);
    this.updateParticipantStats(tournament, match);
    await this.saveTournament(tournament);
    
    return [match]; // Return as array for consistency with runRound
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
    
    // Check if this is a free-for-all match
    const isFreeForAll = match.matchType === 'free-for-all';
    
    // Count disqualifications for each player
    const disqualifiedPlayers = players.filter(player => player.disqualifications > 0);
    
    players.forEach(player => {
      const participant = tournament.participants.find(p => p.name === player.name);
      if (participant) {
        if (isFreeForAll) {
          // For free-for-all: each round counts as a separate game
          participant.stats.gamesPlayed += (player.roundWins + player.roundLosses + player.roundTies);
          participant.stats.wins += player.roundWins;
          participant.stats.losses += player.roundLosses;
          participant.stats.draws += player.roundTies;
        } else {
          // For round-robin: traditional single game statistics
          participant.stats.gamesPlayed++;
          
          // Determine win/loss/draw based on game outcome and disqualifications
          if (player.disqualifications > 0) {
            // Player was disqualified, count as loss
            participant.stats.losses++;
          } else if (winner && winner.name === player.name) {
            // Player won legitimately
            participant.stats.wins++;
          } else if (winner) {
            // Player lost legitimately
            participant.stats.losses++;
          } else {
            // Game was a draw
            participant.stats.draws++;
          }
        }
        
        participant.stats.totalScore += player.score;
        participant.stats.disqualifications += player.disqualifications || 0;
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
        disqualifications: p.stats.disqualifications,
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

  /**
   * Auto-populate tournament with all available bots for the game type
   */
  async autoPopulateBots(tournamentName) {
    const tournament = this.tournaments.get(tournamentName) || await this.loadTournament(tournamentName);
    
    // Clear existing participants to start fresh
    tournament.participants = [];
    
    // Discover all available bots for this game type
    const discoveredBots = await gameRegistry.discoverBots(tournament.settings.gameType);
    
    if (discoveredBots.length === 0) {
      throw new Error(`No bots found for game type '${tournament.settings.gameType}'. Please ensure bots exist in the game's bots directory or the generic bots directory.`);
    }

    // Add each discovered bot as a participant
    for (const bot of discoveredBots) {
      const participant = {
        id: this.generateId(),
        name: bot.name,
        botPath: bot.path,
        source: bot.source,
        description: bot.description,
        addedAt: new Date().toISOString(),
        autoDiscovered: true,
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          disqualifications: 0,
          totalScore: 0
        }
      };

      tournament.participants.push(participant);
    }

    await this.saveTournament(tournament);
    return {
      tournament,
      botsAdded: discoveredBots.length,
      bots: discoveredBots
    };
  }

  /**
   * Run a complete tournament with auto-discovered bots
   */
  async runFullTournament(tournamentName) {
    const tournament = this.tournaments.get(tournamentName) || await this.loadTournament(tournamentName);
    
    // Always auto-populate bots from the game's bots directory
    await this.autoPopulateBots(tournamentName);

    // Reload tournament to get updated participants
    const updatedTournament = this.tournaments.get(tournamentName) || await this.loadTournament(tournamentName);
    
    if (updatedTournament.participants.length < 2) {
      throw new Error(`Need at least 2 participants to run a tournament. Found ${updatedTournament.participants.length} bots.`);
    }

    // Run tournament based on detected match type
    const matches = updatedTournament.settings.matchType === 'free-for-all' 
      ? await this.runFreeForAllMatch(tournamentName)
      : await this.runRound(tournamentName);
    
    // Get final standings
    const standings = await this.getStandings(tournamentName);
    
    return {
      tournament: updatedTournament,
      matches,
      standings,
      summary: {
        totalMatches: matches.length,
        participants: updatedTournament.participants.length,
        winner: standings.length > 0 ? standings[0] : null
      }
    };
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = Tournament;