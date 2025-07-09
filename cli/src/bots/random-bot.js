const BotInterface = require('./bot-interface');

class RandomBot extends BotInterface {
  constructor(name = 'RandomBot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
    
    if (!this.randomService) {
      throw new Error('RandomBot requires randomService dependency');
    }
  }

  async makeMove(gameState) {
    this.validateGameState(gameState);
    
    return this.randomService.chance(0.5) ? 'higher' : 'lower';
  }

  getDescription() {
    return 'A bot that makes random guesses between higher and lower';
  }

  getStrategy() {
    return 'Random: 50% chance of guessing higher, 50% chance of guessing lower';
  }
}

module.exports = RandomBot;