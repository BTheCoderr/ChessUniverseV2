# Chess Universe Mobile

Chess Universe Mobile uses **Capacitor 8** to wrap the production React/Vite app as native iOS and Android applications. The chess rules, Academy, puzzles, Stockfish integration, Supabase auth, and authoritative multiplayer stay in the same codebase.

## App identity

- App name: **Chess Universe**
- Bundle/application ID: `com.bthecoderr.chessuniverse`
- Custom URL scheme: `chessuniverse://`
- Web fallback: `https://chessuniverse.netlify.app`

## First native setup

Install dependencies:

```bash
npm install
```

Create the platforms:

```bash
npm run mobile:init:ios
npm run mobile:init:android
```

Configure the native challenge URL scheme:

```bash
npm run mobile:configure
```

Generate native icons/splash resources from `assets/logo.svg`:

```bash
npm run mobile:assets
```

Build the current web bundle and sync it into both native projects:

```bash
npm run mobile:sync
```

Open the native projects:

```bash
npm run mobile:open:ios
npm run mobile:open:android
```

## iOS requirements

Capacitor 8 requires a current macOS/Xcode toolchain. The project is configured to use Swift Package Manager when iOS is first added. Signing, Apple Team selection, App Store Connect records, and provisioning are completed in Xcode.

## Android requirements

Open the generated `android/` project in Android Studio. Choose the release signing key before Play Store submission.

## Native behavior already wired

- notch and home-indicator safe areas
- native bottom navigation
- native haptic move/capture/check/mate feedback
- native status bar styling
- custom `chessuniverse://challenge/<game-id>` URL handling
- public invite links always use the real Netlify production URL
- existing offline/local JSON storage remains local to the native WebView
- the same Supabase backend remains authoritative for accounts, multiplayer, ratings, Seasons, Championships, and shared progress

## Challenge links

The native app accepts:

```text
chessuniverse://challenge/<uuid>
```

Normal share links remain:

```text
https://chessuniverse.netlify.app/?challenge=<uuid>
```

The public HTTPS link is intentionally retained because it works even when the recipient does not have the mobile app installed. Universal/App Links can be added after the Apple Team ID and Android signing certificate fingerprint are finalized.

## Store work still requiring developer credentials

The codebase can prepare the native projects, but these steps require the owner's Apple/Google developer credentials:

1. select the Apple Developer Team and signing identity in Xcode
2. create the App Store Connect app record
3. create the Android release keystore / Play Console record
4. generate final native screenshots on real simulator/device sizes
5. configure Universal Links / Android App Links after signing identifiers are known
6. archive/sign and submit the release builds

## Release smoke test

Before a store upload, verify on a real phone:

- first launch and bottom tabs
- Practice + Stockfish
- drag and tap moves
- Puzzles and wrong-move explanations
- Academy placement and local progress
- My Games replay/review
- sign in / sign out
- create/join Classic online game
- create/join Battle game
- background the app and return to an active online game
- challenge link opens the Online screen
- Netlify Feedback submits without sign-in
- offline Practice/Puzzles after the first cached/native launch
