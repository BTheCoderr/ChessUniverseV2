import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Tournament = {
  id: string;
  season_id: string;
  name: string;
  slug: string;
  status: "scheduled" | "check_in" | "bracket_ready" | "active" | "completed" | "cancelled";
  qualification_slots: number;
  time_control_minutes: number;
  check_in_opens_at: string;
  check_in_closes_at: string;
  starts_at: string;
  champion_id: string | null;
  runner_up_id: string | null;
  completed_at: string | null;
};

type Entry = {
  tournament_id: string;
  user_id: string;
  seed: number | null;
  qualified_rank: number | null;
  status: "qualified" | "checked_in" | "eliminated" | "champion" | "withdrawn";
  checked_in_at: string | null;
};

type TournamentMatch = {
  id: string;
  tournament_id: string;
  round: number;
  bracket_position: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: "pending" | "ready" | "waiting" | "active" | "completed";
  game_id: string | null;
  replay_count: number;
};

type Profile = {
  id: string;
  username: string;
  rating: number;
};

function formatDate(value: string, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], includeTime
    ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" }
  );
}

function statusLabel(status: Tournament["status"]) {
  if (status === "check_in") return "Check-in open";
  if (status === "bracket_ready") return "Bracket ready";
  if (status === "active") return "Live";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Qualification";
}

function roundTitle(round: number) {
  if (round === 1) return "Quarterfinals";
  if (round === 2) return "Semifinals";
  return "Final";
}

export function SeasonChampionship({
  session,
  onOpenGame,
}: {
  session: Session;
  onOpenGame: (gameId: string) => void;
}) {
  const client = supabase;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [history, setHistory] = useState<Tournament[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!client) return;

    const { data: tournamentRows, error: tournamentError } = await client
      .from("tournaments")
      .select("id,season_id,name,slug,status,qualification_slots,time_control_minutes,check_in_opens_at,check_in_closes_at,starts_at,champion_id,runner_up_id,completed_at")
      .order("starts_at", { ascending: false })
      .limit(10);

    if (tournamentError) {
      setMessage(tournamentError.message);
      return;
    }

    let rows = (tournamentRows ?? []) as Tournament[];
    let current =
      rows.find((item) => !["completed", "cancelled"].includes(item.status)) ??
      rows[0] ??
      null;

    if (current && !["completed", "cancelled"].includes(current.status)) {
      await client.functions.invoke("online-game", {
        body: { action: "championship_status", tournamentId: current.id },
      });

      const { data: refreshed } = await client
        .from("tournaments")
        .select("id,season_id,name,slug,status,qualification_slots,time_control_minutes,check_in_opens_at,check_in_closes_at,starts_at,champion_id,runner_up_id,completed_at")
        .eq("id", current.id)
        .single();

      if (refreshed) {
        current = refreshed as Tournament;
        rows = rows.map((item) => (item.id === current?.id ? current : item));
      }
    }

    setTournament(current);
    setHistory(rows.filter((item) => item.status === "completed"));

    if (!current) {
      setEntries([]);
      setMatches([]);
      setProfiles({});
      return;
    }

    const [{ data: entryRows }, { data: matchRows }] = await Promise.all([
      client
        .from("tournament_entries")
        .select("tournament_id,user_id,seed,qualified_rank,status,checked_in_at")
        .eq("tournament_id", current.id)
        .order("seed", { ascending: true }),
      client
        .from("tournament_matches")
        .select("id,tournament_id,round,bracket_position,player1_id,player2_id,winner_id,status,game_id,replay_count")
        .eq("tournament_id", current.id)
        .order("round", { ascending: true })
        .order("bracket_position", { ascending: true }),
    ]);

    const nextEntries = (entryRows ?? []) as Entry[];
    const nextMatches = (matchRows ?? []) as TournamentMatch[];
    setEntries(nextEntries);
    setMatches(nextMatches);

    const profileIds = Array.from(
      new Set(
        [
          ...nextEntries.map((entry) => entry.user_id),
          ...nextMatches.flatMap((match) => [match.player1_id, match.player2_id, match.winner_id]),
          ...rows.flatMap((item) => [item.champion_id, item.runner_up_id]),
        ].filter((id): id is string => Boolean(id))
      )
    );

    if (profileIds.length === 0) {
      setProfiles({});
      setMessage("");
      return;
    }

    const { data: profileRows } = await client
      .from("profiles")
      .select("id,username,rating")
      .in("id", profileIds);

    const map: Record<string, Profile> = {};
    for (const profile of (profileRows ?? []) as Profile[]) {
      map[profile.id] = profile;
    }
    setProfiles(map);
    setMessage("");
  }, [client]);

  useEffect(() => {
    void load();
    if (!client) return;

    const channel = client
      .channel("season-championship")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_entries" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches" }, () => void load())
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, load]);

  const myEntry = useMemo(
    () => entries.find((entry) => entry.user_id === session.user.id) ?? null,
    [entries, session.user.id]
  );

  const nameFor = (id: string | null) => (id ? profiles[id]?.username ?? "Player" : "TBD");
  const ratingFor = (id: string | null) => (id ? profiles[id]?.rating : null);

  const checkIn = async () => {
    if (!client || !tournament || busy) return;
    setBusy(true);
    setMessage("");

    const { error } = await client.functions.invoke("online-game", {
      body: { action: "championship_check_in", tournamentId: tournament.id },
    });

    if (error) setMessage(error.message);
    await load();
    setBusy(false);
  };

  const openMatch = async (match: TournamentMatch) => {
    if (!client || busy) return;
    setBusy(true);
    setMessage("");

    const { data, error } = await client.functions.invoke("online-game", {
      body: { action: "open_tournament_match", tournamentMatchId: match.id },
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    if (data?.gameId) {
      onOpenGame(String(data.gameId));
      return;
    }

    setMessage("Championship match could not be opened.");
    setBusy(false);
  };

  if (!tournament) {
    return null;
  }

  const participantMatches = matches.filter(
    (match) => match.player1_id === session.user.id || match.player2_id === session.user.id
  );

  return (
    <section className="lobby-section championship-card">
      <div className="championship-heading">
        <div>
          <div className="eyebrow">SEASON CHAMPIONSHIP</div>
          <strong>{tournament.name}</strong>
          <span>
            Top {tournament.qualification_slots} qualify · {tournament.time_control_minutes}-minute knockout games · draws replay
          </span>
        </div>
        <span className={`championship-status ${tournament.status}`}>
          {statusLabel(tournament.status)}
        </span>
      </div>

      <div className="championship-timeline">
        <div>
          <span>1</span>
          <strong>Qualify</strong>
          <small>Top {tournament.qualification_slots} when the Season closes.</small>
        </div>
        <div>
          <span>2</span>
          <strong>Check in</strong>
          <small>{formatDate(tournament.check_in_opens_at)} – {formatDate(tournament.check_in_closes_at)}</small>
        </div>
        <div>
          <span>3</span>
          <strong>Championship</strong>
          <small>{formatDate(tournament.starts_at, true)}</small>
        </div>
      </div>

      {tournament.status === "scheduled" ? (
        <div className="championship-callout">
          <strong>Qualification race is live.</strong>
          <span>
            The final top {tournament.qualification_slots} Season standings are snapshotted when check-in opens.
          </span>
        </div>
      ) : null}

      {tournament.status === "check_in" ? (
        <div className="championship-callout">
          {myEntry ? (
            <>
              <strong>
                Seed #{myEntry.seed ?? myEntry.qualified_rank ?? "—"} · {myEntry.status === "checked_in" ? "Checked in" : "You qualified"}
              </strong>
              <span>
                {myEntry.status === "checked_in"
                  ? "Your Championship spot is locked."
                  : "Confirm your spot before check-in closes."}
              </span>
              {myEntry.status !== "checked_in" ? (
                <button className="primary-action compact" disabled={busy} onClick={() => void checkIn()}>
                  {busy ? "Checking in…" : "Check in"}
                </button>
              ) : null}
            </>
          ) : (
            <>
              <strong>Final field locked.</strong>
              <span>You are not in this Championship field.</span>
            </>
          )}
        </div>
      ) : null}

      {entries.length > 0 ? (
        <div className="championship-field">
          <div className="section-heading">
            <div>
              <strong>Championship field</strong>
              <span>Seeds come from the final Season standings.</span>
            </div>
          </div>
          <div className="championship-seeds">
            {entries.map((entry) => (
              <div className={entry.user_id === session.user.id ? "seed-row me" : "seed-row"} key={entry.user_id}>
                <span>#{entry.seed ?? entry.qualified_rank ?? "—"}</span>
                <div>
                  <strong>{nameFor(entry.user_id)}{entry.user_id === session.user.id ? " · You" : ""}</strong>
                  <small>{ratingFor(entry.user_id) ?? "—"} rating</small>
                </div>
                <em>{entry.status.replaceAll("_", " ")}</em>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {participantMatches.some((match) => ["ready", "waiting", "active"].includes(match.status)) ? (
        <div className="my-championship-match">
          <div>
            <div className="eyebrow">YOUR MATCH</div>
            <strong>Championship table ready</strong>
            <span>Open your assigned bracket match from here.</span>
          </div>
          {participantMatches
            .filter((match) => ["ready", "waiting", "active"].includes(match.status))
            .slice(0, 1)
            .map((match) => (
              <button
                key={match.id}
                className="primary-action compact"
                disabled={busy}
                onClick={() => void openMatch(match)}
              >
                {match.status === "active"
                  ? "Resume match"
                  : match.status === "waiting" && match.player2_id === session.user.id
                    ? "Join match"
                    : match.replay_count > 0
                      ? `Start replay #${match.replay_count + 1}`
                      : "Open match"}
              </button>
            ))}
        </div>
      ) : null}

      {matches.length > 0 ? (
        <div className="championship-bracket">
          {[1, 2, 3].map((round) => (
            <div className="bracket-round" key={round}>
              <div className="section-heading">
                <div>
                  <strong>{roundTitle(round)}</strong>
                  <span>{round === 3 ? "Winner becomes Season Champion." : "Winner advances."}</span>
                </div>
              </div>
              <div className="bracket-match-list">
                {matches.filter((match) => match.round === round).map((match) => {
                  const mine =
                    match.player1_id === session.user.id ||
                    match.player2_id === session.user.id;
                  const actionable = mine && ["ready", "waiting", "active"].includes(match.status);
                  return (
                    <div className={mine ? "bracket-match mine" : "bracket-match"} key={match.id}>
                      <div className={match.winner_id === match.player1_id ? "bracket-player winner" : "bracket-player"}>
                        <span>{nameFor(match.player1_id)}</span>
                        <small>{ratingFor(match.player1_id) ?? "—"}</small>
                      </div>
                      <div className={match.winner_id === match.player2_id ? "bracket-player winner" : "bracket-player"}>
                        <span>{nameFor(match.player2_id)}</span>
                        <small>{ratingFor(match.player2_id) ?? "—"}</small>
                      </div>
                      <div className="bracket-match-meta">
                        <span>{match.status}</span>
                        {match.replay_count > 0 ? <span>{match.replay_count} draw replay{match.replay_count === 1 ? "" : "s"}</span> : null}
                      </div>
                      {actionable ? (
                        <button className="secondary-action compact" disabled={busy} onClick={() => void openMatch(match)}>
                          {match.status === "active" ? "Resume" : match.status === "waiting" ? "Open" : "Play"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tournament.status === "completed" && tournament.champion_id ? (
        <div className="champion-banner">
          <span>♛</span>
          <div>
            <div className="eyebrow">SEASON CHAMPION</div>
            <strong>{nameFor(tournament.champion_id)}</strong>
            <small>
              Runner-up: {nameFor(tournament.runner_up_id)}
            </small>
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="champion-history">
          <div className="section-heading">
            <div>
              <strong>Champion history</strong>
              <span>Completed Chess Universe Season Championships.</span>
            </div>
          </div>
          {history.map((item) => (
            <div className="champion-history-row" key={item.id}>
              <span>♛</span>
              <div>
                <strong>{item.name}</strong>
                <small>{item.completed_at ? formatDate(item.completed_at) : "Completed"}</small>
              </div>
              <strong>{nameFor(item.champion_id)}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}
