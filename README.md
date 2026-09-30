# Chess Universe

<!-- repo-intro:start -->
**Project snapshot:** Chess Universe is an offline-first chess PWA with a custom Black-moves-first ruleset, trusted real-time multiplayer, Seasons, Battle Chess progression, historical play, and player identity.

**What it demonstrates:** React/TypeScript · Vite · Supabase/Postgres · Edge Functions · server-authoritative multiplayer.
<!-- repo-intro:end -->

[![CI](https://github.com/BTheCoderr/ChessUniverseV2/actions/workflows/ci.yml/badge.svg)](https://github.com/BTheCoderr/ChessUniverseV2/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-React%20%2B%20Vite-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/backend-Supabase-3FCF8E)](https://supabase.com/)
[![Netlify](https://img.shields.io/badge/deploy-Netlify-00C7B7)](https://chessuniverse.netlify.app/)

**Chess Universe** is a local-first chess PWA built around a custom **Black-moves-first** ruleset. Offline and single-device features persist in the browser as JSON-backed local state; Supabase is reserved for the features that genuinely require trusted shared state such as accounts, realtime multiplayer, ratings, Seasons, Championships, and cross-device sync.

**Live app:** https://chessuniverse.netlify.app/

## Product at a glance

| Area | Current experience |
| --- | --- |
| **Local play** | Two-player, Stockfish practice, saved games, offline-first PWA |
| **Learning** | Chess Academy, Piece Schools, endgames, adaptive review, puzzles, Legends |
| **Online** | Server-authoritative Classic + Battle multiplayer, private challenges, reconnect/rematch |
| **Competition** | Separate Elo systems, Seasons, Championships, leaderboards, rivalries |
| **Progression** | Battle unlocks, achievements, formation mastery, titles, Trophy Cases |
| **Identity** | Authenticated profiles plus deterministic public-safe player identity marks |

## Engineering highlights

- **Trusted multiplayer:** online moves, clocks, ratings, tournament advancement, unlocks, achievements, and titles are validated through server-side paths.
- **Local-first product design:** practice, puzzles, Legends, preferences, and saved offline state do not require the database.
- **Separate competitive systems:** Classic and Battle ratings/history stay distinct instead of sharing one ladder.
- **Account lifecycle:** signed-in progress can sync across devices, while account deletion removes personal progression and can preserve de-identified completed-match history.
- **PWA release discipline:** production builds include offline verification in addition to gameplay/regression tests.



## Why this project is different

Chess Universe started as a chess experiment and has grown into a full multiplayer product with a server-authoritative competition layer.

The browser handles interaction and presentation, but it does **not** get to decide online moves, results, clocks, ratings, tournament advancement, Battle unlocks, achievements, or titles. Those decisions are validated through Supabase Edge Functions and trusted Postgres functions.

The result is one app that supports offline play, serious online state, alternate chess modes, progression, and competitive history without mixing trusted server state with client-only gameplay.

## Product highlights

### Chess + learning

- Keyboard-navigable chessboards, visible focus states, screen-reader square labels, and reduced-motion support

- Traditional Chess Universe play with **Black moving first**
- Local two-player games
- Stockfish Practice with multiple difficulty levels
- Timed and untimed Practice
- Pause/resume, undo, move history, drag controls, sound, and haptics
- Interactive Chess Academy with piece-decision boards, guided openings, strategy/tactics instruction, and opponent-plan explanations
- Six-question knowledge-based Academy placement that recommends Beginner, Developing, or Intermediate learning paths
- Academy Dashboard with overall progress, 7-day learning activity, reviews due, weak concepts, course-by-course completion, and a recommended next lesson
- Local Academy progress export/import/reset so learners can back up or move their JSON progress without touching saved games or online data
- Piece Schools for Queen, Rook, Bishop, and Knight with local mastery progress
- Opponent-response training that starts from the opponent's last move, threat, and best practical answer
- Endgame School covering opposition, key squares, king activity, rook technique, passed pawns, and basic mating structure
- Mistake explanations for legal-but-weaker moves, with the positional reason the move misses the lesson
- Adaptive local review that prioritizes repeated mistakes and spaces successful recalls over time
- Guided local-first course paths that change by placement level instead of dumping the full lesson library on every player
- Offline tactical Puzzles with a deterministic Puzzle of the Day, queen/rook/bishop/knight/defense/strategy themes, both-color positions, and signed-in progress sync
- Multi-move puzzle sequences that alternate your decisions with scripted opponent responses so players learn combinations and multi-step plans
- Expanded Opening Lab with Caro-Kann, King's Indian, and common response branches for all six opening families
- Expanded puzzle library with back-rank mate, queen fork, and discovered-attack patterns
- Missed Piece School, Piece Decision, Opponent Response, Endgame, and multi-move concepts feed a playable local review queue
- Legends mode with famous games, pivotal moments, and **Rewrite History**
- My Games replay + Stockfish review with engine principal variation, evaluation context, and teaching cues

### Alternate worlds

- **Magic Horse**
- **Evolving Queens**
- **Battle Chess: Formation Clash**
  - alternate back-rank formations
  - Black moves first
  - normal chess movement
  - castling disabled
  - AI, local two-player, and online multiplayer

### Trusted online multiplayer

- Public Classic tables
- Private challenge links
- Public Battle tables
- Private targeted Battle challenges
- Server-authoritative legal move validation
- Server clocks
- Resignations and draw offers
- Reconnect/resume across signed-in devices
- Post-game rematches
- Challenge links that survive authentication
- Classic and Battle histories kept separate

### Ratings + competition

- Separate **Classic Elo**
- Separate **Battle Elo**
- Classic W-L-D and Battle W-L-D
- Top-player leaderboards
- Per-formation Battle statistics
- Beta Season standings using **3/1/0** points
- Rank tiers and Season milestones
- Top-8 Season Championship qualification
- Championship check-in
- Seeded knockout bracket
- Draw replays
- Automatic winner advancement
- Champion + runner-up history

### Universe progression

- Battle Chess unlock path
- Back Rank Lab
- Season Challenger / Season Contender rewards
- Championship Crest
- Champion Crown
- Universe Master
- 16 permanent achievements
- Formation mastery levels:
  - Novice
  - Adept
  - Veteran
  - Elite
  - Master
- Earned profile titles
- One equipped title per player
- Public-safe Trophy Cases
- Lightweight deterministic player identity marks using existing username/title/rating data — no avatar upload backend required

### Social competition

- Player profile spotlight from the leaderboard
- Exact **head-to-head Classic record**
- Exact **head-to-head Battle record**
- Rival status after repeated meetings
- **Nemesis** status for long-running matchups
- Current series streak
- Most-used Battle formation between two players
- One-click **Challenge again** from the opponent profile

## Competition loop

```text
Play Classic
   ↓
Earn rating + Season points
   ↓
Unlock Battle Chess
   ↓
Build a separate Battle rating
   ↓
Master formations + earn achievements/titles
   ↓
Qualify for the Season Championship
   ↓
Compete through the bracket
   ↓
Build rivalries and defend your profile history
```

## Local-first storage

Chess Universe avoids a traditional app-server/database dependency for offline and single-device play.

Local features use:

- React state for the active UI/game session
- browser `localStorage` for small persisted player data
- JSON serialization/deserialization for saved games, puzzle progress, Legends progress, preferences, and resume state
- the service worker / PWA cache for offline app assets

That means Practice, local play, Puzzles, Legends, and other offline-first experiences do not need MongoDB, Express, Socket.io, or a separate database server.

Supabase/Postgres is used only where local JSON cannot safely replace shared authoritative state: authenticated accounts, realtime multiplayer, Elo, Season standings, Championships, public competitive profiles, and cross-device synchronization.

## Trust model

Online games use the browser for responsive UI, not authority.

The `online-game` Edge Function:

1. verifies the signed-in caller,
2. reloads trusted game state,
3. validates participant access,
4. validates the requested chess move with `chess.js`,
5. calculates trusted clock state,
6. resolves game completion,
7. commits state through service-role-only Postgres functions.

The same trusted path protects:

- Classic ratings
- Battle ratings
- Season standings
- Championship advancement
- Battle formation access
- achievements
- earned/equipped titles
- targeted rivalry challenges

Browser roles cannot directly award themselves ratings, tournament results, achievements, titles, or Battle progression.

## Privacy + account lifecycle

- Supabase Auth for signed-in profiles
- Row Level Security on synced personal data
- Public profile showcases return only intended competitive/progression fields
- Private unlock-source data remains server-side
- Self-service account deletion
- Personal progression cascades on deletion
- Completed multiplayer games can remain de-identified so opponents keep historical records

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Chess rules | chess.js |
| Practice AI | Stockfish |
| Shared online state | Supabase / PostgreSQL |
| Database | PostgreSQL |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Trusted game actions | Supabase Edge Functions |
| PWA | vite-plugin-pwa |
| Hosting | Netlify |
| CI | GitHub Actions |

## Project structure

```text
src/
  components/        UI, game modes, online lobby, profiles, progression
  lib/               chess rules, AI helpers, sync, review, progression
supabase/
  functions/         trusted Edge Functions
  migrations/        database schema + competition/security lifecycle
tests/               regression, security, gameplay and release tests
scripts/             PWA/release verification
```

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Supabase is optional for offline/local play. Accounts, cross-device sync, ratings, multiplayer, Seasons, Championships, Trophy Cases, and rivalry features require Supabase.

### Environment

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

### Database + Edge Functions

Apply the SQL migrations in `supabase/migrations/` in order.

Deploy:

- `supabase/functions/online-game/index.ts`
- `supabase/functions/delete-account/index.ts`

The repository intentionally keeps privileged game mutations behind trusted server paths rather than exposing them to browser roles.

## Quality gates

Every release branch is expected to pass:

```bash
npm test
npm run typecheck
npm run build
```

The production build also runs the PWA verification script.

Regression coverage currently includes:

- chess rules and AI modes
- offline/PWA behavior
- online game lifecycle
- private challenges and rematches
- reconnect/resume
- rating separation
- Season progression
- Championship bracket flow
- Battle Chess
- reward/unlock security
- achievements, mastery, and titles
- account sync/deletion
- head-to-head rivalry and targeted challenges

## Current beta focus

The next validation priority is real multi-device usage:

1. two-account Classic and Battle matches on separate phones,
2. background/disconnect/reconnect behavior,
3. private and targeted challenge delivery,
4. clock synchronization under real network conditions,
5. Season/Championship beta participation,
6. mobile UX polish from real-player feedback.

## Product note

Chess Universe uses **virtual game progression only**. It does not provide real-money betting or wagering.

---

Built as a production-style React/Supabase multiplayer system, with the security model, database lifecycle, CI coverage, and deployment workflow treated as part of the product — not afterthoughts.
