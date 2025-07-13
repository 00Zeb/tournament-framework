const BotInterface = require('../../../bots/bot-interface');

class BasicStrategyBot extends BotInterface {
  constructor(name = 'basic-strategy-bot', dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
  }

  getDescription() {
    return 'Uses mathematically optimal basic strategy';
  }

  getStrategy() {
    return 'Strategy: Follows optimal basic strategy charts for all decisions';
  }

  async makeMove(gameState) {
    const handValue = this.calculateHandValue(gameState.playerHand);
    const isSoft = this.isSoftHand(gameState.playerHand);
    const bankUpCard = gameState.bankUpCard;
    const bankUpValue = bankUpCard ? this.getCardValue(bankUpCard.rank) : 10; // Assume 10 if no up card
    
    // Basic Strategy Logic
    return this.getBasicStrategyAction(handValue, isSoft, bankUpValue, gameState.playerHand.length === 2);
  }

  getBasicStrategyAction(handValue, isSoft, bankUpValue, canDouble) {
    // Handle pairs (simplified - treat as hard totals for now)
    
    if (isSoft) {
      // Soft hand strategy
      if (handValue >= 19) return 'stand';
      if (handValue === 18) {
        if ([2, 3, 4, 5, 6].includes(bankUpValue)) return canDouble ? 'double' : 'stand';
        if ([7, 8].includes(bankUpValue)) return 'stand';
        return 'hit';
      }
      if (handValue === 17) {
        if ([3, 4, 5, 6].includes(bankUpValue)) return canDouble ? 'double' : 'hit';
        return 'hit';
      }
      if (handValue >= 15) {
        if ([4, 5, 6].includes(bankUpValue)) return canDouble ? 'double' : 'hit';
        return 'hit';
      }
      if (handValue >= 13) {
        if ([5, 6].includes(bankUpValue)) return canDouble ? 'double' : 'hit';
        return 'hit';
      }
      return 'hit';
    } else {
      // Hard hand strategy
      if (handValue >= 17) return 'stand';
      if (handValue >= 13) {
        return [2, 3, 4, 5, 6].includes(bankUpValue) ? 'stand' : 'hit';
      }
      if (handValue === 12) {
        return [4, 5, 6].includes(bankUpValue) ? 'stand' : 'hit';
      }
      if (handValue === 11) {
        return canDouble ? 'double' : 'hit';
      }
      if (handValue === 10) {
        return (canDouble && bankUpValue !== 10 && bankUpValue !== 11) ? 'double' : 'hit';
      }
      if (handValue === 9) {
        return (canDouble && [3, 4, 5, 6].includes(bankUpValue)) ? 'double' : 'hit';
      }
      return 'hit';
    }
  }

  calculateHandValue(cards) {
    let value = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += this.getCardValue(card.rank);
      }
    }

    // Convert Aces from 11 to 1 if hand would bust
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }

  isSoftHand(cards) {
    let value = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += this.getCardValue(card.rank);
      }
    }

    // If we have aces and the hand value is <= 21, it's soft
    return aces > 0 && value <= 21;
  }

  getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(rank)) return 10;
    return parseInt(rank);
  }
}

module.exports = BasicStrategyBot;