const HigherLowerGame = require('./game');
const CardService = require('./card-service');
const SmartBot = require('./bots/smart-bot');
const CountingBot = require('./bots/counting-bot');

module.exports = {
  Game: HigherLowerGame,
  CardService,
  bots: {
    SmartBot,
    CountingBot
  },
  gameType: 'higher-lower',
  name: 'Higher or Lower',
  description: 'A card guessing game where players predict if the next card will be higher or lower',
  
  // Factory function to create a game instance
  createGame(dependencies, players) {
    const cardService = new CardService(dependencies.randomService);
    return new HigherLowerGame(cardService, players);
  },
  
  // Get available bots for this game
  getAvailableBots() {
    return [
      { name: 'SmartBot', class: SmartBot, description: 'Uses basic strategy based on card probabilities' },
      { name: 'CountingBot', class: CountingBot, description: 'Counts cards and calculates probabilities' }
    ];
  }
};