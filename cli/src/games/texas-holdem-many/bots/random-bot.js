const BotInterface = require('../../../bots/bot-interface');

class RandomBot extends BotInterface {
  constructor(name = 'random-bot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
  }

  getDescription() {
    return 'Makes random decisions - useful for testing';
  }

  getStrategy() {
    return 'Strategy: Completely random actions based on available options';
  }

  async makeMove(gameState) {
    const { possibleActions, playerState, currentBet, pot } = gameState;
    
    if (!possibleActions || possibleActions.length === 0) {
      return { type: 'fold' };
    }

    // Remove fold from options sometimes to make more interesting
    let availableActions = [...possibleActions];
    if (availableActions.length > 1 && this.randomService.random() < 0.3) {
      availableActions = availableActions.filter(action => action !== 'fold');
    }

    const action = this.randomService.pick(availableActions);
    
    switch (action) {
      case 'fold':
        return { type: 'fold' };
        
      case 'check':
        return { type: 'check' };
        
      case 'call':
        return { type: 'call' };
        
      case 'raise':
        // Random raise amount
        const minRaise = Math.max(currentBet, gameState.bigBlind);
        const maxRaise = Math.min(playerState.chips, pot * 2);
        const raiseAmount = this.randomService.randomInt(minRaise, maxRaise);
        return { type: 'raise', amount: raiseAmount };
        
      case 'all-in':
        return { type: 'all-in' };
        
      default:
        return { type: 'fold' };
    }
  }
}

module.exports = RandomBot;