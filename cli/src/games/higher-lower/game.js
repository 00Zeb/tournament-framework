class HigherLowerGame {
  constructor(cardService, players) {
    this.cardService = cardService;
    this.players = players;
    this.gameState = this.initializeGame();
  }

  initializeGame() {
    const deck = this.cardService.shuffleDeck(this.cardService.createDeck());
    const firstCard = this.cardService.dealCard(deck);
    
    return {
      deck,
      currentCard: firstCard,
      players: this.players.map(player => ({
        ...player,
        score: 0,
        correctGuesses: 0,
        incorrectGuesses: 0,
        ties: 0,
        disqualifications: 0
      })),
      currentPlayerIndex: 0,
      round: 1,
      maxRounds: 10,
      gameOver: false,
      winner: null,
      history: []
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
    let score;

    if (isDisqualified) {
      result = 'disqualified';
      score = this.calculateScore(result);
    } else {
      result = this.cardService.checkGuess(
        this.gameState.currentCard,
        nextCard,
        guess
      );
      score = this.calculateScore(result);
    }

    const roundResult = {
      round: this.gameState.round,
      player: currentPlayer.name,
      currentCard: { ...this.gameState.currentCard },
      nextCard: { ...nextCard },
      guess,
      result,
      score,
      disqualified: isDisqualified,
      disqualificationReason: disqualificationReason
    };

    this.updatePlayerStats(currentPlayer, result, roundResult.score);
    this.gameState.history.push(roundResult);
    this.gameState.currentCard = nextCard;
    this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.players.length;
    
    if (this.gameState.currentPlayerIndex === 0) {
      this.gameState.round++;
    }

    if (this.gameState.round > this.gameState.maxRounds) {
      this.endGame();
    }

    return roundResult;
  }

  calculateScore(result) {
    switch (result) {
      case 'correct': return 1;
      case 'tie': return 0;
      case 'incorrect': return -1;
      case 'disqualified': return -2; // Penalty for disqualification
      default: return 0;
    }
  }

  updatePlayerStats(player, result, score) {
    player.score += score;
    
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
        disqualifications: player.disqualifications
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
    const maxCorrect = Math.max(...tiedPlayers.map(p => p.correctGuesses));
    const correctWinners = tiedPlayers.filter(p => p.correctGuesses === maxCorrect);
    
    if (correctWinners.length === 1) {
      return correctWinners[0];
    }

    const minIncorrect = Math.min(...correctWinners.map(p => p.incorrectGuesses));
    const finalWinners = correctWinners.filter(p => p.incorrectGuesses === minIncorrect);
    
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
        disqualifications: player.disqualifications
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

module.exports = HigherLowerGame;