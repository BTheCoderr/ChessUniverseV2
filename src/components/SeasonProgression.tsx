import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  SEASON_MILESTONES,
  currentSeasonTitle,
  milestoneUnlocked,
  nextSeasonMilestone,
  rankForRating,
} from "../lib/progression";

type Season = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  championship_slots: number;
};

type SeasonStats = {
  season_id: string;
  user_id: string;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  rating_start: number;
  rating_current: number;
  rating_peak: number;
};

type Profile = {
  id: string;
  username: string;
  rating: number;
};

type Standing = SeasonStats & {
  username: string;
};

const EMPTY_STATS = {
  games_played: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  points: 0,
};

function seasonEndLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function SeasonProgression({ session }: { session: Session }) {
  const client = supabase;
  const [season, setSeason] = useState<Season | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myStats, setMyStats] = useState<SeasonStats | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!client) return;

    const now = new Date().toISOString();
    const { data: seasonRows, error: seasonError } = await client
      .from("seasons")
      .select("id,name,starts_at,ends_at,championship_slots")
      .eq("status", "active")
      .lte("starts_at", now)
      .gt("ends_at", now)
      .order("starts_at", { ascending: false })
      .limit(1);

    if (seasonError) {
      setMessage(seasonError.message);
      return;
    }

    const activeSeason = (seasonRows?.[0] ?? null) as Season | null;
    setSeason(activeSeason);

    const { data: profileData } = await client
      .from("profiles")
      .select("id,username,rating")
      .eq("id", session.user.id)
      .single();

    setProfile((profileData ?? null) as Profile | null);

    if (!activeSeason) {
      setMyStats(null);
      setStandings([]);
      return;
    }

    const [{ data: myRows }, { data: standingRows }] = await Promise.all([
      client
        .from("season_player_stats")
        .select("season_id,user_id,games_played,wins,losses,draws,points,rating_start,rating_current,rating_peak")
        .eq("season_id", activeSeason.id)
        .eq("user_id", session.user.id)
        .limit(1),
      client
        .from("season_player_stats")
        .select("season_id,user_id,games_played,wins,losses,draws,points,rating_start,rating_current,rating_peak")
        .eq("season_id", activeSeason.id)
        .order("points", { ascending: false })
        .order("wins", { ascending: false })
        .order("rating_current", { ascending: false })
        .limit(10),
    ]);

    const typedMyStats = ((myRows ?? [])[0] ?? null) as SeasonStats | null;
    const typedStandingRows = (standingRows ?? []) as SeasonStats[];
    setMyStats(typedMyStats);

    const ids = typedStandingRows.map((row) => row.user_id);
    if (ids.length === 0) {
      setStandings([]);
      return;
    }

    const { data: profiles } = await client
      .from("profiles")
      .select("id,username,rating")
      .in("id", ids);

    const names = new Map(
      ((profiles ?? []) as Profile[]).map((item) => [item.id, item.username])
    );

    setStandings(
      typedStandingRows.map((row) => ({
        ...row,
        username: names.get(row.user_id) ?? "Player",
      }))
    );
    setMessage("");
  }, [client, session.user.id]);

  useEffect(() => {
    void load();
    if (!client) return;

    const channel = client
      .channel("season-progression")
      .on("postgres_changes", { event: "*", schema: "public", table: "season_player_stats" }, () => {
        void load();
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${session.user.id}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, load, session.user.id]);

  const stats = myStats ?? EMPTY_STATS;
  const rank = rankForRating(profile?.rating ?? 1200);
  const title = currentSeasonTitle(stats);
  const nextMilestone = nextSeasonMilestone(stats);
  const myStanding = useMemo(
    () => standings.findIndex((row) => row.user_id === session.user.id) + 1,
    [standings, session.user.id]
  );
  const qualified =
    Boolean(season && myStanding > 0 && myStanding <= season.championship_slots);

  if (!season) {
    return (
      <section className="lobby-section season-progression-card">
        <div className="section-heading">
          <div>
            <strong>Season progression</strong>
            <span>{message || "The next Chess Universe season has not opened yet."}</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="lobby-section season-progression-card">
      <div className="season-heading">
        <div>
          <div className="eyebrow">CURRENT SEASON</div>
          <strong>{season.name}</strong>
          <span>
            Ends {seasonEndLabel(season.ends_at)} · Top {season.championship_slots} qualify for the Season Championship
          </span>
        </div>
        <span className="season-title-badge">{title}</span>
      </div>

      <div className="season-summary-grid">
        <div className="season-stat-card rank-card">
          <span>Rank</span>
          <strong>{rank.name}</strong>
          <small>{profile?.rating ?? 1200} all-time rating</small>
          <div className="rank-progress-track" aria-label="Progress to next rank">
            <span style={{ width: `${rank.progress}%` }} />
          </div>
          <small>
            {rank.next
              ? `${rank.pointsToNext} rating to ${rank.next.name}`
              : "Highest rank reached"}
          </small>
        </div>

        <div className="season-stat-card">
          <span>Season points</span>
          <strong>{stats.points}</strong>
          <small>{stats.wins}-{stats.losses}-{stats.draws} · {stats.games_played} games</small>
          <small>Win = 3 · Draw = 1</small>
        </div>

        <div className="season-stat-card">
          <span>Championship race</span>
          <strong>{myStanding > 0 ? `#${myStanding}` : "Unranked"}</strong>
          <small>
            {qualified
              ? "Currently inside the qualifying line"
              : stats.games_played === 0
                ? "Finish a rated game to enter the standings"
                : `Top ${season.championship_slots} qualify`}
          </small>
        </div>
      </div>

      <div className="season-unlocks">
        <div className="section-heading">
          <div>
            <strong>Season unlocks</strong>
            <span>
              {nextMilestone
                ? `Next: ${nextMilestone.name} — ${nextMilestone.description}`
                : "Every Season 1 milestone unlocked."}
            </span>
          </div>
        </div>
        <div className="unlock-grid">
          {SEASON_MILESTONES.map((milestone) => {
            const unlocked = milestoneUnlocked(milestone, stats);
            return (
              <div className={unlocked ? "unlock-chip unlocked" : "unlock-chip"} key={milestone.name}>
                <span>{unlocked ? "✓" : "○"}</span>
                <div>
                  <strong>{milestone.name}</strong>
                  <small>{milestone.description}</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="season-standings">
        <div className="section-heading">
          <div>
            <strong>Season standings</strong>
            <span>Points first, then wins, then current rating.</span>
          </div>
        </div>
        {standings.length === 0 ? (
          <p className="muted">No rated Season games yet. The first completed match opens the table.</p>
        ) : (
          <div className="season-standing-list">
            {standings.map((row, index) => (
              <div
                className={row.user_id === session.user.id ? "season-standing-row me" : "season-standing-row"}
                key={row.user_id}
              >
                <span>#{index + 1}</span>
                <div>
                  <strong>{row.username}{row.user_id === session.user.id ? " · You" : ""}</strong>
                  <small>{row.wins}-{row.losses}-{row.draws} · {row.games_played} games</small>
                </div>
                <strong>{row.points} pts</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}
