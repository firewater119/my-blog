import { init as initTheme } from './theme.js';

initTheme();

// ───────────────────────── 상수 ─────────────────────────
const COLS = 10;
const ROWS = 20;
const CELL = 30;          // 보드 셀 크기(px)
const PREVIEW_CELL = 22;  // 넥스트/홀드 미리보기 셀 크기
const NEXT_COUNT = 5;

// 테트로미노 스폰 모양 + 색상 (Tetris Guideline 표준 색)
const SHAPES = {
  I: { color: '#31c7ef', matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
  O: { color: '#f7d308', matrix: [[1,1],[1,1]] },
  T: { color: '#ad4d9c', matrix: [[0,1,0],[1,1,1],[0,0,0]] },
  S: { color: '#42b642', matrix: [[0,1,1],[1,1,0],[0,0,0]] },
  Z: { color: '#ef2029', matrix: [[1,1,0],[0,1,1],[0,0,0]] },
  J: { color: '#5a65ad', matrix: [[1,0,0],[1,1,1],[0,0,0]] },
  L: { color: '#ef7921', matrix: [[0,0,1],[1,1,1],[0,0,0]] },
};

// SRS 월킥 데이터 (y는 위가 양수 → 적용 시 row - dy)
const KICKS_JLSTZ = {
  '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};
const KICKS_I = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>3': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '3>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '3>0': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '0>3': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
};

const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };
const LOCK_DELAY = 500; // ms

// ───────────────────────── 캔버스 ─────────────────────────
const boardCanvas = document.getElementById('board');
const bctx = boardCanvas.getContext('2d');
boardCanvas.width = COLS * CELL;
boardCanvas.height = ROWS * CELL;

const holdCanvas = document.getElementById('hold');
const hctx = holdCanvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nctx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const startBtn = document.getElementById('start-btn');

// ───────────────────────── 상태 ─────────────────────────
let grid, current, nextQueue, bag, holdPiece, canHold;
let score, lines, level, gravityMs, dropAcc, lastTime;
let lockTimer, locking;
let running = false, paused = false, gameOver = false, rafId = null;

function emptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

// 7-bag 랜덤화
function refillBag() {
  bag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}
function nextFromBag() {
  if (!bag || bag.length === 0) refillBag();
  return bag.pop();
}

function spawn(type) {
  const def = SHAPES[type];
  const matrix = def.matrix.map(r => r.slice());
  const x = type === 'I' || type === 'O' ? 3 : 3;
  return { type, color: def.color, matrix, x, y: 0, rot: 0 };
}

function rotateCW(matrix) {
  const n = matrix.length;
  const res = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      res[x][n - 1 - y] = matrix[y][x];
  return res;
}
function rotateCCW(matrix) {
  const n = matrix.length;
  const res = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      res[n - 1 - x][y] = matrix[y][x];
  return res;
}

function collides(piece, offX = 0, offY = 0, matrix = piece.matrix) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      const nx = piece.x + x + offX;
      const ny = piece.y + y + offY;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && grid[ny][nx]) return true;
    }
  }
  return false;
}

function rotate(dir) {
  if (current.type === 'O') return; // O는 회전 효과 없음
  const from = current.rot;
  const to = (from + (dir === 1 ? 1 : 3)) % 4;
  const newMatrix = dir === 1 ? rotateCW(current.matrix) : rotateCCW(current.matrix);
  const table = current.type === 'I' ? KICKS_I : KICKS_JLSTZ;
  const kicks = table[`${from}>${to}`] || [[0, 0]];
  for (const [dx, dy] of kicks) {
    if (!collides(current, dx, -dy, newMatrix)) {
      current.x += dx;
      current.y += -dy;
      current.matrix = newMatrix;
      current.rot = to;
      resetLockIfGrounded();
      return;
    }
  }
}

function move(dx) {
  if (!collides(current, dx, 0)) {
    current.x += dx;
    resetLockIfGrounded();
  }
}

function softDrop() {
  if (!collides(current, 0, 1)) {
    current.y += 1;
    score += 1;
    updateStats();
  } else {
    startLock();
  }
}

function hardDrop() {
  let dist = 0;
  while (!collides(current, 0, dist + 1)) dist++;
  current.y += dist;
  score += dist * 2;
  lockPiece();
}

function resetLockIfGrounded() {
  if (collides(current, 0, 1)) {
    if (!locking) startLock();
    else { clearTimeout(lockTimer); lockTimer = setTimeout(lockPiece, LOCK_DELAY); }
  } else {
    locking = false;
    clearTimeout(lockTimer);
  }
}
function startLock() {
  locking = true;
  clearTimeout(lockTimer);
  lockTimer = setTimeout(lockPiece, LOCK_DELAY);
}

function lockPiece() {
  clearTimeout(lockTimer);
  locking = false;
  for (let y = 0; y < current.matrix.length; y++) {
    for (let x = 0; x < current.matrix[y].length; x++) {
      if (!current.matrix[y][x]) continue;
      const ny = current.y + y;
      const nx = current.x + x;
      if (ny < 0) { endGame(); return; } // 천장 위에서 잠김 → 게임오버
      grid[ny][nx] = current.color;
    }
  }
  clearLines();
  canHold = true;
  takeNext();
  if (collides(current, 0, 0)) endGame();
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (grid[y].every(c => c)) {
      grid.splice(y, 1);
      grid.unshift(Array(COLS).fill(null));
      cleared++;
      y++; // 같은 줄 다시 검사
    }
  }
  if (cleared > 0) {
    score += (LINE_SCORES[cleared] || 0) * level;
    lines += cleared;
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel !== level) { level = newLevel; gravityMs = gravityForLevel(level); }
    updateStats();
  }
}

// 가이드라인 중력 공식 (레벨이 오를수록 빨라짐)
function gravityForLevel(lv) {
  const t = Math.pow(0.8 - (lv - 1) * 0.007, lv - 1);
  return t * 1000;
}

function takeNext() {
  const type = nextQueue.shift();
  nextQueue.push(nextFromBag());
  current = spawn(type);
  dropAcc = 0;
}

function holdSwap() {
  if (!canHold) return;
  canHold = false;
  if (holdPiece) {
    const t = holdPiece;
    holdPiece = current.type;
    current = spawn(t);
  } else {
    holdPiece = current.type;
    takeNext();
  }
  dropAcc = 0;
  drawSide();
}

// ───────────────────────── 렌더링 ─────────────────────────
function drawCell(ctx, cx, cy, size, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(cx, cy, size, size);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx + 0.5, cy + 0.5, size - 1, size - 1);
  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(cx, cy, size, size * 0.18);
}

function getGridColor() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--color-border').trim() || '#e0e0e0';
}

function drawBoard() {
  bctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  // 격자 배경
  bctx.strokeStyle = getGridColor();
  bctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    bctx.beginPath();
    bctx.moveTo(x * CELL + 0.5, 0);
    bctx.lineTo(x * CELL + 0.5, ROWS * CELL);
    bctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    bctx.beginPath();
    bctx.moveTo(0, y * CELL + 0.5);
    bctx.lineTo(COLS * CELL, y * CELL + 0.5);
    bctx.stroke();
  }
  // 쌓인 블록
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (grid[y][x]) drawCell(bctx, x * CELL, y * CELL, CELL, grid[y][x]);

  if (!current) return;

  // 고스트 피스
  let ghostY = 0;
  while (!collides(current, 0, ghostY + 1)) ghostY++;
  for (let y = 0; y < current.matrix.length; y++)
    for (let x = 0; x < current.matrix[y].length; x++)
      if (current.matrix[y][x]) {
        const gy = current.y + y + ghostY;
        if (gy >= 0)
          drawCell(bctx, (current.x + x) * CELL, gy * CELL, CELL, current.color, 0.25);
      }

  // 현재 피스
  for (let y = 0; y < current.matrix.length; y++)
    for (let x = 0; x < current.matrix[y].length; x++)
      if (current.matrix[y][x]) {
        const py = current.y + y;
        if (py >= 0)
          drawCell(bctx, (current.x + x) * CELL, py * CELL, CELL, current.color);
      }
}

function drawMini(ctx, canvas, type) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!type) return;
  const m = SHAPES[type].matrix;
  // 실제 블록 영역만 추려 가운데 정렬
  let minX = 99, maxX = -1, minY = 99, maxY = -1;
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m[y].length; x++)
      if (m[y][x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const w = (maxX - minX + 1) * PREVIEW_CELL;
  const h = (maxY - minY + 1) * PREVIEW_CELL;
  const offX = (canvas.width - w) / 2;
  const offY = (canvas.height - h) / 2;
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++)
      if (m[y][x])
        drawCell(ctx, offX + (x - minX) * PREVIEW_CELL, offY + (y - minY) * PREVIEW_CELL, PREVIEW_CELL, SHAPES[type].color);
}

function drawSide() {
  drawMini(hctx, holdCanvas, holdPiece);
  // 넥스트: 첫 번째 미리보기만 캔버스에, 나머지는 아래에 작게 그릴 수도 있지만 첫 1개 크게
  nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const slotH = nextCanvas.height / NEXT_COUNT;
  for (let i = 0; i < Math.min(NEXT_COUNT, nextQueue.length); i++) {
    const type = nextQueue[i];
    const m = SHAPES[type].matrix;
    let minX = 99, maxX = -1, minY = 99, maxY = -1;
    for (let y = 0; y < m.length; y++)
      for (let x = 0; x < m[y].length; x++)
        if (m[y][x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const cell = 16;
    const w = (maxX - minX + 1) * cell;
    const h = (maxY - minY + 1) * cell;
    const offX = (nextCanvas.width - w) / 2;
    const offY = i * slotH + (slotH - h) / 2;
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++)
        if (m[y][x])
          drawCell(nctx, offX + (x - minX) * cell, offY + (y - minY) * cell, cell, SHAPES[type].color);
  }
}

function updateStats() {
  scoreEl.textContent = score.toLocaleString();
  levelEl.textContent = level;
  linesEl.textContent = lines;
}

// ───────────────────────── 루프 ─────────────────────────
function loop(time) {
  if (!running || paused || gameOver) return;
  const dt = time - lastTime;
  lastTime = time;
  dropAcc += dt;
  if (dropAcc >= gravityMs) {
    dropAcc = 0;
    if (!collides(current, 0, 1)) {
      current.y += 1;
    } else {
      startLock();
    }
  }
  drawBoard();
  drawSide();
  rafId = requestAnimationFrame(loop);
}

function startGame() {
  grid = emptyGrid();
  bag = null;
  refillBag();
  nextQueue = [];
  for (let i = 0; i < NEXT_COUNT; i++) nextQueue.push(nextFromBag());
  holdPiece = null;
  canHold = true;
  score = 0; lines = 0; level = 1;
  gravityMs = gravityForLevel(level);
  dropAcc = 0;
  locking = false;
  gameOver = false; paused = false; running = true;
  takeNext();
  updateStats();
  overlay.classList.add('hidden');
  lastTime = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function endGame() {
  gameOver = true;
  running = false;
  clearTimeout(lockTimer);
  cancelAnimationFrame(rafId);
  drawBoard();
  overlayText.innerHTML = `게임 오버<br><span class="overlay-sub">점수 ${score.toLocaleString()}</span>`;
  startBtn.textContent = '다시 시작';
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  if (paused) {
    cancelAnimationFrame(rafId);
    overlayText.innerHTML = '일시정지';
    startBtn.textContent = '계속하기';
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }
}

// ───────────────────────── 입력 ─────────────────────────
document.addEventListener('keydown', (e) => {
  if (!running || gameOver) {
    if (e.code === 'Enter') startGame();
    return;
  }
  if (e.code === 'KeyP') { e.preventDefault(); togglePause(); return; }
  if (paused) return;

  switch (e.code) {
    case 'ArrowLeft':  e.preventDefault(); move(-1); break;
    case 'ArrowRight': e.preventDefault(); move(1); break;
    case 'ArrowDown':  e.preventDefault(); softDrop(); break;
    case 'ArrowUp':
    case 'KeyX':       e.preventDefault(); if (!e.repeat) rotate(1); break;
    case 'KeyZ':
    case 'ControlLeft':
    case 'ControlRight': e.preventDefault(); if (!e.repeat) rotate(-1); break;
    case 'Space':      e.preventDefault(); if (!e.repeat) hardDrop(); break;
    case 'ShiftLeft':
    case 'ShiftRight':
    case 'KeyC':       e.preventDefault(); if (!e.repeat) holdSwap(); break;
  }
  drawBoard();
  drawSide();
});

startBtn.addEventListener('click', () => {
  if (paused && running) { togglePause(); return; }
  startGame();
});

// 초기 화면
grid = emptyGrid();
nextQueue = [];
holdPiece = null;
score = 0; lines = 0; level = 1;
updateStats();
drawBoard();
drawSide();
