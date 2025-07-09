const BotInterface = require('./bot-interface');

class CountingBot extends BotInterface {
  constructor(name = 'CountingBot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
    this.seenCards = [];
    
    if (!this.randomService) {
      throw new Error('CountingBot requires randomService dependency');
    }
  }

  async makeMove(gameState) {
    this.validateGameState(gameState);
    
    const currentValue = gameState.currentCard.value;
    this.seenCards.push(currentValue);
    
    const remainingCards = this.calculateRemainingCards();
    const higherCount = remainingCards.filter(value => value > currentValue).length;
    const lowerCount = remainingCards.filter(value => value < currentValue).length;
    
    if (higherCount > lowerCount) {
      return 'higher';
    } else if (lowerCount > higherCount) {
      return 'lower';
    } else {
      return this.randomService.chance(0.5) ? 'higher' : 'lower';
    }
  }

  calculateRemainingCards() {
    const allCards = [];
    for (let value = 1; value <= 13; value++) {
      for (let suit = 0; suit < 4; suit++) {
        allCards.push(value);
      }
    }
    
    const remaining = [...allCards];
    for (const seenValue of this.seenCards) {
      const index = remaining.indexOf(seenValue);
      if (index !== -1) {
        remaining.splice(index, 1);
      }
    }
    
    return remaining;
  }

  onGameStart(gameInfo) {
    this.seenCards = [];
  }

  getDescription() {
    return 'A bot that counts cards and calculates probabilities';
  }

  getStrategy() {
    return 'Strategy: Track seen cards and guess based on remaining card probabilities';
  }
}

module.exports = CountingBot;