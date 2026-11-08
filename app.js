// Chess game with online multiplayer support
const PIECES = {
  K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟'
};

let board, turn, selected, legalMoves, lastMove, gameOver;
let gameMode = 'local';
let playerColor = null;
let roomCode = null;
let roomRef = null;
let isMyTurn = true;

// UI Elements
const menuEl = document.getElementById('menu');
const joinFormEl = document.getElementById('join-form');
const gameInfoEl = document.getElementById('game-info');
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');
const leaveBtn = document.getElementById('leave-btn');
const roomDisplayEl = document.getElementById('room-display');
const playerColorEl = document.getElementById('player-color');
const roomCodeInputEl = document.getElementById('room-code');

// Initialize local game
function initGame() {
  board = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
  ];
  turn = 'w';
  selected = null;
  legalMoves = [];
  lastMove = null;
  gameOver = false;
  render();
  updateStatus();
}

// Show menu
function showMenu() {
  menuEl.classList.remove('hidden');
  joinFormEl.classList.add('hidden');
  gameInfoEl.classList.add('hidden');
  boardEl.classList.add('hidden');
  resetBtn.classList.add('hidden');
  leaveBtn.classList.add('hidden');
  statusEl.textContent = 'Select game mode';
}

// Show game
function showGame() {
  menuEl.classList.add('hidden');
  joinFormEl.classList.add('hidden');
  boardEl.classList.remove('hidden');
  resetBtn.classList.remove('hidden');
  if (gameMode === 'online') {
    gameInfoEl.classList.remove('hidden');
    leaveBtn.classList.remove('hidden');
  }
}

// Generate room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Play local button
document.getElementById('local-btn').addEventListener('click', () => {
  gameMode = 'local';
  playerColor = null;
  showGame();
  initGame();
});

// Create online game button
document.getElementById('create-btn').addEventListener('click', async () => {
  gameMode = 'online';
  playerColor = 'w';
  roomCode = generateRoomCode();
  
  const initialBoard = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
  ];
  
  try {
    roomRef = database.ref('rooms/' + roomCode);
    await roomRef.set({
      board: initialBoard,
      turn: 'w',
      lastMove: null,
      gameOver: false,
      whitePlayer: true,
      blackPlayer: false,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    roomDisplayEl.textContent = `Room Code: ${roomCode} (Share this with your opponent!)`;
    playerColorEl.textContent = 'You are: White';
    
    listenToRoom();
    showGame();
    initGame();
  } catch (error) {
    console.error('Error creating game:', error);
    alert('Failed to create game. Please check your internet connection and try again.');
    showMenu();
  }
});

// Join online game button (show form)
document.getElementById('join-btn').addEventListener('click', () => {
  menuEl.classList.add('hidden');
  joinFormEl.classList.remove('hidden');
});

// Cancel join
document.getElementById('join-cancel').addEventListener('click', () => {
  showMenu();
});

// Submit join
document.getElementById('join-submit').addEventListener('click', async () => {
  const code = roomCodeInputEl.value.trim().toUpperCase();
  if (!code) {
    alert('Please enter a room code');
    return;
  }
  
  try {
    roomCode = code;
    roomRef = database.ref('rooms/' + roomCode);
    const snapshot = await roomRef.once('value');
    
    if (!snapshot.exists()) {
      alert('Room not found. Please check the code and try again.');
      return;
    }
    
    const roomData = snapshot.val();
    if (roomData.blackPlayer) {
      alert('This game is already full.');
      return;
    }
    
    gameMode = 'online';
    playerColor = 'b';
    
    await roomRef.update({ blackPlayer: true });
    
    roomDisplayEl.textContent = `Room Code: ${roomCode}`;
    playerColorEl.textContent = 'You are: Black';
    
    listenToRoom();
    showGame();
    initGame();
  } catch (error) {
    console.error('Error joining game:', error);
    alert('Failed to join game. Please check your internet connection and try again.');
  }
});

// Listen to room changes
function listenToRoom() {
  roomRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    board = data.board;
    turn = data.turn;
    lastMove = data.lastMove;
    gameOver = data.gameOver;
    
    isMyTurn = (turn === playerColor);
    
    render();
    updateStatus();
  });
}

// Leave game
leaveBtn.addEventListener('click', async () => {
  if (roomRef) {
    roomRef.off();
    if (playerColor === 'w') {
      await roomRef.remove();
    } else {
      await roomRef.update({ blackPlayer: false });
    }
  }
  roomRef = null;
  roomCode = null;
  playerColor = null;
  showMenu();
});

// Reset button
resetBtn.addEventListener('click', async () => {
  if (gameMode === 'online' && roomRef) {
    const initialBoard = [
      ['bR','bN','bB','bQ','bK','bB','bN','bR'],
      ['bP','bP','bP','bP','bP','bP','bP','bP'],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      ['wP','wP','wP','wP','wP','wP','wP','wP'],
      ['wR','wN','wB','wQ','wK','wB','wN','wR']
    ];
    
    await roomRef.update({
      board: initialBoard,
      turn: 'w',
      lastMove: null,
      gameOver: false
    });
  } else {
    initGame();
  }
});

// Render board
function render() {
  boardEl.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = 'square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
      square.dataset.row = row;
      square.dataset.col = col;
      
      const piece = board[row][col];
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = 'piece';
        pieceEl.textContent = PIECES[piece[1]];
        pieceEl.style.color = piece[0] === 'w' ? '#fff' : '#000';
        square.appendChild(pieceEl);
      }
      
      if (selected && selected[0] === row && selected[1] === col) {
        square.classList.add('selected');
      }
      
      if (legalMoves.some(([r, c]) => r === row && c === col)) {
        square.classList.add('legal-move');
        if (piece) square.classList.add('capture');
      }
      
      if (lastMove && ((lastMove.from[0] === row && lastMove.from[1] === col) || 
                       (lastMove.to[0] === row && lastMove.to[1] === col))) {
        square.classList.add('last-move');
      }
      
      square.addEventListener('click', () => handleSquareClick(row, col));
      boardEl.appendChild(square);
    }
  }
}

// Handle square click
async function handleSquareClick(row, col) {
  if (gameOver) return;
  
  if (gameMode === 'online' && !isMyTurn) {
    return;
  }
  
  const piece = board[row][col];
  
  if (selected) {
    const [selRow, selCol] = selected;
    const isLegal = legalMoves.some(([r, c]) => r === row && c === col);
    
    if (isLegal) {
      const newBoard = board.map(r => [...r]);
      newBoard[row][col] = newBoard[selRow][selCol];
      newBoard[selRow][selCol] = null;
      
      const newTurn = turn === 'w' ? 'b' : 'w';
      const newLastMove = { from: [selRow, selCol], to: [row, col] };
      
      if (gameMode === 'online') {
        await roomRef.update({
          board: newBoard,
          turn: newTurn,
          lastMove: newLastMove
        });
      } else {
        board = newBoard;
        turn = newTurn;
        lastMove = newLastMove;
        selected = null;
        legalMoves = [];
        render();
        updateStatus();
      }
    } else {
      selected = null;
      legalMoves = [];
      render();
    }
  } else if (piece && piece[0] === turn) {
    if (gameMode === 'online' && piece[0] !== playerColor) {
      return;
    }
    selected = [row, col];
    legalMoves = getLegalMoves(row, col);
    render();
  }
}

// Get legal moves for a piece
function getLegalMoves(row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  
  const color = piece[0];
  const type = piece[1];
  const moves = [];
  
  const addMove = (r, c) => {
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    const target = board[r][c];
    if (!target) {
      moves.push([r, c]);
      return true;
    }
    if (target[0] !== color) {
      moves.push([r, c]);
    }
    return false;
  };
  
  const addSlidingMoves = (directions) => {
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (addMove(r, c)) {
        r += dr;
        c += dc;
      }
    }
  };
  
  switch (type) {
    case 'P':
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      
      if (!board[row + dir][col]) {
        moves.push([row + dir, col]);
        if (row === startRow && !board[row + 2 * dir][col]) {
          moves.push([row + 2 * dir, col]);
        }
      }
      
      for (const dc of [-1, 1]) {
        const target = board[row + dir]?.[col + dc];
        if (target && target[0] !== color) {
          moves.push([row + dir, col + dc]);
        }
      }
      break;
      
    case 'R':
      addSlidingMoves([[0,1],[0,-1],[1,0],[-1,0]]);
      break;
      
    case 'N':
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        addMove(row + dr, col + dc);
      }
      break;
      
    case 'B':
      addSlidingMoves([[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
      
    case 'Q':
      addSlidingMoves([[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
      
    case 'K':
      for (const dr of [-1,0,1]) {
        for (const dc of [-1,0,1]) {
          if (dr !== 0 || dc !== 0) {
            addMove(row + dr, col + dc);
          }
        }
      }
      break;
  }
  
  return moves.filter(([r, c]) => {
    const testBoard = board.map(row => [...row]);
    testBoard[r][c] = testBoard[row][col];
    testBoard[row][col] = null;
    return !isInCheck(testBoard, color);
  });
}

// Check if king is in check
function isInCheck(testBoard, color) {
  let kingPos = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (testBoard[r][c] === color + 'K') {
        kingPos = [r, c];
        break;
      }
    }
    if (kingPos) break;
  }
  
  if (!kingPos) return false;
  
  const enemyColor = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = testBoard[r][c];
      if (piece && piece[0] === enemyColor) {
        const moves = getPseudoLegalMoves(testBoard, r, c);
        if (moves.some(([mr, mc]) => mr === kingPos[0] && mc === kingPos[1])) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Get pseudo-legal moves (without check validation)
function getPseudoLegalMoves(testBoard, row, col) {
  const piece = testBoard[row][col];
  if (!piece) return [];
  
  const color = piece[0];
  const type = piece[1];
  const moves = [];
  
  const addMove = (r, c) => {
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    const target = testBoard[r][c];
    if (!target) {
      moves.push([r, c]);
      return true;
    }
    if (target[0] !== color) {
      moves.push([r, c]);
    }
    return false;
  };
  
  const addSlidingMoves = (directions) => {
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (addMove(r, c)) {
        r += dr;
        c += dc;
      }
    }
  };
  
  switch (type) {
    case 'P':
      const dir = color === 'w' ? -1 : 1;
      for (const dc of [-1, 1]) {
        const r = row + dir;
        const c = col + dc;
        if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
          moves.push([r, c]);
        }
      }
      break;
      
    case 'R':
      addSlidingMoves([[0,1],[0,-1],[1,0],[-1,0]]);
      break;
      
    case 'N':
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        addMove(row + dr, col + dc);
      }
      break;
      
    case 'B':
      addSlidingMoves([[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
      
    case 'Q':
      addSlidingMoves([[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
      
    case 'K':
      for (const dr of [-1,0,1]) {
        for (const dc of [-1,0,1]) {
          if (dr !== 0 || dc !== 0) {
            addMove(row + dr, col + dc);
          }
        }
      }
      break;
  }
  
  return moves;
}

// Update status
function updateStatus() {
  if (gameOver) {
    const winner = turn === 'w' ? 'Black' : 'White';
    statusEl.textContent = `Checkmate! ${winner} wins!`;
    return;
  }
  
  const inCheck = isInCheck(board, turn);
  const currentPlayer = turn === 'w' ? 'White' : 'Black';
  
  if (gameMode === 'online') {
    if (isMyTurn) {
      statusEl.textContent = inCheck ? `Your turn (${currentPlayer}) - CHECK!` : `Your turn (${currentPlayer})`;
    } else {
      statusEl.textContent = `Waiting for opponent (${currentPlayer})...`;
    }
  } else {
    statusEl.textContent = inCheck ? `${currentPlayer}'s turn - CHECK!` : `${currentPlayer}'s turn`;
  }
}

// Initialize
showMenu();
