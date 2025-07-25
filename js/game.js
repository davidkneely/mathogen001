// Game constants - default values, can be changed via settings
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 600;
let BALL_RADIUS = 50;
let GRAVITY = 10;
let QUESTION_COUNT = 7;
const SCALE = 30; // Box2D works in meters, we need to convert to pixels
const SPAWN_HEIGHT_RANGE = 200; // Range of heights above the canvas to spawn balls
const DATA_UPDATE_INTERVAL = 500; // ms between data model updates
const MAX_HISTORY_ITEMS = 20; // Maximum number of items to show in the performance graph

// Game settings
const gameSettings = {
    operations: {
        addition: true,
        subtraction: true,
        multiplication: true,
        division: false
    },
    minNumber: 1,
    maxNumber: 10,
    questionCount: 7,
    ballSize: 50,
    gravity: 10,
    numberToWin: 7,
    soundEnabled: true,
    confettiEnabled: true
};

// Player stats
const playerStats = {
    total: 0,
    correct: 0,
    incorrect: 0,
    operations: {
        addition: { total: 0, correct: 0 },
        subtraction: { total: 0, correct: 0 },
        multiplication: { total: 0, correct: 0 },
        division: { total: 0, correct: 0 }
    },
    history: [] // Array of objects with { question, answer, isCorrect, operation }
};

// Leaderboard data
const leaderboard = {
    scores: [], // Array of { screenName, score, date, time }
    currentPlayerName: null
};

// Box2D shortcuts for Box2DWeb
const b2Vec2 = Box2D.Common.Math.b2Vec2;
const b2BodyDef = Box2D.Dynamics.b2BodyDef;
const b2Body = Box2D.Dynamics.b2Body;
const b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
const b2World = Box2D.Dynamics.b2World;
const b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
const b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
const b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

// Game variables
let canvas, ctx, world;
let balls = [];
let lastSpawnTime = 0;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let lastDataUpdateTime = 0;
let correctAnswersCount = 0;
let gameWon = false;
let confettiParticles = [];
let cameraShake = { x: 0, y: 0, intensity: 0, duration: 0 };

// Initialize the game
function init() {
    // Set up canvas
    canvas = document.getElementById('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');
    
    // Set up Box2D world
    world = new b2World(new b2Vec2(0, GRAVITY), true);
    
    // Create boundary walls
    createBoundaries();
    
    // Generate initial questions
    generateQuestions();
    
    // Display the first question
    updateQuestionDisplay();
    
    // Add event listener for ball clicks
    canvas.addEventListener('click', handleClick);
    
    // Spawn initial set of balls
    spawnInitialBalls();
    
    // Initialize data model view
    updateDataModelView();
    
    // Initialize game settings UI
    initializeSettingsUI();
    
    // Initialize player stats
    updatePlayerStatsDisplay();
    
    // Initialize toggle button
    initializeToggleButton();
    
    // Initialize leaderboard button
    initializeLeaderboardButton();
    
    // Load leaderboard data
    loadLeaderboard();
    
    // Reset game state
    correctAnswersCount = 0;
    gameWon = false;
    confettiParticles = [];
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
    
    // Load player stats from localStorage if available
    loadPlayerStats();
}

// Initialize settings UI and event listeners
function initializeSettingsUI() {
    // Set initial values from gameSettings
    document.getElementById('addition').checked = gameSettings.operations.addition;
    document.getElementById('subtraction').checked = gameSettings.operations.subtraction;
    document.getElementById('multiplication').checked = gameSettings.operations.multiplication;
    document.getElementById('division').checked = gameSettings.operations.division;
    
    document.getElementById('min-number').value = gameSettings.minNumber;
    document.getElementById('max-number').value = gameSettings.maxNumber;
    document.getElementById('question-count').value = gameSettings.questionCount;
    
    document.getElementById('ball-size').value = gameSettings.ballSize;
    document.getElementById('ball-size-value').textContent = gameSettings.ballSize;
    
    document.getElementById('gravity').value = gameSettings.gravity;
    document.getElementById('gravity-value').textContent = gameSettings.gravity;
    
    document.getElementById('number-to-win').value = gameSettings.numberToWin;
    document.getElementById('number-to-win-value').textContent = gameSettings.numberToWin;
    
    document.getElementById('sound-enabled').checked = gameSettings.soundEnabled;
    document.getElementById('confetti-enabled').checked = gameSettings.confettiEnabled;
    
    // Add event listeners for sliders
    document.getElementById('ball-size').addEventListener('input', function() {
        document.getElementById('ball-size-value').textContent = this.value;
    });
    
    document.getElementById('gravity').addEventListener('input', function() {
        document.getElementById('gravity-value').textContent = this.value;
    });
    
    document.getElementById('number-to-win').addEventListener('input', function() {
        document.getElementById('number-to-win-value').textContent = this.value;
    });
    
    // Add event listeners for buttons
    document.getElementById('apply-settings').addEventListener('click', applySettings);
    document.getElementById('reset-settings').addEventListener('click', resetSettings);
}

// Apply settings from UI to game
function applySettings() {
    // Get operation settings
    gameSettings.operations.addition = document.getElementById('addition').checked;
    gameSettings.operations.subtraction = document.getElementById('subtraction').checked;
    gameSettings.operations.multiplication = document.getElementById('multiplication').checked;
    gameSettings.operations.division = document.getElementById('division').checked;
    
    // Validate that at least one operation is selected
    if (!gameSettings.operations.addition && 
        !gameSettings.operations.subtraction && 
        !gameSettings.operations.multiplication && 
        !gameSettings.operations.division) {
        alert('Please select at least one operation type.');
        document.getElementById('addition').checked = true;
        gameSettings.operations.addition = true;
    }
    
    // Get number range
    gameSettings.minNumber = parseInt(document.getElementById('min-number').value);
    gameSettings.maxNumber = parseInt(document.getElementById('max-number').value);
    
    // Validate min/max numbers
    if (gameSettings.minNumber >= gameSettings.maxNumber) {
        alert('Minimum number must be less than maximum number.');
        gameSettings.minNumber = 1;
        gameSettings.maxNumber = 10;
        document.getElementById('min-number').value = 1;
        document.getElementById('max-number').value = 10;
    }
    
    // Get other settings
    gameSettings.questionCount = parseInt(document.getElementById('question-count').value);
    gameSettings.ballSize = parseInt(document.getElementById('ball-size').value);
    gameSettings.gravity = parseInt(document.getElementById('gravity').value);
    gameSettings.numberToWin = parseInt(document.getElementById('number-to-win').value);
    gameSettings.soundEnabled = document.getElementById('sound-enabled').checked;
    gameSettings.confettiEnabled = document.getElementById('confetti-enabled').checked;
    
    // Apply settings to game variables
    QUESTION_COUNT = gameSettings.questionCount;
    BALL_RADIUS = gameSettings.ballSize;
    GRAVITY = gameSettings.gravity;
    
    // Update world gravity
    world.SetGravity(new b2Vec2(0, GRAVITY));
    
    // Generate new questions based on new settings
    generateQuestions();
    currentQuestionIndex = 0;
    updateQuestionDisplay();
    
    // Respawn balls with new settings
    spawnInitialBalls();
    
    // Update data model view
    updateDataModelView();
}

// Reset settings to default values
function resetSettings() {
    gameSettings.operations.addition = true;
    gameSettings.operations.subtraction = true;
    gameSettings.operations.multiplication = true;
    gameSettings.operations.division = false;
    gameSettings.minNumber = 1;
    gameSettings.maxNumber = 10;
    gameSettings.questionCount = 7;
    gameSettings.ballSize = 50;
    gameSettings.gravity = 10;
    gameSettings.numberToWin = 7;
    gameSettings.soundEnabled = true;
    gameSettings.confettiEnabled = true;
    
    // Update UI
    document.getElementById('addition').checked = true;
    document.getElementById('subtraction').checked = true;
    document.getElementById('multiplication').checked = true;
    document.getElementById('division').checked = false;
    document.getElementById('min-number').value = 1;
    document.getElementById('max-number').value = 10;
    document.getElementById('question-count').value = 7;
    document.getElementById('ball-size').value = 50;
    document.getElementById('ball-size-value').textContent = 50;
    document.getElementById('gravity').value = 10;
    document.getElementById('gravity-value').textContent = 10;
    document.getElementById('number-to-win').value = 7;
    document.getElementById('number-to-win-value').textContent = 7;
    document.getElementById('sound-enabled').checked = true;
    document.getElementById('confetti-enabled').checked = true;
    
    // Apply these settings
    applySettings();
}

// Generate math questions based on current settings
function generateQuestions() {
    questions = [];
    const operations = [];
    
    if (gameSettings.operations.addition) operations.push('+');
    if (gameSettings.operations.subtraction) operations.push('-');
    if (gameSettings.operations.multiplication) operations.push('*');
    if (gameSettings.operations.division) operations.push('/');
    
    // Generate the requested number of questions
    for (let i = 0; i < gameSettings.questionCount; i++) {
        questions.push(generateNewQuestion(operations));
    }
}

// Generate a new question to replace a completed one
function generateNewQuestion(operations = null) {
    if (!operations) {
        operations = [];
        if (gameSettings.operations.addition) operations.push('+');
        if (gameSettings.operations.subtraction) operations.push('-');
        if (gameSettings.operations.multiplication) operations.push('*');
        if (gameSettings.operations.division) operations.push('/');
    }
    
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let a, b, answer;
    
    switch (op) {
        case '+':
            a = Math.floor(Math.random() * (gameSettings.maxNumber - gameSettings.minNumber + 1)) + gameSettings.minNumber;
            b = Math.floor(Math.random() * (gameSettings.maxNumber - gameSettings.minNumber + 1)) + gameSettings.minNumber;
            answer = a + b;
            break;
        case '-':
            // Ensure a >= b for subtraction to avoid negative answers
            b = Math.floor(Math.random() * (gameSettings.maxNumber - gameSettings.minNumber + 1)) + gameSettings.minNumber;
            a = b + Math.floor(Math.random() * (gameSettings.maxNumber - gameSettings.minNumber + 1)) + gameSettings.minNumber;
            answer = a - b;
            break;
        case '*':
            a = Math.floor(Math.random() * (gameSettings.maxNumber - gameSettings.minNumber + 1)) + gameSettings.minNumber;
            b = Math.floor(Math.random() * (gameSettings.maxNumber - gameSettings.minNumber + 1)) + gameSettings.minNumber;
            answer = a * b;
            break;
        case '/':
            // Ensure division results in whole numbers
            b = Math.floor(Math.random() * (gameSettings.maxNumber - gameSettings.minNumber + 1)) + gameSettings.minNumber;
            answer = Math.floor(Math.random() * (gameSettings.maxNumber - gameSettings.minNumber + 1)) + gameSettings.minNumber;
            a = b * answer;
            break;
    }
    
    return {
        question: `${a} ${op} ${b} = ?`,
        answer: answer.toString()
    };
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Create boundary walls
function createBoundaries() {
    // Ground (bottom)
    createBox(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 20, true);
    
    // Left wall
    createBox(10, CANVAS_HEIGHT / 2, 20, CANVAS_HEIGHT, true);
    
    // Right wall
    createBox(CANVAS_WIDTH - 10, CANVAS_HEIGHT / 2, 20, CANVAS_HEIGHT, true);
    
    // Top boundary (far above the visible canvas to keep balls from escaping too far)
    createBox(CANVAS_WIDTH / 2, -SPAWN_HEIGHT_RANGE * 2, CANVAS_WIDTH, 20, true);
}

// Create a box body in the world
function createBox(x, y, width, height, isStatic) {
    const bodyDef = new b2BodyDef();
    bodyDef.type = isStatic ? b2Body.b2_staticBody : b2Body.b2_dynamicBody;
    bodyDef.position.Set(x / SCALE, y / SCALE); // Box2D uses meters, we use pixels (scale 1:30)
    
    const fixDef = new b2FixtureDef();
    fixDef.shape = new b2PolygonShape();
    fixDef.shape.SetAsBox(width / (2 * SCALE), height / (2 * SCALE)); // Half-width and half-height
    fixDef.density = 1.0;
    fixDef.friction = 0.3;
    fixDef.restitution = 0.2;
    
    const body = world.CreateBody(bodyDef);
    body.CreateFixture(fixDef);
    
    return body;
}

// Update the question display
function updateQuestionDisplay() {
    const questionElement = document.getElementById('question');
    
    // Check if in multiplayer mode
    if (multiplayerGame && multiplayerGame.isMultiplayerMode()) {
        const playerInfo = multiplayerGame.getPlayerInfo();
        questionElement.innerHTML = `Multiplayer - ${playerInfo.screenName}<br>Question: ${questions[currentQuestionIndex].question}`;
    } else {
        questionElement.textContent = `Question: ${questions[currentQuestionIndex].question}`;
    }
    
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = `Score: ${score}`;
}

// Spawn initial set of balls in a scattered pattern
function spawnInitialBalls() {
    // Clear any existing balls
    clearAllBalls();
    
    // Create exactly one ball for each question in the questions array
    questions.forEach((question, index) => {
        createBallWithAnswer(question.answer);
    });
}

// Clear all existing balls
function clearAllBalls() {
    for (let i = balls.length - 1; i >= 0; i--) {
        world.DestroyBody(balls[i].body);
    }
    balls = [];
}

// Create a ball with a specific answer
function createBallWithAnswer(answer) {
    // Random position at the top of the screen with some horizontal scatter
    const x = Math.random() * (CANVAS_WIDTH - 100) + 50;
    // Position balls above the visible canvas area
    const y = -Math.random() * SPAWN_HEIGHT_RANGE - BALL_RADIUS;
    
    // Add some random initial velocity for more natural scattering
    const vx = (Math.random() - 0.5) * 5; // Random horizontal velocity
    const vy = Math.random() * 2; // Small downward velocity
    
    // Create ball body
    const bodyDef = new b2BodyDef();
    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position.Set(x / SCALE, y / SCALE);
    
    const fixDef = new b2FixtureDef();
    fixDef.shape = new b2CircleShape(BALL_RADIUS / SCALE);
    fixDef.density = 1.0;
    fixDef.friction = 0.3;
    fixDef.restitution = 0.6;
    
    const body = world.CreateBody(bodyDef);
    body.CreateFixture(fixDef);
    
    // Set initial velocity
    body.SetLinearVelocity(new b2Vec2(vx, vy));
    
    // Add ball to array with white color
    balls.push({
        body: body,
        answer: answer,
        color: '#FFFFFF' // White color for all regular balls
    });
}

// Create a ball at a specific location
function createBallAtLocation(answer, x, y) {
    // Create ball body
    const bodyDef = new b2BodyDef();
    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position.Set(x / SCALE, y / SCALE);
    
    const fixDef = new b2FixtureDef();
    fixDef.shape = new b2CircleShape(BALL_RADIUS / SCALE);
    fixDef.density = 1.0;
    fixDef.friction = 0.3;
    fixDef.restitution = 0.6;
    
    const body = world.CreateBody(bodyDef);
    body.CreateFixture(fixDef);
    
    // Add ball to array with red color (wrong answer ball)
    balls.push({
        body: body,
        answer: answer,
        color: '#FF0000' // Red color for wrong answer balls
    });
}

// Create confetti particles
function createConfetti() {
    for (let i = 0; i < 100; i++) {
        confettiParticles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: -10,
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * 3 + 2,
            color: getRandomColor(),
            size: Math.random() * 4 + 2
        });
    }
}

// Create confetti explosion at specific location
function createConfettiExplosion(x, y) {
    if (!gameSettings.confettiEnabled) return;
    
    for (let i = 0; i < 50; i++) {
        confettiParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            color: getRandomColor(),
            size: Math.random() * 6 + 3
        });
    }
}

// Play popping sound
function playPopSound() {
    if (!gameSettings.soundEnabled) return;
    
    // Create audio context for sound generation
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set up the pop sound
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    // Play the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Play a muffled click sound for wrong answers
function playMuffledClickSound() {
    if (!gameSettings.soundEnabled) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.005, audioContext.currentTime + 0.05);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
}

// Trigger camera shake
function triggerCameraShake(intensity = 5, duration = 300) {
    cameraShake.intensity = intensity;
    cameraShake.duration = duration;
    cameraShake.x = 0;
    cameraShake.y = 0;
}

// Update camera shake
function updateCameraShake() {
    if (cameraShake.duration > 0) {
        cameraShake.duration -= 16.67; // Approximate time between frames at 60fps
        
        if (cameraShake.duration > 0) {
            // Generate random shake offset
            cameraShake.x = (Math.random() - 0.5) * cameraShake.intensity;
            cameraShake.y = (Math.random() - 0.5) * cameraShake.intensity;
        } else {
            // Reset shake when duration is over
            cameraShake.x = 0;
            cameraShake.y = 0;
            cameraShake.intensity = 0;
        }
    }
}

// Update and draw confetti
function updateConfetti() {
    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const particle = confettiParticles[i];
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // gravity
        
        // Remove particles that are off screen
        if (particle.y > CANVAS_HEIGHT + 10) {
            confettiParticles.splice(i, 1);
        }
    }
}

// Draw confetti
function drawConfetti() {
    confettiParticles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
}

// Show play again button
function showPlayAgainButton() {
    // Check if this is a single-player game (not multiplayer)
    if (!multiplayerGame || !multiplayerGame.isMultiplayerMode()) {
        // Handle single-player game end with leaderboard
        handleSinglePlayerGameEnd();
        return;
    }
    
    // Multiplayer game - show regular win overlay
    const gameArea = document.getElementById('game-area');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'win-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 100;
    `;
    
    // Create win message
    const winMessage = document.createElement('h2');
    winMessage.textContent = 'Congratulations! You Won!';
    winMessage.style.cssText = `
        color: white;
        font-size: 36px;
        margin-bottom: 20px;
        text-align: center;
    `;
    
    // Create play again button
    const playAgainButton = document.createElement('button');
    playAgainButton.textContent = 'Play Again';
    playAgainButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 15px 30px;
        font-size: 18px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.3s;
    `;
    
    playAgainButton.addEventListener('mouseenter', () => {
        playAgainButton.style.background = '#45a049';
    });
    
    playAgainButton.addEventListener('mouseleave', () => {
        playAgainButton.style.background = '#4CAF50';
    });
    
    playAgainButton.addEventListener('click', resetGame);
    
    overlay.appendChild(winMessage);
    overlay.appendChild(playAgainButton);
    gameArea.appendChild(overlay);
}

// Reset the game
function resetGame() {
    // Remove win overlay
    const overlay = document.getElementById('win-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Remove opponent won overlay if it exists
    const opponentOverlay = document.getElementById('opponent-won-overlay');
    if (opponentOverlay) {
        opponentOverlay.remove();
    }
    
    // Remove leaderboard overlay if it exists
    const leaderboardOverlay = document.getElementById('leaderboard-overlay');
    if (leaderboardOverlay) {
        leaderboardOverlay.remove();
    }
    
    // Remove player name input overlay if it exists
    const playerNameOverlay = document.getElementById('player-name-overlay');
    if (playerNameOverlay) {
        playerNameOverlay.remove();
    }
    
    // Reset game state
    correctAnswersCount = 0;
    gameWon = false;
    score = 0;
    confettiParticles = [];
    
    // Clear all balls
    clearAllBalls();
    
    // Generate new questions
    generateQuestions();
    currentQuestionIndex = 0;
    
    // Update displays
    updateQuestionDisplay();
    updateDataModelView();
    
    // Spawn initial balls
    spawnInitialBalls();
    
    // If in multiplayer mode, reset multiplayer state
    if (multiplayerGame && multiplayerGame.isMultiplayerMode()) {
        // Reset multiplayer button state
        const multiplayerButton = document.getElementById('multiplayer-button');
        multiplayerButton.classList.remove('active');
        
        // Reset multiplayer game state
        multiplayerGame.resetMultiplayerState();
    }
    
    // Remove leaderboard button active state
    removeLeaderboardButtonActiveState();
}

// Get a random color for the ball
function getRandomColor() {
    const colors = [
        '#FF5733', '#33FF57', '#3357FF', 
        '#FF33A8', '#33FFF6', '#F6FF33',
        '#FF8333', '#33FF83', '#8333FF'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Update the data model view
function updateDataModelView() {
    // Update questions array
    const questionsArrayDisplay = document.getElementById('questions-array');
    let questionsHtml = `
        <table>
            <tr>
                <th>Index</th>
                <th>Question</th>
                <th>Answer</th>
            </tr>
    `;
    
    questions.forEach((q, index) => {
        const isCurrentClass = index === currentQuestionIndex ? 'class="current-question"' : '';
        questionsHtml += `
            <tr ${isCurrentClass}>
                <td>${index}</td>
                <td>${q.question}</td>
                <td>${q.answer}</td>
            </tr>
        `;
    });
    
    questionsHtml += '</table>';
    questionsArrayDisplay.innerHTML = questionsHtml;
    
    // Update balls info
    const ballsInfoDisplay = document.getElementById('balls-info');
    ballsInfoDisplay.innerHTML = `
        <div class="data-item">
            <span class="data-label">Total Balls:</span>
            <span class="data-value">${balls.length}</span>
        </div>
    `;
}

// Handle click events
function handleClick(event) {
    // Get click position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / SCALE; // Convert to Box2D coordinates
    const clickY = (event.clientY - rect.top) / SCALE;
    
    // Check if any ball was clicked
    for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];
        const ballPos = ball.body.GetPosition();
        const dx = clickX - ballPos.x;
        const dy = clickY - ballPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If clicked on a ball
        if (distance <= BALL_RADIUS / SCALE) {
            // Get current question details
            const currentQuestion = questions[currentQuestionIndex];
            const questionText = currentQuestion.question;
            const correctAnswer = currentQuestion.answer;
            const operation = getOperationFromQuestion(questionText);
            
            // Check if it's the correct answer
            const isCorrect = ball.answer === correctAnswer;
            
            if (isCorrect) {
                // Get ball position for confetti explosion
                const ballPos = ball.body.GetPosition();
                const ballX = ballPos.x * SCALE;
                const ballY = ballPos.y * SCALE;
                
                // Play pop sound and create confetti explosion
                playPopSound();
                createConfettiExplosion(ballX, ballY);
                
                // Remove the ball
                world.DestroyBody(ball.body);
                balls.splice(i, 1);
                
                // Increase score and correct answers count
                score += 10;
                correctAnswersCount++;
                
                // Check for win condition
                if (correctAnswersCount >= gameSettings.numberToWin) {
                    gameWon = true;
                    createConfetti();
                    
                    // Send game won message to opponent if in multiplayer
                    if (multiplayerGame && multiplayerGame.isMultiplayerMode()) {
                        multiplayerGame.sendGameWon();
                    }
                    
                    showPlayAgainButton();
                    return; // Stop processing this click
                }
                
                // Remove the answered question from the array
                questions.splice(currentQuestionIndex, 1);
                
                // Add a new question to replace the removed one
                const newQuestion = generateNewQuestion();
                questions.push(newQuestion);
                
                // Send the new question to opponent if in multiplayer mode
                if (multiplayerGame && multiplayerGame.isMultiplayerMode()) {
                    multiplayerGame.sendQuestionToOpponent(newQuestion.question, newQuestion.answer);
                }
                
                // Create a ball for the new question immediately after adding it
                createBallWithAnswer(newQuestion.answer);
                
                // Shuffle the questions array
                shuffleArray(questions);
                
                // Set current question index to 0 (first item after shuffle)
                currentQuestionIndex = 0;
                
                // Update the display
                updateQuestionDisplay();
                
                // Update data model view immediately after state change
                updateDataModelView();
            } else {
                // Wrong answer clicked - create a new ball at the click location
                const clickX = (event.clientX - rect.left);
                const clickY = (event.clientY - rect.top);
                
                // Play muffled click sound and trigger camera shake
                playMuffledClickSound();
                triggerCameraShake(3, 200); // Mild shake for wrong answers
                
                // Add a new question to the array
                questions.push(generateNewQuestion());
                
                // Create a ball for the new question at the click location
                const newQuestion = questions[questions.length - 1];
                createBallAtLocation(newQuestion.answer, clickX, clickY);
                
                // Update data model view immediately after state change
                updateDataModelView();
            }
            
            // Update player stats
            updatePlayerStats(questionText, ball.answer, isCorrect, operation);
            
            break;
        }
    }
}

// Extract operation type from question
function getOperationFromQuestion(question) {
    if (question.includes('+')) return 'addition';
    if (question.includes('-')) return 'subtraction';
    if (question.includes('*')) return 'multiplication';
    if (question.includes('/')) return 'division';
    return 'unknown';
}

// Update player stats with question result
function updatePlayerStats(question, answer, isCorrect, operation) {
    // Update total stats
    playerStats.total++;
    if (isCorrect) {
        playerStats.correct++;
    } else {
        playerStats.incorrect++;
    }
    
    // Update operation-specific stats
    if (playerStats.operations[operation]) {
        playerStats.operations[operation].total++;
        if (isCorrect) {
            playerStats.operations[operation].correct++;
        }
    }
    
    // Add to history
    playerStats.history.push({
        question,
        answer,
        isCorrect,
        operation,
        timestamp: Date.now()
    });
    
    // Limit history size
    if (playerStats.history.length > MAX_HISTORY_ITEMS) {
        playerStats.history.shift(); // Remove oldest item
    }
    
    // Update the display
    updatePlayerStatsDisplay();
    
    // Save to localStorage
    savePlayerStats();
}

// Update the player stats display
function updatePlayerStatsDisplay() {
    // Update summary stats
    document.getElementById('total-questions').textContent = playerStats.total;
    document.getElementById('correct-answers').textContent = playerStats.correct;
    document.getElementById('incorrect-answers').textContent = playerStats.incorrect;
    
    // Calculate accuracy
    const accuracy = playerStats.total > 0 ? 
        Math.round((playerStats.correct / playerStats.total) * 100) : 0;
    document.getElementById('accuracy').textContent = accuracy + '%';
    
    // Update operation stats
    updateOperationStats('addition');
    updateOperationStats('subtraction');
    updateOperationStats('multiplication');
    updateOperationStats('division');
    
    // Update performance graph
    updatePerformanceGraph();
}

// Update stats for a specific operation
function updateOperationStats(operation) {
    const stats = playerStats.operations[operation];
    const correctElement = document.getElementById(`${operation}-correct`);
    const totalElement = document.getElementById(`${operation}-total`);
    const progressElement = document.getElementById(`${operation}-progress`);
    
    if (correctElement && totalElement && progressElement) {
        correctElement.textContent = stats.correct;
        totalElement.textContent = `/ ${stats.total}`;
        
        // Calculate and set progress percentage
        const percentage = stats.total > 0 ? 
            Math.round((stats.correct / stats.total) * 100) : 0;
        progressElement.style.width = `${percentage}%`;
    }
}

// Update the performance graph
function updatePerformanceGraph() {
    const graphContainer = document.getElementById('performance-graph');
    if (!graphContainer) return;
    
    // Clear previous content
    graphContainer.innerHTML = '';
    
    // If no history, show a message
    if (playerStats.history.length === 0) {
        graphContainer.innerHTML = '<div style="text-align:center;margin-top:50px;color:#666;">No question history yet. Start playing to see your performance!</div>';
        return;
    }
    
    // Count questions by frequency and correctness
    const questionStats = {};
    
    playerStats.history.forEach(item => {
        if (!questionStats[item.question]) {
            questionStats[item.question] = {
                question: item.question,
                correct: 0,
                incorrect: 0,
                total: 0
            };
        }
        
        questionStats[item.question].total++;
        if (item.isCorrect) {
            questionStats[item.question].correct++;
        } else {
            questionStats[item.question].incorrect++;
        }
    });
    
    // Convert to arrays and sort
    const questionsArray = Object.values(questionStats);
    
    // Most frequently missed questions (highest incorrect count)
    const mostMissed = [...questionsArray]
        .filter(q => q.incorrect > 0)
        .sort((a, b) => b.incorrect - a.incorrect)
        .slice(0, 5);
    
    // Most frequently correct questions (highest correct count)
    const mostCorrect = [...questionsArray]
        .filter(q => q.correct > 0)
        .sort((a, b) => b.correct - a.correct)
        .slice(0, 5);
    
    // Create the display
    let html = '<div style="display: flex; gap: 20px; height: 100%;">';
    
    // Most missed questions
    html += '<div style="flex: 1;">';
    html += '<h4 style="margin: 0 0 10px 0; color: #F44336;">Most Frequently Missed</h4>';
    
    if (mostMissed.length === 0) {
        html += '<div style="color: #666; font-style: italic;">No missed questions yet!</div>';
    } else {
        html += '<div style="font-size: 12px;">';
        mostMissed.forEach((item, index) => {
            const accuracy = Math.round((item.correct / item.total) * 100);
            html += `
                <div style="margin-bottom: 8px; padding: 5px; background: #ffebee; border-radius: 4px;">
                    <div style="font-weight: bold;">${item.question}</div>
                    <div style="color: #666;">
                        Correct: ${item.correct} | Incorrect: ${item.incorrect} | Accuracy: ${accuracy}%
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    html += '</div>';
    
    // Most correct questions
    html += '<div style="flex: 1;">';
    html += '<h4 style="margin: 0 0 10px 0; color: #4CAF50;">Most Frequently Correct</h4>';
    
    if (mostCorrect.length === 0) {
        html += '<div style="color: #666; font-style: italic;">No correct questions yet!</div>';
    } else {
        html += '<div style="font-size: 12px;">';
        mostCorrect.forEach((item, index) => {
            const accuracy = Math.round((item.correct / item.total) * 100);
            html += `
                <div style="margin-bottom: 8px; padding: 5px; background: #e8f5e8; border-radius: 4px;">
                    <div style="font-weight: bold;">${item.question}</div>
                    <div style="color: #666;">
                        Correct: ${item.correct} | Incorrect: ${item.incorrect} | Accuracy: ${accuracy}%
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    html += '</div>';
    
    html += '</div>';
    
    graphContainer.innerHTML = html;
}

// Save player stats to localStorage
function savePlayerStats() {
    try {
        localStorage.setItem('mathogenPlayerStats', JSON.stringify(playerStats));
    } catch (e) {
        console.error('Failed to save player stats:', e);
    }
}

// Load player stats from localStorage
function loadPlayerStats() {
    try {
        const savedStats = localStorage.getItem('mathogenPlayerStats');
        if (savedStats) {
            const parsedStats = JSON.parse(savedStats);
            
            // Update playerStats with saved data
            playerStats.total = parsedStats.total || 0;
            playerStats.correct = parsedStats.correct || 0;
            playerStats.incorrect = parsedStats.incorrect || 0;
            
            // Update operation stats
            if (parsedStats.operations) {
                for (const op in parsedStats.operations) {
                    if (playerStats.operations[op]) {
                        playerStats.operations[op].total = parsedStats.operations[op].total || 0;
                        playerStats.operations[op].correct = parsedStats.operations[op].correct || 0;
                    }
                }
            }
            
            // Update history
            if (Array.isArray(parsedStats.history)) {
                playerStats.history = parsedStats.history.slice(-MAX_HISTORY_ITEMS);
            }
            
            // Update the display
            updatePlayerStatsDisplay();
        }
    } catch (e) {
        console.error('Failed to load player stats:', e);
    }
}

// Add a button to clear player stats
document.addEventListener('DOMContentLoaded', function() {
    const playerStatsHeader = document.querySelector('#player-stats h2');
    if (playerStatsHeader) {
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Stats';
        clearButton.style.marginLeft = '15px';
        clearButton.style.fontSize = '14px';
        clearButton.style.padding = '4px 10px';
        clearButton.style.verticalAlign = 'middle';
        
        clearButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear all player stats?')) {
                // Reset player stats
                playerStats.total = 0;
                playerStats.correct = 0;
                playerStats.incorrect = 0;
                
                for (const op in playerStats.operations) {
                    playerStats.operations[op].total = 0;
                    playerStats.operations[op].correct = 0;
                }
                
                playerStats.history = [];
                
                // Update display
                updatePlayerStatsDisplay();
                
                // Clear localStorage
                localStorage.removeItem('mathogenPlayerStats');
            }
        });
        
        playerStatsHeader.appendChild(clearButton);
    }
});

// Initialize toggle button functionality
function initializeToggleButton() {
    const toggleButton = document.getElementById('toggle-button');
    
    if (toggleButton) {
        toggleButton.addEventListener('click', function() {
            const body = document.body;
            
            // Toggle the class
            if (body.classList.contains('panels-hidden')) {
                body.classList.remove('panels-hidden');
                toggleButton.classList.add('active');
                
                // Update data model view when panels are shown
                updateDataModelView();
                updatePlayerStatsDisplay();
            } else {
                body.classList.add('panels-hidden');
                toggleButton.classList.remove('active');
            }
            
            // No need to resize canvas - keep original dimensions
        });
    }
}

// Initialize leaderboard button functionality
function initializeLeaderboardButton() {
    const leaderboardButton = document.getElementById('leaderboard-button');
    
    if (leaderboardButton) {
        leaderboardButton.addEventListener('click', function() {
            // Load leaderboard data
            loadLeaderboard();
            
            // Show leaderboard overlay
            showLeaderboardOverlay();
            
            // Add active state to button
            leaderboardButton.classList.add('active');
        });
    }
}

// Function to remove leaderboard button active state
function removeLeaderboardButtonActiveState() {
    const leaderboardButton = document.getElementById('leaderboard-button');
    if (leaderboardButton) {
        leaderboardButton.classList.remove('active');
    }
}

// Resize canvas to fit the game area - only called during initial setup, not when toggling panels
function resizeCanvas() {
    if (canvas) {
        // Keep canvas at fixed dimensions
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
    }
}

// Draw a ball
function drawBall(ball) {
    const position = ball.body.GetPosition();
    const x = position.x * SCALE;
    const y = position.y * SCALE;
    
    // Apply camera shake
    const finalX = x + cameraShake.x;
    const finalY = y + cameraShake.y;

    // Draw the ball
    ctx.beginPath();
    ctx.arc(finalX, finalY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw the answer text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ball.answer, finalX, finalY);
}

// Main game loop
function gameLoop(timestamp) {
    // Clear the canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Update physics world
    world.Step(1 / 60, 8, 3);
    world.ClearForces();

    // Update camera shake
    updateCameraShake();
    
    // Draw all balls
    balls.forEach(drawBall);
    
    // Update and draw confetti if game is won
    if (gameWon) {
        updateConfetti();
        drawConfetti();
    } else {
        // Update and draw confetti particles for ball explosions
        updateConfetti();
        drawConfetti();
    }
    
    // Update data model view periodically
    if (timestamp - lastDataUpdateTime > DATA_UPDATE_INTERVAL) {
        updateDataModelView();
        lastDataUpdateTime = timestamp;
    }
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Start the game when the page loads
window.addEventListener('load', init);

// Multiplayer integration functions
function initMultiplayerGame() {
    // Reset game state for multiplayer
    correctAnswersCount = 0;
    gameWon = false;
    score = 0;
    confettiParticles = [];
    
    // Clear all balls
    clearAllBalls();
    
    // Generate new questions
    generateQuestions();
    currentQuestionIndex = 0;
    
    // Update displays
    updateQuestionDisplay();
    updateDataModelView();
    
    // Spawn initial balls
    spawnInitialBalls();
    
    // Update game info to show multiplayer status
    const questionElement = document.getElementById('question');
    const playerInfo = multiplayerGame.getPlayerInfo();
    questionElement.innerHTML = `Multiplayer - ${playerInfo.screenName}<br>Question: ${questions[currentQuestionIndex].question}`;
}

// Function called when receiving a question from opponent
function addQuestionFromOpponent(question, answer, fromPlayer) {
    // Add the question to our questions array
    questions.push({
        question: question,
        answer: answer
    });
    
    // Create a ball for the new question
    createBallWithAnswer(answer);
    
    // Update data model view
    updateDataModelView();
    
    // Show notification
    showOpponentQuestionNotification(fromPlayer, question);
}

// Function called when opponent wins
function handleOpponentWon(winner) {
    // Show opponent won overlay
    showOpponentWonOverlay(winner);
}

// Show notification when opponent adds a question
function showOpponentQuestionNotification(fromPlayer, question) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1001;
        font-size: 16px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        animation: slideDown 0.5s ease-out;
    `;
    
    notification.innerHTML = `<strong>${fromPlayer}</strong> added: ${question}`;
    
    // Add animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 3000);
}

// Show overlay when opponent wins
function showOpponentWonOverlay(winner) {
    const gameArea = document.getElementById('game-area');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'opponent-won-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 100;
    `;
    
    // Create message
    const message = document.createElement('h2');
    message.textContent = `${winner} won the game!`;
    message.style.cssText = `
        color: white;
        font-size: 36px;
        margin-bottom: 20px;
        text-align: center;
    `;
    
    // Create play again button
    const playAgainButton = document.createElement('button');
    playAgainButton.textContent = 'Play Again';
    playAgainButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 15px 30px;
        font-size: 18px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.3s;
    `;
    
    playAgainButton.addEventListener('mouseenter', () => {
        playAgainButton.style.background = '#45a049';
    });
    
    playAgainButton.addEventListener('mouseleave', () => {
        playAgainButton.style.background = '#4CAF50';
    });
    
    playAgainButton.addEventListener('click', () => {
        overlay.remove();
        resetGame();
    });
    
    overlay.appendChild(message);
    overlay.appendChild(playAgainButton);
    gameArea.appendChild(overlay);
}

// Leaderboard functions
function loadLeaderboard() {
    try {
        const savedLeaderboard = localStorage.getItem('mathogenLeaderboard');
        if (savedLeaderboard) {
            const parsed = JSON.parse(savedLeaderboard);
            leaderboard.scores = parsed.scores || [];
            leaderboard.currentPlayerName = parsed.currentPlayerName || null;
        }
    } catch (e) {
        console.error('Failed to load leaderboard:', e);
    }
}

function saveLeaderboard() {
    try {
        localStorage.setItem('mathogenLeaderboard', JSON.stringify(leaderboard));
    } catch (e) {
        console.error('Failed to save leaderboard:', e);
    }
}

function addScoreToLeaderboard(screenName, score) {
    const newScore = {
        screenName: screenName,
        score: score,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
    };
    
    leaderboard.scores.push(newScore);
    
    // Sort by score (highest first)
    leaderboard.scores.sort((a, b) => b.score - a.score);
    
    // Keep only top 10 scores
    if (leaderboard.scores.length > 10) {
        leaderboard.scores = leaderboard.scores.slice(0, 10);
    }
    
    // Save current player name for future games
    leaderboard.currentPlayerName = screenName;
    
    saveLeaderboard();
}

function showLeaderboardOverlay() {
    const gameArea = document.getElementById('game-area');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'leaderboard-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 100;
    `;
    
    // Create leaderboard container
    const leaderboardContainer = document.createElement('div');
    leaderboardContainer.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 600px;
        width: 90%;
        text-align: center;
        position: relative;
    `;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.3s;
    `;
    
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = '#f0f0f0';
    });
    
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'transparent';
    });
    
    closeButton.addEventListener('click', () => {
        overlay.remove();
        removeLeaderboardButtonActiveState(); // Remove active state when closing
    });
    
    // Create title
    const title = document.createElement('h2');
    title.textContent = '🏆 Leaderboard';
    title.style.cssText = `
        margin-top: 0;
        color: #333;
        margin-bottom: 20px;
        font-size: 28px;
    `;
    
    // Create leaderboard table
    const table = document.createElement('table');
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        font-size: 16px;
    `;
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr style="background-color: #f2f2f2;">
            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Rank</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Player</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Score</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Date</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    if (leaderboard.scores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 20px; text-align: center; color: #666; font-style: italic;">
                    No scores yet. Be the first to set a record!
                </td>
            </tr>
        `;
    } else {
        leaderboard.scores.forEach((score, index) => {
            const row = document.createElement('tr');
            const isCurrentPlayer = score.screenName === leaderboard.currentPlayerName;
            
            if (isCurrentPlayer) {
                row.style.backgroundColor = '#e8f5e8';
                row.style.fontWeight = 'bold';
            }
            
            row.innerHTML = `
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                    ${index + 1}
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: left;">
                    ${score.screenName}
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">
                    ${score.score}
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                    ${score.date}
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    table.appendChild(tbody);
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 20px;
    `;
    
    // Create play again button (only show if game is in progress)
    if (gameWon || correctAnswersCount > 0) {
        const playAgainButton = document.createElement('button');
        playAgainButton.textContent = 'Play Again';
        playAgainButton.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 18px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.3s;
        `;
        
        playAgainButton.addEventListener('mouseenter', () => {
            playAgainButton.style.background = '#45a049';
        });
        
        playAgainButton.addEventListener('mouseleave', () => {
            playAgainButton.style.background = '#4CAF50';
        });
        
        playAgainButton.addEventListener('click', () => {
            overlay.remove();
            resetGame();
        });
        
        buttonContainer.appendChild(playAgainButton);
    }
    
    // Create close button for the bottom
    const closeButtonBottom = document.createElement('button');
    closeButtonBottom.textContent = 'Close';
    closeButtonBottom.style.cssText = `
        background: #666;
        color: white;
        border: none;
        padding: 15px 30px;
        font-size: 18px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.3s;
    `;
    
    closeButtonBottom.addEventListener('mouseenter', () => {
        closeButtonBottom.style.background = '#555';
    });
    
    closeButtonBottom.addEventListener('mouseleave', () => {
        closeButtonBottom.style.background = '#666';
    });
    
    closeButtonBottom.addEventListener('click', () => {
        overlay.remove();
        removeLeaderboardButtonActiveState(); // Remove active state when closing
    });
    
    buttonContainer.appendChild(closeButtonBottom);
    
    leaderboardContainer.appendChild(closeButton);
    leaderboardContainer.appendChild(title);
    leaderboardContainer.appendChild(table);
    leaderboardContainer.appendChild(buttonContainer);
    overlay.appendChild(leaderboardContainer);
    gameArea.appendChild(overlay);
}

function showPlayerNameInput() {
    const gameArea = document.getElementById('game-area');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'player-name-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 100;
    `;
    
    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
        text-align: center;
    `;
    
    // Create title
    const title = document.createElement('h2');
    title.textContent = '🎉 Congratulations!';
    title.style.cssText = `
        margin-top: 0;
        color: #333;
        margin-bottom: 10px;
        font-size: 24px;
    `;
    
    // Create score display
    const scoreDisplay = document.createElement('p');
    scoreDisplay.textContent = `Your Score: ${score}`;
    scoreDisplay.style.cssText = `
        font-size: 18px;
        color: #4CAF50;
        font-weight: bold;
        margin-bottom: 20px;
    `;
    
    // Create input label
    const label = document.createElement('p');
    label.textContent = 'Enter your name for the leaderboard:';
    label.style.cssText = `
        margin-bottom: 15px;
        color: #666;
    `;
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Your name';
    input.maxLength = 20;
    input.style.cssText = `
        width: 100%;
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 5px;
        font-size: 16px;
        box-sizing: border-box;
        margin-bottom: 20px;
    `;
    
    // Focus on input
    setTimeout(() => input.focus(), 100);
    
    // Create save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Score';
    saveButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 12px 24px;
        font-size: 16px;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.3s;
        margin-right: 10px;
    `;
    
    saveButton.addEventListener('mouseenter', () => {
        saveButton.style.background = '#45a049';
    });
    
    saveButton.addEventListener('mouseleave', () => {
        saveButton.style.background = '#4CAF50';
    });
    
    // Create skip button
    const skipButton = document.createElement('button');
    skipButton.textContent = 'Skip';
    skipButton.style.cssText = `
        background: #f44336;
        color: white;
        border: none;
        padding: 12px 24px;
        font-size: 16px;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.3s;
    `;
    
    skipButton.addEventListener('mouseenter', () => {
        skipButton.style.background = '#da190b';
    });
    
    skipButton.addEventListener('mouseleave', () => {
        skipButton.style.background = '#f44336';
    });
    
    // Handle save button click
    const handleSave = () => {
        const playerName = input.value.trim();
        if (playerName) {
            addScoreToLeaderboard(playerName, score);
            overlay.remove();
            showLeaderboardOverlay();
        } else {
            alert('Please enter your name');
        }
    };
    
    // Handle skip button click
    const handleSkip = () => {
        overlay.remove();
        showLeaderboardOverlay();
    };
    
    saveButton.addEventListener('click', handleSave);
    skipButton.addEventListener('click', handleSkip);
    
    // Handle Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    });
    
    inputContainer.appendChild(title);
    inputContainer.appendChild(scoreDisplay);
    inputContainer.appendChild(label);
    inputContainer.appendChild(input);
    inputContainer.appendChild(saveButton);
    inputContainer.appendChild(skipButton);
    overlay.appendChild(inputContainer);
    gameArea.appendChild(overlay);
}

function handleSinglePlayerGameEnd() {
    // Load leaderboard data
    loadLeaderboard();
    
    // Check if player already has a saved name
    if (leaderboard.currentPlayerName) {
        // Use existing name and show leaderboard directly
        addScoreToLeaderboard(leaderboard.currentPlayerName, score);
        showLeaderboardOverlay();
    } else {
        // Ask for player name first
        showPlayerNameInput();
    }
}