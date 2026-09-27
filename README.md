# Chess Universe

Chess Universe is a Netlify-first React/Vite/TypeScript app with Supabase for authentication, Postgres persistence, realtime multiplayer, and trusted online game actions.

## Current rebuild scope

- Responsive React/Vite/TypeScript shell
- Traditional local chess with Black moving first
- Stockfish AI with Easy / Medium / Hard controls and visible engine status
- Magic Horse as a separate playable challenge mode
- Evolving Queens as a separate playable variant with a rules-aware AI
- Supabase email/password authentication and profiles
- Online lobby with guarded create/join RPCs
- Realtime online chess with Black moving first
- Trusted Edge Function validation for online moves, results, resignations and timeouts
- Server-timestamp game clocks and reconnect restoration
- Postgres schema, RLS and atomic move persistence
- Netlify production deployment
- CI tests, typecheck and build validation

The legacy Express/Mongo/Socket.IO code remains temporarily as migration reference. The current React app does not import or execute it.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Supabase is optional for local/AI play. To enable accounts and online play:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Apply the SQL files in `supabase/migrations/` in order and deploy `supabase/functions/online-game/index.ts` before testing online multiplayer.

## Online trust model

The browser may preview legal moves for UI feedback, but it is not authoritative. The `online-game` Edge Function reloads the current game, validates the authenticated participant, applies the move with `chess.js`, calculates the server clock, determines game-over state, and commits through a service-role-only atomic RPC.

The legacy browser move RPC is kept only long enough to deploy the new client safely and is disabled by the final migration.

## Netlify

Build command: `npm run build`

Publish directory: `dist`

Set the two `VITE_SUPABASE_*` environment variables in Netlify. Production deploys from `main`.

## Roadmap

1. Finish two-account / two-device online multiplayer verification
2. Persistent game history and ratings
3. Matchmaking and private invite codes
4. Battle Chess and custom setups
5. Free tournaments and leaderboards
6. Friends, notifications and spectator mode
7. Play-money contests with a non-cash ledger
8. Real-money contests only after jurisdiction, identity, geolocation and provider requirements are resolved

Real-money wagering is not enabled.
