# Festival Bingo (Web v2)
A working 5x5 Bingo app. No external backend required (uses localStorage).

## Run locally
1. Install Node 18+
2. `npm install`
3. `npm run dev` and open the printed URL

## Tests
- `npm test` (Vitest) checks difficulty constraints, determinism, and bingo detection.

## Features
- 5×5 grid (traditional bingo)
- Difficulty rule: each row and column has 1–2 hard squares (diff ≥ 3)
- Coins: `3 + diff` per square
- Bingo bonus: +10 coins for first crossing of win state
- Win mode: **First line** or **Full card** (selector in UI)
- Unique seeded board per player name
- Leaderboard (localStorage). Refresh button updates list and shows timestamp.
