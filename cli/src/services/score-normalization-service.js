/**
 * Score Normalization Service
 * 
 * Provides unified scoring normalization for all games in the tournament framework.
 * All games normalize their scores to a range of [-1.0, +1.0] where:
 * - +1.0 = Perfect performance (maximum possible score)
 * - 0.0 = Neutral/average performance 
 * - -1.0 = Worst performance (maximum penalty)
 * 
 * This allows fair comparison and ranking across different game types.
 */
class ScoreNormalizationService {
  constructor() {
    this.strategies = {
      'higher-lower': this.normalizeHigherLower.bind(this),
      'higher-lower-many': this.normalizeHigherLowerMany.bind(this),
      'blackjack': this.normalizeBlackjack.bind(this),
      'texas-holdem-many': this.normalizeTexasHoldem.bind(this)
    };
  }

  /**
   * Normalize a game result to the [-1.0, +1.0] range
   * @param {string} gameType - The type of game
   * @param {Object} playerResult - The player's result from the game
   * @param {Object} gameContext - Additional context about the game (optional)
   * @returns {number} Normalized score in [-1.0, +1.0] range OR raw score for override games
   */
  normalizeScore(gameType, playerResult, gameContext = {}) {
    // Check if this game type uses raw scores instead of normalization
    if (this.usesRawScores(gameType)) {
      return this.getRawScore(gameType, playerResult, gameContext);
    }
    
    const strategy = this.strategies[gameType];
    if (!strategy) {
      throw new Error(`No normalization strategy found for game type: ${gameType}`);
    }
    
    const normalizedScore = strategy(playerResult, gameContext);
    
    // Ensure score is within bounds for normalized games
    return Math.max(-1.0, Math.min(1.0, normalizedScore));
  }

  /**
   * Higher-Lower (Round-robin) normalization
   * Raw scores: Total score across all rounds (typically 10 rounds)
   * Each round: +1 correct, 0 tie, -1 incorrect, -2 disqualified
   * Normalize to [-1.0, +1.0]
   */
  normalizeHigherLower(playerResult, gameContext) {
    const { score, disqualifications } = playerResult;
    
    // If player was disqualified, return worst possible score
    if (disqualifications > 0) {
      return -1.0;
    }
    
    // Higher-Lower game plays 10 rounds by default
    // Best case: 10 correct guesses = 10 points
    // Worst case: 10 disqualifications = -20 points
    // Average case: 0 points (mix of correct/incorrect)
    const maxRounds = 10;
    const maxScore = maxRounds * 1; // All correct
    const minScore = maxRounds * -2; // All disqualified
    
    // Normalize score to [-1.0, +1.0]
    if (score >= 0) {
      // Positive scores: map [0, maxScore] to [0, +1.0]
      return Math.min(1.0, score / maxScore);
    } else {
      // Negative scores: map [minScore, 0] to [-1.0, 0]
      return Math.max(-1.0, score / Math.abs(minScore));
    }
  }

  /**
   * Higher-Lower-Many (Free-for-all) normalization
   * Based on round wins, losses, and ties over multiple rounds
   */
  normalizeHigherLowerMany(playerResult, gameContext) {
    const { roundWins, roundLosses, roundTies, disqualifications } = playerResult;
    
    // If player was disqualified, return worst possible score
    if (disqualifications > 0) {
      return -1.0;
    }
    
    const totalRounds = roundWins + roundLosses + roundTies;
    
    // If no rounds played, return neutral score
    if (totalRounds === 0) {
      return 0.0;
    }
    
    // Calculate win rate and adjust for ties
    // Wins count as +1, ties as 0, losses as -1
    const score = (roundWins - roundLosses) / totalRounds;
    
    // Score already ranges from -1.0 to +1.0
    return score;
  }

  /**
   * Blackjack normalization
   * Based on chip winnings/losses per hand
   */
  normalizeBlackjack(playerResult, gameContext) {
    const { 
      score, // Total winnings/losses (blackjack uses 'score' field)
      handsPlayed, 
      disqualifications,
      busts
    } = playerResult;
    
    // If player was disqualified, return worst possible score
    if (disqualifications > 0) {
      return -1.0;
    }
    
    // If no hands played, return neutral score
    if (handsPlayed === 0) {
      return 0.0;
    }
    
    // Calculate average winnings per hand
    const avgWinningsPerHand = score / handsPlayed;
    
    // In blackjack:
    // - Best case: Blackjack every hand = +$15 per hand
    // - Worst case: Bust every hand = -$10 per hand
    // - Neutral: Break even = $0 per hand
    const maxWinPerHand = 15; // Blackjack payout
    const maxLossPerHand = -10; // Standard bet loss
    
    // Normalize to [-1.0, +1.0] range
    if (avgWinningsPerHand >= 0) {
      // Positive winnings: map [0, +15] to [0, +1.0]
      return Math.min(1.0, avgWinningsPerHand / maxWinPerHand);
    } else {
      // Negative winnings: map [-10, 0] to [-1.0, 0]
      return Math.max(-1.0, avgWinningsPerHand / Math.abs(maxLossPerHand));
    }
  }

  /**
   * Texas Hold'em normalization
   * Based on chip performance relative to starting chips
   */
  normalizeTexasHoldem(playerResult, gameContext) {
    const { 
      score, // This is the final chip count
      disqualifications 
    } = playerResult;
    
    // If player was disqualified, return worst possible score
    if (disqualifications > 0) {
      return -1.0;
    }
    
    // Players start with 1000 chips
    const startingChips = 1000;
    
    // Calculate chip performance
    const chipChange = score - startingChips;
    
    // In a typical poker game:
    // - Excellent performance: 3x starting chips (2000 profit)
    // - Good performance: 1.5x starting chips (500 profit)
    // - Neutral: Break even (0 profit)
    // - Poor performance: Lose half (-500 loss)
    // - Terrible performance: Lose all (-1000 loss)
    
    // Normalize based on chip change
    if (chipChange >= 0) {
      // Positive performance: map [0, +2000] to [0, +1.0]
      // Use diminishing returns for very high profits
      const maxReasonableProfit = 2000;
      return Math.min(1.0, chipChange / maxReasonableProfit);
    } else {
      // Negative performance: map [-1000, 0] to [-1.0, 0]
      const maxLoss = -1000;
      return Math.max(-1.0, chipChange / Math.abs(maxLoss));
    }
  }

  /**
   * Check if a game type uses raw scores instead of normalization
   */
  usesRawScores(gameType) {
    const rawScoreGames = ['blackjack', 'texas-holdem-many', 'higher-lower', 'higher-lower-many'];
    return rawScoreGames.includes(gameType);
  }

  /**
   * Get raw score for games that don't use normalization
   */
  getRawScore(gameType, playerResult, gameContext) {
    switch (gameType) {
      case 'blackjack':
        // Return total chip winnings/losses directly
        return playerResult.score || 0;
      
      case 'texas-holdem-many':
        // Return final chip count directly
        return playerResult.score || 0;
      
      case 'higher-lower':
        // Return total points directly (no normalization)
        return playerResult.score || 0;
      
      case 'higher-lower-many':
        // Return total win/loss score directly (no normalization)
        return playerResult.score || 0;
      
      default:
        throw new Error(`Raw score not implemented for game type: ${gameType}`);
    }
  }

  /**
   * Get all supported game types
   */
  getSupportedGameTypes() {
    return Object.keys(this.strategies);
  }

  /**
   * Check if a game type is supported
   */
  isGameTypeSupported(gameType) {
    return this.strategies.hasOwnProperty(gameType);
  }
}

module.exports = ScoreNormalizationService;