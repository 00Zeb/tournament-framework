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
  .description('Simple CLI for running bot tournaments. Use "games" to list available games, "run <game-type>" to run tournaments.')
  .version('1.0.0');

const container = DependencyContainer.createDefault();
const dependencies = {
  fileService: container.get('fileService'),
  randomService: container.get('randomService')
};
const tournament = new Tournament(dependencies);


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
  .command('run <game-type>')
  .description('Run a tournament for the specified game type. Uses convention: {game-type}-tournament')
  .action(async (gameType) => {
    try {
      // Validate game type
      if (!gameRegistry.isValidGameType(gameType)) {
        console.error(chalk.red(`✗ Invalid game type '${gameType}'. Available types: ${gameRegistry.getAvailableGameTypes().join(', ')}`));
        process.exit(1);
      }
      
      // Use conventional tournament naming
      const tournamentName = `${gameType}-tournament`;
      
      console.log(chalk.blue(`🏆 Running tournament for '${gameType}'`));
      console.log(chalk.gray(`Tournament name: ${tournamentName}`));
      
      // Check if tournament exists, create if not
      let tournamentExists = false;
      try {
        await tournament.loadTournament(tournamentName);
        tournamentExists = true;
        console.log(chalk.gray('📁 Using existing tournament'));
      } catch (error) {
        console.log(chalk.gray('🆕 Creating new tournament...'));
        await tournament.createTournament(tournamentName, {
          gameType: gameType,
          maxRounds: 10
        });
      }
      
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
      
      // Show detailed standings
      console.log(chalk.bold(`\n🏆 Final Standings:`));
      const standings = await tournament.getStandings(tournamentName);
      
      if (standings.length > 0) {
        const tournamentData = await tournament.tournaments.get(tournamentName) || await tournament.loadTournament(tournamentName);
        const gameType = tournamentData.settings.gameType;
        const ScoreNormalizationService = require('./services/score-normalization-service');
        const scoreService = new ScoreNormalizationService();
        
        console.log(chalk.gray('Rank | Name                 | Games | Wins | Losses | Draws | DQs | Win Rate | Avg Score'));
        console.log(chalk.gray('-----|----------------------|-------|------|--------|-------|-----|----------|----------'));
        
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
            rowColor = chalk.red;
          }
          
          console.log(rowColor(`${rank} | ${name} | ${games} | ${wins} | ${losses} | ${draws} | ${dqs} | ${winRate} | ${avgScore}`));
        });
        
        if (scoreService.usesRawScores(gameType)) {
          console.log(chalk.gray(`\n📋 Note: Average Score shows raw ${gameType === 'texas-holdem-many' ? 'chip counts' : 'winnings/losses'} for meaningful comparison.`));
        } else {
          console.log(chalk.gray(`\n📋 Note: Average Score is normalized to [-1.0, +1.0] range for fair comparison across game types.`));
        }
        console.log(chalk.gray(`     Higher values indicate better performance. Ranking is: Avg Score → Win Rate → Games Played`));
      }
      
      console.log(chalk.gray(`\n💾 Tournament data saved as: ${tournamentName}.json`));
      
    } catch (error) {
      console.error(chalk.red(`✗ Error running tournament: ${error.message}`));
      process.exit(1);
    }
  });





program.parse();