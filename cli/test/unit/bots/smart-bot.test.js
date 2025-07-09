const SmartBot = require('../../../src/bots/smart-bot');
const MockRandomService = require('../../mocks/mock-random-service');

describe('SmartBot', () => {
  let bot;
  let mockRandomService;

  beforeEach(() => {
    mockRandomService = new MockRandomService();
    bot = new SmartBot('TestBot', { randomService: mockRandomService });
  });

  describe('constructor', () => {
    it('should create bot with name and dependencies', () => {
      expect(bot.name).toBe('TestBot');
      expect(bot.randomService).toBe(mockRandomService);
    });

    it('should throw error if randomService is not provided', () => {
      expect(() => {
        new SmartBot('TestBot', {});
      }).toThrow('SmartBot requires randomService dependency');
    });
  });

  describe('makeMove', () => {
    const createGameState = (cardValue) => ({
      currentCard: { suit: 'hearts', rank: '7', value: cardValue },
      round: 1,
      maxRounds: 10,
      cardsLeft: 51,
      players: [
        { name: 'Player1', score: 0, correctGuesses: 0, incorrectGuesses: 0, ties: 0 },
        { name: 'Player2', score: 0, correctGuesses: 0, incorrectGuesses: 0, ties: 0 }
      ]
    });

    it('should return "higher" for low cards (1-6)', async () => {
      for (let value = 1; value <= 6; value++) {
        const move = await bot.makeMove(createGameState(value));
        expect(move).toBe('higher');
      }
    });

    it('should return "lower" for high cards (8-13)', async () => {
      for (let value = 8; value <= 13; value++) {
        const move = await bot.makeMove(createGameState(value));
        expect(move).toBe('lower');
      }
    });

    it('should return random choice for middle card (7)', async () => {
      mockRandomService.setSeed(0.3);
      let move = await bot.makeMove(createGameState(7));
      expect(move).toBe('higher');

      mockRandomService.setSeed(0.7);
      move = await bot.makeMove(createGameState(7));
      expect(move).toBe('lower');
    });

    it('should validate game state', async () => {
      const invalidState = { currentCard: { suit: 'hearts' } };
      
      await expect(bot.makeMove(invalidState)).rejects.toThrow();
    });
  });

  describe('getDescription', () => {
    it('should return correct description', () => {
      expect(bot.getDescription()).toBe('A bot that uses basic strategy based on card probabilities');
    });
  });

  describe('getStrategy', () => {
    it('should return correct strategy', () => {
      expect(bot.getStrategy()).toBe('Strategy: Guess higher for cards 1-6, lower for cards 8-13, random for 7');
    });
  });
});