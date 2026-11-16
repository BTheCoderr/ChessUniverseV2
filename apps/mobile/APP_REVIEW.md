# Chess Universe iOS App Review checklist

App Store Connect app ID: 6822133409
iOS bundle ID: `com.bthecoderr.chessuniverse`
Native app: `apps/mobile`, Expo SDK 54
Submitted build: 0.1.0 (2), rejection dated October 30, 2026

## Actual iOS features

- Practice: Black moves first against a paced built-in opponent, or play local pass-and-play chess. **Not the web Stockfish engine.**
- Puzzles: move-on-board tactical exercises, explanations and saved progress.
- Academy: guided lessons and completion tracking.
- Legends: historical chess game replay and lessons.
- Online: Classic and Battle Chess with game creation, private invites, timed/untimed games, rematches, resignations and draws. Requires a Chess Universe account and configured Supabase services.
- My Games: signed-in game history and replay.
- Accounts: email registration, login, sign-out, website-handled email verification and password recovery, and in-app permanent deletion.
- Safety controls: reporting/blocking are proposed separately and must not be claimed to Apple until the database migration and client changes are merged and tested.

Do **not** copy features from the web's promotional metadata into App Review notes unless the native app really implements them.

## External services / libraries

- Supabase Auth, Postgres, Realtime and Edge Functions: accounts, online games, synced progress and account deletion.
- Netlify: Chess Universe website with privacy policy, support, terms and browser-based email confirmation/password reset.
- Expo, React Native and expo-router: native iOS shell and navigation.
- chess.js: native chess rule calculations. Native Practice uses a local opponent, not an external AI/Stockfish service.
- No in-app purchases, real-money wagering or paid access is present in the inspected native screens.

## Before the next submission

- [ ] Resolve and validate the separately proposed player-safety migration before declaring online moderation features ready.
- [ ] Verify the `online-game` and `delete-account` Edge Functions are deployed and healthy; source code alone is not proof.
- [ ] Verify the Supabase allowed redirect URL includes `https://chessuniverse.netlify.app`.
- [ ] Confirm the public privacy, support and terms URLs are live on the deployed site and are listed accurately in App Store Connect.
- [ ] Verify moderation reports are reviewed promptly and the support contact is monitored.
- [ ] Build a **new** production iOS binary from this merged source. Existing build 0.1.0 (2) will not contain these changes.
- [ ] Install the new build on supported physical iPhones and an iPad (iPad support is enabled).
- [ ] Test guest Practice, Puzzles, Academy and Legends, plus online gameplay with two real test accounts.
- [ ] Test registration/confirmation, login/logout, reset-password links and account deletion on a *disposable* test account.
- [ ] Once player-safety controls are actually shipped, test report/block with two disposable accounts and verify database rows and moderator review.
- [ ] Capture a real physical-device screen recording starting at app launch, demonstrating the typical flow, registration/login, in-app account deletion, and report/block controls.
- [ ] Provide working reviewer credentials for all needed roles and make sure backend access is available.
- [ ] Verify native App Store screenshots show actual app use, and the App Privacy questionnaire reflects all collected data.
- [ ] Explain all regional variations (or confirm none after verification), and list any applicable protected content rights.
- [ ] Make sure web Terms do not inaccurately present a publicly released app as a test-only beta.

## Suggested App Review notes (fill verified details)

Chess Universe is a chess game and training app for casual and developing chess players. It includes offline Practice, Puzzles, an Academy and historical game replays. A Chess Universe account enables online Classic and Battle Chess, private challenges, game history and synced progress. There are no in-app purchases or real-money wagering in the iOS app.

To review:
1. Open the app and select Practice, Puzzles, Academy or Legends without signing in.
2. Select Account and sign in with the demo account shown below.
3. Open Online to create or join a game. A second demo account/device is needed to demonstrate live two-player play.
4. In an active online match, use Report player and Block player to test the safety controls.
5. Open Account and select Delete my account to initiate permanent account deletion with confirmation (use a disposable review account).

Recording: [attach physical-device recording].
Demo accounts: [supply real active credentials privately in App Store Connect].
External services: Supabase, Netlify, Expo/React Native, chess.js.
Regional differences: [verify and fill].
Third-party protected content/regulated activity: [verify and fill].

**Do not submit these notes before verifying the deployment and recording.**
