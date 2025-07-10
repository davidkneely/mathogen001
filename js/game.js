// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BALL_RADIUS = 30;
const BALL_SPAWN_INTERVAL = 2000; // ms
const GRAVITY = 10;
const QUESTION_COUNT = 7;
const SCALE = 30; // Box2D works in meters, we need to convert to pixels
const INITIAL_BALL_COUNT = 15; // Number of balls to spawn initially
const RESPAWN_DELAY = 5000; // ms to wait before respawning all balls
const SPAWN_HEIGHT_RANGE = 200; // Range of heights above the canvas to spawn balls
const DATA_UPDATE_INTERVAL = 500; // ms between data model updates

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
let needToRespawnBalls = false;
let respawnTimer = 0;
let lastDataUpdateTime = 0;

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
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
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

// Generate math questions
function generateQuestions() {
    questions = [
        { question: "1 + 1 = ?", answer: "2" },
        { question: "2 + 2 = ?", answer: "4" },
        { question: "3 + 3 = ?", answer: "6" },
        { question: "4 + 4 = ?", answer: "8" },
        { question: "5 + 5 = ?", answer: "10" },
        { question: "6 + 4 = ?", answer: "10" },
        { question: "7 + 3 = ?", answer: "10" }
    ];
}

// Generate a new question to replace a completed one
function generateNewQuestion() {
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let a, b, answer;
    
    switch (op) {
        case '+':
            a = Math.floor(Math.random() * 10) + 1;
            b = Math.floor(Math.random() * 10) + 1;
            answer = a + b;
            break;
        case '-':
            a = Math.floor(Math.random() * 10) + 5;
            b = Math.floor(Math.random() * 5) + 1;
            answer = a - b;
            break;
        case '*':
            a = Math.floor(Math.random() * 5) + 1;
            b = Math.floor(Math.random() * 5) + 1;
            answer = a * b;
            break;
    }
    
    return {
        question: `${a} ${op} ${b} = ?`,
        answer: answer.toString()
    };
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
    
    // Get all possible answers from current questions
    const possibleAnswers = questions.map(q => q.answer);
    
    // Make sure the current answer is included
    const currentAnswer = questions[currentQuestionIndex].answer;
    
    // Calculate how many of each answer type to create
    const ballsPerAnswer = Math.floor(INITIAL_BALL_COUNT / possibleAnswers.length);
    const extraBalls = INITIAL_BALL_COUNT - (ballsPerAnswer * possibleAnswers.length);
    
    // Create balls for each answer
    for (let i = 0; i < possibleAnswers.length; i++) {
        const answer = possibleAnswers[i];
        // Create more balls for the current answer to increase chances
        const count = answer === currentAnswer ? 
            ballsPerAnswer + extraBalls : 
            ballsPerAnswer;
        
        for (let j = 0; j < count; j++) {
            createBallWithAnswer(answer);
        }
    }
    
    // Ensure at least one ball has the current answer
    let hasCurrentAnswer = balls.some(ball => ball.answer === currentAnswer);
    if (!hasCurrentAnswer) {
        createBallWithAnswer(currentAnswer);
    }
    
    needToRespawnBalls = false;
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
            <span class="data-value">${needToRespawnBalls}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Respawn Timer:</span>
            <span class="data-value">${respawnTimer > 0 ? (respawnTimer / 1000).toFixed(1) + 's' : 'N/A'}</span>
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
            // Check if it's the correct answer
            if (ball.answer === questions[currentQuestionIndex].answer) {
                // Remove the ball
                world.DestroyBody(ball.body);
                balls.splice(i, 1);
                
                // Increase score
                score += 10;
                
                // Replace the completed question with a new one
                questions[currentQuestionIndex] = generateNewQuestion();
                
                // Move to the next question
                currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
                
                // Update the display
                updateQuestionDisplay();
                
                // Update data model view immediately after state change
                updateDataModelView();
                
                // Schedule a respawn of all balls
                needToRespawnBalls = true;
                respawnTimer = RESPAWN_DELAY;
            }
            break;
        }
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
    
    // Check if we need to respawn balls
    if (needToRespawnBalls) {
        respawnTimer -= 16.67; // Approximate time between frames at 60fps
        
        if (respawnTimer <= 0) {
            spawnInitialBalls();
        }
    }
    
    // Draw all balls
    balls.forEach(drawBall);
    
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