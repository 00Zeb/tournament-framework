class HigherLowerManyGame {
  constructor(cardService, players) {
    this.cardService = cardService;
    this.players = players;
    this.gameState = this.initializeGame();
  }

  initializeGame() {
    // Calculate needed cards: players * maxRounds + 1 for initial card
    const neededCards = this.players.length * 100 + 1;
    const decksNeeded = Math.ceil(neededCards / 52);
    
    // Create multiple decks if needed
    let combinedDeck = [];
    for (let i = 0; i < decksNeeded; i++) {
      combinedDeck = combinedDeck.concat(this.cardService.createDeck());
    }
    
    const deck = this.cardService.shuffleDeck(combinedDeck);
    const firstCard = this.cardService.dealCard(deck);
    
    return {
      deck,
      currentCard: firstCard,
      players: this.players.map(player => ({
        ...player,
        score: 1000, // Starting with 1000 base credits
        correctGuesses: 0,
        incorrectGuesses: 0,
        ties: 0,
        disqualifications: 0,
        roundWins: 0,
        roundLosses: 0,
        roundTies: 0
      })),
      currentPlayerIndex: 0,
      round: 1,
      maxRounds: 100,
      gameOver: false,
      winner: null,
      history: [],
      roundResults: [] // Track results for each round
    };
  }

  getCurrentPlayer() {
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  async playRound() {
    if (this.gameState.gameOver) {
      throw new Error('Game is already over');
    }

    if (this.gameState.deck.length === 0) {
      this.endGame();
      return this.getGameResult();
    }

    const currentPlayer = this.getCurrentPlayer();
    const gameStateForPlayer = this.getGameStateForPlayer();
    
    let guess;
    let isDisqualified = false;
    let disqualificationReason = null;
    
    try {
      guess = await currentPlayer.bot.makeMove(gameStateForPlayer);
    } catch (error) {
      isDisqualified = true;
      disqualificationReason = `Bot crashed during makeMove(): ${error.message}`;
      guess = 'higher'; // fallback for card dealing
    }

    if (!isDisqualified && !this.cardService.isValidGuess(guess)) {
      isDisqualified = true;
      disqualificationReason = `Invalid guess returned: '${guess}'. Must be 'higher' or 'lower'`;
      guess = 'higher'; // fallback for card dealing
    }

    const nextCard = this.cardService.dealCard(this.gameState.deck);
    let result;
    let roundScore;

    if (isDisqualified) {
      result = 'disqualified';
      roundScore = -2;
    } else {
      result = this.cardService.checkGuess(
        this.gameState.currentCard,
        nextCard,
        guess
      );
      roundScore = this.calculateRoundScore(result);
    }

    const turnResult = {
      round: this.gameState.round,
      player: currentPlayer.name,
      currentCard: { ...this.gameState.currentCard },
      nextCard: { ...nextCard },
      guess,
      result,
      roundScore,
      disqualified: isDisqualified,
      disqualificationReason: disqualificationReason
    };

    this.updatePlayerStats(currentPlayer, result);
    this.gameState.history.push(turnResult);
    
    // Store result for round evaluation
    if (!this.gameState.roundResults[this.gameState.round - 1]) {
      this.gameState.roundResults[this.gameState.round - 1] = [];
    }
    this.gameState.roundResults[this.gameState.round - 1].push({
      player: currentPlayer,
      result: result,
      roundScore: roundScore,
      disqualified: isDisqualified
    });

    this.gameState.currentCard = nextCard;
    this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.players.length;
    
    // When all players have played this round, evaluate round winners/losers
    if (this.gameState.currentPlayerIndex === 0) {
      this.evaluateRound(this.gameState.round - 1);
      this.gameState.round++;
    }

    if (this.gameState.round > this.gameState.maxRounds) {
      this.endGame();
    }

    return turnResult;
  }

  calculateRoundScore(result) {
    switch (result) {
      case 'correct': return 1;
      case 'tie': return 0;
      case 'incorrect': return -1;
      case 'disqualified': return -2;
      default: return 0;
    }
  }

  evaluateRound(roundIndex) {
    const roundResults = this.gameState.roundResults[roundIndex];
    if (!roundResults || roundResults.length === 0) return;

    // Find the best score in this round
    const bestRoundScore = Math.max(...roundResults.map(r => r.roundScore));
    
    // Determine winners, losers, and ties
    const winners = roundResults.filter(r => r.roundScore === bestRoundScore);
    const losers = roundResults.filter(r => r.roundScore < bestRoundScore);

    // Award tournament points (1000-credit system)
    winners.forEach(winner => {
      if (winners.length === 1) {
        // Single winner gets +100 credits
        winner.player.score += 100;
        winner.player.roundWins++;
      } else {
        // Multiple winners tie, get 0 points
        winner.player.roundTies++;
      }
    });

    losers.forEach(loser => {
      // Losers get -100 credits
      loser.player.score -= 100;
      loser.player.roundLosses++;
    });
  }

  updatePlayerStats(player, result) {
    switch (result) {
      case 'correct':
        player.correctGuesses++;
        break;
      case 'tie':
        player.ties++;
        break;
      case 'incorrect':
        player.incorrectGuesses++;
        break;
      case 'disqualified':
        player.disqualifications++;
        break;
    }
  }

  getGameStateForPlayer() {
    return {
      currentCard: { ...this.gameState.currentCard },
      round: this.gameState.round,
      maxRounds: this.gameState.maxRounds,
      cardsLeft: this.gameState.deck.length,
      players: this.gameState.players.map(player => ({
        name: player.name,
        score: player.score,
        correctGuesses: player.correctGuesses,
        incorrectGuesses: player.incorrectGuesses,
        ties: player.ties,
        disqualifications: player.disqualifications,
        roundWins: player.roundWins,
        roundLosses: player.roundLosses,
        roundTies: player.roundTies
      }))
    };
  }

  endGame() {
    this.gameState.gameOver = true;
    
    const maxScore = Math.max(...this.gameState.players.map(p => p.score));
    const winners = this.gameState.players.filter(p => p.score === maxScore);
    
    if (winners.length === 1) {
      this.gameState.winner = winners[0];
    } else {
      this.gameState.winner = this.resolveTie(winners);
    }
  }

  resolveTie(tiedPlayers) {
    // First tiebreaker: most round wins
    const maxRoundWins = Math.max(...tiedPlayers.map(p => p.roundWins));
    const roundWinWinners = tiedPlayers.filter(p => p.roundWins === maxRoundWins);
    
    if (roundWinWinners.length === 1) {
      return roundWinWinners[0];
    }

    // Second tiebreaker: fewest round losses
    const minRoundLosses = Math.min(...roundWinWinners.map(p => p.roundLosses));
    const finalWinners = roundWinWinners.filter(p => p.roundLosses === minRoundLosses);
    
    return finalWinners[0];
  }

  getGameResult() {
    return {
      gameOver: this.gameState.gameOver,
      winner: this.gameState.winner,
      players: this.gameState.players.map(player => ({
        name: player.name,
        score: player.score,
        correctGuesses: player.correctGuesses,
        incorrectGuesses: player.incorrectGuesses,
        ties: player.ties,
        disqualifications: player.disqualifications,
        roundWins: player.roundWins,
        roundLosses: player.roundLosses,
        roundTies: player.roundTies
      })),
      totalRounds: this.gameState.round - 1,
      history: this.gameState.history
    };
  }

  isGameOver() {
    return this.gameState.gameOver;
  }

  async playFullGame() {
    const results = [];
    
    while (!this.isGameOver()) {
      const roundResult = await this.playRound();
      results.push(roundResult);
    }
    
    return {
      roundResults: results,
      gameResult: this.getGameResult()
    };
  }
}

module.exports = HigherLowerManyGame;