// Multiplayer game functionality
class MultiplayerGame {
    constructor() {
        this.socket = null;
        this.playerId = null;
        this.screenName = '';
        this.isMultiplayer = false;
        this.players = [];
        this.isReady = false;
        this.gameStarted = false;
        
        this.initializeUI();
    }
    
    initializeUI() {
        // Multiplayer button
        const multiplayerButton = document.getElementById('multiplayer-button');
        multiplayerButton.addEventListener('click', () => {
            this.showMultiplayerOverlay();
        });
        
        // Join game button
        const joinGameBtn = document.getElementById('join-game-btn');
        joinGameBtn.addEventListener('click', () => {
            this.joinGame();
        });
        
        // Ready button
        const readyBtn = document.getElementById('ready-btn');
        readyBtn.addEventListener('click', () => {
            this.setReady();
        });
        
        // Leave game button
        const leaveGameBtn = document.getElementById('leave-game-btn');
        leaveGameBtn.addEventListener('click', () => {
            this.leaveGame();
        });
        
        // Enter key for player name input
        const playerNameInput = document.getElementById('player-name-input');
        playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinGame();
            }
        });
    }
    
    showMultiplayerOverlay() {
        const overlay = document.getElementById('multiplayer-overlay');
        overlay.style.display = 'flex';
        
        // Show player name input screen
        document.getElementById('player-name-screen').style.display = 'block';
        document.getElementById('waiting-room-screen').style.display = 'none';
        document.getElementById('countdown-screen').style.display = 'none';
        
        // Focus on input
        document.getElementById('player-name-input').focus();
    }
    
    hideMultiplayerOverlay() {
        const overlay = document.getElementById('multiplayer-overlay');
        overlay.style.display = 'none';
    }
    
    joinGame() {
        const playerNameInput = document.getElementById('player-name-input');
        const screenName = playerNameInput.value.trim();
        
        if (!screenName) {
            alert('Please enter a screen name');
            return;
        }
        
        this.screenName = screenName;
        this.connectToServer();
    }
    
    connectToServer() {
        // Determine WebSocket URL based on current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('Connected to server');
            this.sendMessage({
                type: 'joinGame',
                screenName: this.screenName
            });
        };
        
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('Error parsing server message:', error);
            }
        };
        
        this.socket.onclose = () => {
            console.log('Disconnected from server');
            this.handleDisconnect();
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            alert('Failed to connect to server. Please try again.');
        };
    }
    
    handleServerMessage(data) {
        switch (data.type) {
            case 'welcome':
                this.playerId = data.playerId;
                this.showWaitingRoom();
                break;
                
            case 'gameStatus':
                this.updatePlayersList(data.players);
                this.gameStarted = data.gameStarted;
                
                if (data.countdownActive) {
                    this.showCountdown(data.countdownValue);
                } else if (data.gameStarted && !this.gameStarted) {
                    this.startMultiplayerGame();
                }
                break;
                
            case 'countdown':
                this.showCountdown(data.value);
                break;
                
            case 'gameStart':
                this.startMultiplayerGame();
                break;
                
            case 'addQuestion':
                this.addQuestionFromOpponent(data.question, data.answer, data.fromPlayer);
                break;
                
            case 'gameWon':
                this.handleOpponentWon(data.winner);
                break;
        }
    }
    
    showWaitingRoom() {
        document.getElementById('player-name-screen').style.display = 'none';
        document.getElementById('waiting-room-screen').style.display = 'block';
        document.getElementById('countdown-screen').style.display = 'none';
    }
    
    updatePlayersList(players) {
        this.players = players;
        const playersUl = document.getElementById('players-ul');
        playersUl.innerHTML = '';
        
        players.forEach(player => {
            const li = document.createElement('li');
            const status = player.ready ? 
                '<span class="ready-status">Ready</span>' : 
                '<span class="waiting-status">Waiting...</span>';
            
            li.innerHTML = `
                <span>${player.screenName}</span>
                ${status}
            `;
            playersUl.appendChild(li);
        });
    }
    
    showCountdown(value) {
        document.getElementById('player-name-screen').style.display = 'none';
        document.getElementById('waiting-room-screen').style.display = 'none';
        document.getElementById('countdown-screen').style.display = 'block';
        
        const countdownText = document.getElementById('countdown-text');
        countdownText.textContent = value;
        
        if (value === 'Go!') {
            setTimeout(() => {
                this.hideMultiplayerOverlay();
            }, 1000);
        }
    }
    
    setReady() {
        this.isReady = true;
        this.sendMessage({
            type: 'ready'
        });
        
        const readyBtn = document.getElementById('ready-btn');
        readyBtn.textContent = 'Ready!';
        readyBtn.disabled = true;
        readyBtn.style.backgroundColor = '#45a049';
    }
    
    leaveGame() {
        if (this.socket) {
            this.socket.close();
        }
        this.resetMultiplayerState();
        this.hideMultiplayerOverlay();
    }
    
    handleDisconnect() {
        this.resetMultiplayerState();
        this.hideMultiplayerOverlay();
        alert('Disconnected from server');
    }
    
    resetMultiplayerState() {
        this.isMultiplayer = false;
        this.isReady = false;
        this.gameStarted = false;
        this.players = [];
        this.socket = null;
        
        // Reset UI
        const readyBtn = document.getElementById('ready-btn');
        readyBtn.textContent = 'Ready';
        readyBtn.disabled = false;
        readyBtn.style.backgroundColor = '#4CAF50';
    }
    
    startMultiplayerGame() {
        this.isMultiplayer = true;
        this.gameStarted = true;
        this.hideMultiplayerOverlay();
        
        // Update multiplayer button to show active state
        const multiplayerButton = document.getElementById('multiplayer-button');
        multiplayerButton.classList.add('active');
        
        // Initialize the game in multiplayer mode
        if (typeof initMultiplayerGame === 'function') {
            initMultiplayerGame();
        }
    }
    
    sendMessage(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }
    
    // Called when this player gets a correct answer
    sendQuestionToOpponent(question, answer) {
        this.sendMessage({
            type: 'addQuestion',
            question: question,
            answer: answer,
            fromPlayer: this.screenName
        });
    }
    
    // Called when this player wins
    sendGameWon() {
        this.sendMessage({
            type: 'gameWon',
            winner: this.screenName
        });
    }
    
    // Called when receiving a question from opponent
    addQuestionFromOpponent(question, answer, fromPlayer) {
        if (typeof addQuestionFromOpponent === 'function') {
            addQuestionFromOpponent(question, answer, fromPlayer);
        }
    }
    
    // Called when opponent wins
    handleOpponentWon(winner) {
        if (typeof handleOpponentWon === 'function') {
            handleOpponentWon(winner);
        }
    }
    
    // Check if currently in multiplayer mode
    isMultiplayerMode() {
        return this.isMultiplayer && this.gameStarted;
    }
    
    // Get current player info
    getPlayerInfo() {
        return {
            id: this.playerId,
            screenName: this.screenName
        };
    }
}

// Create global multiplayer instance
const multiplayerGame = new MultiplayerGame(); 