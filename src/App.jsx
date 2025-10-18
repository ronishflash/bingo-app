import React, { useEffect, useState } from 'react'

// ---------------------------
// Constants & Config
// ---------------------------
const BOARD_SIZE = 5;            // Traditional bingo
const DIFFICULTY_HARD = 3;       // diff >= 3 counts as "hard"
const BINGO_BONUS = 10;

const PRIZE_TIERS = [
  { tier: 1, label: 'CFF Sticker', coins: 3 },
  { tier: 2, label: 'CFF Magnet', coins: 5 },
  { tier: 3, label: 'Popcorn Bucket', coins: 10 },
  { tier: 4, label: 'Free Drink (festival night)', coins: 15 },
  { tier: 5, label: 'Free T-shirt', coins: 25 },
];

// Expanded criteria list (ensure > 25 items)
const BASE_CRITERIA = [
  { id: 1,  text: 'Watch a scary movie', diff: 1 },
  { id: 2,  text: 'Visit the Rowland Theatre', diff: 2 },
  { id: 3,  text: 'Have an Immersive Experience', diff: 3 },
  { id: 4,  text: 'Watch Film A', diff: 2 },
  { id: 5,  text: 'Attend a Q&A session', diff: 3 },
  { id: 6,  text: 'Try local vendor food', diff: 2 },
  { id: 7,  text: 'Meet a filmmaker', diff: 3 },
  { id: 8,  text: 'Volunteer at an event', diff: 4 },
  { id: 9,  text: 'Post a festival pic on Instagram', diff: 2 },
  { id: 10, text: 'Watch Film B', diff: 2 },
  { id: 11, text: 'Watch Film C', diff: 3 },
  { id: 12, text: 'Try a new genre', diff: 1 },
  { id: 13, text: 'Talk to a volunteer', diff: 1 },
  { id: 14, text: 'Rate a film on the app', diff: 2 },
  { id: 15, text: 'Join an immersive photo booth', diff: 3 },
  { id: 16, text: 'Watch [Festival Headliner]', diff: 3 },
  { id: 17, text: 'Explore an art installation', diff: 2 },
  { id: 18, text: 'Attend opening night', diff: 3 },
  { id: 19, text: 'Collect a program booklet', diff: 1 },
  { id: 20, text: 'Take a selfie with a mascot', diff: 2 },
  { id: 21, text: 'Watch a documentary', diff: 2 },
  { id: 22, text: 'Share feedback with staff', diff: 1 },
  { id: 23, text: 'Try a new theater location', diff: 2 },
  { id: 24, text: 'Attend a late-night showing', diff: 3 },
  { id: 25, text: 'Watch a foreign-language film', diff: 3 },
  { id: 26, text: 'Bring a friend to a screening', diff: 1 },
  { id: 27, text: 'Spot a local artist performance', diff: 2 },
  { id: 28, text: 'Participate in a raffle', diff: 2 },
  { id: 29, text: 'Watch an animation block', diff: 2 },
  { id: 30, text: 'Try festival-exclusive snack', diff: 1 },
  { id: 31, text: 'Attend a panel discussion', diff: 3 },
  { id: 32, text: 'Visit a sponsor booth', diff: 1 },
  { id: 33, text: 'Watch a student short', diff: 2 }
];

// ---------------------------
// Utility: PRNG + seeded shuffle
// ---------------------------
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStringToSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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

// ---------------------------
// Board helpers
// ---------------------------
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
function countHard(items) {
  return items.filter((x) => x.diff >= DIFFICULTY_HARD).length;
}
function validDifficulty(board) {
  const rows = boardToRows(board);
  const cols = boardToCols(board);
  const okRow = rows.every((row) => {
    const hard = countHard(row);
    return hard >= 1 && hard <= 2; // 1–2 hard per row
  });
  const okCol = cols.every((col) => {
    const hard = countHard(col);
    return hard >= 1 && hard <= 2; // 1–2 hard per column
  });
  return okRow && okCol;
}
function generateBingoBoard(criteria, seed) {
  const N = BOARD_SIZE * BOARD_SIZE;
  for (let i = 0; i < 8000; i++) {
    const candidate = seededShuffle(criteria, seed + i).slice(0, N);
    if (validDifficulty(candidate)) return candidate;
  }
  return seededShuffle(criteria, seed).slice(0, N);
}

// ---------------------------
// Backend (LocalStorage)
// ---------------------------
class LocalStorageBackend {
  constructor(key = 'festival_bingo_users') {
    this.key = key;
  }
  _load() {
    const raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : {};
  }
  _save(db) {
    localStorage.setItem(this.key, JSON.stringify(db));
  }
  async getUser(uid) {
    const db = this._load();
    return db[uid] || null;
  }
  async upsertUser(uid, data) {
    const db = this._load();
    db[uid] = { ...(db[uid] || {}), ...data };
    this._save(db);
    return db[uid];
  }
  async topUsers(limit = 20) {
    const db = this._load();
    return Object.values(db)
      .sort((a, b) => (b.coins || 0) - (a.coins || 0))
      .slice(0, limit);
  }
}
const backend = new LocalStorageBackend();

function coinsFor(cell) { return 3 + (cell.diff || 0); }

function checkAnyBingo(completedIds, board) {
  const rows = boardToRows(board);
  for (const row of rows) {
    if (row.every((cell) => completedIds.has(cell.id))) return true;
  }
  const cols = boardToCols(board);
  for (const col of cols) {
    if (col.every((cell) => completedIds.has(cell.id))) return true;
  }
  return false;
}

// ---------------------------
// UI Components
// ---------------------------
function Header() {
  return (
    <div style={{ padding: 16, textAlign: 'center', background: '#0b0b0b' }}>
      <h1 style={{ color: '#f5c542', margin: 0 }}>🎬 Festival Bingo</h1>
      <p style={{ color: '#ddd', marginTop: 8 }}>
        Complete squares to earn coins. First full row/column gives a bonus.
      </p>
    </div>
  );
}
function Login({ onLogin }) {
  const [name, setName] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 16 }}>
      <input
        placeholder='Enter your name'
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: 8, minWidth: 240 }}
      />
      <button
        onClick={() => name.trim() && onLogin(name.trim())}
        style={{ padding: '8px 16px', background: '#e11d48', color: 'white', border: 0, borderRadius: 8 }}
      >
        Start
      </button>
    </div>
  );
}
function PrizeList() {
  return (
    <div style={{ marginTop: 12, textAlign: 'center' }}>
      <h3 style={{ color: '#f5c542' }}>🏅 Prize Tiers</h3>
      <ul style={{ listStyle: 'none', padding: 0, color: '#ddd' }}>
        {PRIZE_TIERS.map((t) => (
          <li key={t.tier} style={{ margin: 4 }}>
            <strong>Tier {t.tier}:</strong> {t.label} — {t.coins} coins
          </li>
        ))}
      </ul>
    </div>
  );
}
function Leaderboard({ items }) {
  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ color: '#f5c542', textAlign: 'center' }}>🏆 Leaderboard</h3>
      {items.length === 0 ? (
        <p style={{ color: '#bbb', textAlign: 'center' }}>No entries yet</p>
      ) : (
        <ol style={{ color: '#ddd', maxWidth: 420, margin: '8px auto' }}>
          {items.map((u, i) => (
            <li key={i}>
              {u.name || 'Anonymous'} — {u.coins || 0} coins
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
function Board({ board, completedIds, onToggle }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
        gap: 8,
        maxWidth: 720,
        margin: '16px auto',
      }}
    >
      {board.map((cell) => {
        const done = completedIds.has(cell.id);
        return (
          <button
            key={cell.id}
            onClick={() => onToggle(cell)}
            title={`Difficulty: ${cell.diff}`}
            style={{
              minHeight: 90,
              padding: 8,
              borderRadius: 12,
              border: 0,
              background: done ? '#16a34a' : '#1f2937',
              color: 'white',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8 }}>diff {cell.diff}</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>{cell.text}</div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------
// Main App
// ---------------------------
export default function App() {
  const [profile, setProfile] = useState(null); // { uid, name }
  const [board, setBoard] = useState([]);
  const [completed, setCompleted] = useState(new Set());
  const [coins, setCoins] = useState(0);
  const [lb, setLb] = useState([]);
  const [flash, setFlash] = useState('');
  const [winMode, setWinMode] = useState('first_line'); // 'first_line' | 'full_card'
  const [lbUpdatedAt, setLbUpdatedAt] = useState(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const seed = hashStringToSeed(profile.uid);
      const b = generateBingoBoard(BASE_CRITERIA, seed);
      setBoard(b);

      const u = await backend.getUser(profile.uid);
      if (u) {
        setCoins(u.coins || 0);
        setCompleted(new Set(u.completed || []));
      } else {
        await backend.upsertUser(profile.uid, { uid: profile.uid, name: profile.name, coins: 0, completed: [] });
      }
      const top = await backend.topUsers(20);
      setLb(top);
      setLbUpdatedAt(new Date());
    })();
  }, [profile]);

  async function handleLogin(name) {
    const uid = name.toLowerCase().replace(/\s+/g, '_');
    setProfile({ uid, name });
  }

  function isWin(completedSet) {
    if (winMode === 'full_card') {
      return board.length > 0 && board.every((c) => completedSet.has(c.id));
    }
    return checkAnyBingo(completedSet, board);
  }

  async function toggleCell(cell) {
    const next = new Set(completed);
    let gained = 0;
    if (next.has(cell.id)) {
      next.delete(cell.id);
      gained = -coinsFor(cell); // allow uncheck to reverse coins
    } else {
      next.add(cell.id);
      gained = coinsFor(cell);
    }

    let total = coins + gained;
    if (gained > 0 && isWin(next) && !isWin(completed)) {
      total += BINGO_BONUS;
      setFlash(`🔥 BINGO! +${BINGO_BONUS} bonus coins`);
      setTimeout(() => setFlash(''), 1500);
    }

    setCompleted(next);
    setCoins(total);
    await backend.upsertUser(profile.uid, { uid: profile.uid, name: profile.name, coins: total, completed: [...next] });
    await refreshLeaderboard();
  }

  async function refreshLeaderboard() {
    const top = await backend.topUsers(20);
    setLb(top.slice()); // ensure new reference
    setLbUpdatedAt(new Date());
  }

  return (
    <div>
      <Header />
      {!profile ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
          <div style={{ color: '#f5c542', textAlign: 'center', fontSize: 18 }}>
            Welcome, <strong>{profile.name}</strong>
          </div>
          <div style={{ color: '#ddd', textAlign: 'center', marginTop: 4 }}>Coins: {coins}</div>
          {flash && (
            <div style={{ color: '#22c55e', textAlign: 'center', marginTop: 6, fontWeight: 700 }}>{flash}</div>
          )}

          <Board board={board} completedIds={completed} onToggle={toggleCell} />

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <label style={{ color: '#ddd', fontSize: 14 }}>Win Condition:</label>
            <select value={winMode} onChange={(e) => setWinMode(e.target.value)} style={{ padding: 6, borderRadius: 8 }}>
              <option value="first_line">First full row/column</option>
              <option value="full_card">Entire board</option>
            </select>
          </div>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button
              onClick={refreshLeaderboard}
              style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 0, borderRadius: 8 }}
            >
              Refresh Leaderboard
            </button>
            {lbUpdatedAt && (
              <div style={{ color: '#9ca3af', marginTop: 6, fontSize: 12 }}>
                Updated: {lbUpdatedAt.toLocaleTimeString()}
              </div>
            )}
          </div>

          <Leaderboard items={lb} />
          <PrizeList />
        </div>
      )}
    </div>
  );
}
