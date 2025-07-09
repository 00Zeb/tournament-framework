const BotInterface = require('../src/bots/bot-interface');

class SmartBot extends BotInterface {
  constructor(name = 'SmartBot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
    
    if (!this.randomService) {
      throw new Error('SmartBot requires randomService dependency');
    }
  }

  async makeMove(gameState) {
    this.validateGameState(gameState);
    
    const currentValue = gameState.currentCard.value;
    
    if (currentValue <= 6) {
      return 'higher';
    } else if (currentValue >= 8) {
      return 'lower';
    } else {
      return this.randomService.chance(0.5) ? 'higher' : 'lower';
    }
  }

  getDescription() {
    return 'A bot that uses basic strategy based on card probabilities';
  }

  getStrategy() {
    return 'Strategy: Guess higher for cards 1-6, lower for cards 8-13, random for 7';
  }
}

module.exports = SmartBot;