class CardService {
  constructor(randomService) {
    this.randomService = randomService;
  }

  createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          suit,
          rank,
          value: this.getCardValue(rank)
        });
      }
    }

    return deck;
  }

  getCardValue(rank) {
    const values = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
    return values[rank];
  }

  shuffleDeck(deck) {
    return this.randomService.shuffle(deck);
  }

  dealCard(deck) {
    if (deck.length === 0) {
      throw new Error('Cannot deal from empty deck');
    }
    return deck.pop();
  }

  compareCards(card1, card2) {
    if (card1.value > card2.value) return 1;
    if (card1.value < card2.value) return -1;
    return 0;
  }

  formatCard(card) {
    const suitSymbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return `${card.rank}${suitSymbols[card.suit]}`;
  }

  isValidGuess(guess) {
    return guess === 'higher' || guess === 'lower';
  }

  checkGuess(currentCard, nextCard, guess) {
    const comparison = this.compareCards(nextCard, currentCard);
    
    if (comparison === 0) {
      return 'tie';
    }
    
    if (guess === 'higher' && comparison > 0) {
      return 'correct';
    }
    
    if (guess === 'lower' && comparison < 0) {
      return 'correct';
    }
    
    return 'incorrect';
  }
}

module.exports = CardService;