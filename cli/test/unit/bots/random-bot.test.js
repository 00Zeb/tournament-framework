const RandomBot = require('../../../src/bots/random-bot');
const MockRandomService = require('../../mocks/mock-random-service');

describe('RandomBot', () => {
  let bot;
  let mockRandomService;

  beforeEach(() => {
    mockRandomService = new MockRandomService();
    bot = new RandomBot('TestBot', { randomService: mockRandomService });
  });

  describe('constructor', () => {
    it('should create bot with name and dependencies', () => {
      expect(bot.name).toBe('TestBot');
      expect(bot.randomService).toBe(mockRandomService);
    });

    it('should throw error if randomService is not provided', () => {
      expect(() => {
        new RandomBot('TestBot', {});
      }).toThrow('RandomBot requires randomService dependency');
    });
  });

  describe('makeMove', () => {
    const gameState = {
      currentCard: { suit: 'hearts', rank: '7', value: 7 },
      round: 1,
      maxRounds: 10,
      cardsLeft: 51,
      players: [
        { name: 'Player1', score: 0, correctGuesses: 0, incorrectGuesses: 0, ties: 0 },
        { name: 'Player2', score: 0, correctGuesses: 0, incorrectGuesses: 0, ties: 0 }
      ]
    };

    it('should return "higher" when random chance is true', async () => {
      mockRandomService.setSeed(0.3);
      
      const move = await bot.makeMove(gameState);
      expect(move).toBe('higher');
    });

    it('should return "lower" when random chance is false', async () => {
      mockRandomService.setSeed(0.7);
      
      const move = await bot.makeMove(gameState);
      expect(move).toBe('lower');
    });

    it('should validate game state', async () => {
      const invalidState = { currentCard: { suit: 'hearts' } };
      
      await expect(bot.makeMove(invalidState)).rejects.toThrow();
    });
  });

  describe('getDescription', () => {
    it('should return correct description', () => {
      expect(bot.getDescription()).toBe('A bot that makes random guesses between higher and lower');
    });
  });

  describe('getStrategy', () => {
    it('should return correct strategy', () => {
      expect(bot.getStrategy()).toBe('Random: 50% chance of guessing higher, 50% chance of guessing lower');
    });
  });
});