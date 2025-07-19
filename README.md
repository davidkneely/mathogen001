# Mathogen Ball Pop - WebGL Game with Box2D Physics

A fun and educational math game where players pop balls with correct answers to math questions. Features realistic physics simulation and multiplayer support.

## Features

### Single Player Mode
- Interactive ball physics using Box2D
- Multiple math operations (addition, subtraction, multiplication, division)
- Customizable game settings (ball size, gravity, question count, etc.)
- Sound effects and confetti animations
- Player statistics tracking
- Performance analysis and graphs

### Multiplayer Mode
- Real-time multiplayer gameplay over WebSocket
- Player name input and waiting room
- 3-2-1-Go! countdown before game starts
- Questions from one player appear on opponent's screen
- Win/lose notifications
- Automatic game synchronization

## How to Play

### Single Player
1. Open the game in your browser
2. Configure game settings using the gear icon
3. Click on balls with correct answers
4. Get enough correct answers to win!

### Multiplayer
1. Click the multiplayer button (👥) next to the settings gear
2. Enter your screen name and click "Join Game"
3. Wait for another player to join
4. Click "Ready" when you're prepared to play
5. Both players must be ready for the countdown to start
6. Play the game - when you get a correct answer, a new question appears on your opponent's screen
7. First player to reach the win condition wins!

## Technical Details

### Physics Engine
- Box2D physics engine for realistic ball movement
- Customizable gravity and ball properties
- Collision detection and response

### Multiplayer Architecture
- WebSocket server for real-time communication
- Node.js backend with Express-like routing
- Automatic player synchronization
- Question sharing between players

### Game Engine
- HTML5 Canvas for rendering
- RequestAnimationFrame for smooth 60fps gameplay
- Box2DWeb for physics simulation

## Installation and Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   node server.js
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

4. For multiplayer, open the same URL in a second browser window/tab

## File Structure

- `index.html` - Main game interface
- `server.js` - WebSocket server for multiplayer
- `js/game.js` - Main game logic and physics
- `js/multiplayer.js` - Multiplayer functionality
- `js/box2d.min.js` - Box2D physics library
- `package.json` - Node.js dependencies

## Game Settings

- **Question Types**: Choose which math operations to include
- **Number Range**: Set minimum and maximum numbers for questions
- **Ball Size**: Adjust the size of the physics balls
- **Gravity**: Control how fast balls fall
- **Number to Win**: Set how many correct answers needed to win
- **Sound Effects**: Toggle audio feedback
- **Confetti Effects**: Toggle visual celebrations

## Multiplayer Features

- **Player Names**: Each player can choose a unique screen name
- **Ready System**: Players must indicate they're ready before the game starts
- **Countdown**: 3-2-1-Go! countdown ensures synchronized start
- **Question Sharing**: Correct answers from one player create new questions for the opponent
- **Win Detection**: Automatic detection and notification when a player wins
- **Disconnect Handling**: Graceful handling of player disconnections

## Browser Compatibility

- Modern browsers with WebSocket support
- HTML5 Canvas support required
- Web Audio API for sound effects

## Development

The game is built with vanilla JavaScript and HTML5. The multiplayer functionality uses WebSockets for real-time communication between players. The physics simulation is powered by Box2D, providing realistic ball movement and collision detection.
