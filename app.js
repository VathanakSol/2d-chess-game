// Simple 2-player chess game
const PIECES = {
  K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟'
};

let board, turn, selected, legalMoves, lastMove, gameOver;

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

function render() {
  const boardEl = document.getElementById('board');
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
  const piece = board[r][c];

  if (selected) {
    const move = legalMoves.find(m => m[0] === r && m[1] === c);
    if (move) {
      makeMove(selected[0], selected[1], r, c);
      selected = null;
      legalMoves = [];
      render();
      updateStatus();
      return;
    }
    selected = null;
    legalMoves = [];
  }

  if (piece && piece[0] === turn) {
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
  const statusEl = document.getElementById('status');
  const king = findKing(turn, board);
  const inCheck = king && isAttacked(king[0], king[1], opponent(turn), board);
  const hasMoves = playerHasMoves(turn);

  if (!hasMoves) {
    gameOver = true;
    if (inCheck) {
      statusEl.textContent = `Checkmate! ${turn === 'w' ? 'Black' : 'White'} wins! 🏆`;
    } else {
      statusEl.textContent = "Stalemate! It's a draw.";
    }
  } else if (inCheck) {
    statusEl.textContent = `${turn === 'w' ? 'White' : 'Black'} to move — Check!`;
  } else {
    statusEl.textContent = `${turn === 'w' ? 'White' : 'Black'} to move`;
  }
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
    for (const dr of [-1,0,1]) for (const dc of [-1,0,1]) {
      if (dr || dc) add(r + dr, c + dc);
    }
  }
  return moves;
}

function isAttacked(r, c, byColor, b) {
  for (let rr = 0; rr < 8; rr++)
    for (let cc = 0; cc < 8; cc++)
      if (b[rr][cc] && b[rr][cc][0] === byColor) {
        const moves = getPseudoMoves(rr, cc, b);
        if (moves.some(m => m[0] === r && m[1] === c)) return true;
      }
  return false;
}

// Legal moves: filter out moves leaving own king in check
function getLegalMoves(r, c, b) {
  const piece = b[r][c];
  const color = piece[0];
  return getPseudoMoves(r, c, b).filter(([r2, c2]) => {
    const copy = b.map(row => row.slice());
    copy[r2][c2] = piece;
    copy[r][c] = null;
    const king = findKing(color, copy);
    return !isAttacked(king[0], king[1], opponent(color), copy);
  });
}

function playerHasMoves(color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && board[r][c][0] === color && getLegalMoves(r, c, board).length > 0)
        return true;
  return false;
}

document.getElementById('reset-btn').addEventListener('click', initGame);
initGame();
