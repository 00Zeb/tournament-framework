class TexasHoldemGame {
  constructor(cardService, players) {
    this.cardService = cardService;
    this.players = players;
    this.gameState = this.initializeGame();
  }

  initializeGame() {
    // Create multiple decks for long tournaments
    let combinedDeck = [];
    for (let i = 0; i < 3; i++) {
      combinedDeck = combinedDeck.concat(this.cardService.createDeck());
    }
    const deck = this.cardService.shuffleDeck(combinedDeck);

    return {
      deck,
      communityCards: [],
      pot: 0,
      currentBet: 0,
      players: this.players.map((player, index) => ({
        ...player,
        chips: 1000, // Starting chips (reset each hand)
        startingChips: 1000, // Base chip amount for rebuys
        holeCards: [],
        currentBet: 0,
        folded: false,
        allIn: false,
        position: index,
        handsWon: 0,
        handsLost: 0,
        handsTied: 0,
        totalWinnings: 0,
        disqualifications: 0
      })),
      dealerPosition: 0,
      currentPlayerIndex: 0,
      gamePhase: 'preflop', // preflop, flop, turn, river, showdown
      bettingRound: 1,
      smallBlind: 50,
      bigBlind: 100,
      // Betting limits for structured play
      smallBet: 100, // Betting unit for preflop and flop
      bigBet: 200,   // Betting unit for turn and river (2x small bet)
      maxRaisesPerRound: 3, // Maximum raises per betting round
      handCount: 1,
      maxHands: 10,
      gameOver: false,
      history: [],
      handResults: []
    };
  }

  getCurrentPlayer() {
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  async playFullGame() {
    const results = [];
    
    console.log(`Starting full game with ${this.players.length} players...`);
    
    while (!this.isGameOver()) {
      console.log(`Playing hand ${this.gameState.handCount}...`);
      const handResult = await this.playHand();
      results.push(handResult);
      console.log(`Hand ${this.gameState.handCount} completed.`);
    }
    
    console.log(`Game over after ${results.length} hands.`);
    
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

    // Reset for new hand
    this.resetForNewHand();

    // Post blinds
    this.postBlinds();

    // Deal hole cards
    this.dealHoleCards();

    // Play betting rounds
    await this.playBettingRound('preflop');
    
    if (this.getActivePlayers().length > 1) {
      this.dealFlop();
      await this.playBettingRound('flop');
    }
    
    if (this.getActivePlayers().length > 1) {
      this.dealTurn();
      await this.playBettingRound('turn');
    }
    
    if (this.getActivePlayers().length > 1) {
      this.dealRiver();
      await this.playBettingRound('river');
    }

    // Showdown
    const handResult = this.showdown();
    this.gameState.handResults.push(handResult);

    // Move dealer button
    this.gameState.dealerPosition = (this.gameState.dealerPosition + 1) % this.players.length;
    this.gameState.handCount++;

    return handResult;
  }

  resetForNewHand() {
    // Remove players with no chips (traditional elimination)
    this.gameState.players = this.gameState.players.filter(player => player.chips > 0);

    if (this.gameState.players.length < 2) {
      this.endGame();
      return;
    }

    // Reset hand-specific states
    this.gameState.players.forEach(player => {
      player.holeCards = [];
      player.currentBet = 0;
      player.folded = false;
      player.allIn = false;
    });

    this.gameState.communityCards = [];
    this.gameState.pot = 0;
    this.gameState.currentBet = 0;
    this.gameState.gamePhase = 'preflop';
    this.gameState.bettingRound = 1;
    this.gameState.raisesThisRound = 0; // Track raises for limit enforcement
  }

  postBlinds() {
    const playersCount = this.gameState.players.length;
    const smallBlindIndex = (this.gameState.dealerPosition + 1) % playersCount;
    const bigBlindIndex = (this.gameState.dealerPosition + 2) % playersCount;

    const smallBlindPlayer = this.gameState.players[smallBlindIndex];
    const bigBlindPlayer = this.gameState.players[bigBlindIndex];

    // Post small blind
    const smallBlindAmount = Math.min(this.gameState.smallBlind, smallBlindPlayer.chips);
    smallBlindPlayer.chips -= smallBlindAmount;
    smallBlindPlayer.currentBet = smallBlindAmount;
    this.gameState.pot += smallBlindAmount;

    // Post big blind
    const bigBlindAmount = Math.min(this.gameState.bigBlind, bigBlindPlayer.chips);
    bigBlindPlayer.chips -= bigBlindAmount;
    bigBlindPlayer.currentBet = bigBlindAmount;
    this.gameState.pot += bigBlindAmount;
    this.gameState.currentBet = bigBlindAmount;

    // Set first player to act (after big blind)
    this.gameState.currentPlayerIndex = (bigBlindIndex + 1) % playersCount;
  }

  dealHoleCards() {
    // Deal 2 cards to each player
    for (let i = 0; i < 2; i++) {
      this.gameState.players.forEach(player => {
        player.holeCards.push(this.cardService.dealCard(this.gameState.deck));
      });
    }
  }

  dealFlop() {
    // Burn one card
    this.cardService.dealCard(this.gameState.deck);
    
    // Deal 3 community cards
    for (let i = 0; i < 3; i++) {
      this.gameState.communityCards.push(this.cardService.dealCard(this.gameState.deck));
    }
    this.gameState.gamePhase = 'flop';
  }

  dealTurn() {
    // Burn one card
    this.cardService.dealCard(this.gameState.deck);
    
    // Deal 1 community card
    this.gameState.communityCards.push(this.cardService.dealCard(this.gameState.deck));
    this.gameState.gamePhase = 'turn';
  }

  dealRiver() {
    // Burn one card
    this.cardService.dealCard(this.gameState.deck);
    
    // Deal 1 community card
    this.gameState.communityCards.push(this.cardService.dealCard(this.gameState.deck));
    this.gameState.gamePhase = 'river';
  }

  async playBettingRound(phase) {
    console.log(`Starting betting round: ${phase}`);
    this.gameState.gamePhase = phase;
    this.gameState.raisesThisRound = 0; // Reset raise counter for each betting round

    // Reset current bets for new round (except preflop with blinds)
    if (phase !== 'preflop') {
      this.gameState.currentBet = 0;
      this.gameState.players.forEach(player => {
        player.currentBet = 0;
      });
      // First player to act is after dealer
      this.gameState.currentPlayerIndex = (this.gameState.dealerPosition + 1) % this.gameState.players.length;
    }

    // Check if all active players are all-in before starting betting
    const activePlayers = this.getActivePlayers();
    const allInPlayers = activePlayers.filter(p => p.allIn);
    if (allInPlayers.length === activePlayers.length) {
      console.log(`All active players are all-in, skipping betting round`);
      return;
    }

    let actionsThisRound = 0;
    let lastRaiseIndex = -1;
    let maxActions = this.gameState.players.length * 10; // Safeguard against infinite loops
    let playersToAct = new Set(activePlayers.filter(p => !p.allIn).map(p => p.name));

    console.log(`Starting betting loop with max ${maxActions} actions...`);

    while (actionsThisRound < maxActions) {
      const player = this.getCurrentPlayer();

      // Skip folded players and all-in players
      if (player.folded || player.allIn) {
        this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
        continue;
      }

      console.log(`Action ${actionsThisRound + 1}: ${player.name} to act`);

      const gameStateForPlayer = this.getGameStateForPlayer();
      let action;
      let isDisqualified = false;
      let disqualificationReason = null;

      try {
        action = await player.bot.makeMove(gameStateForPlayer);
      } catch (error) {
        isDisqualified = true;
        disqualificationReason = `Bot crashed during makeMove(): ${error.message}`;
        action = { type: 'fold' };
      }

      if (!isDisqualified && !this.isValidAction(action)) {
        isDisqualified = true;
        disqualificationReason = `Invalid action returned: ${JSON.stringify(action)}`;
        action = { type: 'fold' };
      }

      if (isDisqualified) {
        player.disqualifications++;
        action = { type: 'fold' };
      }

      console.log(`${player.name} action: ${JSON.stringify(action)}`);

      // Process action
      this.processAction(player, action);
      actionsThisRound++;

      // Remove player from players to act if they've acted
      playersToAct.delete(player.name);

      // Check if betting round is complete
      const currentActivePlayers = this.getActivePlayers();
      console.log(`Active players: ${currentActivePlayers.length}`);
      if (currentActivePlayers.length <= 1) {
        console.log(`Betting round ending - only ${currentActivePlayers.length} active players`);
        break;
      }

      // Check if all remaining active players are all-in
      const remainingNonAllInPlayers = currentActivePlayers.filter(p => !p.allIn);
      if (remainingNonAllInPlayers.length === 0) {
        console.log(`Betting round ending - all remaining players are all-in`);
        break;
      }

      // Check if all players have acted and bets are equal
      const roundComplete = this.isBettingRoundComplete();
      console.log(`Betting round complete: ${roundComplete}`);
      if (roundComplete) {
        console.log(`Betting round ending - all bets equal`);
        break;
      }

      this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
    }

    // If we reach here, we hit the max actions limit
    if (actionsThisRound >= maxActions) {
      console.warn(`Warning: Betting round reached maximum actions limit (${maxActions}). Forcing end of betting round.`);
    }
  }

  processAction(player, action) {
    const callAmount = this.gameState.currentBet - player.currentBet;

    switch (action.type) {
      case 'fold':
        player.folded = true;
        break;

      case 'check':
        if (callAmount > 0) {
          // Invalid check, treat as fold
          player.folded = true;
        }
        break;

      case 'call':
        const actualCallAmount = Math.min(callAmount, player.chips);
        player.chips -= actualCallAmount;
        player.currentBet += actualCallAmount;
        this.gameState.pot += actualCallAmount;
        
        if (player.chips === 0) {
          player.allIn = true;
        }
        break;

      case 'raise':
        const betSize = this.getCurrentBetSize();
        const totalBet = this.gameState.currentBet + betSize;
        const playerContribution = Math.min(totalBet - player.currentBet, player.chips);

        player.chips -= playerContribution;
        player.currentBet += playerContribution;
        this.gameState.pot += playerContribution;
        this.gameState.currentBet = player.currentBet;
        this.gameState.raisesThisRound++;

        if (player.chips === 0) {
          player.allIn = true;
        }
        break;
    }
  }

  isValidAction(action) {
    if (!action || typeof action !== 'object' || !action.type) {
      return false;
    }

    const validTypes = ['fold', 'check', 'call', 'raise'];
    if (!validTypes.includes(action.type)) {
      return false;
    }

    // Validate raise amounts for limit hold'em
    if (action.type === 'raise') {
      const currentBetSize = this.getCurrentBetSize();
      const maxRaises = this.gameState.maxRaisesPerRound;

      // Check if max raises exceeded
      if (this.gameState.raisesThisRound >= maxRaises) {
        console.log(`Raise rejected: Max raises (${maxRaises}) exceeded`);
        return false;
      }

      // Check if raise amount is exactly one bet size
      if (action.amount !== currentBetSize) {
        console.log(`Raise rejected: Amount ${action.amount} must be exactly ${currentBetSize}`);
        return false;
      }
    }

    return true;
  }

  getCurrentBetSize() {
    // Small bet for preflop and flop, big bet for turn and river
    if (this.gameState.gamePhase === 'preflop' || this.gameState.gamePhase === 'flop') {
      return this.gameState.smallBet;
    } else {
      return this.gameState.bigBet;
    }
  }

  isBettingRoundComplete() {
    const activePlayers = this.getActivePlayers();

    if (activePlayers.length === 0) {
      return true;
    }

    // If all active players are all-in, betting is complete
    if (activePlayers.every(player => player.allIn)) {
      console.log(`isBettingRoundComplete: All players are all-in`);
      return true;
    }

    // If only one player is not all-in and there's no bet to call, betting is complete
    const nonAllInPlayers = activePlayers.filter(p => !p.allIn);
    if (nonAllInPlayers.length === 1 && this.gameState.currentBet === 0) {
      console.log(`isBettingRoundComplete: Only one non-all-in player with no bet to call`);
      return true;
    }

    // All active players have same bet amount (or are all-in)
    const maxBet = Math.max(...activePlayers.map(p => p.currentBet));
    const result = activePlayers.every(player =>
      player.currentBet === maxBet || player.allIn
    );

    // Debug output
    console.log(`isBettingRoundComplete: activePlayers=${activePlayers.length}, maxBet=${maxBet}`);
    activePlayers.forEach(player => {
      console.log(`  ${player.name}: currentBet=${player.currentBet}, allIn=${player.allIn}`);
    });
    console.log(`  Result: ${result}`);

    return result;
  }

  getActivePlayers() {
    return this.gameState.players.filter(player => !player.folded);
  }

  showdown() {
    const activePlayers = this.getActivePlayers();
    const allPlayers = this.gameState.players; // Include folded players in scoring

    if (activePlayers.length === 1) {
      // Only one player left, they win
      const winner = activePlayers[0];
      winner.chips += this.gameState.pot;
      winner.totalWinnings += this.gameState.pot;
      winner.handsWon++;

      // Mark all other players as having lost this hand
      allPlayers.forEach(player => {
        if (player !== winner) {
          player.handsLost++;
        }
      });

      return {
        handNumber: this.gameState.handCount,
        winners: [winner.name],
        winnings: { [winner.name]: this.gameState.pot },
        communityCards: this.gameState.communityCards,
        hands: {}
      };
    }

    // Multiple players - evaluate hands
    const playerHands = {};
    const handEvaluations = {};

    activePlayers.forEach(player => {
      const allCards = [...player.holeCards, ...this.gameState.communityCards];
      const bestHand = this.cardService.getBestHand(allCards);
      playerHands[player.name] = bestHand.hand;
      handEvaluations[player.name] = bestHand.evaluation;
    });

    // Find winner(s)
    const sortedPlayers = activePlayers.sort((a, b) => {
      const evalA = handEvaluations[a.name];
      const evalB = handEvaluations[b.name];

      if (evalA.rank !== evalB.rank) {
        return evalB.rank - evalA.rank;
      }
      return evalB.value - evalA.value;
    });

    // Check for ties
    const winners = [];
    const winningEval = handEvaluations[sortedPlayers[0].name];

    for (const player of sortedPlayers) {
      const evaluation = handEvaluations[player.name];
      if (evaluation.rank === winningEval.rank && evaluation.value === winningEval.value) {
        winners.push(player);
      } else {
        break;
      }
    }

    // Distribute pot
    const winnings = {};
    const potShare = Math.floor(this.gameState.pot / winners.length);

    winners.forEach(winner => {
      winner.chips += potShare;
      winner.totalWinnings += potShare;
      winnings[winner.name] = potShare;
    });

    // Track hand outcomes for statistics
    if (winners.length === 1) {
      // Single winner
      winners[0].handsWon++;
      allPlayers.forEach(player => {
        if (!winners.includes(player)) {
          player.handsLost++;
        }
      });
    } else {
      // Multiple winners (tie)
      winners.forEach(winner => {
        winner.handsTied++;
      });
      allPlayers.forEach(player => {
        if (!winners.includes(player)) {
          player.handsLost++;
        }
      });
    }


    return {
      handNumber: this.gameState.handCount,
      winners: winners.map(w => w.name),
      winnings,
      communityCards: this.gameState.communityCards,
      hands: playerHands
    };
  }

  getGameStateForPlayer() {
    const currentPlayer = this.getCurrentPlayer();
    return {
      gamePhase: this.gameState.gamePhase,
      communityCards: this.gameState.communityCards,
      pot: this.gameState.pot,
      currentBet: this.gameState.currentBet,
      smallBlind: this.gameState.smallBlind,
      bigBlind: this.gameState.bigBlind,
      handCount: this.gameState.handCount,
      playerState: {
        chips: currentPlayer.chips,
        holeCards: currentPlayer.holeCards,
        currentBet: currentPlayer.currentBet,
        position: currentPlayer.position
      },
      opponents: this.gameState.players
        .filter(p => p !== currentPlayer)
        .map(p => ({
          name: p.name,
          chips: p.chips,
          currentBet: p.currentBet,
          folded: p.folded,
          allIn: p.allIn,
          position: p.position
        })),
      possibleActions: this.cardService.getPossibleActions(this.gameState, this.gameState.currentPlayerIndex)
    };
  }


  isGameOver() {
    return this.gameState.gameOver || this.gameState.handCount > this.gameState.maxHands;
  }

  endGame() {
    this.gameState.gameOver = true;
  }

  getGameResult() {
    // Sort players by chips (descending) for final ranking
    const sortedPlayers = [...this.gameState.players].sort((a, b) => b.chips - a.chips);

    return {
      gameOver: true,
      winner: sortedPlayers[0]?.name || 'No winner',
      players: sortedPlayers.map((player, index) => ({
        name: player.name,
        score: player.chips, // Use chips as score for tournament ranking
        finalChips: player.chips,
        position: index + 1,
        totalWinnings: player.totalWinnings,
        disqualifications: player.disqualifications,
        // Hand-level statistics for tournament tracking
        handsWon: player.handsWon,
        handsLost: player.handsLost,
        handsTied: player.handsTied,
        // Fields expected by tournament framework
        roundWins: player.handsWon,
        roundLosses: player.handsLost,
        roundTies: player.handsTied
      }))
    };
  }
}

module.exports = TexasHoldemGame;