// Chess game with online multiplayer support
const PIECES = {
  K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟'
};

let board, turn, selected, legalMoves, lastMove, gameOver;
let gameMode = 'local'; // 'local' or 'online'
let playerColor = null; // 'w' or 'b' for online games
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
  if (roomRef) {
    roomRef.off();
    roomRef = null;
  }
}

// Show game
function showGame() {
  menuEl.classList.add('hidden');
  joinFormEl.classList.add('hidden');
  boardEl.classList.remove('hidden');
  resetBtn.classList.remove('hidden');
}

// Local game button
document.getElementById('local-btn').addEventListener('click', () => {
  gameMode = 'local';
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

  showGame();
  gameInfoEl.classList.remove('hidden');
  leaveBtn.classList.remove('hidden');
  roomDisplayEl.textContent = `Room: ${roomCode}`;
  playerColorEl.textContent = 'You are: White';
  
  initGame();
  listenToRoom();
});

// Join online game button (show form)
document.getElementById('join-btn').addEventListener('click', () => {
  menuEl.classList.add('hidden');
  joinFormEl.classList.remove('hidden');
  roomCodeInputEl.focus();
});

// Join form submit
document.getElementById('join-submit').addEventListener('click', async () => {
  const code = roomCodeInputEl.value.trim().toUpperCase();
  if (!code) {
    alert('Please enter a room code');
    return;
  }

  gameMode = 'online';
  playerColor = 'b';
  roomCode = code;
  roomRef = database.ref('rooms/' + roomCode);

  const snapshot = await roomRef.once('value');
  const roomData = snapshot.val();

  if (!roomData) {
    alert('Room not found!');
    return;
  }

  if (roomData.blackPlayer) {
    alert('Room is full!');
    return;
  }

  await roomRef.update({ blackPlayer: true });

  showGame();
  gameInfoEl.classList.remove('hidden');
  leaveBtn.classList.remove('hidden');
  roomDisplayEl.textContent = `Room: ${roomCode}`;
  playerColorEl.textContent = 'You are: Black';
  
  initGame();
  listenToRoom();
});

// Join form cancel
document.getElementById('join-cancel').addEventListener('click', () => {
  joinFormEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  roomCodeInputEl.value = '';
});

// Reset button
resetBtn.addEventListener('click', () => {
  if (gameMode === 'local') {
    initGame();
  } else {
    // For online games, reset the room
    if (roomRef) {
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
      roomRef.update({
        board: initialBoard,
        turn: 'w',
        lastMove: null,
        gameOver: false
      });
    }
  }
});

// Leave button
leaveBtn.addEventListener('click', () => {
  if (roomRef) {
    roomRef.off();
    // Optionally delete the room if you're the creator
    if (playerColor === 'w') {
      roomRef.remove();
    }
  }
  showMenu();
});

// Listen to room changes
function listenToRoom() {
  roomRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      // Room was deleted
      if (gameMode === 'online') {
        alert('The game room has been closed.');
        showMenu();
      }
      return;
    }

    board = data.board;
    turn = data.turn;
    lastMove = data.lastMove;
    gameOver = data.gameOver || false;
    
    isMyTurn = (turn === playerColor);
    
    render();
    updateStatus();
  });
}

// Sync move to Firebase
function syncMove() {
  if (gameMode === 'online' && roomRef) {
    roomRef.update({
      board: board,
      turn: turn,
      lastMove: lastMove,
      gameOver: gameOver
    });
  }
}

// Generate random room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function render() {
  boardEl.innerHTML = '';
  const checkSquare = findKing(turn, board);
  const inCheck = checkSquare && isAttacked(checkSquare[0], checkSquare[1], opponent(turn), board);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.row = r;
      sq.dataset.col = c;

      if (selected && selected[0] === r && selected[1] === c) sq.classList.add('selected');
      if (lastMove && ((lastMove[0] === r && lastMove[1] === c) || (lastMove[2] === r && lastMove[3] === c))) sq.classList.add('last-move');
      if (inCheck && checkSquare[0] === r && checkSquare[1] === c) sq.classList.add('in-check');

      const move = legalMoves.find(m => m[0] === r && m[1] === c);
      if (move) sq.classList.add(board[r][c] ? 'legal-capture' : 'legal-move');

      const piece = board[r][c];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece ' + (piece[0] === 'w' ? 'white' : 'black');
        span.textContent = PIECES[piece[1]];
        sq.appendChild(span);
      }

      sq.addEventListener('click', () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }
}

function onSquareClick(r, c) {
  if (gameOver) return;
  
  // In online mode, only allow moves on your turn
  if (gameMode === 'online' && !isMyTurn) {
    return;
  }

  const piece = board[r][c];

  if (selected) {
    const move = legalMoves.find(m => m[0] === r && m[1] === c);
    if (move) {
      makeMove(selected[0], selected[1], r, c);
      selected = null;
      legalMoves = [];
      render();
      updateStatus();
      syncMove();
      return;
    }
    selected = null;
    legalMoves = [];
  }

  if (piece && piece[0] === turn) {
    // In online mode, only allow selecting your own pieces
    if (gameMode === 'online' && piece[0] !== playerColor) {
      return;
    }
    selected = [r, c];
    legalMoves = getLegalMoves(r, c, board);
  }
  render();
}

function makeMove(r1, c1, r2, c2) {
  const piece = board[r1][c1];
  board[r2][c2] = piece;
  board[r1][c1] = null;
  // Pawn promotion (auto-queen)
  if (piece[1] === 'P' && (r2 === 0 || r2 === 7)) {
    board[r2][c2] = piece[0] + 'Q';
  }
  lastMove = [r1, c1, r2, c2];
  turn = opponent(turn);
}

function updateStatus() {
  const king = findKing(turn, board);
  const inCheck = king && isAttacked(king[0], king[1], opponent(turn), board);
  const hasMoves = playerHasMoves(turn);

  let statusText = '';

  if (!hasMoves) {
    gameOver = true;
    if (inCheck) {
      statusText = `Checkmate! ${turn === 'w' ? 'Black' : 'White'} wins! 🏆`;
    } else {
      statusText = "Stalemate! It's a draw.";
    }
  } else if (inCheck) {
    statusText = `${turn === 'w' ? 'White' : 'Black'} to move — Check!`;
  } else {
    statusText = `${turn === 'w' ? 'White' : 'Black'} to move`;
  }

  // Add online mode indicator
  if (gameMode === 'online') {
    if (gameOver) {
      // Keep game over message
    } else if (isMyTurn) {
      statusText = '🟢 Your turn - ' + statusText;
    } else {
      statusText = '⏳ Waiting for opponent...';
    }
  }

  statusEl.textContent = statusText;
}

function opponent(color) {
  return color === 'w' ? 'b' : 'w';
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function findKing(color, b) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c] === color + 'K') return [r, c];
  return null;
}

// Pseudo-legal moves (ignores own-king safety)
function getPseudoMoves(r, c, b) {
  const piece = b[r][c];
  if (!piece) return [];
  const color = piece[0];
  const type = piece[1];
  const moves = [];

  const add = (rr, cc) => {
    if (!inBounds(rr, cc)) return false;
    if (!b[rr][cc]) { moves.push([rr, cc]); return true; }
    if (b[rr][cc][0] !== color) moves.push([rr, cc]);
    return false;
  };

  const slide = (dirs) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (inBounds(rr, cc)) {
        if (!add(rr, cc)) break;
        rr += dr; cc += dc;
      }
    }
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (inBounds(r + dir, c) && !b[r + dir][c]) {
      moves.push([r + dir, c]);
      if (r === startRow && !b[r + 2 * dir][c]) moves.push([r + 2 * dir, c]);
    }
    for (const dc of [-1, 1]) {
      const rr = r + dir, cc = c + dc;
      if (inBounds(rr, cc) && b[rr][cc] && b[rr][cc][0] !== color) moves.push([rr, cc]);
    }
  } else if (type === 'N') {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(r + dr, c + dc);
  } else if (type === 'B') {
    slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  } else if (type === 'R') {
    slide([[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === 'Q') {
    slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === 'K') {
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) add(r + dr, c + dc);
  }

  return moves;
}

// Check if a square is attacked by a color
function isAttacked(r, c, byColor, b) {
  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      const piece = b[rr][cc];
      if (piece && piece[0] === byColor) {
        const moves = getPseudoMoves(rr, cc, b);
        if (moves.some(m => m[0] === r && m[1] === c)) return true;
      }
    }
  }
  return false;
}

// Get legal moves (filters out moves that leave king in check)
function getLegalMoves(r, c, b) {
  const piece = b[r][c];
  if (!piece) return [];
  const color = piece[0];
  const pseudoMoves = getPseudoMoves(r, c, b);
  const legalMoves = [];

  for (const [rr, cc] of pseudoMoves) {
    // Simulate move
    const newBoard = b.map(row => [...row]);
    newBoard[rr][cc] = newBoard[r][c];
    newBoard[r][c] = null;

    // Check if own king is in check after move
    const king = findKing(color, newBoard);
    if (king && !isAttacked(king[0], king[1], opponent(color), newBoard)) {
      legalMoves.push([rr, cc]);
    }
  }

  return legalMoves;
}

// Check if player has any legal moves
function playerHasMoves(color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece[0] === color) {
        const moves = getLegalMoves(r, c, board);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

// Initialize on page load
showMenu();
