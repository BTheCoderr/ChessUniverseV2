# Chess Universe — brand and feature-parity review

## Existing website

The existing website is a full React/Vite product at
https://chessuniverse.netlify.app/ (configured through `netlify.toml`).
The iOS Expo client in `apps/mobile/` uses the same Supabase account and
shared online multiplayer backend. The native client is not a WebView.

The site is hosted separately from this repository's source changes: a GitHub
commit alone is not proof of a completed Netlify production deploy.

## Native visual refresh — gold knight and cosmic navy (November 16, 2026)

The user confirmed that the installed iPhone icon shows a **metallic gold knight
with orbit rings and a midnight-blue starfield**. The native iOS interface is
now styled in `apps/mobile/lib/theme.ts` around that reference:

| Native token | Color | Purpose |
| --- | --- | --- |
| Midnight navy | `#08152D` | page background and status bar |
| Cosmic panel | `#11233F` | cards and surfaces |
| Metallic gold | `#F2C064` | buttons, focus rings and highlights |
| Warm ivory | `#F9F3E8` | headlines and body text |
| Slate blue | `#A6B7CB` | supporting text |
| Navy chess square | `#526E8D` | alternating board squares |
| Ivory chess square | `#E8DCC4` | alternating board squares |

**Web and native color parity:** The website CSS in `src/styles.css`,
browser theme and PWA manifest now use the same midnight-navy, gold, ivory,
blue-slate and board tokens as `apps/mobile/lib/theme.ts`. The
`tests/webGoldBrand.test.mjs` CI test protects parity.

## Original gold knight logo — now the source of truth

The exact user-provided visual is a metallic gold chess knight surrounded by
glowing orbit rings on a dark navy, star-filled background. The compressed,
high-resolution gold master is checked into
`public/brand/gold-cosmic-master.avif` (1024 × 1024, opaque).

`scripts/sync-brand-icons.py` creates all sizes from this single source:

| Asset | Location | Size |
| --- | --- | --- |
| Browser favicon | `public/brand/favicon-64.png` | 64 × 64 |
| PWA small icon | `public/brand/knight-icon-192.png` | 192 × 192 |
| PWA big / website hero | `public/brand/knight-icon-512.png` | 512 × 512 |
| Apple touch icon | `public/brand/apple-touch-icon.png` | 180 × 180 |
| iOS app icon | `apps/mobile/assets/icon.png` | 1024 × 1024 RGB |
| Native home logo | `apps/mobile/assets/logo-mark.png` | 256 × 256 |
| Legacy knight artwork | `public/brand/knight-emblem-{160,512}.jpg` | 160 / 512 |
| Social-sharing image | `public/brand/og-image.jpg` | 1200 × 630 |

The website hero, navigation, browser metadata, PWA install icon, native
home logo and Expo iOS app icon now use the same source art. The old
lime/green image and temporary hue filter are no longer shipped.

The icon master is a high-quality AVIF copy of the user-supplied PNG; it
preserves the actual gold-and-cosmic artwork rather than synthesizing a
new chess design. The iOS icon is opaque square RGB and iOS applies its
system rounded-square mask during installation.

Both web and mobile CI validate the generated icons with
`python3 scripts/sync-brand-icons.py --check`. A GitHub Actions workflow
automatically regenerates and commits matching assets when the master or
generation script changes. To revise artwork, update the master, generate
`--write`, and verify `--check` before submitting to Apple.

**Release note:** Updating the repository and deploying Netlify does not
install the new native icon on an existing iPhone. It requires a new
signed iOS/TestFlight build and physical-device validation. Do not spend
an EAS build until the branch checks and build environment are verified.

## Feature parity — validated from source, not devices

| Capability | Web | Expo native | State |
| --- | --- | --- | --- |
| Black-first universe practice | Yes | Updated in this change | Device QA needed |
| Local two-player practice | Yes | Added here | Device QA needed |
| Timed practice and move undo | Yes | Present | Device QA needed |
| Stockfish opponent and analysis | Yes | No; native lightweight AI | Not at parity |
| Academy placement, adaptive review, endgames | Yes | Native lessons/progress only | Not at parity |
| Puzzles with move feedback | Yes | Same 19 curated web puzzles (+1 native), hints, skip; synced via `scripts/sync-mobile-puzzles.mjs` | Single-move puzzles at parity; multi-move puzzles web-only |
| Legends with replay | Yes | Present | Partial (no Rewrite History) |
| Online Classic and Battle | Yes | Present | Two-device QA needed |
| Profile and account sync | Yes | Present | QA needed |
| Seasons, trophies, Championships, rivalries | Yes | Some in game data, no full mobile UI | Not at parity |
| Magic Horse and Evolving Queens | Yes | Not exposed in native client | Not at parity |
| Local saved practice and post-game analysis | Yes | Not fully ported | Not at parity |
| Account deletion | Yes | Merged from PR #49 | Destructive QA needed |

Do not describe the iOS app as having the full web feature set in App Store
metadata until all relevant features actually ship in a new build.

## Pre-release checks

1. Run `npm test && npm run typecheck && npm run build` from the repository root.
2. Run `npm ci && npm test && npm run typecheck` in `apps/mobile`.
3. Check website and native logo visually on actual screen sizes.
4. Confirm Black moves first on both Practice routes; confirm legal-move
   selection, computer response, clock controls and undo in untimed play.
5. Follow `apps/mobile/APP_REVIEW_QA.md` using disposable test accounts.
6. Do not merge unrelated UGC/regulatory migrations without migration review.
7. Upload a new signed iOS build and record Apple's required physical-device
   walkthrough — existing rejected build 0.1.0 (2) does not contain updates.

### Remaining port order

Stockfish on native (or accurately labeled equivalent), local saved games and
review, Academy placement/adaptive training, alternate-world modes, and richer
competition/progression screens. Each needs code, test coverage and a real-device
pass rather than a marketing claim.
