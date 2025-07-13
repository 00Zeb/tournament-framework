const BlackjackCardService = require('../../../../src/games/blackjack/card-service');

class MockRandomService {
  shuffle(array) {
    // Return array as-is for predictable testing
    return [...array];
  }
}

describe('BlackjackCardService', () => {
  let cardService;

  beforeEach(() => {
    cardService = new BlackjackCardService(new MockRandomService());
  });

  describe('createDeck', () => {
    test('creates a standard 52-card deck', () => {
      const deck = cardService.createDeck();
      expect(deck).toHaveLength(52);
      
      // Check all suits and ranks are present
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      
      suits.forEach(suit => {
        ranks.forEach(rank => {
          const card = deck.find(c => c.suit === suit && c.rank === rank);
          expect(card).toBeDefined();
        });
      });
    });
  });

  describe('getCardValue', () => {
    test('returns correct values for number cards', () => {
      expect(cardService.getCardValue('2')).toBe(2);
      expect(cardService.getCardValue('10')).toBe(10);
    });

    test('returns 11 for Ace', () => {
      expect(cardService.getCardValue('A')).toBe(11);
    });

    test('returns 10 for face cards', () => {
      expect(cardService.getCardValue('J')).toBe(10);
      expect(cardService.getCardValue('Q')).toBe(10);
      expect(cardService.getCardValue('K')).toBe(10);
    });
  });

  describe('calculateHandValue', () => {
    test('calculates simple hand value', () => {
      const cards = [
        { rank: '5', value: 5 },
        { rank: '7', value: 7 }
      ];
      expect(cardService.calculateHandValue(cards)).toBe(12);
    });

    test('handles Ace as 11 when possible', () => {
      const cards = [
        { rank: 'A', value: 11 },
        { rank: '9', value: 9 }
      ];
      expect(cardService.calculateHandValue(cards)).toBe(20);
    });

    test('converts Ace to 1 when hand would bust', () => {
      const cards = [
        { rank: 'A', value: 11 },
        { rank: 'K', value: 10 },
        { rank: '5', value: 5 }
      ];
      expect(cardService.calculateHandValue(cards)).toBe(16);
    });

    test('handles multiple Aces', () => {
      const cards = [
        { rank: 'A', value: 11 },
        { rank: 'A', value: 11 },
        { rank: '9', value: 9 }
      ];
      expect(cardService.calculateHandValue(cards)).toBe(21);
    });
  });

  describe('isBlackjack', () => {
    test('returns true for Ace and 10-value card', () => {
      const cards = [
        { rank: 'A', value: 11 },
        { rank: 'K', value: 10 }
      ];
      expect(cardService.isBlackjack(cards)).toBe(true);
    });

    test('returns false for 21 with more than 2 cards', () => {
      const cards = [
        { rank: '7', value: 7 },
        { rank: '7', value: 7 },
        { rank: '7', value: 7 }
      ];
      expect(cardService.isBlackjack(cards)).toBe(false);
    });

    test('returns false for non-21 hands', () => {
      const cards = [
        { rank: 'A', value: 11 },
        { rank: '9', value: 9 }
      ];
      expect(cardService.isBlackjack(cards)).toBe(false);
    });
  });

  describe('isBust', () => {
    test('returns true when hand value > 21', () => {
      const cards = [
        { rank: 'K', value: 10 },
        { rank: 'Q', value: 10 },
        { rank: '5', value: 5 }
      ];
      expect(cardService.isBust(cards)).toBe(true);
    });

    test('returns false when hand value <= 21', () => {
      const cards = [
        { rank: 'A', value: 11 },
        { rank: 'K', value: 10 }
      ];
      expect(cardService.isBust(cards)).toBe(false);
    });
  });

  describe('canSplit', () => {
    test('returns true for same rank cards', () => {
      const cards = [
        { rank: '8', value: 8 },
        { rank: '8', value: 8 }
      ];
      expect(cardService.canSplit(cards)).toBe(true);
    });

    test('returns false for different rank cards', () => {
      const cards = [
        { rank: '8', value: 8 },
        { rank: '9', value: 9 }
      ];
      expect(cardService.canSplit(cards)).toBe(false);
    });

    test('returns false for more than 2 cards', () => {
      const cards = [
        { rank: '8', value: 8 },
        { rank: '8', value: 8 },
        { rank: '8', value: 8 }
      ];
      expect(cardService.canSplit(cards)).toBe(false);
    });
  });

  describe('isValidAction', () => {
    test('returns true for valid actions', () => {
      expect(cardService.isValidAction('hit')).toBe(true);
      expect(cardService.isValidAction('stand')).toBe(true);
      expect(cardService.isValidAction('double')).toBe(true);
      expect(cardService.isValidAction('split')).toBe(true);
    });

    test('returns false for invalid actions', () => {
      expect(cardService.isValidAction('fold')).toBe(false);
      expect(cardService.isValidAction('call')).toBe(false);
      expect(cardService.isValidAction('')).toBe(false);
    });
  });
});