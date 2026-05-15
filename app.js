// Game state
const gameState = {
    phase: 'splash', // splash, placement, playing, gameover
    currentPlayer: 'player',
    difficulty: 2,
    lastPlayedDifficulty: 2,
    playerShips: [],
    computerShips: [],
    playerHits: new Set(),
    playerMisses: new Set(),
    computerHits: new Set(),
    computerMisses: new Set(),
    computerLastHit: null,
    computerTargetQueue: [],
    shipsPlaced: 0,
    playerSunkShips: [],
    computerSunkShips: [],
    showComputerShips: false
};

// Statistics tracking
let statistics = {
    1: { wins: 0, losses: 0 },
    2: { wins: 0, losses: 0 },
    3: { wins: 0, losses: 0 }
};

// Load statistics from localStorage
function loadStatistics() {
    const saved = localStorage.getItem('battleshipStats');
    if (saved) {
        statistics = JSON.parse(saved);
    }
}

// Save statistics to localStorage
function saveStatistics() {
    localStorage.setItem('battleshipStats', JSON.stringify(statistics));
}

// Ship definitions
const SHIPS = [
    { name: 'destroyer', length: 2 },
    { name: 'submarine', length: 3 },
    { name: 'cruiser', length: 3 },
    { name: 'battleship', length: 4 },
    { name: 'carrier', length: 5 }
];

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const BUFFER = 26;
const DURATION = 2000;
const DELAYS = [0, 140, 280];

// DOM elements
let splashScreen, gameScreen, messageArea;
let stagingSurface, playerSurface, computerBoard, playerBoard;
let stagingShips, leftBoardLabel;
let startGameBtn, difficultySelector, debugToggleBtn, newGameBtn, randomizeBtn, viewStatsBtn;
let statsModal, statsModalBody, closeStatsModal;

// Drag state
let draggedShip = null;
let draggedShipElement = null;
let shipOriginalParent = null;
let shipOriginalPosition = { x: 0, y: 0 };
let dragOffset = 0; // Which segment was grabbed

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    splashScreen = document.getElementById('splash-screen');
    gameScreen = document.getElementById('game-screen');
    messageArea = document.getElementById('message-area');
    stagingSurface = document.getElementById('staging-surface');
    playerSurface = document.getElementById('player-surface');
    computerBoard = document.getElementById('computer-board');
    playerBoard = document.getElementById('player-board');
    stagingShips = document.getElementById('staging-ships');
    leftBoardLabel = document.getElementById('left-board-label');
    startGameBtn = document.getElementById('start-game-btn');
    difficultySelector = document.getElementById('difficulty-selector');
    debugToggleBtn = document.getElementById('debug-toggle-btn');
    newGameBtn = document.getElementById('new-game-btn');
    randomizeBtn = document.getElementById('randomize-btn');
    viewStatsBtn = document.getElementById('view-stats-btn');
    statsModal = document.getElementById('stats-modal');
    statsModalBody = document.getElementById('stats-modal-body');
    closeStatsModal = document.getElementById('close-stats-modal');

    // Setup event listeners
    splashScreen.addEventListener('click', startSetup);
    startGameBtn.addEventListener('click', beginGame);
    debugToggleBtn.addEventListener('click', toggleComputerShips);
    newGameBtn.addEventListener('click', resetGame);
    randomizeBtn.addEventListener('click', randomizePlayerShips);
    viewStatsBtn.addEventListener('click', showStatsModal);
    closeStatsModal.addEventListener('click', hideStatsModal);

    // Close modal when clicking overlay
    statsModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            hideStatsModal();
        }
    });

    // Difficulty buttons
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            gameState.difficulty = parseInt(btn.dataset.difficulty);
            gameState.lastPlayedDifficulty = gameState.difficulty;
        });
    });

    // Create game boards
    createBoard(playerBoard, 'player');
    createBoard(computerBoard, 'computer');

    // Setup ship drag and drop
    setupShipDragDrop();

    // Load statistics
    loadStatistics();
});

// Start setup phase
function startSetup() {
    splashScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    gameState.phase = 'placement';
}

// Create a game board
function createBoard(boardElement, type) {
    boardElement.innerHTML = '';
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.dataset.board = type;
        boardElement.appendChild(cell);

        // Add click handler for player board during placement to return ships
        if (type === 'player') {
            cell.addEventListener('click', () => {
                if (gameState.phase === 'placement' && cell.classList.contains('ship-placed')) {
                    returnShipToStaging(cell.dataset.ship);
                }
            });
        }
    }
}

// Setup drag and drop for ships
function setupShipDragDrop() {
    const ships = document.querySelectorAll('.ship');

    ships.forEach(ship => {
        // Click to rotate in staging, or return to staging if on board
        ship.addEventListener('click', (e) => {
            if (gameState.phase !== 'placement') return;

            if (ship.parentElement === stagingShips) {
                ship.classList.toggle('vertical');
            }
        });

        // Mouse down to capture which segment was clicked
        ship.addEventListener('mousedown', (e) => {
            if (gameState.phase !== 'placement') return;

            const rect = ship.getBoundingClientRect();
            const segments = ship.querySelectorAll('.ship-segment');

            // Find which segment was clicked
            for (let i = 0; i < segments.length; i++) {
                const segRect = segments[i].getBoundingClientRect();
                if (e.clientX >= segRect.left && e.clientX <= segRect.right &&
                    e.clientY >= segRect.top && e.clientY <= segRect.bottom) {
                    dragOffset = i;
                    break;
                }
            }
        });

        // Drag start
        ship.addEventListener('dragstart', (e) => {
            if (gameState.phase !== 'placement') return;
            draggedShipElement = ship;
            draggedShip = {
                name: ship.dataset.ship,
                length: parseInt(ship.dataset.length),
                isVertical: ship.classList.contains('vertical')
            };
            shipOriginalParent = ship.parentElement;
            const rect = ship.getBoundingClientRect();
            shipOriginalPosition = { x: rect.left, y: rect.top };
            ship.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        // Drag end
        ship.addEventListener('dragend', (e) => {
            ship.classList.remove('dragging');
            dragOffset = 0;
        });
    });

    // Player board drop
    playerBoard.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    playerBoard.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedShip || gameState.phase !== 'placement') return;

        const cell = e.target.closest('.cell');
        if (!cell) {
            animateReturnToStaging();
            return;
        }

        let dropIndex = parseInt(cell.dataset.index);

        // Adjust for drag offset
        if (draggedShip.isVertical) {
            dropIndex = dropIndex - (dragOffset * GRID_SIZE);
        } else {
            dropIndex = dropIndex - dragOffset;
        }

        // If ship was already on board, remove it first
        if (draggedShipElement.dataset.placed === 'true') {
            removeShipFromBoard(draggedShip.name, 'player');
            gameState.shipsPlaced--;
        }

        if (canPlaceShip(dropIndex, draggedShip, 'player')) {
            placeShip(dropIndex, draggedShip, 'player', draggedShipElement);
            draggedShipElement.dataset.placed = 'true';
            gameState.shipsPlaced++;

            if (gameState.shipsPlaced === SHIPS.length) {
                messageArea.textContent = 'All ships placed! Choose difficulty and click Start Game.';
                startGameBtn.style.display = 'inline-block';
                difficultySelector.style.display = 'flex';
                // Select the last played difficulty
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
                document.querySelector(`[data-difficulty="${gameState.lastPlayedDifficulty}"]`).classList.add('selected');
                gameState.difficulty = gameState.lastPlayedDifficulty;
            } else {
                messageArea.textContent = `Ship placed! ${SHIPS.length - gameState.shipsPlaced} ships remaining.`;
            }
        } else {
            animateReturnToStaging();
        }

        draggedShip = null;
        draggedShipElement = null;
        dragOffset = 0;
    });
}

// Check if ship can be placed
function canPlaceShip(startIndex, ship, boardType) {
    const positions = getShipPositions(startIndex, ship);
    if (!positions) return false;

    const board = boardType === 'player' ? playerBoard : computerBoard;
    const cells = Array.from(board.children);

    // Check if all positions are valid and not taken
    return positions.every(pos => {
        if (pos < 0 || pos >= GRID_SIZE * GRID_SIZE) return false;
        const cell = cells[pos];
        return cell && !cell.classList.contains('ship-placed');
    });
}

// Get ship positions
function getShipPositions(startIndex, ship) {
    const positions = [];
    const row = Math.floor(startIndex / GRID_SIZE);
    const col = startIndex % GRID_SIZE;

    for (let i = 0; i < ship.length; i++) {
        if (ship.isVertical) {
            const newRow = row + i;
            if (newRow >= GRID_SIZE) return null;
            positions.push(startIndex + i * GRID_SIZE);
        } else {
            const newCol = col + i;
            if (newCol >= GRID_SIZE) return null;
            positions.push(startIndex + i);
        }
    }

    return positions;
}

// Remove ship from board
function removeShipFromBoard(shipName, boardType) {
    const board = boardType === 'player' ? playerBoard : computerBoard;
    const cells = Array.from(board.children);
    const shipArray = boardType === 'player' ? gameState.playerShips : gameState.computerShips;

    // Remove ship from cells
    cells.forEach(cell => {
        if (cell.dataset.ship === shipName) {
            cell.classList.remove('ship-placed', 'ship-start', 'ship-middle', 'ship-end', 'ship-horizontal', 'ship-vertical');
            delete cell.dataset.ship;
        }
    });

    // Remove ship from array
    const index = shipArray.findIndex(s => s.name === shipName);
    if (index !== -1) {
        shipArray.splice(index, 1);
    }
}

// Return ship to staging area
function returnShipToStaging(shipName) {
    // Get ship info
    const shipDef = SHIPS.find(s => s.name === shipName);
    if (!shipDef) return;

    // Remove from board
    removeShipFromBoard(shipName, 'player');
    gameState.shipsPlaced--;

    // Recreate ship element in staging
    const shipDiv = document.createElement('div');
    shipDiv.className = `ship ${shipName}-container`;
    shipDiv.draggable = true;
    shipDiv.dataset.ship = shipName;
    shipDiv.dataset.length = shipDef.length;

    for (let i = 0; i < shipDef.length; i++) {
        const segment = document.createElement('div');
        segment.className = 'ship-segment';
        shipDiv.appendChild(segment);
    }

    stagingShips.appendChild(shipDiv);

    // Re-setup drag and drop for this ship
    setupShipDragDrop();

    // Update message
    messageArea.textContent = `${shipName.charAt(0).toUpperCase() + shipName.slice(1)} returned to staging. ${SHIPS.length - gameState.shipsPlaced} ships remaining.`;

    // Hide start button if not all ships placed
    if (gameState.shipsPlaced < SHIPS.length) {
        startGameBtn.style.display = 'none';
        difficultySelector.style.display = 'none';
    }
}

// Place ship on board
function placeShip(startIndex, ship, boardType, shipElement) {
    const positions = getShipPositions(startIndex, ship);
    const board = boardType === 'player' ? playerBoard : computerBoard;
    const cells = Array.from(board.children);
    const shipArray = boardType === 'player' ? gameState.playerShips : gameState.computerShips;

    positions.forEach((pos, index) => {
        cells[pos].classList.add('ship-placed');
        cells[pos].dataset.ship = ship.name;

        // Add position classes for cohesive styling
        if (ship.isVertical) {
            cells[pos].classList.add('ship-vertical');
            if (index === 0) {
                cells[pos].classList.add('ship-start');
            } else if (index === positions.length - 1) {
                cells[pos].classList.add('ship-end');
            } else {
                cells[pos].classList.add('ship-middle');
            }
        } else {
            cells[pos].classList.add('ship-horizontal');
            if (index === 0) {
                cells[pos].classList.add('ship-start');
            } else if (index === positions.length - 1) {
                cells[pos].classList.add('ship-end');
            } else {
                cells[pos].classList.add('ship-middle');
            }
        }
    });

    shipArray.push({
        name: ship.name,
        positions: positions,
        hits: new Set()
    });

    if (shipElement && shipElement.parentElement === stagingShips) {
        shipElement.remove();
    }
}

// Animate return to staging
function animateReturnToStaging() {
    if (!draggedShipElement) return;
    messageArea.textContent = 'Invalid placement! Ships must be completely within the board and cannot overlap.';
    draggedShipElement.classList.add('invalid-placement');
    setTimeout(() => {
        draggedShipElement.classList.remove('invalid-placement');
    }, 500);
}

// Begin game
function beginGame() {
    if (gameState.shipsPlaced !== SHIPS.length) {
        messageArea.textContent = 'Please place all ships before starting!';
        return;
    }

    gameState.phase = 'playing';
    startGameBtn.style.display = 'none';
    difficultySelector.style.display = 'none';
    randomizeBtn.style.display = 'none';
    debugToggleBtn.style.display = 'inline-block';

    // Replace staging area with computer board
    stagingShips.style.display = 'none';
    computerBoard.style.display = 'grid';
    stagingSurface.style.background = 'var(--surface)';
    leftBoardLabel.textContent = 'Computer Board';

    // Place computer ships
    placeComputerShips();

    // Randomly choose who goes first
    gameState.currentPlayer = Math.random() < 0.5 ? 'player' : 'computer';

    if (gameState.currentPlayer === 'player') {
        messageArea.textContent = 'You go first! Click a cell on the computer board.';
        enablePlayerTurn();
    } else {
        messageArea.textContent = 'Computer goes first!';
        setTimeout(() => computerTurn(), 1500);
    }
}

// Place computer ships randomly
function placeComputerShips() {
    SHIPS.forEach(shipDef => {
        let placed = false;
        while (!placed) {
            const isVertical = Math.random() < 0.5;
            const startIndex = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
            const ship = { ...shipDef, isVertical };

            if (canPlaceShip(startIndex, ship, 'computer')) {
                placeShip(startIndex, ship, 'computer', null);
                placed = true;
            }
        }
    });

    // Initially hide computer ships
    updateComputerShipVisibility();
}

// Update computer ship visibility
function updateComputerShipVisibility() {
    const cells = Array.from(computerBoard.children);
    cells.forEach(cell => {
        if (cell.classList.contains('ship-placed')) {
            if (gameState.showComputerShips) {
                cell.classList.remove('ship-hidden');
            } else {
                cell.classList.add('ship-hidden');
            }
        }
    });
}

// Toggle computer ships visibility
function toggleComputerShips() {
    gameState.showComputerShips = !gameState.showComputerShips;
    updateComputerShipVisibility();
}

// Enable player turn
function enablePlayerTurn() {
    const cells = Array.from(computerBoard.children);
    cells.forEach(cell => {
        cell.onclick = () => handlePlayerShot(parseInt(cell.dataset.index));
    });
}

// Disable player turn
function disablePlayerTurn() {
    const cells = Array.from(computerBoard.children);
    cells.forEach(cell => {
        cell.onclick = null;
    });
}

// Handle player shot
function handlePlayerShot(index) {
    if (gameState.phase !== 'playing' || gameState.currentPlayer !== 'player') return;
    if (gameState.playerHits.has(index) || gameState.playerMisses.has(index)) return;

    disablePlayerTurn();

    const cells = Array.from(computerBoard.children);
    const cell = cells[index];
    const isHit = cell.classList.contains('ship-placed');

    const rect = computerBoard.parentElement.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const x = cellRect.left + cellRect.width / 2 - rect.left;
    const y = cellRect.top + cellRect.height / 2 - rect.top;

    if (isHit) {
        gameState.playerHits.add(index);
        cell.classList.add('mark-fire', 'used');
        createFireEffects(stagingSurface, x, y);

        const shipName = cell.dataset.ship;
        const ship = gameState.computerShips.find(s => s.name === shipName);
        ship.hits.add(index);

        const row = Math.floor(index / GRID_SIZE);
        const col = index % GRID_SIZE;
        const coord = String.fromCharCode(65 + row) + (col + 1);

        if (ship.hits.size === ship.positions.length) {
            gameState.playerSunkShips.push(shipName);
            if (gameState.difficulty === 1) {
                messageArea.textContent = `HIT at ${coord}! You sunk the computer's ${shipName}!`;
            } else if (gameState.difficulty === 2) {
                messageArea.textContent = `HIT at ${coord}! You sunk a ship!`;
            } else {
                messageArea.textContent = `HIT at ${coord}!`;
            }

            if (gameState.playerSunkShips.length === SHIPS.length) {
                setTimeout(() => endGame('player'), 1500);
                return;
            }
        } else {
            messageArea.textContent = `HIT at ${coord}!`;
        }
    } else {
        gameState.playerMisses.add(index);
        cell.classList.add('mark-water', 'used');
        createWaterEffects(stagingSurface, x, y);

        const row = Math.floor(index / GRID_SIZE);
        const col = index % GRID_SIZE;
        const coord = String.fromCharCode(65 + row) + (col + 1);
        messageArea.textContent = `Miss at ${coord}.`;
    }

    gameState.currentPlayer = 'computer';
    setTimeout(() => computerTurn(), 1500);
}

// Computer turn
function computerTurn() {
    if (gameState.phase !== 'playing') return;

    let targetIndex;

    if (gameState.difficulty === 1) {
        targetIndex = getRandomTarget();
    } else if (gameState.difficulty === 2) {
        targetIndex = getMediumTarget();
    } else {
        targetIndex = getHardTarget();
    }

    const cells = Array.from(playerBoard.children);
    const cell = cells[targetIndex];
    const isHit = cell.classList.contains('ship-placed');

    const rect = playerBoard.parentElement.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const x = cellRect.left + cellRect.width / 2 - rect.left;
    const y = cellRect.top + cellRect.height / 2 - rect.top;

    if (isHit) {
        gameState.computerHits.add(targetIndex);
        cell.classList.add('mark-fire', 'used');
        createFireEffects(playerSurface, x, y);
        gameState.computerLastHit = targetIndex;

        const shipName = cell.dataset.ship;
        const ship = gameState.playerShips.find(s => s.name === shipName);
        ship.hits.add(targetIndex);

        const row = Math.floor(targetIndex / GRID_SIZE);
        const col = targetIndex % GRID_SIZE;
        const coord = String.fromCharCode(65 + row) + (col + 1);

        if (ship.hits.size === ship.positions.length) {
            gameState.computerSunkShips.push(shipName);
            messageArea.textContent = `Computer HIT at ${coord}! Computer sunk your ${shipName}!`;
            gameState.computerLastHit = null;
            gameState.computerTargetQueue = [];

            if (gameState.computerSunkShips.length === SHIPS.length) {
                setTimeout(() => endGame('computer'), 1500);
                return;
            }
        } else {
            messageArea.textContent = `Computer HIT at ${coord}!`;
            if (gameState.difficulty >= 2) {
                addAdjacentTargets(targetIndex);
            }
        }
    } else {
        gameState.computerMisses.add(targetIndex);
        cell.classList.add('mark-water', 'used');
        createWaterEffects(playerSurface, x, y);

        const row = Math.floor(targetIndex / GRID_SIZE);
        const col = targetIndex % GRID_SIZE;
        const coord = String.fromCharCode(65 + row) + (col + 1);
        messageArea.textContent = `Computer missed at ${coord}.`;
    }

    gameState.currentPlayer = 'player';
    setTimeout(() => {
        if (gameState.phase === 'playing') {
            enablePlayerTurn();
        }
    }, 500);
}

// Get random target (difficulty 1)
function getRandomTarget() {
    const available = [];
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        if (!gameState.computerHits.has(i) && !gameState.computerMisses.has(i)) {
            available.push(i);
        }
    }
    return available[Math.floor(Math.random() * available.length)];
}

// Get medium difficulty target
function getMediumTarget() {
    if (gameState.computerTargetQueue.length > 0) {
        const target = gameState.computerTargetQueue.shift();
        if (!gameState.computerHits.has(target) && !gameState.computerMisses.has(target)) {
            return target;
        }
        return getMediumTarget();
    }
    return getRandomTarget();
}

// Get hard difficulty target
function getHardTarget() {
    if (gameState.computerTargetQueue.length > 0) {
        const target = gameState.computerTargetQueue.shift();
        if (!gameState.computerHits.has(target) && !gameState.computerMisses.has(target)) {
            return target;
        }
        return getHardTarget();
    }

    // Hunt mode: target checkerboard pattern
    const available = [];
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        if (!gameState.computerHits.has(i) && !gameState.computerMisses.has(i)) {
            const row = Math.floor(i / GRID_SIZE);
            const col = i % GRID_SIZE;
            if ((row + col) % 2 === 0) {
                available.push(i);
            }
        }
    }

    if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
    }

    return getRandomTarget();
}

// Add adjacent targets to queue
function addAdjacentTargets(index) {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const adjacent = [];

    // Up
    if (row > 0) adjacent.push(index - GRID_SIZE);
    // Down
    if (row < GRID_SIZE - 1) adjacent.push(index + GRID_SIZE);
    // Left
    if (col > 0) adjacent.push(index - 1);
    // Right
    if (col < GRID_SIZE - 1) adjacent.push(index + 1);

    adjacent.forEach(pos => {
        if (!gameState.computerHits.has(pos) && !gameState.computerMisses.has(pos) && !gameState.computerTargetQueue.includes(pos)) {
            gameState.computerTargetQueue.push(pos);
        }
    });
}

// Water effects
function createWaterEffects(surface, x, y) {
    const size = 165;
    DELAYS.forEach((delay, i) => {
        setTimeout(() => {
            const ripple = document.createElement('span');
            ripple.className = 'ripple-water';
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.opacity = String(0.70 - i * 0.12);
            surface.appendChild(ripple);
            setTimeout(() => ripple.remove(), DURATION);
        }, delay);
    });
}

// Fire effects
function createFireEffects(surface, x, y) {
    const size = 185;
    const colors = [
        'rgba(255,170,70,0.92)',
        'rgba(255,70,35,0.90)',
        'rgba(210,0,15,0.88)'
    ];

    DELAYS.forEach((delay, i) => {
        setTimeout(() => {
            const ring = document.createElement('span');
            ring.className = 'ripple-fire';
            ring.style.width = ring.style.height = size + 'px';
            ring.style.left = x + 'px';
            ring.style.top = y + 'px';
            ring.style.setProperty('--ring-color', colors[i]);
            ring.style.opacity = String(0.98 - i * 0.16);
            surface.appendChild(ring);
            setTimeout(() => ring.remove(), DURATION);
        }, delay);
    });

    createSparks(surface, x, y);
    shakeSurface(surface);
}

// Create sparks
function createSparks(surface, x, y) {
    const palette = [
        'rgba(255,190,80,0.95)',
        'rgba(255,140,55,0.95)',
        'rgba(255,80,35,0.95)',
        'rgba(235,10,20,0.92)',
        'rgba(180,0,10,0.88)'
    ];

    const count = 18;
    const minDist = 8;
    const maxDist = 95;

    for (let i = 0; i < count; i++) {
        const spark = document.createElement('span');
        spark.className = 'spark';

        const streak = Math.random() < 0.45;
        const angle = Math.random() * Math.PI * 2;
        const dist = rand(minDist, maxDist) * (streak ? 1.0 : 0.85);

        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;

        const life = rand(520, 900);
        const w = streak ? rand(2, 4) : rand(3, 6);
        const h = streak ? rand(10, 18) : rand(3, 6);

        spark.style.left = x + 'px';
        spark.style.top = y + 'px';
        spark.style.setProperty('--dx', dx + 'px');
        spark.style.setProperty('--dy', dy + 'px');
        spark.style.setProperty('--rot', rand(-180, 180) + 'deg');
        spark.style.setProperty('--life', life + 'ms');
        spark.style.setProperty('--sx', w + 'px');
        spark.style.setProperty('--sy', h + 'px');
        spark.style.setProperty('--sparkColor', palette[Math.floor(Math.random() * palette.length)]);

        surface.appendChild(spark);
        setTimeout(() => spark.remove(), life);
    }
}

// Shake surface
function shakeSurface(surface) {
    surface.classList.remove('shake');
    void surface.offsetWidth;
    surface.classList.add('shake');
    setTimeout(() => surface.classList.remove('shake'), 360);
}

// Random helper
function rand(min, max) {
    return Math.random() * (max - min) + min;
}

// End game
function endGame(winner) {
    gameState.phase = 'gameover';
    gameState.showComputerShips = true;
    updateComputerShipVisibility();
    disablePlayerTurn();

    // Update statistics
    if (winner === 'player') {
        statistics[gameState.difficulty].wins++;
    } else {
        statistics[gameState.difficulty].losses++;
    }
    saveStatistics();

    // Show winner message
    if (winner === 'player') {
        messageArea.innerHTML = `<strong>🎉 YOU WIN!</strong> All enemy ships destroyed!`;
    } else {
        messageArea.innerHTML = `<strong>💥 GAME OVER</strong> All your ships were destroyed.`;
    }

    debugToggleBtn.style.display = 'none';
    viewStatsBtn.style.display = 'inline-block';
    newGameBtn.style.display = 'inline-block';

    // Auto-show statistics modal after game
    setTimeout(() => showStatsModal(), 500);
}

// Build statistics text
function buildStatisticsText() {
    const difficultyNames = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
    let statsHTML = '<div class="statistics-table">';
    statsHTML += '<div class="stats-header"><span>Difficulty</span><span>Wins</span><span>Losses</span></div>';

    for (let level = 1; level <= 3; level++) {
        const stats = statistics[level];
        statsHTML += `<div class="stats-row">`;
        statsHTML += `<span>${difficultyNames[level]}</span>`;
        statsHTML += `<span>${stats.wins}</span>`;
        statsHTML += `<span>${stats.losses}</span>`;
        statsHTML += `</div>`;
    }

    statsHTML += '</div>';
    return statsHTML;
}

// Show statistics modal
function showStatsModal() {
    statsModalBody.innerHTML = buildStatisticsText();
    statsModal.style.display = 'flex';
}

// Hide statistics modal
function hideStatsModal() {
    statsModal.style.display = 'none';
}

// Reset game
function resetGame() {
    // Reset game state
    gameState.phase = 'placement';
    gameState.currentPlayer = 'player';
    gameState.difficulty = 2;
    gameState.playerShips = [];
    gameState.computerShips = [];
    gameState.playerHits = new Set();
    gameState.playerMisses = new Set();
    gameState.computerHits = new Set();
    gameState.computerMisses = new Set();
    gameState.computerLastHit = null;
    gameState.computerTargetQueue = [];
    gameState.shipsPlaced = 0;
    gameState.playerSunkShips = [];
    gameState.computerSunkShips = [];
    gameState.showComputerShips = false;

    // Reset UI
    messageArea.textContent = 'Welcome! Place your ships to begin.';
    leftBoardLabel.textContent = 'Staging Area';
    stagingSurface.style.background = '#4a5568';

    // Hide/show appropriate elements
    computerBoard.style.display = 'none';
    stagingShips.style.display = 'flex';
    newGameBtn.style.display = 'none';
    debugToggleBtn.style.display = 'none';
    viewStatsBtn.style.display = 'none';
    startGameBtn.style.display = 'none';
    difficultySelector.style.display = 'none';
    randomizeBtn.style.display = 'inline-block';
    hideStatsModal();

    // Clear boards
    createBoard(playerBoard, 'player');
    createBoard(computerBoard, 'computer');

    // Reset ships in staging
    stagingShips.innerHTML = `
        <div class="ship destroyer-container" draggable="true" data-ship="destroyer" data-length="2">
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
        </div>
        <div class="ship submarine-container" draggable="true" data-ship="submarine" data-length="3">
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
        </div>
        <div class="ship cruiser-container" draggable="true" data-ship="cruiser" data-length="3">
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
        </div>
        <div class="ship battleship-container" draggable="true" data-ship="battleship" data-length="4">
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
        </div>
        <div class="ship carrier-container" draggable="true" data-ship="carrier" data-length="5">
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
            <div class="ship-segment"></div>
        </div>
    `;

    // Re-setup drag and drop
    setupShipDragDrop();

    // Clear difficulty selection
    document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
}

// Randomize player ships
function randomizePlayerShips() {
    if (gameState.phase !== 'placement') return;

    // Clear all ships from board with all styling classes
    const cells = Array.from(playerBoard.children);
    cells.forEach(cell => {
        cell.classList.remove('ship-placed', 'ship-start', 'ship-middle', 'ship-end', 'ship-horizontal', 'ship-vertical');
        delete cell.dataset.ship;
    });
    gameState.playerShips = [];
    gameState.shipsPlaced = 0;

    // Clear staging area
    stagingShips.innerHTML = '';

    // Place all ships randomly
    SHIPS.forEach(shipDef => {
        let placed = false;
        while (!placed) {
            const isVertical = Math.random() < 0.5;
            const startIndex = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
            const ship = { ...shipDef, isVertical };

            if (canPlaceShip(startIndex, ship, 'player')) {
                placeShip(startIndex, ship, 'player', null);
                gameState.shipsPlaced++;
                placed = true;
            }
        }
    });

    messageArea.textContent = 'All ships randomly placed! Choose difficulty and click Start Game.';
    startGameBtn.style.display = 'inline-block';
    difficultySelector.style.display = 'flex';
    // Select the last played difficulty
    document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector(`[data-difficulty="${gameState.lastPlayedDifficulty}"]`).classList.add('selected');
    gameState.difficulty = gameState.lastPlayedDifficulty;
}

// Handle click on player board during game
playerBoard.addEventListener('click', (e) => {
    if (gameState.phase !== 'playing') return;

    const cell = e.target.closest('.cell');
    if (!cell) return;

    const rect = playerBoard.parentElement.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const x = cellRect.left + cellRect.width / 2 - rect.left;
    const y = cellRect.top + cellRect.height / 2 - rect.top;

    createWaterEffects(playerSurface, x, y);
});
