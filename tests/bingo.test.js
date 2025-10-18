import { describe, it, expect } from 'vitest'

const BOARD_SIZE = 5
const DIFFICULTY_HARD = 3

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle(arr, seed) {
  const rng = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function boardToRows(board) {
  const rows = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    rows.push(board.slice(r * BOARD_SIZE, r * BOARD_SIZE + BOARD_SIZE));
  }
  return rows;
}
function boardToCols(board) {
  const cols = [];
  for (let c = 0; c < BOARD_SIZE; c++) {
    const col = [];
    for (let r = 0; r < BOARD_SIZE; r++) col.push(board[r * BOARD_SIZE + c]);
    cols.push(col);
  }
  return cols;
}
function countHard(items) { return items.filter((x) => x.diff >= DIFFICULTY_HARD).length; }
function validDifficulty(board) {
  const rows = boardToRows(board);
  const cols = boardToCols(board);
  const okRow = rows.every((row) => {
    const hard = countHard(row); return hard >= 1 && hard <= 2;
  });
  const okCol = cols.every((col) => {
    const hard = countHard(col); return hard >= 1 && hard <= 2;
  });
  return okRow && okCol;
}
const CRIT = Array.from({length: 35}, (_, i) => {
  const diff = (i % 4) + 1;
  return { id: i + 1, text: 'T'+(i+1), diff };
});
function generateBoard(criteria, seed) {
  const N = BOARD_SIZE * BOARD_SIZE;
  for (let i = 0; i < 8000; i++) {
    const candidate = seededShuffle(criteria, seed + i).slice(0, N);
    if (validDifficulty(candidate)) return candidate;
  }
  return seededShuffle(criteria, seed).slice(0, N);
}
function checkAnyBingo(completedIds, board) {
  const rows = boardToRows(board);
  for (const row of rows) if (row.every((cell) => completedIds.has(cell.id))) return true;
  const cols = boardToCols(board);
  for (const col of cols) if (col.every((cell) => completedIds.has(cell.id))) return true;
  return false;
}

describe('Board generation', () => {
  it('produces a 5x5 board', () => {
    const b = generateBoard(CRIT, 123);
    expect(b.length).toBe(25);
  });
  it('enforces 1-2 hard per row/col', () => {
    const b = generateBoard(CRIT, 456);
    const rows = boardToRows(b);
    const cols = boardToCols(b);
    for (const row of rows) {
      const hard = countHard(row);
      expect(hard >= 1 && hard <= 2).toBe(true);
    }
    for (const col of cols) {
      const hard = countHard(col);
      expect(hard >= 1 && hard <= 2).toBe(true);
    }
  });
  it('is deterministic for a given seed', () => {
    const a = generateBoard(CRIT, 789).map(x => x.id).join(',');
    const b = generateBoard(CRIT, 789).map(x => x.id).join(',');
    expect(a).toBe(b);
  });
});

describe('Bingo detection', () => {
  it('detects a complete row', () => {
    const b = generateBoard(CRIT, 999);
    const rows = boardToRows(b);
    const ids = new Set(rows[0].map(x => x.id));
    expect(checkAnyBingo(ids, b)).toBe(true);
  });
  it('detects a complete column', () => {
    const b = generateBoard(CRIT, 1000);
    const cols = boardToCols(b);
    const ids = new Set(cols[3].map(x => x.id));
    expect(checkAnyBingo(ids, b)).toBe(true);
  });
  it('returns false for partials', () => {
    const b = generateBoard(CRIT, 1001);
    const rows = boardToRows(b);
    const ids = new Set([rows[0][0].id, rows[0][1].id]);
    expect(checkAnyBingo(ids, b)).toBe(false);
  });
});
