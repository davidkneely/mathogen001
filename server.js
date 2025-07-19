const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create HTTP server
const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
    }
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Game state
const gameState = {
    players: new Map(), // Map of playerId to player data
    gameStarted: false,
    countdownActive: false,
    countdownValue: 0,
    countdownInterval: null
};

// Player data structure
class Player {
    constructor(id, ws, screenName) {
        this.id = id;
        this.ws = ws;
        this.screenName = screenName;
        this.ready = false;
        this.connected = true;
    }
}

// Generate unique player ID
function generatePlayerId() {
    return Math.random().toString(36).substr(2, 9);
}

// Broadcast message to all connected players
function broadcast(message, excludePlayerId = null) {
    gameState.players.forEach((player, playerId) => {
        if (player.connected && playerId !== excludePlayerId) {
            try {
                player.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending message to player:', error);
            }
        }
    });
}

// Send message to specific player
function sendToPlayer(playerId, message) {
    const player = gameState.players.get(playerId);
    if (player && player.connected) {
        try {
            player.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error sending message to player:', error);
        }
    }
}

// Update all players with current game state
function updateAllPlayers() {
    const playersList = Array.from(gameState.players.values()).map(player => ({
        id: player.id,
        screenName: player.screenName,
        ready: player.ready
    }));
    
    const gameStatus = {
        type: 'gameStatus',
        players: playersList,
        gameStarted: gameState.gameStarted,
        countdownActive: gameState.countdownActive,
        countdownValue: gameState.countdownValue
    };
    
    broadcast(gameStatus);
}

// Start countdown
function startCountdown() {
    gameState.countdownActive = true;
    gameState.countdownValue = 3;
    
    const countdown = () => {
        if (gameState.countdownValue > 0) {
            broadcast({
                type: 'countdown',
                value: gameState.countdownValue
            });
            gameState.countdownValue--;
            gameState.countdownInterval = setTimeout(countdown, 1000);
        } else {
            // Countdown finished, start game
            gameState.countdownActive = false;
            gameState.gameStarted = true;
            broadcast({
                type: 'gameStart'
            });
        }
    };
    
    countdown();
}

// Check if all players are ready
function checkAllReady() {
    const connectedPlayers = Array.from(gameState.players.values()).filter(p => p.connected);
    if (connectedPlayers.length >= 2 && connectedPlayers.every(p => p.ready)) {
        startCountdown();
    }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    const playerId = generatePlayerId();
    console.log(`New player connected: ${playerId}`);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        playerId: playerId
    }));
    
    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'joinGame':
                    const player = new Player(playerId, ws, data.screenName);
                    gameState.players.set(playerId, player);
                    console.log(`Player ${data.screenName} joined the game`);
                    updateAllPlayers();
                    break;
                    
                case 'ready':
                    const readyPlayer = gameState.players.get(playerId);
                    if (readyPlayer) {
                        readyPlayer.ready = true;
                        console.log(`Player ${readyPlayer.screenName} is ready`);
                        updateAllPlayers();
                        checkAllReady();
                    }
                    break;
                    
                case 'addQuestion':
                    // Forward the question to other players
                    broadcast({
                        type: 'addQuestion',
                        question: data.question,
                        answer: data.answer,
                        fromPlayer: data.fromPlayer
                    }, playerId);
                    break;
                    
                case 'gameWon':
                    // Notify other players that someone won
                    broadcast({
                        type: 'gameWon',
                        winner: data.winner
                    }, playerId);
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    // Handle player disconnect
    ws.on('close', () => {
        const player = gameState.players.get(playerId);
        if (player) {
            player.connected = false;
            console.log(`Player ${player.screenName} disconnected`);
            
            // If game was in progress, reset it
            if (gameState.gameStarted) {
                gameState.gameStarted = false;
                gameState.countdownActive = false;
                if (gameState.countdownInterval) {
                    clearTimeout(gameState.countdownInterval);
                }
            }
            
            // Remove player after a short delay
            setTimeout(() => {
                gameState.players.delete(playerId);
                updateAllPlayers();
            }, 1000);
        }
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
}); 