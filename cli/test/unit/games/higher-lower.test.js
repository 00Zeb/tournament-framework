const HigherLowerGame = require('../../../src/games/higher-lower');
const MockRandomService = require('../../mocks/mock-random-service');
const CardService = require('../../../src/services/card-service');
const RandomBot = require('../../../src/bots/random-bot');

describe('HigherLowerGame', () => {
  let game;
  let mockRandomService;
  let cardService;
  let players;

  beforeEach(() => {
    mockRandomService = new MockRandomService();
    cardService = new CardService(mockRandomService);
    
    const bot1 = new RandomBot('Player1', { randomService: mockRandomService });
    const bot2 = new RandomBot('Player2', { randomService: mockRandomService });
    
    players = [
      { name: 'Player1', bot: bot1 },
      { name: 'Player2', bot: bot2 }
    ];
    
    game = new HigherLowerGame(cardService, players);
  });

  describe('constructor', () => {
    it('should initialize game with proper state', () => {
      expect(game.gameState.players).toHaveLength(2);
      expect(game.gameState.currentPlayerIndex).toBe(0);
      expect(game.gameState.round).toBe(1);
      expect(game.gameState.maxRounds).toBe(10);
      expect(game.gameState.gameOver).toBe(false);
      expect(game.gameState.currentCard).toBeDefined();
      expect(game.gameState.deck).toHaveLength(51);
    });

    it('should initialize players with zero scores', () => {
      game.gameState.players.forEach(player => {
        expect(player.score).toBe(0);
        expect(player.correctGuesses).toBe(0);
        expect(player.incorrectGuesses).toBe(0);
        expect(player.ties).toBe(0);
      });
    });
  });

  describe('getCurrentPlayer', () => {
    it('should return current player', () => {
      const currentPlayer = game.getCurrentPlayer();
      expect(currentPlayer.name).toBe('Player1');
    });
  });

  describe('calculateScore', () => {
    it('should return correct scores for different results', () => {
      expect(game.calculateScore('correct')).toBe(1);
      expect(game.calculateScore('tie')).toBe(0);
      expect(game.calculateScore('incorrect')).toBe(-1);
      expect(game.calculateScore('unknown')).toBe(0);
    });
  });

  describe('updatePlayerStats', () => {
    it('should update player stats correctly', () => {
      const player = game.gameState.players[0];
      
      game.updatePlayerStats(player, 'correct', 1);
      expect(player.score).toBe(1);
      expect(player.correctGuesses).toBe(1);
      
      game.updatePlayerStats(player, 'incorrect', -1);
      expect(player.score).toBe(0);
      expect(player.incorrectGuesses).toBe(1);
      
      game.updatePlayerStats(player, 'tie', 0);
      expect(player.score).toBe(0);
      expect(player.ties).toBe(1);
    });
  });

  describe('getGameStateForPlayer', () => {
    it('should return sanitized game state', () => {
      const state = game.getGameStateForPlayer();
      
      expect(state).toHaveProperty('currentCard');
      expect(state).toHaveProperty('round');
      expect(state).toHaveProperty('maxRounds');
      expect(state).toHaveProperty('cardsLeft');
      expect(state).toHaveProperty('players');
      expect(state.players).toHaveLength(2);
      expect(state.players[0]).toHaveProperty('name');
      expect(state.players[0]).toHaveProperty('score');
    });
  });

  describe('endGame', () => {
    it('should set game over and determine winner', () => {
      game.gameState.players[0].score = 5;
      game.gameState.players[1].score = 3;
      
      game.endGame();
      
      expect(game.gameState.gameOver).toBe(true);
      expect(game.gameState.winner.name).toBe('Player1');
    });
  });

  describe('resolveTie', () => {
    it('should resolve tie by correct guesses', () => {
      const player1 = { name: 'Player1', score: 5, correctGuesses: 7, incorrectGuesses: 2 };
      const player2 = { name: 'Player2', score: 5, correctGuesses: 6, incorrectGuesses: 1 };
      
      const winner = game.resolveTie([player1, player2]);
      expect(winner.name).toBe('Player1');
    });

    it('should resolve tie by incorrect guesses when correct guesses are equal', () => {
      const player1 = { name: 'Player1', score: 5, correctGuesses: 6, incorrectGuesses: 3 };
      const player2 = { name: 'Player2', score: 5, correctGuesses: 6, incorrectGuesses: 2 };
      
      const winner = game.resolveTie([player1, player2]);
      expect(winner.name).toBe('Player2');
    });
  });

  describe('isGameOver', () => {
    it('should return false initially', () => {
      expect(game.isGameOver()).toBe(false);
    });

    it('should return true after game ends', () => {
      game.endGame();
      expect(game.isGameOver()).toBe(true);
    });
  });

  describe('playRound', () => {
    it('should throw error if game is over', async () => {
      game.gameState.gameOver = true;
      
      await expect(game.playRound()).rejects.toThrow('Game is already over');
    });

    it('should end game if deck is empty', async () => {
      game.gameState.deck = [];
      
      const result = await game.playRound();
      
      expect(game.gameState.gameOver).toBe(true);
      expect(result.gameOver).toBe(true);
    });
  });
});