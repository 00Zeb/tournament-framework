const BotInterface = require('../../../bots/bot-interface');

class BasicStrategyBot extends BotInterface {
  constructor(name = 'basic-strategy-bot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
  }

  getDescription() {
    return 'Uses basic poker strategy with hand strength evaluation';
  }

  getStrategy() {
    return 'Strategy: Solid fundamentals - plays good hands, folds bad ones, uses position';
  }

  async makeMove(gameState) {
    const { gamePhase, playerState, currentBet, possibleActions } = gameState;
    
    if (gamePhase === 'preflop') {
      return this.makePreflopDecision(gameState);
    } else {
      return this.makePostflopDecision(gameState);
    }
  }

  makePreflopDecision(gameState) {
    const { playerState, currentBet, possibleActions, opponents } = gameState;
    const hand = playerState.holeCards;
    const handStrength = this.evaluatePreflopHand(hand);
    const position = this.getPosition(playerState, opponents);
    const callAmount = currentBet - playerState.currentBet;
    
    // Adjust play based on position
    let threshold = 0.5; // Default threshold
    if (position === 'early') threshold = 0.7;
    if (position === 'late') threshold = 0.4;
    
    if (handStrength >= threshold + 0.2) {
      // Strong hands - raise
      if (possibleActions.includes('raise')) {
        const raiseAmount = Math.max(currentBet, gameState.bigBlind * 3);
        return { type: 'raise', amount: raiseAmount };
      }
      return { type: 'call' };
    }
    
    if (handStrength >= threshold) {
      // Playable hands - call
      if (callAmount < playerState.chips * 0.1) {
        return { type: 'call' };
      }
    }
    
    // Weak hands
    if (possibleActions.includes('check')) {
      return { type: 'check' };
    }
    
    return { type: 'fold' };
  }

  makePostflopDecision(gameState) {
    const { communityCards, playerState, currentBet, possibleActions, pot } = gameState;
    const allCards = [...playerState.holeCards, ...communityCards];
    const callAmount = currentBet - playerState.currentBet;
    
    if (allCards.length >= 5) {
      const handStrength = this.evaluatePostflopHand(allCards);
      const potOdds = callAmount / (pot + callAmount);
      
      if (handStrength >= 0.7) {
        // Strong hands - bet for value
        if (possibleActions.includes('raise')) {
          const raiseAmount = Math.max(currentBet, pot * 0.6);
          return { type: 'raise', amount: raiseAmount };
        }
        return { type: 'call' };
      }
      
      if (handStrength >= 0.4) {
        // Medium hands - call with good pot odds
        if (potOdds > 0.3) {
          return { type: 'call' };
        }
        if (possibleActions.includes('check')) {
          return { type: 'check' };
        }
      }
      
      if (handStrength >= 0.2) {
        // Weak hands - check/fold
        if (possibleActions.includes('check')) {
          return { type: 'check' };
        }
        if (potOdds > 0.5) {
          return { type: 'call' };
        }
      }
    }
    
    // Drawing hands
    if (this.hasDrawingPotential(allCards)) {
      const potOdds = callAmount / (pot + callAmount);
      if (potOdds > 0.25) { // Rough drawing odds
        return { type: 'call' };
      }
      if (possibleActions.includes('check')) {
        return { type: 'check' };
      }
    }

    // Default to fold
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
      return 0.5; // Small pairs
    }
    
    const high = Math.max(rank1, rank2);
    const low = Math.min(rank1, rank2);
    const gap = high - low;
    
    if (suited) {
      if (high >= 13 && low >= 10) return 0.8; // AK, AQ, KQ suited
      if (high >= 12 && low >= 9) return 0.7; // AJ, KJ, QJ suited
      if (gap <= 1 && high >= 8) return 0.6; // Suited connectors
      if (high >= 11) return 0.5; // Any jack+ suited
      return 0.3;
    } else {
      if (high >= 13 && low >= 12) return 0.7; // AK, AQ offsuit
      if (high >= 12 && low >= 10) return 0.5; // KQ, KJ offsuit
      if (gap <= 1 && high >= 9) return 0.4; // Connectors
      return 0.2;
    }
  }

  evaluatePostflopHand(allCards) {
    if (allCards.length < 5) return 0.3;
    
    const ranks = allCards.map(card => card.value);
    const suits = allCards.map(card => card.suit);
    
    // Count ranks
    const rankCounts = {};
    ranks.forEach(rank => {
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    // Hand rankings
    if (counts[0] >= 4) return 0.95; // Four of a kind
    if (counts[0] >= 3 && counts[1] >= 2) return 0.9; // Full house
    
    // Check for flush
    const suitCounts = {};
    suits.forEach(suit => {
      suitCounts[suit] = (suitCounts[suit] || 0) + 1;
    });
    
    const hasFlush = Math.max(...Object.values(suitCounts)) >= 5;
    
    // Check for straight
    const hasStraight = this.hasStraight(ranks);
    
    if (hasFlush && hasStraight) return 0.95; // Straight flush
    if (hasFlush) return 0.8; // Flush
    if (hasStraight) return 0.75; // Straight
    if (counts[0] >= 3) return 0.7; // Three of a kind
    if (counts[0] >= 2 && counts[1] >= 2) return 0.6; // Two pair
    if (counts[0] >= 2) return 0.4; // One pair
    
    // High card
    const highCard = Math.max(...ranks);
    if (highCard >= 13) return 0.25; // Ace high
    if (highCard >= 11) return 0.2; // Jack high or better
    
    return 0.1;
  }

  hasStraight(ranks) {
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
    
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      let consecutive = 1;
      for (let j = i + 1; j < uniqueRanks.length; j++) {
        if (uniqueRanks[j] === uniqueRanks[j - 1] + 1) {
          consecutive++;
          if (consecutive >= 5) return true;
        } else {
          break;
        }
      }
    }
    
    // Check for A-2-3-4-5 straight
    const hasAce = uniqueRanks.includes(14);
    const hasLowCards = uniqueRanks.includes(2) && uniqueRanks.includes(3) && 
                       uniqueRanks.includes(4) && uniqueRanks.includes(5);
    
    return hasAce && hasLowCards;
  }

  hasDrawingPotential(allCards) {
    if (allCards.length < 4) return false;
    
    const suits = allCards.map(card => card.suit);
    const ranks = allCards.map(card => card.value).sort((a, b) => a - b);
    
    // Check for flush draws
    const suitCounts = {};
    suits.forEach(suit => {
      suitCounts[suit] = (suitCounts[suit] || 0) + 1;
    });
    
    if (Math.max(...Object.values(suitCounts)) >= 4) return true;
    
    // Check for straight draws (simplified)
    const uniqueRanks = [...new Set(ranks)];
    for (let i = 0; i < uniqueRanks.length - 3; i++) {
      if (uniqueRanks[i + 3] - uniqueRanks[i] <= 4) return true;
    }
    
    return false;
  }

  getPosition(playerState, opponents) {
    const totalPlayers = opponents.length + 1;
    const position = playerState.position;
    
    if (position < totalPlayers / 3) return 'early';
    if (position < (totalPlayers * 2) / 3) return 'middle';
    return 'late';
  }
}

module.exports = BasicStrategyBot;