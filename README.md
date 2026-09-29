# Chess Universe

Chess Universe is an offline-first React/Vite/TypeScript chess app with Supabase for authentication, Postgres persistence, realtime multiplayer, cross-device progress sync, and trusted online game actions.

## Beta feature set

- Traditional Chess Universe play with **Black moving first**
- Local two-player and Stockfish Practice with multiple difficulty levels
- Untimed and timed Practice, pause/resume, undo, move history, drag controls, sound and haptics
- Learn mode for piece movement, checkmate, and the Chess Universe Black-first rule
- Offline tactical Puzzles with local + signed-in progress sync
- Legends mode with famous historical games, pivotal moments, and Rewrite History challenges
- My Games with offline replay and Stockfish review
- Magic Horse and Evolving Queens as separate playable variants
- Installable offline PWA
- Supabase email/password accounts and profiles
- Realtime online chess with server-authoritative moves, clocks, results, resignations and draws
- Opponent presence/reconnect state and resumable online games
- Recent online match history and W/L/D tracking
- Signed-in sync for Puzzles, Legends, preferences, and saved Practice games
- In-app beta feedback, Privacy and Beta Terms
- Password recovery and self-service account deletion
- CI tests, TypeScript validation and production/PWA build checks

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Supabase is optional for offline/local play. To enable accounts, sync and online multiplayer:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Apply the SQL files in `supabase/migrations/` in order and deploy these Edge Functions:

- `supabase/functions/online-game/index.ts`
- `supabase/functions/delete-account/index.ts`

## Online trust model

The browser may preview legal moves for UI feedback, but it is not authoritative. The `online-game` Edge Function reloads the current game, validates the authenticated participant, applies moves with `chess.js`, calculates the server clock, determines game-over state, and commits through service-role-only database functions.

Browser roles do not directly mutate online game state.

## Privacy and account data

Player-specific synced progress is protected by Row Level Security. A signed-in player can only read or write their own progress and saved Practice games.

Deleting an account removes the account and synced personal progress. Unfinished games are removed. Completed match records can remain de-identified so the opponent does not lose their game history.

## Netlify

Build command:

```bash
npm run build
```

Publish directory: `dist`

Production deploys from `main`.

## Beta testing priorities

1. Two-device online create/join and realtime move sync
2. Disconnect/reconnect and Resume behavior
3. Draw offer/decline/accept flows
4. Mobile responsiveness and PWA install/offline behavior
5. Cross-device Puzzle, Legends and My Games sync
6. Feedback collection and account recovery/deletion
7. Ratings, rematches and private challenge links after the beta lifecycle is proven

Chess Universe does **not** provide real-money wagering.
