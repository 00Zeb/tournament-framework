const CardService = require('../../../../src/games/higher-lower/card-service');
const MockRandomService = require('../../../mocks/mock-random-service');

describe('CardService', () => {
  let cardService;
  let mockRandomService;

  beforeEach(() => {
    mockRandomService = new MockRandomService();
    cardService = new CardService(mockRandomService);
  });

  describe('createDeck', () => {
    it('should create a deck with 52 cards', () => {
      const deck = cardService.createDeck();
      expect(deck.length).toBe(52);
    });

    it('should have 13 cards per suit', () => {
      const deck = cardService.createDeck();
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
      
      suits.forEach(suit => {
        const suitCards = deck.filter(card => card.suit === suit);
        expect(suitCards.length).toBe(13);
      });
    });

    it('should have correct card structure', () => {
      const deck = cardService.createDeck();
      const card = deck[0];
      
      expect(card).toHaveProperty('suit');
      expect(card).toHaveProperty('rank');
      expect(card).toHaveProperty('value');
      expect(typeof card.value).toBe('number');
    });
  });

  describe('getCardValue', () => {
    it('should return correct values for all ranks', () => {
      expect(cardService.getCardValue('A')).toBe(1);
      expect(cardService.getCardValue('2')).toBe(2);
      expect(cardService.getCardValue('10')).toBe(10);
      expect(cardService.getCardValue('J')).toBe(11);
      expect(cardService.getCardValue('Q')).toBe(12);
      expect(cardService.getCardValue('K')).toBe(13);
    });
  });

  describe('shuffleDeck', () => {
    it('should use random service to shuffle', () => {
      const deck = cardService.createDeck();
      const originalDeck = [...deck];
      
      mockRandomService.setSequence([0.8, 0.2, 0.5, 0.1, 0.9]);
      const shuffled = cardService.shuffleDeck(deck);
      
      expect(shuffled.length).toBe(originalDeck.length);
      expect(shuffled).not.toBe(deck);
    });
  });

  describe('dealCard', () => {
    it('should remove and return last card from deck', () => {
      const deck = [
        { suit: 'hearts', rank: 'A', value: 1 },
        { suit: 'hearts', rank: '2', value: 2 }
      ];
      const originalLength = deck.length;
      
      const card = cardService.dealCard(deck);
      
      expect(card).toEqual({ suit: 'hearts', rank: '2', value: 2 });
      expect(deck.length).toBe(originalLength - 1);
    });

    it('should throw error for empty deck', () => {
      expect(() => {
        cardService.dealCard([]);
      }).toThrow('Cannot deal from empty deck');
    });
  });

  describe('compareCards', () => {
    it('should return 1 when first card is higher', () => {
      const card1 = { value: 10 };
      const card2 = { value: 5 };
      
      expect(cardService.compareCards(card1, card2)).toBe(1);
    });

    it('should return -1 when first card is lower', () => {
      const card1 = { value: 3 };
      const card2 = { value: 8 };
      
      expect(cardService.compareCards(card1, card2)).toBe(-1);
    });

    it('should return 0 when cards are equal', () => {
      const card1 = { value: 7 };
      const card2 = { value: 7 };
      
      expect(cardService.compareCards(card1, card2)).toBe(0);
    });
  });

  describe('formatCard', () => {
    it('should format card with suit symbols', () => {
      const card = { suit: 'hearts', rank: 'A', value: 1 };
      expect(cardService.formatCard(card)).toBe('A♥');
    });

    it('should format all suit symbols correctly', () => {
      const cards = [
        { suit: 'hearts', rank: 'K', value: 13 },
        { suit: 'diamonds', rank: 'Q', value: 12 },
        { suit: 'clubs', rank: 'J', value: 11 },
        { suit: 'spades', rank: '10', value: 10 }
      ];
      
      expect(cardService.formatCard(cards[0])).toBe('K♥');
      expect(cardService.formatCard(cards[1])).toBe('Q♦');
      expect(cardService.formatCard(cards[2])).toBe('J♣');
      expect(cardService.formatCard(cards[3])).toBe('10♠');
    });
  });

  describe('isValidGuess', () => {
    it('should return true for valid guesses', () => {
      expect(cardService.isValidGuess('higher')).toBe(true);
      expect(cardService.isValidGuess('lower')).toBe(true);
    });

    it('should return false for invalid guesses', () => {
      expect(cardService.isValidGuess('up')).toBe(false);
      expect(cardService.isValidGuess('down')).toBe(false);
      expect(cardService.isValidGuess('')).toBe(false);
      expect(cardService.isValidGuess(null)).toBe(false);
    });
  });

  describe('checkGuess', () => {
    it('should return "tie" for equal cards', () => {
      const current = { value: 7 };
      const next = { value: 7 };
      
      expect(cardService.checkGuess(current, next, 'higher')).toBe('tie');
      expect(cardService.checkGuess(current, next, 'lower')).toBe('tie');
    });

    it('should return "correct" for correct higher guess', () => {
      const current = { value: 5 };
      const next = { value: 8 };
      
      expect(cardService.checkGuess(current, next, 'higher')).toBe('correct');
    });

    it('should return "correct" for correct lower guess', () => {
      const current = { value: 10 };
      const next = { value: 3 };
      
      expect(cardService.checkGuess(current, next, 'lower')).toBe('correct');
    });

    it('should return "incorrect" for wrong guesses', () => {
      const current = { value: 8 };
      const next = { value: 3 };
      
      expect(cardService.checkGuess(current, next, 'higher')).toBe('incorrect');
      
      const current2 = { value: 3 };
      const next2 = { value: 8 };
      
      expect(cardService.checkGuess(current2, next2, 'lower')).toBe('incorrect');
    });
  });
});