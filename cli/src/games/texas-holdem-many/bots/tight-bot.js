const BotInterface = require('../../../bots/bot-interface');

class TightBot extends BotInterface {
  constructor(name = 'tight-bot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
  }

  getDescription() {
    return 'Conservative player that only plays strong hands';
  }

  getStrategy() {
    return 'Strategy: Plays tight - only premium hands preflop, cautious postflop';
  }

  async makeMove(gameState) {
    const { gamePhase, playerState, currentBet, possibleActions } = gameState;
    
    if (gamePhase === 'preflop') {
      return this.makePreflopDecision(playerState, currentBet, possibleActions, gameState);
    } else {
      return this.makePostflopDecision(gameState);
    }
  }

  makePreflopDecision(playerState, currentBet, possibleActions, gameState) {
    const hand = playerState.holeCards;
    const handStrength = this.evaluatePreflopHand(hand);
    const callAmount = currentBet - playerState.currentBet;
    const potOdds = callAmount / (gameState.pot + callAmount);

    // Very tight preflop ranges
    if (handStrength >= 0.8) {
      // Premium hands - raise or call
      if (possibleActions.includes('raise') && this.randomService.random() < 0.7) {
        return { type: 'raise', amount: currentBet * 2 };
      }
      return { type: 'call' };
    }
    
    if (handStrength >= 0.6) {
      // Good hands - call if price is right
      if (potOdds < 0.3) {
        return { type: 'call' };
      }
    }

    // Weak hands - fold or check
    if (possibleActions.includes('check')) {
      return { type: 'check' };
    }
    
    return { type: 'fold' };
  }

  makePostflopDecision(gameState) {
    const { communityCards, playerState, currentBet, possibleActions } = gameState;
    const allCards = [...playerState.holeCards, ...communityCards];
    
    // Simple postflop strategy - need strong hands to continue
    if (allCards.length >= 5) {
      // Can evaluate actual hand strength
      const handStrength = this.evaluatePostflopHand(allCards);
      
      if (handStrength >= 0.7) {
        if (possibleActions.includes('raise')) {
          return { type: 'raise', amount: currentBet };
        }
        return { type: 'call' };
      }
      
      if (handStrength >= 0.4) {
        if (possibleActions.includes('check')) {
          return { type: 'check' };
        }
        if (currentBet - playerState.currentBet < playerState.chips * 0.1) {
          return { type: 'call' };
        }
      }
    }

    // Default to conservative play
    if (possibleActions.includes('check')) {
      return { type: 'check' };
    }
    
    return { type: 'fold' };
  }

  evaluatePreflopHand(hand) {
    if (hand.length !== 2) return 0;
    
    const [card1, card2] = hand;
    const rank1 = card1.value;
    const rank2 = card2.value;
    const suited = card1.suit === card2.suit;
    
    // Pocket pairs
    if (rank1 === rank2) {
      if (rank1 >= 13) return 0.9; // AA, KK, QQ
      if (rank1 >= 10) return 0.8; // JJ, TT, 99
      if (rank1 >= 7) return 0.6; // 88, 77
      return 0.4; // Small pairs
    }
    
    // Suited connectors and high cards
    const high = Math.max(rank1, rank2);
    const low = Math.min(rank1, rank2);
    const gap = high - low;
    
    if (suited) {
      if (high >= 13 && low >= 10) return 0.8; // AK, AQ, KQ suited
      if (high >= 12 && low >= 9) return 0.6; // AJ, KJ, QJ suited
      if (gap <= 1 && high >= 8) return 0.5; // Suited connectors
      return 0.3;
    } else {
      if (high >= 13 && low >= 12) return 0.7; // AK, AQ offsuit
      if (high >= 12 && low >= 10) return 0.5; // KQ, KJ offsuit
      return 0.2;
    }
  }

  evaluatePostflopHand(allCards) {
    // Simple hand strength evaluation
    // In a real implementation, this would use the card service
    // For now, return a simplified evaluation
    
    if (allCards.length < 5) return 0.3;
    
    // Check for pairs, flushes, straights, etc.
    const ranks = allCards.map(card => card.value);
    const suits = allCards.map(card => card.suit);
    
    // Check for pair
    const rankCounts = {};
    ranks.forEach(rank => {
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    if (counts[0] >= 4) return 0.95; // Four of a kind
    if (counts[0] >= 3 && counts[1] >= 2) return 0.9; // Full house
    if (counts[0] >= 3) return 0.7; // Three of a kind
    if (counts[0] >= 2 && counts[1] >= 2) return 0.6; // Two pair
    if (counts[0] >= 2) return 0.4; // One pair
    
    // Check for flush
    const suitCounts = {};
    suits.forEach(suit => {
      suitCounts[suit] = (suitCounts[suit] || 0) + 1;
    });
    
    if (Math.max(...Object.values(suitCounts)) >= 5) return 0.8; // Flush
    
    return 0.2; // High card
  }
}

module.exports = TightBot;