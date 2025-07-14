#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const Tournament = require('./tournament');
const DependencyContainer = require('./utils/dependency-container');
const gameRegistry = require('./games/game-registry');

const program = new Command();

program
  .name('tournament')
  .description('CLI for managing bot tournaments')
  .version('1.0.0');

const container = DependencyContainer.createDefault();
const dependencies = {
  fileService: container.get('fileService'),
  randomService: container.get('randomService')
};
const tournament = new Tournament(dependencies);

program
  .command('create <name> <game-type>')
  .description(`Create a new tournament. Games ending with '-many' use free-for-all mode, others use round-robin. Available: ${gameRegistry.getAvailableGameTypes().join(', ')}`)
  .option('-r, --max-rounds <number>', 'Maximum rounds per game', '10')
  .action(async (name, gameType, options) => {
    try {
      if (!gameRegistry.isValidGameType(gameType)) {
        console.error(chalk.red(`✗ Invalid game type '${gameType}'. Available types: ${gameRegistry.getAvailableGameTypes().join(', ')}`));
        process.exit(1);
      }
      
      const tournamentData = await tournament.createTournament(name, {
        gameType: gameType,
        maxRounds: parseInt(options.maxRounds)
      });
      
      console.log(chalk.green(`✓ Tournament '${name}' created successfully`));
      console.log(chalk.gray(`  ID: ${tournamentData.id}`));
      console.log(chalk.gray(`  Game Type: ${tournamentData.settings.gameType}`));
      console.log(chalk.gray(`  Tournament Mode: ${tournamentData.settings.matchType}`));
      console.log(chalk.gray(`  Max Rounds: ${tournamentData.settings.maxRounds}`));
    } catch (error) {
      console.error(chalk.red(`✗ Error creating tournament: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('games')
  .description('List available game types')
  .action(() => {
    const games = gameRegistry.getAvailableGames();
    
    if (games.length === 0) {
      console.log(chalk.yellow('No games available'));
      return;
    }
    
    console.log(chalk.bold('\nAvailable Games:'));
    games.forEach(game => {
      console.log(`  ${chalk.cyan(game.gameType)} - ${game.name}`);
      console.log(chalk.gray(`    ${game.description}`));
    });
  });

program
  .command('bots [game-type]')
  .description('List available bots for a game type (defaults to all game types)')
  .action(async (gameType) => {
    try {
      if (gameType) {
        // Show bots for specific game type
        if (!gameRegistry.isValidGameType(gameType)) {
          console.error(chalk.red(`✗ Invalid game type '${gameType}'. Available types: ${gameRegistry.getAvailableGameTypes().join(', ')}`));
          process.exit(1);
        }
        
        console.log(chalk.blue(`🤖 Available bots for ${gameType}:`));
        
        const bots = await gameRegistry.discoverBots(gameType);
        
        if (bots.length === 0) {
          console.log(chalk.yellow('  No bots found for this game type'));
          return;
        }
        
        bots.forEach(bot => {
          console.log(`  ${chalk.cyan(bot.name)} (${chalk.gray(bot.source)})`);
          console.log(`    ${bot.description}`);
          console.log(chalk.gray(`    Path: ${bot.path}`));
        });
        
        console.log(chalk.gray(`\nTotal: ${bots.length} bots found`));
        
      } else {
        // Show bots for all game types
        console.log(chalk.blue('🤖 Available bots by game type:'));
        
        const gameTypes = gameRegistry.getAvailableGameTypes();
        
        for (const type of gameTypes) {
          console.log(chalk.bold(`\n${type}:`));
          const bots = await gameRegistry.discoverBots(type);
          
          if (bots.length === 0) {
            console.log(chalk.gray('  No bots found'));
          } else {
            bots.forEach(bot => {
              console.log(`  ${chalk.cyan(bot.name)} (${chalk.gray(bot.source)}) - ${bot.description}`);
            });
          }
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`✗ Error listing bots: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all tournaments')
  .action(async () => {
    try {
      const tournaments = await tournament.getTournamentList();
      
      if (tournaments.length === 0) {
        console.log(chalk.yellow('No tournaments found'));
        return;
      }
      
      console.log(chalk.bold('\nTournaments:'));
      tournaments.forEach(t => {
        console.log(`  ${chalk.cyan(t.name)} - ${t.participants} participants, ${t.matches} matches`);
        console.log(chalk.gray(`    Created: ${new Date(t.createdAt).toLocaleString()}`));
      });
    } catch (error) {
      console.error(chalk.red(`✗ Error listing tournaments: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('add-bot <tournament> <bot-name> <bot-path>')
  .description('Add a bot to a tournament')
  .action(async (tournamentName, botName, botPath) => {
    try {
      const absolutePath = path.resolve(botPath);
      await tournament.addParticipant(tournamentName, botName, absolutePath);
      
      console.log(chalk.green(`✓ Bot '${botName}' added to tournament '${tournamentName}'`));
    } catch (error) {
      console.error(chalk.red(`✗ Error adding bot: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('remove-bot <tournament> <bot-name>')
  .description('Remove a bot from a tournament')
  .action(async (tournamentName, botName) => {
    try {
      await tournament.removeParticipant(tournamentName, botName);
      
      console.log(chalk.green(`✓ Bot '${botName}' removed from tournament '${tournamentName}'`));
    } catch (error) {
      console.error(chalk.red(`✗ Error removing bot: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('run-match <tournament> <bot1> <bot2>')
  .description('Run a match between two bots')
  .action(async (tournamentName, bot1, bot2) => {
    try {
      console.log(chalk.blue(`Running match: ${bot1} vs ${bot2}`));
      
      const match = await tournament.runMatch(tournamentName, bot1, bot2);
      
      console.log(chalk.green('✓ Match completed'));
      console.log(chalk.bold(`Winner: ${match.result.winner ? match.result.winner.name : 'Draw'}`));
      
      match.result.players.forEach(player => {
        let playerDisplay = `  ${player.name}: ${player.score} points (${player.correctGuesses} correct, ${player.incorrectGuesses} incorrect, ${player.ties} ties`;
        
        if (player.disqualifications > 0) {
          playerDisplay += `, ${chalk.red(player.disqualifications + ' disqualifications')}`;
        }
        
        playerDisplay += ')';
        console.log(playerDisplay);
      });
      
    } catch (error) {
      console.error(chalk.red(`✗ Error running match: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('run <tournament>')
  .description('Run a complete tournament with auto-discovered bots')
  .action(async (tournamentName) => {
    try {
      console.log(chalk.blue(`🏆 Running full tournament '${tournamentName}'`));
      console.log(chalk.gray('🔍 Auto-discovering available bots...'));
      
      const result = await tournament.runFullTournament(tournamentName);
      
      console.log(chalk.green(`✓ Tournament completed successfully`));
      console.log(chalk.bold(`\n📊 Tournament Summary:`));
      console.log(`  Participants: ${result.summary.participants}`);
      console.log(`  Total Matches: ${result.summary.totalMatches}`);
      console.log(`  Winner: ${result.summary.winner ? result.summary.winner.name : 'No clear winner'}`);
      
      if (result.summary.winner) {
        const winner = result.summary.winner;
        const tournamentData = result.tournament;
        const gameType = tournamentData.settings.gameType;
        const ScoreNormalizationService = require('./services/score-normalization-service');
        const scoreService = new ScoreNormalizationService();
        
        console.log(chalk.yellow(`\n🥇 Champion: ${winner.name}`));
        
        if (scoreService.usesRawScores(gameType)) {
          const scoreLabel = gameType === 'texas-holdem-many' ? 'chips' : 'winnings';
          console.log(`  🎯 Average Score: ${winner.avgScore.toFixed(0)} (avg ${scoreLabel})`);
        } else {
          console.log(`  🎯 Average Score: ${winner.avgScore.toFixed(3)} (normalized)`);
        }
        
        console.log(`  📊 Win Rate: ${(winner.winRate * 100).toFixed(1)}%`);
        console.log(`  📈 Record: ${winner.wins}W-${winner.losses}L-${winner.draws}D`);
      }
      
      console.log(chalk.gray(`\n💾 Tournament data saved. Use 'tournament standings ${tournamentName}' for detailed results.`));
      
    } catch (error) {
      console.error(chalk.red(`✗ Error running tournament: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('run-round <tournament>')
  .description('Run a full round robin between all participants')
  .action(async (tournamentName) => {
    try {
      console.log(chalk.blue(`Running round robin for tournament '${tournamentName}'`));
      console.log(chalk.gray('🔍 Auto-discovering available bots...'));
      
      // Auto-populate bots before running the round
      await tournament.autoPopulateBots(tournamentName);
      
      const matches = await tournament.runRound(tournamentName);
      
      console.log(chalk.green(`✓ Round completed with ${matches.length} matches`));
      
      matches.forEach(match => {
        const winner = match.result.winner ? match.result.winner.name : 'Draw';
        console.log(`  ${match.participants[0]} vs ${match.participants[1]} - Winner: ${winner}`);
      });
      
    } catch (error) {
      console.error(chalk.red(`✗ Error running round: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('standings <tournament>')
  .description('Show tournament standings')
  .action(async (tournamentName) => {
    try {
      const standings = await tournament.getStandings(tournamentName);
      
      if (standings.length === 0) {
        console.log(chalk.yellow('No participants in tournament'));
        return;
      }
      
      // Get tournament info for formatting
      const tournamentData = await tournament.tournaments.get(tournamentName) || await tournament.loadTournament(tournamentName);
      const gameType = tournamentData.settings.gameType;
      const ScoreNormalizationService = require('./services/score-normalization-service');
      const scoreService = new ScoreNormalizationService();
      
      console.log(chalk.bold(`\\nStandings for '${tournamentName}' (ranked by Average Score):`));
      console.log(chalk.gray('Rank | Name | Games | Wins | Losses | Draws | DQs | Win Rate | Avg Score'));
      console.log(chalk.gray('-----|------|-------|------|--------|-------|-----|----------|----------'));
      
      standings.forEach((participant, index) => {
        const rank = (index + 1).toString().padStart(4);
        const name = participant.name.padEnd(20);
        const games = participant.gamesPlayed.toString().padStart(5);
        const wins = participant.wins.toString().padStart(4);
        const losses = participant.losses.toString().padStart(6);
        const draws = participant.draws.toString().padStart(5);
        const dqs = participant.disqualifications.toString().padStart(3);
        const winRate = (participant.winRate * 100).toFixed(1).padStart(8) + '%';
        const avgScore = scoreService.usesRawScores(gameType) 
          ? participant.avgScore.toFixed(0).padStart(8)
          : participant.avgScore.toFixed(3).padStart(8);
        
        let rowColor = chalk.white;
        if (participant.disqualifications > 0) {
          rowColor = chalk.red; // Highlight bots with disqualifications
        }
        
        console.log(rowColor(`${rank} | ${name} | ${games} | ${wins} | ${losses} | ${draws} | ${dqs} | ${winRate} | ${avgScore}`));
      });
      
      // Use the already retrieved tournament data
      
      if (scoreService.usesRawScores(gameType)) {
        console.log(chalk.gray(`\n📋 Note: Average Score shows raw ${gameType === 'texas-holdem-many' ? 'chip counts' : 'winnings/losses'} for meaningful comparison.`));
      } else {
        console.log(chalk.gray(`\n📋 Note: Average Score is normalized to [-1.0, +1.0] range for fair comparison across game types.`));
      }
      console.log(chalk.gray(`     Higher values indicate better performance. Ranking is: Avg Score → Win Rate → Games Played`));
      
    } catch (error) {
      console.error(chalk.red(`✗ Error getting standings: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('delete <tournament>')
  .description('Delete a tournament')
  .action(async (tournamentName) => {
    try {
      await tournament.deleteTournament(tournamentName);
      
      console.log(chalk.green(`✓ Tournament '${tournamentName}' deleted`));
    } catch (error) {
      console.error(chalk.red(`✗ Error deleting tournament: ${error.message}`));
      process.exit(1);
    }
  });


program.parse();