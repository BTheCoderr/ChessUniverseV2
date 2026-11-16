# iOS App Review 2.1 — physical-device QA

Apple asked for a complete physical-device walkthrough of Chess Universe 0.1.0 (2).
This repository change does **not** update the binary already submitted to Apple.
Build and submit a newer iOS binary after merging and verifying this fix.

## Account deletion (required for apps with account creation)

Path: **Home → Sign In / Account → Delete my account** (when signed in).

The app asks for an explicit destructive confirmation. If confirmed, it calls the
existing authenticated `delete-account` Supabase Edge Function. On confirmed
success only, it clears `chess-universe:` local data and signs out locally.
Deletion can remove unfinished games; completed records may be removed or
de-identified based on database relationships.

Before release, check the deployed function is the correct one and has
`verify_jwt` enabled. Do not place Supabase service-role keys in the mobile
application.

Test with **disposable accounts only**, not the review account or a real player:

1. Create and confirm a test account, then sign in.
2. Complete an Academy lesson and a puzzle; confirm progress is saved.
3. Open Account, select Delete my account, and press **Cancel**; the account
   must remain signed in and usable.
4. Disconnect network and attempt deletion; the app must show an error and
   must **not** clear its session or offline progress.
5. Restore connectivity, retry and confirm. Verify the success message.
6. Restart the app; it should be signed out with no old local progress.
7. Try signing in with the deleted account; it should no longer work.
8. In Supabase (with appropriate admin access), verify the user record and
   associated account data were removed. Check game history retention rules.
9. Register a new disposable account on the same iPhone and verify the
   deleted account's local progress does not reappear.

Do **not** run the destructive steps on a production account.

## Full reviewer walkthrough

Record on a **physical iPhone running a current supported iOS version** and
include the device model, iOS version, and submitted build number.
Begin the recording by launching the installed app. Show:

- Home navigation and Practice with actual chess moves
- Puzzles, explanation of an incorrect move, and a correct solution
- Academy lesson and progress tracking
- Legends and My Games
- Account creation, confirmation, sign-in, and account deletion
- Online Classic and Battle creation/join flows with two disposable accounts
- Background/resume of an online game and a challenge invitation
- Any paid content or user-generated content moderation controls **if** those
  exist in the submitted build

Also test on every supported device class. The native Expo app currently sets
`ios.supportsTablet: true`, so check iPad layout or adjust supported devices
before submission.

## App Store Connect reply and Notes field

Provide all six items Apple requested:

1. The physical-device recording (upload or link accessible to App Review)
2. Purpose, target audience, problem solved, and user value
3. Instructions to reach major features and **working demo credentials**
4. External services (React Native/Expo, chess.js, Supabase Auth/Postgres/
   Realtime/Edge Functions; list any additional services used by the submitted build)
5. Verified regional feature consistency or documented differences
6. Regulatory/licensing details if applicable, including rights to content/assets

Store reviewer credentials in **App Store Connect Review Information**, not
in source control or a public document. For multiplayer, include two test
accounts. Make sure both remain available to Apple; use a separate disposable
account solely to demonstrate deletion.

## Release gate

- [ ] Mobile CI typecheck passed on the release commit
- [ ] `delete-account` confirmed deployed and JWT-protected
- [ ] Physical-iPhone registration, sign-in, and deletion passed
- [ ] Offline practice and saved learning progress passed
- [ ] Multiplayer worked across two real devices
- [ ] No launch crashes or major layout issues on supported devices
- [ ] Actual-app screenshots match the submitted binary
- [ ] Recording uploaded and the six responses entered in both App Review
      reply and App Review Information Notes
- [ ] New iOS build uploaded; selected and resubmitted for review
