const HigherLowerGame = require('../../../../src/games/higher-lower/game');
const MockRandomService = require('../../../mocks/mock-random-service');
const CardService = require('../../../../src/games/higher-lower/card-service');
const RandomBot = require('../../../../src/bots/random-bot');
const CrashingBot = require('../../../bots/crashing-bot');
const InvalidGuessBot = require('../../../bots/invalid-guess-bot');

describe('HigherLowerGame Disqualification', () => {
  let mockRandomService;
  let cardService;

  beforeEach(() => {
    mockRandomService = new MockRandomService();
    cardService = new CardService(mockRandomService);
  });

  describe('Bot Crashing', () => {
    it('should disqualify a bot that crashes', async () => {
      const crashingBot = new CrashingBot('CrashBot', { randomService: mockRandomService });
      const randomBot = new RandomBot('RandomBot', { randomService: mockRandomService });
      
      const players = [
        { name: 'CrashBot', bot: crashingBot },
        { name: 'RandomBot', bot: randomBot }
      ];
      
      const game = new HigherLowerGame(cardService, players);
      
      // Force the crashing bot to crash on next move
      crashingBot.crashCount = 1; // Next move will crash (since it crashes on even counts)
      
      // Play rounds until we find the crashing bot
      let foundCrash = false;
      for (let i = 0; i < 6 && !game.isGameOver() && !foundCrash; i++) {
        const roundResult = await game.playRound();
        
        if (roundResult.player === 'CrashBot' && roundResult.disqualified) {
          expect(roundResult.disqualified).toBe(true);
          expect(roundResult.result).toBe('disqualified');
          expect(roundResult.score).toBe(-2);
          expect(roundResult.disqualificationReason).toContain('Bot crashed during makeMove()');
          foundCrash = true;
        }
      }
      
      expect(foundCrash).toBe(true);
    });

    it('should update player stats for disqualification', async () => {
      const crashingBot = new CrashingBot('CrashBot', { randomService: mockRandomService });
      const randomBot = new RandomBot('RandomBot', { randomService: mockRandomService });
      
      const players = [
        { name: 'CrashBot', bot: crashingBot },
        { name: 'RandomBot', bot: randomBot }
      ];
      
      const game = new HigherLowerGame(cardService, players);
      
      // Force the crashing bot to be first and crash
      crashingBot.crashCount = 1; // Next move will crash
      
      await game.playRound();
      
      const gameResult = game.getGameResult();
      const crashBotStats = gameResult.players.find(p => p.name === 'CrashBot');
      
      expect(crashBotStats.disqualifications).toBe(1);
      expect(crashBotStats.score).toBeLessThan(0); // Should have penalty
    });
  });

  describe('Invalid Guesses', () => {
    it('should disqualify a bot that returns invalid guesses', async () => {
      const invalidBot = new InvalidGuessBot('InvalidBot', { randomService: mockRandomService });
      const randomBot = new RandomBot('RandomBot', { randomService: mockRandomService });
      
      const players = [
        { name: 'InvalidBot', bot: invalidBot },
        { name: 'RandomBot', bot: randomBot }
      ];
      
      const game = new HigherLowerGame(cardService, players);
      
      // Play a round where the invalid bot should return an invalid guess
      const roundResult = await game.playRound();
      
      if (roundResult.player === 'InvalidBot') {
        expect(roundResult.disqualified).toBe(true);
        expect(roundResult.result).toBe('disqualified');
        expect(roundResult.score).toBe(-2);
        expect(roundResult.disqualificationReason).toContain('Invalid guess returned');
      }
    });

    it('should handle multiple different invalid guesses', async () => {
      const invalidBot = new InvalidGuessBot('InvalidBot', { randomService: mockRandomService });
      const randomBot = new RandomBot('RandomBot', { randomService: mockRandomService });
      
      const players = [
        { name: 'InvalidBot', bot: invalidBot },
        { name: 'RandomBot', bot: randomBot }
      ];
      
      const game = new HigherLowerGame(cardService, players);
      
      let disqualificationCount = 0;
      
      // Play several rounds to test different invalid values
      for (let i = 0; i < 8; i++) {
        if (game.isGameOver()) break;
        
        const roundResult = await game.playRound();
        
        if (roundResult.player === 'InvalidBot' && roundResult.disqualified) {
          disqualificationCount++;
          expect(roundResult.result).toBe('disqualified');
          expect(roundResult.score).toBe(-2);
        }
      }
      
      expect(disqualificationCount).toBeGreaterThan(0);
    });
  });

  describe('Mixed Scenarios', () => {
    it('should handle games with both legal and illegal bots', async () => {
      const randomBot = new RandomBot('RandomBot', { randomService: mockRandomService });
      const crashingBot = new CrashingBot('CrashBot', { randomService: mockRandomService });
      const invalidBot = new InvalidGuessBot('InvalidBot', { randomService: mockRandomService });
      
      const players = [
        { name: 'RandomBot', bot: randomBot },
        { name: 'CrashBot', bot: crashingBot },
        { name: 'InvalidBot', bot: invalidBot }
      ];
      
      const game = new HigherLowerGame(cardService, players);
      
      // Play the full game
      const result = await game.playFullGame();
      
      // Check that disqualifications were tracked
      const finalResult = result.gameResult;
      const crashBotStats = finalResult.players.find(p => p.name === 'CrashBot');
      const invalidBotStats = finalResult.players.find(p => p.name === 'InvalidBot');
      const randomBotStats = finalResult.players.find(p => p.name === 'RandomBot');
      
      // Illegal bots should have disqualifications
      expect(crashBotStats.disqualifications).toBeGreaterThan(0);
      expect(invalidBotStats.disqualifications).toBeGreaterThan(0);
      
      // Legal bot should have no disqualifications
      expect(randomBotStats.disqualifications).toBe(0);
      
      // Legal bot should likely have a better score due to penalties on illegal bots
      expect(randomBotStats.score).toBeGreaterThanOrEqual(crashBotStats.score);
      expect(randomBotStats.score).toBeGreaterThanOrEqual(invalidBotStats.score);
    });
  });

  describe('Scoring System', () => {
    it('should apply -2 penalty for disqualification', async () => {
      const game = new HigherLowerGame(cardService, []);
      
      expect(game.calculateScore('correct')).toBe(1);
      expect(game.calculateScore('incorrect')).toBe(-1);
      expect(game.calculateScore('tie')).toBe(0);
      expect(game.calculateScore('disqualified')).toBe(-2);
    });
  });
});