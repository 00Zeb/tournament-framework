class BotInterface {
  constructor(name, dependencies = {}) {
    this.name = name;
    this.dependencies = dependencies;
  }

  async makeMove(gameState) {
    throw new Error('makeMove method must be implemented by subclass');
  }

  getName() {
    return this.name;
  }

  getDescription() {
    return 'A bot that plays Higher or Lower';
  }

  getStrategy() {
    return 'No strategy specified';
  }

  onGameStart(gameInfo) {
  }

  onGameEnd(gameResult) {
  }

  onRoundEnd(roundResult) {
  }

  validateGameState(gameState) {
    const required = ['currentCard', 'round', 'maxRounds', 'cardsLeft', 'players'];
    
    for (const field of required) {
      if (!(field in gameState)) {
        throw new Error(`Missing required field in game state: ${field}`);
      }
    }

    if (!gameState.currentCard.suit || !gameState.currentCard.rank || !gameState.currentCard.value) {
      throw new Error('Invalid current card in game state');
    }

    if (!Array.isArray(gameState.players)) {
      throw new Error('Players must be an array');
    }

    return true;
  }

  static createBot(botClass, name, dependencies) {
    return new botClass(name, dependencies);
  }
}

module.exports = BotInterface;