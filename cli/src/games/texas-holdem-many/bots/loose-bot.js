const BotInterface = require('../../../bots/bot-interface');

class LooseBot extends BotInterface {
  constructor(name = 'loose-bot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
  }

  getDescription() {
    return 'Aggressive player that plays many hands and bets frequently';
  }

  getStrategy() {
    return 'Strategy: Plays loose-aggressive - many hands preflop, aggressive postflop';
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
    
    // Very loose preflop ranges
    if (handStrength >= 0.3) {
      // Play most hands aggressively
      if (possibleActions.includes('raise') && this.randomService.random() < 0.6) {
        const raiseAmount = Math.max(currentBet, gameState.bigBlind * 2);
        return { type: 'raise', amount: raiseAmount };
      }
      return { type: 'call' };
    }
    
    if (handStrength >= 0.1) {
      // Even weak hands - call if cheap
      if (callAmount < playerState.chips * 0.05) {
        return { type: 'call' };
      }
    }

    // Still fold some hands
    if (possibleActions.includes('check')) {
      return { type: 'check' };
    }
    
    return { type: 'fold' };
  }

  makePostflopDecision(gameState) {
    const { communityCards, playerState, currentBet, possibleActions, pot } = gameState;
    const allCards = [...playerState.holeCards, ...communityCards];
    const callAmount = currentBet - playerState.currentBet;
    
    // Aggressive postflop play
    if (allCards.length >= 5) {
      const handStrength = this.evaluatePostflopHand(allCards);
      
      if (handStrength >= 0.4) {
        // Bet/raise with medium+ hands
        if (possibleActions.includes('raise') && this.randomService.random() < 0.7) {
          const raiseAmount = Math.max(currentBet, pot * 0.7);
          return { type: 'raise', amount: raiseAmount };
        }
        return { type: 'call' };
      }
      
      if (handStrength >= 0.2) {
        // Bluff sometimes with weak hands
        if (possibleActions.includes('raise') && this.randomService.random() < 0.3) {
          return { type: 'raise', amount: currentBet };
        }
        
        if (possibleActions.includes('check')) {
          return { type: 'check' };
        }
        
        // Call light sometimes
        if (callAmount < playerState.chips * 0.15) {
          return { type: 'call' };
        }
      }
    }

    // Drawing hands - call more often
    if (this.hasDrawingPotential(allCards)) {
      if (possibleActions.includes('check')) {
        return { type: 'check' };
      }
      if (callAmount < playerState.chips * 0.2) {
        return { type: 'call' };
      }
    }

    // Default aggressive play
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
    
    // Much looser ranges than tight bot
    if (rank1 === rank2) {
      if (rank1 >= 13) return 0.9; // AA, KK, QQ
      if (rank1 >= 8) return 0.8; // JJ down to 88
      return 0.6; // Any pair
    }
    
    const high = Math.max(rank1, rank2);
    const low = Math.min(rank1, rank2);
    const gap = high - low;
    
    if (suited) {
      if (high >= 10) return 0.7; // Any suited broadway
      if (gap <= 2) return 0.6; // Suited connectors and 1-gappers
      if (high >= 8) return 0.5; // Medium suited cards
      return 0.4; // Any suited
    } else {
      if (high >= 13 && low >= 10) return 0.7; // Big offsuit
      if (high >= 11) return 0.5; // Any jack or better
      if (gap <= 1 && high >= 8) return 0.4; // Connectors
      return 0.2; // Even weak offsuit hands
    }
  }

  evaluatePostflopHand(allCards) {
    if (allCards.length < 5) return 0.3;
    
    const ranks = allCards.map(card => card.value);
    const suits = allCards.map(card => card.suit);
    
    // Check for pairs, flushes, straights, etc.
    const rankCounts = {};
    ranks.forEach(rank => {
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    if (counts[0] >= 4) return 0.95; // Four of a kind
    if (counts[0] >= 3 && counts[1] >= 2) return 0.9; // Full house
    if (counts[0] >= 3) return 0.8; // Three of a kind
    if (counts[0] >= 2 && counts[1] >= 2) return 0.7; // Two pair
    if (counts[0] >= 2) return 0.5; // One pair
    
    // Check for flush
    const suitCounts = {};
    suits.forEach(suit => {
      suitCounts[suit] = (suitCounts[suit] || 0) + 1;
    });
    
    if (Math.max(...Object.values(suitCounts)) >= 5) return 0.8; // Flush
    
    // High card hands still get some value in loose play
    const highCard = Math.max(...ranks);
    if (highCard >= 13) return 0.3; // Ace high
    if (highCard >= 11) return 0.2; // Jack high or better
    
    return 0.1; // Even low cards have some value
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
    for (let i = 0; i < ranks.length - 3; i++) {
      if (ranks[i + 3] - ranks[i] <= 4) return true;
    }
    
    return false;
  }
}

module.exports = LooseBot;