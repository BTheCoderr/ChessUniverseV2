# Chess Universe — iOS Store Metadata Draft

## Name
Chess Universe

## Subtitle
Classic strategy. New worlds.

## Category
Games → Board

## Native app positioning
Chess Universe lets players practice chess, solve puzzles with explanations, complete Chess Academy lessons, replay famous historical games, and play online Classic or Battle Chess. Offline learning and practice work without an account. An account enables online matches and saved shared game history.

## Features actually present in the Expo iOS source
- Native chess Practice against a paced local opponent with difficulty choices (not the website Stockfish engine).
- Tactics puzzles with interactive move input and explanations.
- Chess Academy lessons with completion tracking and account sync.
- Famous historical game replays and study notes in Legends.
- Online Classic and Battle Chess games, private invites, clocks, draws, resignation and rematches.
- Signed-in My Games history and replay.
- Email authentication, account deletion, privacy and support links.
- Player reporting/blocking controls (available once backend migration 023 is deployed).

## Do not claim for the native app until ported and tested
- Stockfish-powered native Practice.
- Full web Academy adaptive placement and all web-only learning features.
- Every web-only mode, Season, tournament and rewards screen.
- A custom Black-moves-first rule in every native game: native Practice currently plays standard White-first chess.

## Privacy and services
- Device-only progress is stored locally; signing in enables synchronized progress.
- Signed-in online play uses Supabase, and browser email recovery and legal pages use the Chess Universe website.
- No in-app purchases, paid content, or real-money wagering are shown in the audited native source.
- Describe user accounts, game history and any identifiers accurately in App Store Connect App Privacy.
- Upload screenshots of the native app actually in use.

## Review notes
See `apps/mobile/APP_REVIEW.md` for a truthful demo flow, supporting services and manual release checklist. Verify the release build and backend before using this metadata.
