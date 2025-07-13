class BlackjackGame {
  constructor(cardService, players) {
    this.cardService = cardService;
    this.players = players;
    this.gameState = this.initializeGame();
  }

  initializeGame() {
    // Calculate needed cards: players * 2 (initial) + estimated hits per hand * maxHands
    // Conservative estimate: each player averages 1 additional card per hand
    const estimatedCardsPerHand = this.players.length * 3; // 2 initial + 1 average hit
    const neededCards = estimatedCardsPerHand * 100; // 100 hands
    const decksNeeded = Math.max(1, Math.ceil(neededCards / 52));
    
    // Create multiple decks if needed
    let combinedDeck = [];
    for (let i = 0; i < decksNeeded; i++) {
      combinedDeck = combinedDeck.concat(this.cardService.createDeck());
    }
    
    const deck = this.cardService.shuffleDeck(combinedDeck);
    
    return {
      deck,
      players: this.players.map(player => ({
        ...player,
        hand: [],
        bet: 10, // Fixed bet for tournament play
        score: 0,
        handsPlayed: 0,
        handsWon: 0,
        handsLost: 0,
        handsTied: 0,
        blackjacks: 0,
        busts: 0,
        disqualifications: 0,
        isBank: player.name === 'bank-bot'
      })),
      bankPlayer: null,
      currentPlayerIndex: 0,
      currentHandIndex: 0,
      gamePhase: 'dealing', // dealing, playing, bank-turn, complete
      handCount: 1,
      maxHands: 100,
      gameOver: false,
      winner: null,
      history: []
    };
  }

  getCurrentPlayer() {
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  async playFullGame() {
    const results = [];
    
    // Find and set bank player
    const bankIndex = this.gameState.players.findIndex(p => p.isBank);
    if (bankIndex === -1) {
      throw new Error('Bank bot not found. Ensure a player named "bank-bot" exists.');
    }
    this.gameState.bankPlayer = this.gameState.players[bankIndex];
    
    while (!this.isGameOver()) {
      const handResult = await this.playHand();
      results.push(handResult);
    }
    
    return {
      roundResults: results,
      gameResult: this.getGameResult()
    };
  }

  async playHand() {
    if (this.gameState.gameOver) {
      throw new Error('Game is already over');
    }

    if (this.gameState.deck.length < 10) {
      this.endGame();
      return this.getGameResult();
    }

    // Reset all players for new hand
    this.gameState.players.forEach(player => {
      player.hand = [];
      player.currentAction = null;
      player.isStanding = false;
      player.isBust = false;
      player.isBlackjack = false;
    });

    this.gameState.gamePhase = 'dealing';
    this.gameState.currentPlayerIndex = 0;

    // Deal initial cards
    await this.dealInitialCards();

    // Players take turns
    this.gameState.gamePhase = 'playing';
    await this.playersPhase();

    // Bank plays
    this.gameState.gamePhase = 'bank-turn';
    await this.bankPhase();

    // Evaluate hand
    const handResult = this.evaluateHand();
    this.gameState.history.push(handResult);
    
    this.gameState.handCount++;
    if (this.gameState.handCount > this.gameState.maxHands) {
      this.endGame();
    }

    return handResult;
  }

  async dealInitialCards() {
    // Deal 2 cards to each player (including bank)
    for (let cardNum = 0; cardNum < 2; cardNum++) {
      for (const player of this.gameState.players) {
        const card = this.cardService.dealCard(this.gameState.deck);
        player.hand.push(card);
      }
    }

    // Check for blackjacks
    this.gameState.players.forEach(player => {
      if (this.cardService.isBlackjack(player.hand)) {
        player.isBlackjack = true;
      }
    });
  }

  async playersPhase() {
    // Non-bank players play first
    const nonBankPlayers = this.gameState.players.filter(p => !p.isBank);
    
    for (let i = 0; i < nonBankPlayers.length; i++) {
      this.gameState.currentPlayerIndex = this.gameState.players.indexOf(nonBankPlayers[i]);
      await this.playPlayerTurn(nonBankPlayers[i]);
    }
  }

  async playPlayerTurn(player) {
    // Skip if player has blackjack
    if (player.isBlackjack) {
      player.isStanding = true;
      return;
    }

    while (!player.isStanding && !player.isBust) {
      const gameStateForPlayer = this.getGameStateForPlayer();
      
      let action;
      let isDisqualified = false;
      let disqualificationReason = null;
      
      try {
        action = await player.bot.makeMove(gameStateForPlayer);
      } catch (error) {
        isDisqualified = true;
        disqualificationReason = `Bot crashed during makeMove(): ${error.message}`;
        action = 'stand'; // Safe fallback
      }

      if (!isDisqualified && !this.cardService.isValidAction(action)) {
        isDisqualified = true;
        disqualificationReason = `Invalid action returned: '${action}'. Must be 'hit', 'stand', 'double', or 'split'`;
        action = 'stand'; // Safe fallback
      }

      if (isDisqualified) {
        player.disqualifications++;
        player.isStanding = true;
        player.isBust = true; // Treat as bust for scoring
        break;
      }

      await this.processPlayerAction(player, action);
    }
  }

  async processPlayerAction(player, action) {
    player.currentAction = action;

    switch (action) {
      case 'hit':
        const card = this.cardService.dealCard(this.gameState.deck);
        player.hand.push(card);
        
        if (this.cardService.isBust(player.hand)) {
          player.isBust = true;
          player.isStanding = true;
        }
        break;

      case 'stand':
        player.isStanding = true;
        break;

      case 'double':
        // Can only double with exactly 2 cards
        if (player.hand.length === 2) {
          player.bet *= 2;
          const doubleCard = this.cardService.dealCard(this.gameState.deck);
          player.hand.push(doubleCard);
          
          if (this.cardService.isBust(player.hand)) {
            player.isBust = true;
          }
          player.isStanding = true;
        } else {
          // Invalid double, treat as stand
          player.isStanding = true;
        }
        break;

      case 'split':
        // For simplicity in tournament play, treat split as hit
        // (Full split implementation would require multiple hands per player)
        const splitCard = this.cardService.dealCard(this.gameState.deck);
        player.hand.push(splitCard);
        
        if (this.cardService.isBust(player.hand)) {
          player.isBust = true;
          player.isStanding = true;
        }
        break;
    }
  }

  async bankPhase() {
    const bankPlayer = this.gameState.bankPlayer;
    
    // Bank follows standard rules: hit on 16 or less, stand on 17 or more
    while (this.cardService.calculateHandValue(bankPlayer.hand) < 17) {
      const card = this.cardService.dealCard(this.gameState.deck);
      bankPlayer.hand.push(card);
    }

    if (this.cardService.isBust(bankPlayer.hand)) {
      bankPlayer.isBust = true;
    }
  }

  evaluateHand() {
    const bankPlayer = this.gameState.bankPlayer;
    const bankValue = this.cardService.calculateHandValue(bankPlayer.hand);
    const bankBust = bankPlayer.isBust;
    
    const results = [];

    this.gameState.players.forEach(player => {
      if (player.isBank) return; // Skip bank in results

      const playerValue = this.cardService.calculateHandValue(player.hand);
      let result = 'loss';
      let winnings = -player.bet;

      player.handsPlayed++;

      // Determine outcome
      if (player.isBust || player.disqualifications > 0) {
        result = 'loss';
        player.handsLost++;
        player.busts++;
      } else if (player.isBlackjack && !this.cardService.isBlackjack(bankPlayer.hand)) {
        result = 'blackjack';
        winnings = player.bet * 1.5; // 3:2 payout
        player.handsWon++;
        player.blackjacks++;
      } else if (bankBust && !player.isBust) {
        result = 'win';
        winnings = player.bet;
        player.handsWon++;
      } else if (playerValue > bankValue) {
        result = 'win';
        winnings = player.bet;
        player.handsWon++;
      } else if (playerValue === bankValue) {
        result = 'tie';
        winnings = 0; // Push
        player.handsTied++;
      } else {
        result = 'loss';
        player.handsLost++;
      }

      player.score += winnings;

      results.push({
        hand: this.gameState.handCount,
        player: player.name,
        playerHand: [...player.hand],
        playerValue: playerValue,
        bankHand: [...bankPlayer.hand],
        bankValue: bankValue,
        action: player.currentAction,
        result: result,
        winnings: winnings,
        isBlackjack: player.isBlackjack,
        isBust: player.isBust,
        disqualified: player.disqualifications > 0
      });
    });

    return {
      hand: this.gameState.handCount,
      bankHand: [...bankPlayer.hand],
      bankValue: bankValue,
      bankBust: bankBust,
      results: results
    };
  }

  getGameStateForPlayer() {
    const currentPlayer = this.getCurrentPlayer();
    const bankPlayer = this.gameState.bankPlayer;
    
    return {
      hand: this.gameState.handCount,
      maxHands: this.gameState.maxHands,
      gamePhase: this.gameState.gamePhase,
      cardsLeft: this.gameState.deck.length,
      playerHand: [...currentPlayer.hand],
      playerValue: this.cardService.calculateHandValue(currentPlayer.hand),
      bankUpCard: bankPlayer && bankPlayer.hand.length > 0 ? bankPlayer.hand[1] : null, // Second card is up card
      possibleActions: this.cardService.getPossibleActions(currentPlayer.hand),
      players: this.gameState.players.map(player => ({
        name: player.name,
        score: player.score,
        handsPlayed: player.handsPlayed,
        handsWon: player.handsWon,
        handsLost: player.handsLost,
        handsTied: player.handsTied,
        blackjacks: player.blackjacks,
        busts: player.busts,
        disqualifications: player.disqualifications,
        isBank: player.isBank
      }))
    };
  }

  endGame() {
    this.gameState.gameOver = true;
    
    // Find winner based on total score
    const nonBankPlayers = this.gameState.players.filter(p => !p.isBank);
    const maxScore = Math.max(...nonBankPlayers.map(p => p.score));
    const winners = nonBankPlayers.filter(p => p.score === maxScore);
    
    if (winners.length === 1) {
      this.gameState.winner = winners[0];
    } else {
      this.gameState.winner = this.resolveTie(winners);
    }
  }

  resolveTie(tiedPlayers) {
    // First tiebreaker: most hands won
    const maxWins = Math.max(...tiedPlayers.map(p => p.handsWon));
    const winWinners = tiedPlayers.filter(p => p.handsWon === maxWins);
    
    if (winWinners.length === 1) {
      return winWinners[0];
    }

    // Second tiebreaker: most blackjacks
    const maxBlackjacks = Math.max(...winWinners.map(p => p.blackjacks));
    const blackjackWinners = winWinners.filter(p => p.blackjacks === maxBlackjacks);
    
    if (blackjackWinners.length === 1) {
      return blackjackWinners[0];
    }

    // Third tiebreaker: fewest busts
    const minBusts = Math.min(...blackjackWinners.map(p => p.busts));
    const finalWinners = blackjackWinners.filter(p => p.busts === minBusts);
    
    return finalWinners[0];
  }

  getGameResult() {
    return {
      gameOver: this.gameState.gameOver,
      winner: this.gameState.winner,
      players: this.gameState.players.filter(p => !p.isBank).map(player => ({
        name: player.name,
        score: player.score,
        handsPlayed: player.handsPlayed,
        handsWon: player.handsWon,
        handsLost: player.handsLost,
        handsTied: player.handsTied,
        blackjacks: player.blackjacks,
        busts: player.busts,
        disqualifications: player.disqualifications,
        // Map to tournament expected format for free-for-all
        roundWins: player.handsWon,
        roundLosses: player.handsLost,
        roundTies: player.handsTied
      })),
      totalHands: this.gameState.handCount - 1,
      history: this.gameState.history
    };
  }

  isGameOver() {
    return this.gameState.gameOver;
  }
}

module.exports = BlackjackGame;