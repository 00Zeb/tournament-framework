# Tournament Framework

A framework for running automated bot tournaments with a focus on the card game "Higher or Lower". The framework consists of a CLI application for managing tournaments and a web application for displaying results.

## Features

- **CLI Tournament Management**: Create tournaments, add bots, run matches, and view standings
- **Web Interface**: Real-time tournament scoreboards and match history
- **Extensible Architecture**: Easy to add new games and bots
- **Testable Design**: Comprehensive test suite with dependency injection
- **Higher or Lower Game**: Implementation of the popular card game for 2+ players

## Project Structure

```
tournament-framework/
├── cli/                    # CLI application
│   ├── src/
│   │   ├── games/          # Game implementations
│   │   ├── bots/           # Bot implementations
│   │   ├── services/       # Core services
│   │   └── utils/          # Utility classes
│   ├── test/               # Test suite
│   └── data/               # Tournament data storage
├── web/                    # Web application
│   ├── src/                # Express server
│   ├── views/              # HTML templates
│   └── public/             # Static assets
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm

### Installation & Setup

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd tournament-framework
   ```

2. **Install dependencies**
   ```bash
   # Install CLI dependencies
   cd cli
   npm install
   
   # Install web dependencies
   cd ../web
   npm install
   ```

3. **Run the framework**
   
   **Terminal 1: Start the CLI (from cli directory)**
   ```bash
   cd cli
   
   # Create a tournament
   node src/index.js create my-first-tournament
   
   # Initialize example bots
   node src/index.js init-bots
   
   # Add bots to tournament
   node src/index.js add-bot my-first-tournament RandomBot ./bots/random-bot.js
   node src/index.js add-bot my-first-tournament SmartBot ./bots/smart-bot.js
   node src/index.js add-bot my-first-tournament CountingBot ./bots/counting-bot.js
   
   # Run some matches
   node src/index.js run-match my-first-tournament RandomBot SmartBot
   node src/index.js run-round my-first-tournament
   
   # View standings
   node src/index.js standings my-first-tournament
   ```

   **Terminal 2: Start the web server (from web directory)**
   ```bash
   cd web
   npm start
   ```
   
   Open your browser to `http://localhost:3000` to view the tournament results!

### Optional: Global CLI Installation

Make the CLI globally available:
```bash
cd cli
npm link
```

Then you can use `tournament` command from anywhere:
```bash
tournament create my-tournament
tournament list
tournament init-bots
```

## Installation

### Prerequisites

- Node.js 16+ 
- npm

### Setup

1. Clone or download the project
2. Install CLI dependencies:
   ```bash
   cd cli
   npm install
   ```

3. Install web dependencies:
   ```bash
   cd ../web
   npm install
   ```

4. Make CLI globally available (optional):
   ```bash
   cd ../cli
   npm link
   ```

## CLI Usage

### Basic Commands

```bash
# Create a new tournament
tournament create my-tournament

# List all tournaments
tournament list

# Initialize example bots
tournament init-bots

# Add a bot to a tournament
tournament add-bot my-tournament RandomBot ./bots/random-bot.js

# Run a single match
tournament run-match my-tournament RandomBot SmartBot

# Run a full round robin
tournament run-round my-tournament

# View tournament standings
tournament standings my-tournament

# Delete a tournament
tournament delete my-tournament
```

### Complete Example

```bash
# 1. Create a tournament
tournament create higher-lower-championship

# 2. Initialize example bots
tournament init-bots

# 3. Add bots to the tournament
tournament add-bot higher-lower-championship RandomBot ./bots/random-bot.js
tournament add-bot higher-lower-championship SmartBot ./bots/smart-bot.js
tournament add-bot higher-lower-championship CountingBot ./bots/counting-bot.js

# 4. Run some matches
tournament run-match higher-lower-championship RandomBot SmartBot
tournament run-match higher-lower-championship SmartBot CountingBot

# 5. Run a full round robin
tournament run-round higher-lower-championship

# 6. View standings
tournament standings higher-lower-championship
```

## Web Interface

### Starting the Web Server

```bash
cd web
npm start
```

The web interface will be available at `http://localhost:3000`

### Features

- **Tournament List**: View all tournaments with participant and match counts
- **Tournament Details**: Detailed standings and recent match results
- **Real-time Updates**: Auto-refresh functionality for live tournament viewing
- **Responsive Design**: Works on desktop and mobile devices

## Creating Custom Bots

### Bot Interface

All bots must extend the `BotInterface` class and implement the `makeMove` method:

```javascript
const BotInterface = require('./src/bots/bot-interface');

class MyBot extends BotInterface {
  constructor(name, dependencies = {}) {
    super(name, dependencies);
    this.randomService = dependencies.randomService;
  }

  async makeMove(gameState) {
    // gameState contains:
    // - currentCard: { suit, rank, value }
    // - round: current round number
    // - maxRounds: maximum rounds per game
    // - cardsLeft: remaining cards in deck
    // - players: array of player stats
    
    // Return either 'higher' or 'lower'
    return 'higher';
  }
}

module.exports = MyBot;
```

### Example Bot Strategies

1. **Random Bot**: Makes random guesses
2. **Smart Bot**: Uses basic probability (guess higher for low cards, lower for high cards)
3. **Counting Bot**: Tracks seen cards and calculates remaining probabilities

### Adding New Bots

1. Create a new JavaScript file in the `bots/` directory
2. Implement the bot following the interface above
3. Add the bot to a tournament using the CLI:
   ```bash
   tournament add-bot my-tournament MyBot ./bots/my-bot.js
   ```

## Game Rules: Higher or Lower

- Players take turns guessing if the next card will be higher or lower than the current card
- Correct guesses earn 1 point, incorrect guesses lose 1 point, ties earn 0 points
- Games typically last 10 rounds (configurable)
- Winner is determined by highest score, with tiebreakers based on correct guesses and fewest incorrect guesses

## Testing

### Running Tests

```bash
# CLI tests
cd cli
npm test

# Web tests
cd web
npm test

# Run with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **Mock Services**: Testable implementations of external dependencies
- **Test Coverage**: Comprehensive coverage requirements

## Development

### Architecture

The framework uses dependency injection for testability:

- **Services**: Abstracted external dependencies (file system, randomness, card operations)
- **Containers**: Manage service lifecycles and dependencies
- **Mocks**: Test implementations for reliable testing

### Key Design Patterns

1. **Dependency Injection**: Services are injected rather than created directly
2. **Strategy Pattern**: Different bot implementations follow the same interface
3. **Factory Pattern**: Bots are created dynamically from file paths
4. **Observer Pattern**: Bots can react to game events

### Adding New Games

1. Create a game class in `src/games/`
2. Implement the game logic with injected dependencies
3. Update the tournament system to support the new game type
4. Create bots that implement the game's interface

## API Reference

### Tournament Commands

- `create <name>`: Create a new tournament
- `list`: List all tournaments  
- `add-bot <tournament> <name> <path>`: Add a bot to a tournament
- `remove-bot <tournament> <name>`: Remove a bot from a tournament
- `run-match <tournament> <bot1> <bot2>`: Run a single match
- `run-round <tournament>`: Run a full round robin
- `standings <tournament>`: Show tournament standings
- `delete <tournament>`: Delete a tournament

### Web API Endpoints

- `GET /`: Tournament list page
- `GET /tournament/:name`: Tournament details page
- `GET /api/tournaments`: Tournament list API
- `GET /api/tournament/:name`: Tournament details API
- `GET /api/tournament/:name/matches`: Match history API

## Troubleshooting

### Common Issues

1. **Bot not loading**: Ensure the bot file exports a class that extends BotInterface
2. **Tournament not found**: Check that the tournament was created and data files exist
3. **Web server not starting**: Verify that the CLI data directory exists and has proper permissions

### Debug Mode

Set `NODE_ENV=development` for detailed error messages and logging.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Future Enhancements

- Additional card games (Blackjack, Poker)
- Tournament brackets and elimination rounds
- Bot performance analytics
- Real-time match visualization
- Database persistence option
- Multi-language bot support