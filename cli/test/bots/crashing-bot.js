const BotInterface = require('../../src/bots/bot-interface');

class CrashingBot extends BotInterface {
  constructor(name = 'CrashingBot', dependencies = {}) {
    super(name, dependencies);
    this.crashCount = 0;
  }

  async makeMove(gameState) {
    this.validateGameState(gameState);
    
    // Crash every other move
    this.crashCount++;
    if (this.crashCount % 2 === 0) {
      throw new Error('Bot intentionally crashed for testing');
    }
    
    // When not crashing, make a reasonable guess
    return gameState.currentCard.value <= 6 ? 'higher' : 'lower';
  }

  getDescription() {
    return 'A bot that crashes every other move (for testing disqualification)';
  }

  getStrategy() {
    return 'Strategy: Crash every other turn to test error handling';
  }
}

module.exports = CrashingBot;