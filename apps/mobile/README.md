# Chess Universe — Expo Mobile

Native React Native/Expo client for Chess Universe. The existing Vite web app remains independently deployable and is not wrapped in a WebView.

## Development

```bash
cd apps/mobile
npm install
npx expo start
```

## Environment

Create `.env.local` in this directory:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Only the public Supabase URL and anon/publishable key belong in the app. Never place service-role credentials in Expo environment variables.

## iOS / TestFlight

After the first EAS project link/configuration:

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

Bundle identifier: `com.bthecoderr.chessuniverse`
URL scheme: `chessuniverse://`

## Port order

1. Native shell and navigation
2. Shared Supabase auth/client
3. Native chess board + local chess.js engine
4. Practice + Stockfish
5. Puzzles and explanations
6. Academy/progress
7. My Games/replay
8. Classic online multiplayer
9. Battle Chess
10. Deep links, background/resume, polish, TestFlight QA

The production Netlify web app is not deployed by mobile work unless explicitly requested.
