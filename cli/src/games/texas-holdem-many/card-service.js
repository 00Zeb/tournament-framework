class TexasHoldemCardService {
  constructor(randomService) {
    this.randomService = randomService;
  }

  createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
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
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
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
   * Evaluate poker hand strength
   * Returns: { rank: number, value: number, description: string }
   */
  evaluateHand(cards) {
    if (cards.length !== 5) {
      throw new Error('Hand must contain exactly 5 cards');
    }

    const sorted = cards.sort((a, b) => b.value - a.value);
    const ranks = sorted.map(card => card.value);
    const suits = sorted.map(card => card.suit);

    // Check for flush
    const isFlush = suits.every(suit => suit === suits[0]);
    
    // Check for straight
    const isStraight = this.isStraight(ranks);
    
    // Check for special A-2-3-4-5 straight (wheel)
    const isWheel = ranks.join('') === '1454321';
    
    // Count ranks for pairs, trips, etc.
    const rankCounts = {};
    ranks.forEach(rank => {
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const uniqueRanks = Object.keys(rankCounts).map(Number).sort((a, b) => b - a);

    // Royal flush
    if (isFlush && ranks.join('') === '1413121110') {
      return { rank: 10, value: 10, description: 'Royal Flush' };
    }

    // Straight flush
    if (isFlush && (isStraight || isWheel)) {
      const highCard = isWheel ? 5 : ranks[0];
      return { rank: 9, value: highCard, description: 'Straight Flush' };
    }

    // Four of a kind
    if (counts[0] === 4) {
      const fourKind = uniqueRanks.find(rank => rankCounts[rank] === 4);
      const kicker = uniqueRanks.find(rank => rankCounts[rank] === 1);
      return { rank: 8, value: fourKind * 100 + kicker, description: 'Four of a Kind' };
    }

    // Full house
    if (counts[0] === 3 && counts[1] === 2) {
      const trips = uniqueRanks.find(rank => rankCounts[rank] === 3);
      const pair = uniqueRanks.find(rank => rankCounts[rank] === 2);
      return { rank: 7, value: trips * 100 + pair, description: 'Full House' };
    }

    // Flush
    if (isFlush) {
      const value = ranks.reduce((sum, rank, i) => sum + rank * Math.pow(100, 4-i), 0);
      return { rank: 6, value, description: 'Flush' };
    }

    // Straight
    if (isStraight || isWheel) {
      const highCard = isWheel ? 5 : ranks[0];
      return { rank: 5, value: highCard, description: 'Straight' };
    }

    // Three of a kind
    if (counts[0] === 3) {
      const trips = uniqueRanks.find(rank => rankCounts[rank] === 3);
      const kickers = uniqueRanks.filter(rank => rankCounts[rank] === 1);
      const value = trips * 10000 + kickers[0] * 100 + kickers[1];
      return { rank: 4, value, description: 'Three of a Kind' };
    }

    // Two pair
    if (counts[0] === 2 && counts[1] === 2) {
      const pairs = uniqueRanks.filter(rank => rankCounts[rank] === 2);
      const kicker = uniqueRanks.find(rank => rankCounts[rank] === 1);
      const value = pairs[0] * 10000 + pairs[1] * 100 + kicker;
      return { rank: 3, value, description: 'Two Pair' };
    }

    // One pair
    if (counts[0] === 2) {
      const pair = uniqueRanks.find(rank => rankCounts[rank] === 2);
      const kickers = uniqueRanks.filter(rank => rankCounts[rank] === 1);
      const value = pair * 1000000 + kickers[0] * 10000 + kickers[1] * 100 + kickers[2];
      return { rank: 2, value, description: 'One Pair' };
    }

    // High card
    const value = ranks.reduce((sum, rank, i) => sum + rank * Math.pow(100, 4-i), 0);
    return { rank: 1, value, description: 'High Card' };
  }

  isStraight(ranks) {
    for (let i = 0; i < ranks.length - 1; i++) {
      if (ranks[i] - ranks[i + 1] !== 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get best 5-card hand from 7 cards (hole cards + community cards)
   */
  getBestHand(cards) {
    if (cards.length !== 7) {
      throw new Error('Must provide exactly 7 cards');
    }

    const combinations = this.getCombinations(cards, 5);
    let bestHand = null;
    let bestEval = null;

    combinations.forEach(combination => {
      const evaluation = this.evaluateHand(combination);
      if (!bestEval || evaluation.rank > bestEval.rank || 
          (evaluation.rank === bestEval.rank && evaluation.value > bestEval.value)) {
        bestHand = combination;
        bestEval = evaluation;
      }
    });

    return { hand: bestHand, evaluation: bestEval };
  }

  /**
   * Get all combinations of k cards from array
   */
  getCombinations(cards, k) {
    if (k === 1) return cards.map(card => [card]);
    if (k === cards.length) return [cards];
    
    const combinations = [];
    for (let i = 0; i <= cards.length - k; i++) {
      const head = cards[i];
      const tail = cards.slice(i + 1);
      const tailCombinations = this.getCombinations(tail, k - 1);
      tailCombinations.forEach(combination => {
        combinations.push([head, ...combination]);
      });
    }
    return combinations;
  }

  /**
   * Compare two hands - returns 1 if hand1 wins, -1 if hand2 wins, 0 if tie
   */
  compareHands(hand1, hand2) {
    const eval1 = this.evaluateHand(hand1);
    const eval2 = this.evaluateHand(hand2);

    if (eval1.rank > eval2.rank) return 1;
    if (eval1.rank < eval2.rank) return -1;
    if (eval1.value > eval2.value) return 1;
    if (eval1.value < eval2.value) return -1;
    return 0;
  }

  /**
   * Format hand for display
   */
  formatHand(cards, hideCards = false) {
    if (hideCards) {
      return cards.map(() => '[Hidden]').join(', ');
    }
    return cards.map(card => this.formatCard(card)).join(', ');
  }

  /**
   * Validate poker action
   */
  isValidAction(action) {
    return ['fold', 'check', 'call', 'raise', 'all-in'].includes(action);
  }

  /**
   * Get possible actions based on game state
   */
  getPossibleActions(gameState, playerIndex) {
    const player = gameState.players[playerIndex];
    const currentBet = gameState.currentBet;
    const playerBet = player.currentBet;
    const canCheck = currentBet === playerBet;
    const canCall = currentBet > playerBet && player.chips > 0;
    const canRaise = player.chips > (currentBet - playerBet);

    const actions = ['fold'];
    
    if (canCheck) {
      actions.push('check');
    }
    
    if (canCall) {
      actions.push('call');
    }
    
    if (canRaise) {
      actions.push('raise');
    }
    
    if (player.chips > 0) {
      actions.push('all-in');
    }

    return actions;
  }
}

module.exports = TexasHoldemCardService;