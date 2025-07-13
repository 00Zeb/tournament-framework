const BotInterface = require('../../src/bots/bot-interface');

class InvalidGuessBot extends BotInterface {
  constructor(name = 'InvalidGuessBot', dependencies = {}) {
    super(name, dependencies);
    this.moveCount = 0;
  }

  async makeMove(gameState) {
    this.validateGameState(gameState);
    
    this.moveCount++;
    
    // Return invalid guesses to test validation
    const invalidGuesses = ['up', 'down', 'maybe', 42, null, undefined, '', 'HIGHER'];
    
    if (this.moveCount <= invalidGuesses.length) {
      return invalidGuesses[this.moveCount - 1];
    }
    
    // After exhausting invalid guesses, return valid ones
    return gameState.currentCard.value <= 6 ? 'higher' : 'lower';
  }

  getDescription() {
    return 'A bot that returns invalid guesses (for testing validation)';
  }

  getStrategy() {
    return 'Strategy: Return invalid values to test input validation';
  }
}

module.exports = InvalidGuessBot;