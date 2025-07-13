class BlackjackCardService {
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
      'A': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10
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

  formatCard(card) {
    const suitSymbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return `${card.rank}${suitSymbols[card.suit]}`;
  }

  /**
   * Calculate hand value considering Ace can be 1 or 11
   */
  calculateHandValue(cards) {
    let value = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    }

    // Convert Aces from 11 to 1 if hand would bust
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }

  /**
   * Check if hand is soft (contains Ace counted as 11)
   */
  isSoftHand(cards) {
    let value = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    }

    // If we have aces and the hand value is <= 21, it's soft
    return aces > 0 && value <= 21;
  }

  /**
   * Check if hand is blackjack (21 with exactly 2 cards)
   */
  isBlackjack(cards) {
    return cards.length === 2 && this.calculateHandValue(cards) === 21;
  }

  /**
   * Check if hand is bust (over 21)
   */
  isBust(cards) {
    return this.calculateHandValue(cards) > 21;
  }

  /**
   * Check if cards can be split (same rank)
   */
  canSplit(cards) {
    return cards.length === 2 && cards[0].rank === cards[1].rank;
  }

  /**
   * Validate blackjack action
   */
  isValidAction(action) {
    return ['hit', 'stand', 'double', 'split'].includes(action);
  }

  /**
   * Get all possible actions for a hand
   */
  getPossibleActions(cards, canDouble = true, canSplit = true) {
    const actions = ['hit', 'stand'];
    
    if (canDouble && cards.length === 2) {
      actions.push('double');
    }
    
    if (canSplit && this.canSplit(cards)) {
      actions.push('split');
    }
    
    return actions;
  }

  /**
   * Format hand for display
   */
  formatHand(cards, hideHole = false) {
    if (hideHole && cards.length > 0) {
      // Hide first card (hole card)
      const visibleCards = cards.slice(1);
      return `[Hidden], ${visibleCards.map(card => this.formatCard(card)).join(', ')}`;
    }
    return cards.map(card => this.formatCard(card)).join(', ');
  }
}

module.exports = BlackjackCardService;