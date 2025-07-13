const HigherLowerManyGame = require('./game');
const CardService = require('./card-service');
const SmartBot = require('./bots/smart-bot');
const CountingBot = require('./bots/counting-bot');

module.exports = {
  Game: HigherLowerManyGame,
  CardService,
  bots: {
    SmartBot,
    CountingBot
  },
  gameType: 'higher-lower-many',
  name: 'Higher or Lower (Many Players)',
  description: 'A card guessing game where multiple players compete in rounds, with winners and losers determined each round',
  
  // Factory function to create a game instance
  createGame(dependencies, players) {
    const cardService = new CardService(dependencies.randomService);
    return new HigherLowerManyGame(cardService, players);
  },
  
  // Get available bots for this game
  getAvailableBots() {
    return [
      { name: 'SmartBot', class: SmartBot, description: 'Uses basic strategy based on card probabilities' },
      { name: 'CountingBot', class: CountingBot, description: 'Counts cards and calculates probabilities' }
    ];
  }
};