const BlackjackGame = require('../../../../src/games/blackjack/game');
const BlackjackCardService = require('../../../../src/games/blackjack/card-service');

class MockRandomService {
  shuffle(array) {
    // Return predictable order for testing
    return [...array];
  }
}

class MockBot {
  constructor(name, actions = []) {
    this.name = name;
    this.actions = actions;
    this.actionIndex = 0;
  }

  onGameStart() {}
  onGameEnd() {}

  async makeMove() {
    const action = this.actions[this.actionIndex] || 'stand';
    this.actionIndex++;
    return action;
  }
}

describe('BlackjackGame', () => {
  let cardService;
  let game;
  let players;

  beforeEach(() => {
    cardService = new BlackjackCardService(new MockRandomService());
    
    players = [
      { name: 'bank-bot', bot: new MockBot('bank-bot') },
      { name: 'test-player', bot: new MockBot('test-player', ['stand']) }
    ];
    
    game = new BlackjackGame(cardService, players);
  });

  describe('initialization', () => {
    test('initializes game state correctly', () => {
      expect(game.gameState.players).toHaveLength(2);
      expect(game.gameState.gamePhase).toBe('dealing');
      expect(game.gameState.handCount).toBe(1);
      expect(game.gameState.maxHands).toBe(100);
      expect(game.gameState.gameOver).toBe(false);
    });

    test('identifies bank player correctly', () => {
      const bankPlayer = game.gameState.players.find(p => p.isBank);
      expect(bankPlayer).toBeDefined();
      expect(bankPlayer.name).toBe('bank-bot');
    });
  });

  describe('card dealing', () => {
    test('deals initial cards to all players', async () => {
      await game.dealInitialCards();
      
      game.gameState.players.forEach(player => {
        expect(player.hand).toHaveLength(2);
      });
    });

    test('detects blackjack correctly', async () => {
      // Mock specific cards for blackjack
      const aceCard = { rank: 'A', suit: 'hearts', value: 11 };
      const kingCard = { rank: 'K', suit: 'spades', value: 10 };
      
      game.gameState.players[1].hand = [aceCard, kingCard];
      
      // Check for blackjacks
      game.gameState.players.forEach(player => {
        if (cardService.isBlackjack(player.hand)) {
          player.isBlackjack = true;
        }
      });
      
      expect(game.gameState.players[1].isBlackjack).toBe(true);
    });
  });

  describe('player actions', () => {
    test('processes hit action correctly', async () => {
      const player = game.gameState.players[1];
      player.hand = [
        { rank: '5', suit: 'hearts', value: 5 },
        { rank: '6', suit: 'spades', value: 6 }
      ];
      
      await game.processPlayerAction(player, 'hit');
      
      expect(player.hand).toHaveLength(3);
      expect(player.currentAction).toBe('hit');
    });

    test('processes stand action correctly', async () => {
      const player = game.gameState.players[1];
      player.hand = [
        { rank: 'K', suit: 'hearts', value: 10 },
        { rank: '7', suit: 'spades', value: 7 }
      ];
      
      await game.processPlayerAction(player, 'stand');
      
      expect(player.hand).toHaveLength(2);
      expect(player.isStanding).toBe(true);
      expect(player.currentAction).toBe('stand');
    });

    test('processes double action correctly', async () => {
      const player = game.gameState.players[1];
      player.hand = [
        { rank: '5', suit: 'hearts', value: 5 },
        { rank: '6', suit: 'spades', value: 6 }
      ];
      player.bet = 10;
      
      await game.processPlayerAction(player, 'double');
      
      expect(player.hand).toHaveLength(3);
      expect(player.bet).toBe(20);
      expect(player.isStanding).toBe(true);
      expect(player.currentAction).toBe('double');
    });
  });

  describe('bust detection', () => {
    test('detects bust correctly', async () => {
      const player = game.gameState.players[1];
      player.hand = [
        { rank: 'K', suit: 'hearts', value: 10 },
        { rank: 'Q', suit: 'spades', value: 10 },
        { rank: '5', suit: 'diamonds', value: 5 }
      ];
      
      await game.processPlayerAction(player, 'hit');
      
      expect(player.isBust).toBe(true);
      expect(player.isStanding).toBe(true);
    });
  });

  describe('game state for player', () => {
    test('provides correct game state', () => {
      game.gameState.currentPlayerIndex = 1;
      const player = game.gameState.players[1];
      player.hand = [
        { rank: '7', suit: 'hearts', value: 7 },
        { rank: '8', suit: 'spades', value: 8 }
      ];
      
      const gameStateForPlayer = game.getGameStateForPlayer();
      
      expect(gameStateForPlayer.playerHand).toHaveLength(2);
      expect(gameStateForPlayer.playerValue).toBe(15);
      expect(gameStateForPlayer.possibleActions).toContain('hit');
      expect(gameStateForPlayer.possibleActions).toContain('stand');
      expect(gameStateForPlayer.hand).toBe(1);
      expect(gameStateForPlayer.maxHands).toBe(100);
    });
  });

  describe('game completion', () => {
    test('ends game correctly', () => {
      game.endGame();
      
      expect(game.gameState.gameOver).toBe(true);
      expect(game.gameState.winner).toBeDefined();
    });

    test('determines winner correctly', () => {
      // Set up player scores
      game.gameState.players[1].score = 100;
      
      game.endGame();
      
      const nonBankPlayers = game.gameState.players.filter(p => !p.isBank);
      expect(game.gameState.winner).toBe(nonBankPlayers[0]);
    });
  });

  describe('tie resolution', () => {
    test('resolves ties by hands won', () => {
      const player1 = { score: 100, handsWon: 50, blackjacks: 5, busts: 10 };
      const player2 = { score: 100, handsWon: 60, blackjacks: 3, busts: 8 };
      
      const winner = game.resolveTie([player1, player2]);
      
      expect(winner).toBe(player2);
    });

    test('resolves ties by blackjacks when hands won are equal', () => {
      const player1 = { score: 100, handsWon: 50, blackjacks: 5, busts: 10 };
      const player2 = { score: 100, handsWon: 50, blackjacks: 8, busts: 8 };
      
      const winner = game.resolveTie([player1, player2]);
      
      expect(winner).toBe(player2);
    });

    test('resolves ties by fewest busts when other stats are equal', () => {
      const player1 = { score: 100, handsWon: 50, blackjacks: 5, busts: 10 };
      const player2 = { score: 100, handsWon: 50, blackjacks: 5, busts: 8 };
      
      const winner = game.resolveTie([player1, player2]);
      
      expect(winner).toBe(player2);
    });
  });
});