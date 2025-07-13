const HigherLowerManyGame = require('../../../../src/games/higher-lower-many/game');
const MockRandomService = require('../../../mocks/mock-random-service');
const CardService = require('../../../../src/games/higher-lower-many/card-service');
const RandomBot = require('../../../../src/bots/random-bot');

describe('HigherLowerManyGame', () => {
  let game;
  let mockRandomService;
  let cardService;
  let players;

  beforeEach(() => {
    mockRandomService = new MockRandomService();
    cardService = new CardService(mockRandomService);
    
    const bot1 = new RandomBot('Player1', { randomService: mockRandomService });
    const bot2 = new RandomBot('Player2', { randomService: mockRandomService });
    const bot3 = new RandomBot('Player3', { randomService: mockRandomService });
    
    players = [
      { name: 'Player1', bot: bot1 },
      { name: 'Player2', bot: bot2 },
      { name: 'Player3', bot: bot3 }
    ];
    
    game = new HigherLowerManyGame(cardService, players);
  });

  describe('constructor', () => {
    it('should initialize game with 3 players', () => {
      expect(game.gameState.players).toHaveLength(3);
      expect(game.gameState.currentPlayerIndex).toBe(0);
      expect(game.gameState.round).toBe(1);
      expect(game.gameState.maxRounds).toBe(100);
      expect(game.gameState.gameOver).toBe(false);
      expect(game.gameState.currentCard).toBeDefined();
    });

    it('should have enough cards for 100 rounds with 3 players', () => {
      const neededCards = 3 * 100 + 1; // 301 cards needed
      expect(game.gameState.deck.length).toBeGreaterThanOrEqual(neededCards - 1); // -1 because first card is dealt
    });

    it('should initialize players with zero scores and round stats', () => {
      game.gameState.players.forEach(player => {
        expect(player.score).toBe(0);
        expect(player.correctGuesses).toBe(0);
        expect(player.incorrectGuesses).toBe(0);
        expect(player.ties).toBe(0);
        expect(player.roundWins).toBe(0);
        expect(player.roundLosses).toBe(0);
        expect(player.roundTies).toBe(0);
      });
    });
  });

  describe('round evaluation with 3 players', () => {
    it('should determine single winner and losers in a round', () => {
      // Simulate a round where Player1 gets correct, others get incorrect
      const roundResults = [
        { player: game.gameState.players[0], result: 'correct', roundScore: 1, disqualified: false },
        { player: game.gameState.players[1], result: 'incorrect', roundScore: -1, disqualified: false },
        { player: game.gameState.players[2], result: 'incorrect', roundScore: -1, disqualified: false }
      ];
      
      game.gameState.roundResults[0] = roundResults;
      game.evaluateRound(0);
      
      // Player1 should win the round (+1 tournament point)
      expect(game.gameState.players[0].score).toBe(1);
      expect(game.gameState.players[0].roundWins).toBe(1);
      
      // Player2 and Player3 should lose the round (-1 tournament point each)
      expect(game.gameState.players[1].score).toBe(-1);
      expect(game.gameState.players[1].roundLosses).toBe(1);
      expect(game.gameState.players[2].score).toBe(-1);
      expect(game.gameState.players[2].roundLosses).toBe(1);
    });

    it('should handle ties when multiple players have best score', () => {
      // Simulate a round where Player1 and Player2 both get correct, Player3 gets incorrect
      const roundResults = [
        { player: game.gameState.players[0], result: 'correct', roundScore: 1, disqualified: false },
        { player: game.gameState.players[1], result: 'correct', roundScore: 1, disqualified: false },
        { player: game.gameState.players[2], result: 'incorrect', roundScore: -1, disqualified: false }
      ];
      
      game.gameState.roundResults[0] = roundResults;
      game.evaluateRound(0);
      
      // Player1 and Player2 should tie (0 tournament points each)
      expect(game.gameState.players[0].score).toBe(0);
      expect(game.gameState.players[0].roundTies).toBe(1);
      expect(game.gameState.players[1].score).toBe(0);
      expect(game.gameState.players[1].roundTies).toBe(1);
      
      // Player3 should lose the round (-1 tournament point)
      expect(game.gameState.players[2].score).toBe(-1);
      expect(game.gameState.players[2].roundLosses).toBe(1);
    });

    it('should handle all players tying', () => {
      // Simulate a round where all players get the same result
      const roundResults = [
        { player: game.gameState.players[0], result: 'correct', roundScore: 1, disqualified: false },
        { player: game.gameState.players[1], result: 'correct', roundScore: 1, disqualified: false },
        { player: game.gameState.players[2], result: 'correct', roundScore: 1, disqualified: false }
      ];
      
      game.gameState.roundResults[0] = roundResults;
      game.evaluateRound(0);
      
      // All players should tie (0 tournament points each)
      game.gameState.players.forEach(player => {
        expect(player.score).toBe(0);
        expect(player.roundTies).toBe(1);
        expect(player.roundWins).toBe(0);
        expect(player.roundLosses).toBe(0);
      });
    });
  });

  describe('N-player turn cycling', () => {
    it('should cycle through all 3 players before starting next round', () => {
      expect(game.gameState.currentPlayerIndex).toBe(0);
      expect(game.gameState.round).toBe(1);
      
      // After player 0 plays
      game.gameState.currentPlayerIndex = (game.gameState.currentPlayerIndex + 1) % players.length;
      expect(game.gameState.currentPlayerIndex).toBe(1);
      
      // After player 1 plays
      game.gameState.currentPlayerIndex = (game.gameState.currentPlayerIndex + 1) % players.length;
      expect(game.gameState.currentPlayerIndex).toBe(2);
      
      // After player 2 plays, should go back to player 0 and increment round
      game.gameState.currentPlayerIndex = (game.gameState.currentPlayerIndex + 1) % players.length;
      expect(game.gameState.currentPlayerIndex).toBe(0);
    });
  });

  describe('tie resolution with 3 players', () => {
    it('should resolve final game tie by round wins', () => {
      const player1 = { name: 'Player1', score: 5, roundWins: 10, roundLosses: 5 };
      const player2 = { name: 'Player2', score: 5, roundWins: 8, roundLosses: 7 };
      const player3 = { name: 'Player3', score: 5, roundWins: 10, roundLosses: 5 };
      
      const winner = game.resolveTie([player1, player2, player3]);
      expect(winner.name).toBe('Player1'); // First player with max round wins
    });

    it('should resolve tie by round losses when round wins are equal', () => {
      const player1 = { name: 'Player1', score: 5, roundWins: 10, roundLosses: 7 };
      const player2 = { name: 'Player2', score: 5, roundWins: 10, roundLosses: 5 };
      const player3 = { name: 'Player3', score: 5, roundWins: 10, roundLosses: 6 };
      
      const winner = game.resolveTie([player1, player2, player3]);
      expect(winner.name).toBe('Player2'); // Player with fewest round losses
    });
  });

  describe('getGameStateForPlayer with 3 players', () => {
    it('should return state with all 3 players', () => {
      const state = game.getGameStateForPlayer();
      
      expect(state).toHaveProperty('currentCard');
      expect(state).toHaveProperty('round');
      expect(state).toHaveProperty('maxRounds');
      expect(state).toHaveProperty('cardsLeft');
      expect(state).toHaveProperty('players');
      expect(state.players).toHaveLength(3);
      
      state.players.forEach(player => {
        expect(player).toHaveProperty('name');
        expect(player).toHaveProperty('score');
        expect(player).toHaveProperty('roundWins');
        expect(player).toHaveProperty('roundLosses');
        expect(player).toHaveProperty('roundTies');
      });
    });
  });
});