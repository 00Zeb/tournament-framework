const BotInterface = require('../../../bots/bot-interface');

class AggressiveBot extends BotInterface {
  constructor(name = 'aggressive-bot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
  }

  getDescription() {
    return 'Takes more risks, doubles and hits more frequently';
  }

  getStrategy() {
    return 'Strategy: Aggressive hitting and doubling, more risk-taking';
  }

  async makeMove(gameState) {
    const handValue = this.calculateHandValue(gameState.playerHand);
    const canDouble = gameState.playerHand.length === 2;
    
    // Aggressive strategy: take more risks
    if (handValue >= 19) {
      return 'stand';
    }
    
    // Try to double when possible with decent hands
    if (canDouble && handValue >= 9 && handValue <= 11) {
      return 'double';
    }
    
    // Hit more aggressively
    if (handValue <= 16) {
      return 'hit';
    }
    
    // Stand on 17-18
    return 'stand';
  }

  calculateHandValue(cards) {
    let value = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else if (['K', 'Q', 'J'].includes(card.rank)) {
        value += 10;
      } else {
        value += parseInt(card.rank);
      }
    }

    // Convert Aces from 11 to 1 if hand would bust
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }
}

module.exports = AggressiveBot;