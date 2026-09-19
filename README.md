# Chess Universe

Chess Universe is being rebuilt as a Netlify-first web app with Supabase for authentication, Postgres persistence, and realtime multiplayer.

## Current rebuild scope

- Responsive React/Vite/TypeScript shell
- Traditional local chess
- Browser AI using the existing Stockfish assets with a safe legal-move fallback
- Supabase email/password authentication
- Online lobby with guarded create/join RPCs
- Realtime online chess table with persisted turn-by-turn moves
- Postgres schema and RLS for profiles, games, and moves
- Netlify deployment configuration
- CI typecheck/build validation

The legacy Express/Mongo/Socket.IO code remains in the repository temporarily as migration reference, but the new app does not import or execute it.

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

Apply `supabase/migrations/001_initial_schema.sql` to the Supabase project before testing auth or online play.

## Netlify

Build command: `npm run build`

Publish directory: `dist`

Set the two `VITE_SUPABASE_*` environment variables in Netlify.

## Migration plan

1. Core local/AI chess
2. Auth + profiles
3. Apply/test Supabase auth + online realtime move sync
4. Persistent game history and ratings
5. Magic Horse + progressive variants
6. Tournaments and leaderboards
7. Friends, notifications, polish

Betting is intentionally outside the first rebuild milestone.
