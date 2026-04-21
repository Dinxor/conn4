// Константы
const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;
const CELL_SIZE = 100;
const RADIUS = 40;

let board = Array(BOARD_WIDTH * BOARD_HEIGHT).fill('.');
let currentPlayer = 'X'; // X - игрок (красный), O - бот (желтый)
let gameOver = false;
let winner = null;
let playerFirst = true; // true - игрок ходит первым

// Цвета
const colors = {
    X: '#e74c3c', // красный (игрок)
    O: '#f1c40f', // желтый (бот)
    empty: '#34495e',
    board: '#2c3e50'
};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');

// Отрисовка доски
function drawBoard() {
    // Фон
    ctx.fillStyle = colors.board;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ячейки
    for (let row = 0; row < BOARD_HEIGHT; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
            const x = col * CELL_SIZE + CELL_SIZE/2;
            const y = row * CELL_SIZE + CELL_SIZE/2;
            const index = row * BOARD_WIDTH + col;
            const value = board[index];
            
            // Тень
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
            
            if (value === 'X') {
                ctx.fillStyle = colors.X;
            } else if (value === 'O') {
                ctx.fillStyle = colors.O;
            } else {
                ctx.fillStyle = '#1a252f';
            }
            ctx.fill();
            
            // Обводка
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Блик
            if (value !== '.') {
                ctx.beginPath();
                ctx.arc(x - 8, y - 8, 8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fill();
            }
        }
    }
}

// Проверка на заполненность
function isFull() {
    return !board.includes('.');
}

// Проверка победы
function checkWin(symb) {
    // Горизонталь
    for (let row = 0; row < BOARD_HEIGHT; row++) {
        for (let col = 0; col <= BOARD_WIDTH - 4; col++) {
            let win = true;
            for (let k = 0; k < 4; k++) {
                if (board[row * BOARD_WIDTH + col + k] !== symb) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }
    
    // Вертикаль
    for (let col = 0; col < BOARD_WIDTH; col++) {
        for (let row = 0; row <= BOARD_HEIGHT - 4; row++) {
            let win = true;
            for (let k = 0; k < 4; k++) {
                if (board[(row + k) * BOARD_WIDTH + col] !== symb) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }
    
    // Диагональ \
    for (let row = 0; row <= BOARD_HEIGHT - 4; row++) {
        for (let col = 0; col <= BOARD_WIDTH - 4; col++) {
            let win = true;
            for (let k = 0; k < 4; k++) {
                if (board[(row + k) * BOARD_WIDTH + (col + k)] !== symb) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }
    
    // Диагональ /
    for (let row = 0; row <= BOARD_HEIGHT - 4; row++) {
        for (let col = 3; col < BOARD_WIDTH; col++) {
            let win = true;
            for (let k = 0; k < 4; k++) {
                if (board[(row + k) * BOARD_WIDTH + (col - k)] !== symb) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }
    
    return false;
}

// Поставить фишку в колонку
function makeMove(column, symb) {
    if (gameOver) return false;
    if (column < 0 || column >= BOARD_WIDTH) return false;
    
    // Находим свободную ячейку снизу
    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
        const index = row * BOARD_WIDTH + column;
        if (board[index] === '.') {
            board[index] = symb;
            drawBoard();
            return true;
        }
    }
    return false;
}

// Проверка, валидный ли ход
function isValidMove(column) {
    if (column < 0 || column >= BOARD_WIDTH) return false;
    return board[column] === '.';
}

// Получение всех валидных ходов
function getValidMoves() {
    const moves = [];
    for (let col = 0; col < BOARD_WIDTH; col++) {
        if (isValidMove(col)) moves.push(col);
    }
    return moves;
}

// AI: оценка потенциальных ходов
function getPotentialMoves(boardState, tile, lookAhead) {
    if (lookAhead === 0 || !boardState.includes('.')) {
        return Array(BOARD_WIDTH).fill(0);
    }
    
    const enemyTile = tile === 'X' ? 'O' : 'X';
    const potentialMoves = Array(BOARD_WIDTH).fill(0);
    
    for (let firstMove = 0; firstMove < BOARD_WIDTH; firstMove++) {
        if (!isValidMoveOnBoard(boardState, firstMove)) continue;
        
        const dupeBoard = [...boardState];
        makeMoveOnBoard(dupeBoard, firstMove, tile);
        
        if (checkWinOnBoard(dupeBoard, tile)) {
            potentialMoves[firstMove] = 1;
            continue;
        }
        
        if (!dupeBoard.includes('.')) {
            potentialMoves[firstMove] = 0;
        } else {
            for (let counterMove = 0; counterMove < BOARD_WIDTH; counterMove++) {
                if (!isValidMoveOnBoard(dupeBoard, counterMove)) continue;
                
                const dupeBoard2 = [...dupeBoard];
                makeMoveOnBoard(dupeBoard2, counterMove, enemyTile);
                
                if (checkWinOnBoard(dupeBoard2, enemyTile)) {
                    potentialMoves[firstMove] = -1;
                    break;
                } else {
                    const results = getPotentialMoves(dupeBoard2, tile, lookAhead - 1);
                    potentialMoves[firstMove] += results.reduce((a, b) => a + b, 0) / BOARD_WIDTH / BOARD_WIDTH;
                }
            }
        }
    }
    return potentialMoves;
}

// Вспомогательные функции для AI
function isValidMoveOnBoard(boardState, column) {
    return boardState[column] === '.';
}

function makeMoveOnBoard(boardState, column, symb) {
    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
        const index = row * BOARD_WIDTH + column;
        if (boardState[index] === '.') {
            boardState[index] = symb;
            return true;
        }
    }
    return false;
}

function checkWinOnBoard(boardState, symb) {
    // Аналогично checkWin, но с переданной доской
    for (let row = 0; row < BOARD_HEIGHT; row++) {
        for (let col = 0; col <= BOARD_WIDTH - 4; col++) {
            let win = true;
            for (let k = 0; k < 4; k++) {
                if (boardState[row * BOARD_WIDTH + col + k] !== symb) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }
    for (let col = 0; col < BOARD_WIDTH; col++) {
        for (let row = 0; row <= BOARD_HEIGHT - 4; row++) {
            let win = true;
            for (let k = 0; k < 4; k++) {
                if (boardState[(row + k) * BOARD_WIDTH + col] !== symb) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }
    for (let row = 0; row <= BOARD_HEIGHT - 4; row++) {
        for (let col = 0; col <= BOARD_WIDTH - 4; col++) {
            let win = true;
            for (let k = 0; k < 4; k++) {
                if (boardState[(row + k) * BOARD_WIDTH + (col + k)] !== symb) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }
    for (let row = 0; row <= BOARD_HEIGHT - 4; row++) {
        for (let col = 3; col < BOARD_WIDTH; col++) {
            let win = true;
            for (let k = 0; k < 4; k++) {
                if (boardState[(row + k) * BOARD_WIDTH + (col - k)] !== symb) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }
    return false;
}

// AI ход
function aiMove() {
    if (gameOver) return;
    if (currentPlayer !== 'O') return;
    
    const validMoves = getValidMoves();
    if (validMoves.length === 0) return;
    
    const difficulty = 2;// how many moves to look ahead. (>2 is usually too much)
    const potentialMoves = getPotentialMoves([...board], 'O', difficulty);
    
    let bestFitness = -Infinity;
    for (let i = 0; i < BOARD_WIDTH; i++) {
        if (isValidMove(i) && potentialMoves[i] > bestFitness) {
            bestFitness = potentialMoves[i];
        }
    }
    
    const bestMoves = [];
    for (let i = 0; i < BOARD_WIDTH; i++) {
        if (isValidMove(i) && potentialMoves[i] === bestFitness) {
            bestMoves.push(i);
        }
    }
    
    const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    
    setTimeout(() => {
        makeMove(move, 'O');
        
        if (checkWin('O')) {
            gameOver = true;
            winner = 'O';
            statusDiv.innerHTML = '🟡 Бот победил! Нажмите "Новая игра"';
        } else if (isFull()) {
            gameOver = true;
            winner = 'draw';
            statusDiv.innerHTML = '🤝 Ничья! Нажмите "Новая игра"';
        } else {
            currentPlayer = 'X';
            statusDiv.innerHTML = '🔴 Ваш ход';
        }
        drawBoard();
    }, 100);
}

// Ход игрока
function playerMove(column) {
    if (gameOver) return false;
    if (currentPlayer !== 'X') return false;
    if (!isValidMove(column)) return false;
    
    makeMove(column, 'X');
    
    if (checkWin('X')) {
        gameOver = true;
        winner = 'X';
        statusDiv.innerHTML = '🔴 Вы победили! 🎉 Нажмите "Новая игра"';
        drawBoard();
        return true;
    } else if (isFull()) {
        gameOver = true;
        winner = 'draw';
        statusDiv.innerHTML = '🤝 Ничья! Нажмите "Новая игра"';
        drawBoard();
        return true;
    }
    
    currentPlayer = 'O';
    statusDiv.innerHTML = '🟡 Ход бота...';
    drawBoard();
    aiMove();
    return true;
}

// Новая игра
function newGame(firstPlayer = null) {
    if (firstPlayer !== undefined) {
        playerFirst = firstPlayer;
    }
    
    board = Array(BOARD_WIDTH * BOARD_HEIGHT).fill('.');
    gameOver = false;
    winner = null;
    currentPlayer = playerFirst ? 'X' : 'O';
    
    drawBoard();
    
    if (!playerFirst) {
        statusDiv.innerHTML = '🟡 Ход бота...';
        setTimeout(() => aiMove(), 200);
    } else {
        statusDiv.innerHTML = '🔴 Ваш ход';
    }
}

// Обработка клика по канвасу
canvas.addEventListener('click', (e) => {
    if (gameOver) return;
    if (currentPlayer !== 'X') return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    
    const column = Math.floor(mouseX / CELL_SIZE);
    if (column >= 0 && column < BOARD_WIDTH) {
        playerMove(column);
    }
});

// Touch для мобильных
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameOver) return;
    if (currentPlayer !== 'X') return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const touchX = (touch.clientX - rect.left) * scaleX;
    
    const column = Math.floor(touchX / CELL_SIZE);
    if (column >= 0 && column < BOARD_WIDTH) {
        playerMove(column);
    }
});

// Кнопки
document.getElementById('reset').addEventListener('click', () => {
    newGame(playerFirst);
});

document.getElementById('firstX').addEventListener('click', () => {
    document.getElementById('firstX').classList.add('active');
    document.getElementById('firstO').classList.remove('active');
    newGame(true);
});

document.getElementById('firstO').addEventListener('click', () => {
    document.getElementById('firstO').classList.add('active');
    document.getElementById('firstX').classList.remove('active');
    newGame(false);
});

// Запуск игры
drawBoard();
newGame(true);