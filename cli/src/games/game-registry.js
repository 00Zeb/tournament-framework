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

  /**
   * Discover all available bots for a specific game type
   * Scans both game-specific bots directory and generic bots directory
   * Avoids duplicates by preferring game-specific bots over generic ones
   */
  async discoverBots(gameType) {
    const gameModule = this.getGame(gameType);
    const discoveredBots = [];
    const botNames = new Set(); // Track bot names to avoid duplicates

    // 1. Get game-specific bots from the game's bots directory (higher priority)
    const gameBotsDir = path.join(__dirname, gameType, 'bots');
    if (fs.existsSync(gameBotsDir)) {
      const gameBots = await this._scanBotsDirectory(gameBotsDir, `game-specific (${gameType})`);
      gameBots.forEach(bot => {
        discoveredBots.push(bot);
        botNames.add(bot.name);
      });
    }

    // 2. Get generic bots from the main bots directory (only if not already found)
    const genericBotsDir = path.join(__dirname, '../../bots');
    if (fs.existsSync(genericBotsDir)) {
      const genericBots = await this._scanBotsDirectory(genericBotsDir, 'generic');
      genericBots.forEach(bot => {
        if (!botNames.has(bot.name)) {
          discoveredBots.push(bot);
          botNames.add(bot.name);
        }
      });
    }

    return discoveredBots;
  }

  /**
   * Scan a directory for bot files and return bot metadata
   */
  async _scanBotsDirectory(botsDir, source) {
    const bots = [];
    
    try {
      const entries = fs.readdirSync(botsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.js')) {
          const botPath = path.join(botsDir, entry.name);
          const botName = path.basename(entry.name, '.js');
          
          try {
            // Validate that the file exports a valid bot class
            const BotClass = require(botPath);
            
            // Check if it's a valid bot (has required methods)
            if (typeof BotClass === 'function' && this._isValidBotClass(BotClass)) {
              bots.push({
                name: botName,
                path: botPath,
                source: source,
                className: BotClass.name || botName,
                description: this._getBotDescription(BotClass)
              });
            } else {
              console.warn(`Bot ${entry.name} failed validation: Invalid bot class structure`);
            }
          } catch (error) {
            console.warn(`Failed to load bot ${entry.name}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan bots directory ${botsDir}: ${error.message}`);
    }

    return bots;
  }

  /**
   * Validate that a bot class follows the proper interface
   */
  _isValidBotClass(BotClass) {
    try {
      // Check if it's a constructor function
      if (typeof BotClass !== 'function') {
        return false;
      }

      // Try to create an instance with minimal dependencies
      const mockDependencies = {
        randomService: { chance: () => true, shuffle: (arr) => arr },
        fileService: {}
      };
      
      const instance = new BotClass('test', mockDependencies);
      
      // Check if it has the required makeMove method
      if (typeof instance.makeMove !== 'function') {
        return false;
      }

      // Check if it has basic bot interface methods
      if (typeof instance.getName !== 'function' || 
          typeof instance.getDescription !== 'function') {
        return false;
      }

      return true;
    } catch (error) {
      // If we can't instantiate it or it throws errors, it's invalid
      return false;
    }
  }

  /**
   * Extract description from bot class if available
   */
  _getBotDescription(BotClass) {
    try {
      // Try to get description from static method or prototype
      if (BotClass.prototype && typeof BotClass.prototype.getDescription === 'function') {
        // Create a minimal mock dependencies object for safe instantiation
        const mockDependencies = {
          randomService: { chance: () => true, shuffle: (arr) => arr },
          fileService: {}
        };
        const tempInstance = new BotClass('temp', mockDependencies);
        return tempInstance.getDescription();
      }
      return `${BotClass.name || 'Unknown'} bot`;
    } catch (error) {
      return `${BotClass.name || 'Unknown'} bot (description unavailable)`;
    }
  }
}

// Export a singleton instance
module.exports = new GameRegistry();