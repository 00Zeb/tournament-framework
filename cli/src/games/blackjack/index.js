const BlackjackGame = require('./game');
const BlackjackCardService = require('./card-service');
const BankBot = require('./bots/bank-bot');
const BasicStrategyBot = require('./bots/basic-strategy-bot');
const ConservativeBot = require('./bots/conservative-bot');
const AggressiveBot = require('./bots/aggressive-bot');

module.exports = {
  Game: BlackjackGame,
  CardService: BlackjackCardService,
  bots: {
    BankBot,
    BasicStrategyBot,
    ConservativeBot,
    AggressiveBot
  },
  gameType: 'blackjack',
  name: 'Blackjack',
  description: 'Classic casino blackjack where players compete against the bank to get closest to 21 without going over',
  
  // Factory function to create a game instance
  createGame(dependencies, players) {
    const cardService = new BlackjackCardService(dependencies.randomService);
    return new BlackjackGame(cardService, players);
  },
  
  // Get available bots for this game
  getAvailableBots() {
    return [
      { name: 'BankBot', class: BankBot, description: 'The bank that follows standard blackjack rules (hit on 16, stand on 17)' },
      { name: 'BasicStrategyBot', class: BasicStrategyBot, description: 'Uses mathematically optimal basic strategy' },
      { name: 'ConservativeBot', class: ConservativeBot, description: 'Plays conservatively, never doubles or splits' },
      { name: 'AggressiveBot', class: AggressiveBot, description: 'Takes more risks, doubles and hits more frequently' }
    ];
  }
};