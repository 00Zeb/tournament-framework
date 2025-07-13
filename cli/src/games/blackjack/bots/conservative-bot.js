const BotInterface = require('../../../bots/bot-interface');

class ConservativeBot extends BotInterface {
  constructor(name = 'conservative-bot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
  }

  getDescription() {
    return 'Plays conservatively, never doubles or splits';
  }

  getStrategy() {
    return 'Strategy: Stand on 17+, hit below 17, never double or split';
  }

  async makeMove(gameState) {
    const handValue = this.calculateHandValue(gameState.playerHand);
    
    // Conservative strategy: stand on 17+, hit below 17
    // Never double or split to minimize risk
    if (handValue >= 17) {
      return 'stand';
    } else {
      return 'hit';
    }
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

module.exports = ConservativeBot;