const path = require('path');
const fs = require('fs');

class GameRegistry {
  constructor() {
    this.games = new Map();
    this.loadAvailableGames();
  }

  loadAvailableGames() {
    // Load all available games from the games directory
    const gamesDir = path.join(__dirname);
    const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== '.' && entry.name !== '..') {
        try {
          const gameIndexPath = path.join(gamesDir, entry.name, 'index.js');
          if (fs.existsSync(gameIndexPath)) {
            const gameModule = require(gameIndexPath);
            if (gameModule.gameType && gameModule.createGame) {
              this.games.set(gameModule.gameType, gameModule);
            }
          }
        } catch (error) {
          console.warn(`Failed to load game ${entry.name}:`, error.message);
        }
      }
    }
  }

  getGame(gameType) {
    const game = this.games.get(gameType);
    if (!game) {
      throw new Error(`Game type '${gameType}' not found. Available games: ${this.getAvailableGameTypes().join(', ')}`);
    }
    return game;
  }

  getAvailableGameTypes() {
    return Array.from(this.games.keys());
  }

  getAvailableGames() {
    return Array.from(this.games.values()).map(game => ({
      gameType: game.gameType,
      name: game.name,
      description: game.description
    }));
  }

  createGame(gameType, dependencies, players) {
    const gameModule = this.getGame(gameType);
    return gameModule.createGame(dependencies, players);
  }

  getGameBots(gameType) {
    const gameModule = this.getGame(gameType);
    return gameModule.getAvailableBots ? gameModule.getAvailableBots() : [];
  }

  isValidGameType(gameType) {
    return this.games.has(gameType);
  }
}

// Export a singleton instance
module.exports = new GameRegistry();