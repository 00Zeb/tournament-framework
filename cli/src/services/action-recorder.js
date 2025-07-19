class ActionRecorder {
  constructor() {
    this.recording = null;
    this.currentHand = null;
    this.currentPhase = null;
  }

  startRecording(gameId, gameType, players) {
    this.recording = {
      gameId,
      gameType,
      timestamp: new Date().toISOString(),
      players: players.map(p => ({
        name: p.name,
        startingChips: p.chips || 1000
      })),
      hands: []
    };
  }

  startHand(handNumber, dealerPosition, blinds) {
    if (!this.recording) {
      throw new Error('Recording not started');
    }

    this.currentHand = {
      handNumber,
      dealerPosition,
      blinds,
      phases: [],
      result: null
    };

    this.recording.hands.push(this.currentHand);
  }

  startPhase(phase, communityCards = []) {
    if (!this.currentHand) {
      throw new Error('Hand not started');
    }

    this.currentPhase = {
      phase,
      communityCards: [...communityCards],
      actions: []
    };

    this.currentHand.phases.push(this.currentPhase);
  }

  recordAction(player, action, gameState) {
    if (!this.currentPhase) {
      throw new Error('Phase not started');
    }

    const actionRecord = {
      timestamp: new Date().toISOString(),
      player: player.name,
      action: action.type,
      chips: player.chips,
      position: player.position,
      pot: gameState.pot
    };

    // Add action-specific details
    switch (action.type) {
      case 'call':
        actionRecord.amount = gameState.currentBet - player.currentBet;
        break;
      case 'raise':
        actionRecord.amount = action.amount;
        actionRecord.newBet = gameState.currentBet;
        break;
      case 'fold':
      case 'check':
        // No additional amount needed
        break;
    }

    this.currentPhase.actions.push(actionRecord);
  }

  recordBlind(player, blindType, amount, gameState) {
    if (!this.currentPhase) {
      throw new Error('Phase not started');
    }

    this.currentPhase.actions.push({
      timestamp: new Date().toISOString(),
      player: player.name,
      action: blindType,
      amount,
      chips: player.chips,
      position: player.position,
      pot: gameState.pot
    });
  }

  recordDealing(cards, dealType) {
    if (!this.currentPhase) {
      throw new Error('Phase not started');
    }

    this.currentPhase.actions.push({
      timestamp: new Date().toISOString(),
      action: 'deal',
      dealType, // 'hole', 'flop', 'turn', 'river'
      cards: dealType === 'hole' ? '[hidden]' : cards
    });
  }

  recordHandResult(result) {
    if (!this.currentHand) {
      throw new Error('Hand not started');
    }

    this.currentHand.result = {
      ...result,
      timestamp: new Date().toISOString()
    };
  }

  recordDisqualification(player, reason) {
    if (!this.currentPhase) {
      throw new Error('Phase not started');
    }

    this.currentPhase.actions.push({
      timestamp: new Date().toISOString(),
      player: player.name,
      action: 'disqualified',
      reason,
      chips: player.chips,
      position: player.position
    });
  }

  getRecording() {
    if (!this.recording) {
      throw new Error('Recording not started');
    }

    return {
      ...this.recording,
      endTimestamp: new Date().toISOString()
    };
  }

  reset() {
    this.recording = null;
    this.currentHand = null;
    this.currentPhase = null;
  }
}

module.exports = ActionRecorder;