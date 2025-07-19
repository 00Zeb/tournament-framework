const TexasHoldemGame = require('./game');
const TexasHoldemCardService = require('./card-service');
const TightBot = require('./bots/tight-bot');
const LooseBot = require('./bots/loose-bot');
const RandomBot = require('./bots/random-bot');
const BasicStrategyBot = require('./bots/basic-strategy-bot');

module.exports = {
  Game: TexasHoldemGame,
  CardService: TexasHoldemCardService,
  bots: {
    TightBot,
    LooseBot,
    RandomBot,
    BasicStrategyBot
  },
  gameType: 'texas-holdem-many',
  name: 'Texas Hold\'em Poker',
  description: 'Classic Texas Hold\'em poker where players compete in tournament format with blinds and betting rounds',
  
  // Factory function to create a game instance
  createGame(dependencies, players, actionRecorder = null) {
    const cardService = new TexasHoldemCardService(dependencies.randomService);
    return new TexasHoldemGame(cardService, players, actionRecorder);
  },
  
  // Get available bots for this game
  getAvailableBots() {
    return [
      { name: 'TightBot', class: TightBot, description: 'Conservative player that only plays strong hands' },
      { name: 'LooseBot', class: LooseBot, description: 'Aggressive player that plays many hands and bets frequently' },
      { name: 'RandomBot', class: RandomBot, description: 'Makes random decisions - useful for testing' },
      { name: 'BasicStrategyBot', class: BasicStrategyBot, description: 'Uses basic poker strategy with hand strength evaluation' }
    ];
  }
};