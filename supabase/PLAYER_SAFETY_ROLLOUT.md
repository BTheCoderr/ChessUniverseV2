# Chess Universe player-safety rollout (migration 023)

This change is **not deployed**. Never assume a passing GitHub typecheck means the database is ready.

## Verified source-side assumptions

- Chess Universe project: `msmftyqdjzegcgbwrwvy`, hosted in `us-east-2`.
- The `games` table exists in repository migrations and has `white_id`, `black_id`, and `invited_user_id` (migration 014).
- Current `join_waiting_game_service` (migration 022) sets `black_id` and `invited_user_id`. Migration 023 intercepts new blocked pairings with a trigger.
- The proposed native match UI submits reports for its current opponent and lets a user block that same opponent.
- The database management connection repeatedly timed out while attempting **read-only SQL and migration history** on November 16, 2026. This means the live schema and its migration history **are not verified**. The Supabase control plane reporting `ACTIVE_HEALTHY` is not proof of working Postgres connections.

## What migration 023 grants

- **Reports**: a logged-in user can insert `reporter_id`, `reported_id`, `game_id`, and `reason` only. The insert RLS requires the reporter to have been an actual player opposite the reported account in that game; `game_id` cannot be NULL on user insert. One report per reporter/opponent/match is allowed. Users cannot set report `status` or `created_at`, read other reports, or update/delete any report.
- **Blocks**: users can list, create, and delete only their own blocks. They cannot set timestamps through the API.
- **Service operators**: `service_role` can review and update report statuses; this role must never be present in the mobile app or a public web client.
- **Matches**: a database trigger rejects new pairings or private invitations where either participant has blocked the other. It does not terminate matches already in progress.
- **No change** to the chess rules, existing rating calculation, user login, or account deletion procedure.

## Required sequence (do not skip)

1. Restore database connectivity. In the Supabase Dashboard for Chess Universe, open **Database → SQL Editor** and try a read-only query:
   ```sql
   select current_database(), now(), to_regclass('public.games'),
          to_regclass('public.player_reports'), to_regclass('public.player_blocks');
   ```
   If the dashboard also times out, inspect Database/Observability health and active connections, and contact Supabase support with the project ref and timeout message. Do not repeatedly apply a migration when reads are failing.
2. Inspect the real `games` table, including the `invited_user_id` column and the history of migrations through `022_online_beta_housekeeping`; confirm migration 023 has not been applied under another name.
3. Apply migration 023 to a **staging copy** of the database first. Do not apply it to production until the tests below pass and a backup/rollback plan is approved.
4. Run `supabase/tests/023_player_safety_catalog_checks.sql` against staging. It must complete without exceptions. Also review `get_advisors` security output.
5. Using **two disposable staging accounts** and a completed staging game, verify:
   - A reports B from their real match; one report is stored, status `new`, and A cannot read reports or set status.
   - A cannot report user C or submit a fabricated/missing game ID.
   - A repeating the same report gets a duplicate response, not a second row.
   - A blocks B, sees B's open tables filtered from their lobby, and cannot create/join new games with B, including invited challenges.
   - B cannot match with A after A blocks B (bidirectional enforcement). Existing active games finish.
   - A can remove their own block but cannot alter B's block list.
   - An unrelated pair C/D can still create, join, play, finish and rematch.
6. Arrange moderation ownership: someone must regularly inspect `player_reports`, resolve abusive usernames/content, and maintain response records. **No automated moderator or notification is implemented here.** With authorized SQL Editor access:
   ```sql
   select id, reporter_id, reported_id, game_id, reason, status, created_at
   from public.player_reports
   where status in ('new','reviewing')
   order by created_at asc
   limit 100;
   ```
   Mark a reviewed report using `status='reviewing'` or `'resolved'` only after review; do not put a service-role key in the app.
7. Only after the staging tests and live schema review succeed, apply the migration to the intended production project and rerun read-only checks. **Apply the migration before shipping the native reporting/blocking code.** Then test with disposable real accounts.
8. Merge the paired native UI and test on an iPhone/iPad. Finish the rest of the App Review checklist. Do not spend EAS credits until the release gate is green.

## Emergency rollback (operator review required)

If new pairings are blocked unexpectedly, an authorized operator can temporarily disable only the trigger while keeping existing reports and blocks:

```sql
drop trigger if exists reject_blocked_matchups on public.games;
```

This deliberately preserves moderation data; it also temporarily stops server-side blocking of new matchups. Restore an audited trigger after diagnosing the issue. If the production native UI has already shipped, coordinate a safe client rollout as well. Do not drop the tables or destroy submitted reports as a routine rollback.

## Verification gaps

No live Postgres schema, migration state, RLS impersonation, staging environment, production apply, two-account gameplay or physical-device verification has been completed by this repository-only change. They must be performed before calling the feature production-ready.
