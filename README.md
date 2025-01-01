# Splendor Web Game

A web-based implementation of the board game Splendor using React, TypeScript, and Chakra UI.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (usually http://localhost:5173)

## Game Rules

Splendor is a game of Renaissance merchants racing to build the most prestigious jewelry business. Players compete to build the most profitable and prestigious business by:

- Collecting gems (tokens)
- Purchasing development cards
- Attracting noble patrons

### Basic Gameplay

On your turn, you can perform one of these actions:

1. Take up to three gems of different colors
2. Take two gems of the same color (if there are at least 4 available)
3. Purchase a development card using your gems
4. Reserve a development card and take a gold token (joker)

### Development Cards

- Cards provide permanent gem bonuses for future purchases
- Cards are worth prestige points
- There are three levels of cards (1, 2, and 3)

### Nobles

- Nobles are worth 3 prestige points
- They automatically visit a player who meets their requirements
- Requirements are based on owned development cards

### Winning

The game ends when a player reaches 15 prestige points. Complete the current round so all players have the same number of turns.

## Development

This project uses:

- React with TypeScript for the UI
- Chakra UI for styling
- Zustand for state management
- Vite for development and building

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
