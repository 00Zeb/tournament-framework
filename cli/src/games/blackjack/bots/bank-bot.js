const BotInterface = require('../../../bots/bot-interface');

class BankBot extends BotInterface {
  constructor(name = 'bank-bot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
  }

  getDescription() {
    return 'The bank that follows standard blackjack rules (hit on 16, stand on 17)';
  }

  getStrategy() {
    return 'Strategy: Hit on 16 or less, stand on 17 or more';
  }

  /**
   * Bank bot follows standard blackjack rules:
   * - Hit on 16 or less
   * - Stand on 17 or more (including soft 17)
   * 
   * Note: The actual bank logic is implemented in the game class
   * This bot will never actually be called for moves since the bank
   * plays automatically after all players are done
   */
  async makeMove(gameState) {
    // This should never be called for the bank bot
    // But if it is, follow standard bank rules
    const handValue = this.calculateHandValue(gameState.playerHand);
    
    if (handValue < 17) {
      return 'hit';
    } else {
      return 'stand';
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

module.exports = BankBot;