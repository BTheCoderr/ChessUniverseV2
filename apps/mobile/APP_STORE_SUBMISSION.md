# Chess Universe — iOS 1.0 App Store submission package

| Item | Value (verified from source on 2026-11-26) |
| --- | --- |
| App Store Connect app ID (`ascAppId`) | `6822133409` (`apps/mobile/eas.json` → `submit.production.ios`) |
| Bundle ID | `com.bthecoderr.chessuniverse` |
| Marketing version | `1.0` (`app.json` and `app.config.ts`) |
| Build number | EAS remote (`appVersionSource: remote`, `autoIncrement: true`). Last known: 0.1.0 (3) finished, 0.1.0 (2) rejected. Next production build will be 1.0 (4) or higher. |
| Expo account / project | owner `bferrell514`, project `ac1f969d-ef7d-48a4-8a55-7f6ee62aa426` |
| SDK | Expo 54, React Native 0.81.5, new architecture on |
| Encryption | `ITSAppUsesNonExemptEncryption: false` (HTTPS only) |
| Devices | iPhone **and iPad** (`supportsTablet: true`) — iPad screenshots and iPad review testing are required |

Everything below describes only what the native Expo app actually ships. Do not
copy website-only features (Stockfish, Seasons, Magic Horse, Evolving Queens,
adaptive Academy placement) into App Store text.

---

## 1. App Store text

**Name (30):** `Chess Universe`

**Subtitle (30):** `Classic strategy. New worlds.` (29 chars, matches the in-app headline)
Alternative: `Chess where Black moves first` (29)

**Promotional text (170):**
Chess with a twist: in Chess Universe, Black moves first. Practice against the computer, solve tactics, replay legendary games and challenge friends online.

**Description:**

Chess Universe is chess with one bold change — Black moves first.

PRACTICE
• Play the built-in computer at four levels, from Beginner to Hard
• Pass-and-play two-player games on one device
• Untimed, 10 minute, 5+3 and 3+2 clocks, undo and board flip

PUZZLES
• 20 hand-picked tactics: checkmates, forks, promotions, defense and more
• Play the answer directly on the board
• Hints, and an explanation when a move misses — and why the right one works

ACADEMY
• Short lessons on the center, king safety, calculation and endgames
• Track your progress on this device or sync it to your account

LEGENDS
• Step through famous games by Morphy, Anderssen, Fischer and more
• Learn the key idea behind each masterpiece

ONLINE
• Classic and Battle Chess games against other players
• Private invites and rematches, timed or untimed games, draws and resignation

MY GAMES
• Replay every online game move by move

Practice, Puzzles, Academy and Legends work without an account. A free Chess
Universe account is needed for online play, game history and syncing progress
with the Chess Universe website. No ads, no in-app purchases.

**Keywords (100, comma-separated, no spaces):**
`chess,puzzles,tactics,strategy,board game,checkmate,academy,learn chess,multiplayer,legends,endgame`
(99 characters. Do not repeat words already in the name/subtitle.)

**Category:** Games → Board (secondary: Games → Strategy or Education)

**URLs**
- Support: `https://chessuniverse.netlify.app/support`
- Privacy policy: `https://chessuniverse.netlify.app/privacy`
- Marketing (optional): `https://chessuniverse.netlify.app/`
Verify each URL loads from a phone before submitting (this environment could
not reach the live site).

**Copyright:** `2026 BTheCoderr` (use the legal entity/person on the Apple Developer account)

---

## 2. App Privacy (App Store Connect → App Privacy)

No analytics, advertising or tracking SDKs are in `apps/mobile/package.json`.
Data leaves the device only through Supabase when a user signs in.

| Data type | Collected | Linked to user | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Contact Info → Email Address | Yes | Yes | No | App Functionality (account) |
| Identifiers → User ID | Yes | Yes | No | App Functionality |
| User Content → Gameplay Content (online moves, results, puzzle/academy progress) | Yes | Yes | No | App Functionality |
| User Content → Other User Content (username; player reports) | Yes | Yes | No | App Functionality |
| Everything else (location, contacts, health, financial, browsing, diagnostics, usage data, purchases) | No | — | — | — |

- "Do you or your third-party partners use data for tracking?" → **No** (no ATT prompt needed).
- If you enable Supabase/Expo crash or analytics reporting later, update this table first.

**Account deletion:** in-app at Account → Delete my account (Guideline 5.1.1(v)).

---

## 3. Age rating answers (verify in App Store Connect's questionnaire)

- Violence, mature themes, gambling, contests, horror, profanity: **None**
- Simulated gambling / real-money gaming: **No**
- Unrestricted web access: **No** (only opens Chess Universe privacy/terms/support pages in Safari)
- User-generated content: **Yes** — usernames are visible to opponents; moderation = in-match Report and Block
- Messaging / chat: **No**
- Advertising: **No**
Expect a low rating (the exact tier depends on how Apple scores user-generated content).

---

## 4. App Review information

**Sign-in required:** No for offline modes; yes for Online / My Games.
**Demo account:** create a dedicated reviewer account (and a second one for a two-player game) — never the owner's account. Enter credentials only in App Store Connect.

**Notes for review (paste and fill the bracketed parts):**

> Chess Universe is a chess game and training app. Its signature rule is that Black moves first.
>
> Without signing in, try: Practice (play the computer or two players on one device), Puzzles (play the move on the board; Show hint / Skip are available), Academy (open a lesson, mark it complete) and Legends (step through famous games).
>
> To test accounts and online play, open SIGN IN on the home screen and use the demo account below. Online → Create Classic opens a table; a second account ([second demo account]) can join from another device. Report player / Block player are on the match screen.
>
> Account deletion: Account → Delete my account → confirm. Please use the separate disposable account [deletion test account] for this, not the main demo account.
>
> No in-app purchases, ads, subscriptions or real-money features. External services: Supabase (accounts, online games, progress sync); privacy, terms, support and password-reset pages on chessuniverse.netlify.app. The computer opponent runs on device.
>
> A screen recording from a physical iPhone running build [1.0 (N)] is attached.

**Attachment:** physical-device recording (Guideline 2.1 request from the 0.1.0 (2) rejection). Simulator recordings are useful for QA but are not a substitute.

---

## 5. Screenshots and previews

Required sizes (portrait):
- iPhone 6.9": **1320 × 2868** (iPhone 16 Pro Max simulator outputs exactly this)
- iPad 13": **2064 × 2752** (iPad Pro 13-inch (M4) simulator outputs exactly this)

Source: `.github/workflows/ios-simulator-qa.yml` → `qa-captures` branch,
`runs/<sha>/native-ios-simulator-captures/{iphone-6.9,ipad-13}/*.png`. These are
**native iOS app** screens from an unsigned Release simulator build with the status
bar fixed at 9:41. Website captures live separately under `website-captures/`
and are named `website-*.png`; **never upload those as iOS screenshots.**

Verified captures from run `3ae4a50` (all 8 Maestro flows passed on iPhone 16 Pro Max, iOS 26.2):
`iphone-6.9-native-02-practice-vs-computer.png`, `-04b-puzzle-solved.png`, `-06-legends-replay.png`,
`-05-academy-lesson.png`, `-01-home.png` (and the `ipad-13-native-*` equivalents at 2064 × 2752).
The QA build had no Supabase secrets, so Account shows "Online services unavailable" and Online is
signed-out — add repository secrets `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` and run
`apps/mobile/.maestro/optional/09-online-signed-in.yaml` with a disposable account for signed-in shots.

Suggested order (5–6 per device): Practice vs computer, Puzzle solved,
Legends replay, Academy lesson, Online lobby (signed in — needs QA secrets),
Home. Captions may be added on top of the real screens but must not show
features the app doesn't have.

App preview (optional): trim the native recording to 15–30 s, 886 × 1920 for
6.9", e.g.
`ffmpeg -ss 2 -t 28 -i iphone-6.9-native-gameplay.mp4 -vf "scale=886:1920,fps=30" -an -c:v libx264 -pix_fmt yuv420p preview-6.9.mp4`

---

## 6. Release steps (in order — one build only)

1. **Merge** the release PR after CI, Mobile CI and *iOS Simulator QA* are green.
2. **EAS environment (no build cost):** in expo.dev → project → Environment variables → `production`, confirm
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set to the Chess Universe project
   (`npx eas-cli env:list --environment production`). The production build now aborts early if they are missing.
3. **App Store Connect API key (no build cost):** `npx eas-cli credentials -p ios` → App Store Connect API Key → add/select,
   so `eas submit` runs non-interactively. Confirm distribution certificate + provisioning profile for
   `com.bthecoderr.chessuniverse` are valid (same menu).
4. **Supabase checks:** `online-game` and `delete-account` Edge Functions deployed with `verify_jwt`; Auth redirect URL includes
   `https://chessuniverse.netlify.app`; migrations through 023 applied.
5. **Local preflight** from `apps/mobile`: `npm ci && npm run typecheck && npm test && npx expo-doctor && npx expo config --type public | grep -E '"version"|bundleIdentifier'` → expect `1.0` / `com.bthecoderr.chessuniverse`.
6. **One production build** (needs owner approval — uses an EAS credit):
   `npx eas-cli build --platform ios --profile production`
7. **TestFlight:** `npx eas-cli submit --platform ios --latest` (targets ascAppId 6822133409). Install on a physical iPhone and an iPad.
8. **Physical-device QA** per `APP_REVIEW_QA.md`, record the walkthrough from launch (Settings → Control Center → Screen Recording).
9. In App Store Connect → version **1.0**: select the new build, add screenshots, text, privacy answers, review notes, demo
   accounts and the recording, then **Submit for Review** (owner approval).
