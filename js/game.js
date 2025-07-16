// Game constants - default values, can be changed via settings
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 600;
let BALL_RADIUS = 41;
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
    ballSize: 41,
    gravity: 10,
    numberToWin: 7
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
    gameSettings.ballSize = 41;
    gameSettings.gravity = 10;
    gameSettings.numberToWin = 7;
    
    // Update UI
    document.getElementById('addition').checked = true;
    document.getElementById('subtraction').checked = true;
    document.getElementById('multiplication').checked = true;
    document.getElementById('division').checked = false;
    document.getElementById('min-number').value = 1;
    document.getElementById('max-number').value = 10;
    document.getElementById('question-count').value = 7;
    document.getElementById('ball-size').value = 41;
    document.getElementById('ball-size-value').textContent = 41;
    document.getElementById('gravity').value = 10;
    document.getElementById('gravity-value').textContent = 10;
    document.getElementById('number-to-win').value = 7;
    document.getElementById('number-to-win-value').textContent = 7;
    
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
    questionElement.textContent = `Question: ${questions[currentQuestionIndex].question}`;
    
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
    
    // Add ball to array
    balls.push({
        body: body,
        answer: answer,
        color: getRandomColor()
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
    
    // Add ball to array
    balls.push({
        body: body,
        answer: answer,
        color: getRandomColor()
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
    // Update current question
    const currentQuestionDisplay = document.getElementById('current-question-display');
    const currentQuestion = questions[currentQuestionIndex];
    currentQuestionDisplay.innerHTML = `
        <table>
            <tr>
                <th>Index</th>
                <th>Question</th>
                <th>Answer</th>
            </tr>
            <tr>
                <td>${currentQuestionIndex}</td>
                <td>${currentQuestion.question}</td>
                <td>${currentQuestion.answer}</td>
            </tr>
        </table>
    `;
    
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
        <div class="data-item">
            <span class="data-label">Answer Distribution:</span>
        </div>
    `;
    
    // Count balls by answer
    const answerCounts = {};
    balls.forEach(ball => {
        if (!answerCounts[ball.answer]) {
            answerCounts[ball.answer] = 0;
        }
        answerCounts[ball.answer]++;
    });
    
    // Create table for answer distribution
    let answerDistHtml = `
        <table>
            <tr>
                <th>Answer</th>
                <th>Count</th>
                <th>Is Current Answer</th>
            </tr>
    `;
    
    for (const answer in answerCounts) {
        const isCurrentAnswer = answer === currentQuestion.answer;
        const isCurrentClass = isCurrentAnswer ? 'class="current-question"' : '';
        answerDistHtml += `
            <tr ${isCurrentClass}>
                <td>${answer}</td>
                <td>${answerCounts[answer]}</td>
                <td>${isCurrentAnswer ? 'Yes' : 'No'}</td>
            </tr>
        `;
    }
    
    answerDistHtml += '</table>';
    ballsInfoDisplay.innerHTML += answerDistHtml;
    
    // Update game state
    const gameStateDisplay = document.getElementById('game-state');
    gameStateDisplay.innerHTML = `
        <div class="data-item">
            <span class="data-label">Score:</span>
            <span class="data-value">${score}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Need To Respawn:</span>
            <span class="data-value">N/A</span>
        </div>
        <div class="data-item">
            <span class="data-label">Respawn Timer:</span>
            <span class="data-value">N/A</span>
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
                    showPlayAgainButton();
                    return; // Stop processing this click
                }
                
                // Remove the answered question from the array
                questions.splice(currentQuestionIndex, 1);
                
                // Add a new question to replace the removed one
                questions.push(generateNewQuestion());
                
                // Create a ball for the new question immediately after adding it
                const newQuestion = questions[questions.length - 1]; // The question we just added
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
    
    // Draw the ball
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
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
    ctx.fillText(ball.answer, x, y);
}

// Main game loop
function gameLoop(timestamp) {
    // Clear the canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Update physics world
    world.Step(1 / 60, 8, 3);
    world.ClearForces();
    
    // Draw all balls
    balls.forEach(drawBall);
    
    // Update and draw confetti if game is won
    if (gameWon) {
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