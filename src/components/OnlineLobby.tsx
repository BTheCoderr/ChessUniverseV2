import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type GameRow = {
  id: string;
  white_id: string | null;
  black_id: string | null;
  status: "waiting" | "active" | "completed" | "cancelled";
  result: "white" | "black" | "draw" | null;
  result_reason: string | null;
  variant: string;
  time_control_minutes: number;
  created_at: string;
  ended_at: string | null;
  is_private: boolean;
  invited_user_id: string | null;
  rematch_of: string | null;
  white_rating_before: number | null;
  white_rating_after: number | null;
  black_rating_before: number | null;
  black_rating_after: number | null;
};

type PlayerProfile = {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
};

type ChallengeInfo = {
  gameId: string;
  timeControlMinutes: number;
  isRematch: boolean;
  challenger: PlayerProfile | null;
};

const timeOptions = [
  { minutes: 0, label: "Untimed", detail: "Leave and resume later" },
  { minutes: 10, label: "10 min", detail: "Quick casual game" },
  { minutes: 15, label: "15 min", detail: "More thinking time" },
  { minutes: 30, label: "30 min", detail: "Relaxed timed game" },
];

function timeLabel(minutes: number) {
  return minutes === 0 ? "Untimed" : `${minutes} min`;
}

function totalGames(profile: Pick<PlayerProfile, "wins" | "losses" | "draws">) {
  return profile.wins + profile.losses + profile.draws;
}

function winRate(profile: Pick<PlayerProfile, "wins" | "losses" | "draws">) {
  const games = totalGames(profile);
  return games === 0 ? 0 : Math.round((profile.wins / games) * 100);
}

function resultForPlayer(game: GameRow, userId: string) {
  if (game.result === "draw") return "Draw";
  if (game.result === "white") return game.white_id === userId ? "Win" : "Loss";
  if (game.result === "black") return game.black_id === userId ? "Win" : "Loss";
  return "Completed";
}

function ratingDeltaForPlayer(game: GameRow, userId: string) {
  const before =
    game.white_id === userId
      ? game.white_rating_before
      : game.black_id === userId
        ? game.black_rating_before
        : null;
  const after =
    game.white_id === userId
      ? game.white_rating_after
      : game.black_id === userId
        ? game.black_rating_after
        : null;

  return before !== null && after !== null ? after - before : null;
}

function endedLabel(game: GameRow) {
  const value = game.ended_at ?? game.created_at;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function challengeUrl(gameId: string) {
  const url = new URL(window.location.origin);
  url.searchParams.set("challenge", gameId);
  return url.toString();
}

export function OnlineLobby({
  session,
  onOpenGame,
  challengeGameId,
  onChallengeHandled,
  onSignIn,
}: {
  session: Session | null;
  onOpenGame: (gameId: string) => void;
  challengeGameId?: string | null;
  onChallengeHandled: () => void;
  onSignIn: () => void;
}) {
  const client = supabase;
  const [games, setGames] = useState<GameRow[]>([]);
  const [activeGames, setActiveGames] = useState<GameRow[]>([]);
  const [incomingChallenges, setIncomingChallenges] = useState<GameRow[]>([]);
  const [myPrivateChallenges, setMyPrivateChallenges] = useState<GameRow[]>([]);
  const [recentGames, setRecentGames] = useState<GameRow[]>([]);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, PlayerProfile>>({});
  const [leaderboard, setLeaderboard] = useState<PlayerProfile[]>([]);
  const [spotlightProfile, setSpotlightProfile] = useState<PlayerProfile | null>(null);
  const [challengeInfo, setChallengeInfo] = useState<ChallengeInfo | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!client || !session) return;

    const { data, error } = await client
      .from("games")
      .select("id,white_id,black_id,status,result,result_reason,variant,time_control_minutes,created_at,ended_at,is_private,invited_user_id,rematch_of,white_rating_before,white_rating_after,black_rating_before,black_rating_after")
      .in("status", ["waiting", "active", "completed"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setMessage(error.message);
      return;
    }

    const rows = (data ?? []) as GameRow[];
    setGames(rows.filter((game) => game.status === "waiting" && !game.is_private));
    setIncomingChallenges(
      rows.filter(
        (game) =>
          game.status === "waiting" &&
          game.is_private &&
          game.invited_user_id === session.user.id &&
          game.white_id !== session.user.id
      )
    );
    setMyPrivateChallenges(
      rows.filter(
        (game) =>
          game.status === "waiting" &&
          game.is_private &&
          game.white_id === session.user.id
      )
    );
    setActiveGames(
      rows.filter(
        (game) =>
          game.status === "active" &&
          (game.white_id === session.user.id || game.black_id === session.user.id)
      )
    );
    setRecentGames(
      rows
        .filter(
          (game) =>
            game.status === "completed" &&
            (game.white_id === session.user.id || game.black_id === session.user.id)
        )
        .sort((a, b) => Date.parse(b.ended_at ?? b.created_at) - Date.parse(a.ended_at ?? a.created_at))
        .slice(0, 8)
    );

    const participantIds = Array.from(
      new Set(
        [
          session.user.id,
          ...rows.flatMap((game) => [game.white_id, game.black_id, game.invited_user_id]),
        ].filter((id): id is string => Boolean(id))
      )
    );

    if (participantIds.length > 0) {
      const { data: participantData } = await client
        .from("profiles")
        .select("id,username,rating,wins,losses,draws")
        .in("id", participantIds);

      const nextMap: Record<string, PlayerProfile> = {};
      for (const player of (participantData ?? []) as PlayerProfile[]) {
        nextMap[player.id] = player;
      }
      setProfileMap(nextMap);
      setProfile(nextMap[session.user.id] ?? null);
    }

    const { data: leaderboardData } = await client
      .from("profiles")
      .select("id,username,rating,wins,losses,draws")
      .order("rating", { ascending: false })
      .order("wins", { ascending: false })
      .order("username", { ascending: true })
      .limit(10);

    setLeaderboard((leaderboardData ?? []) as PlayerProfile[]);
  };

  useEffect(() => {
    void load();
    if (!client || !session) return;

    const channel = client
      .channel("lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!client || !session || !challengeGameId) {
      setChallengeInfo(null);
      return;
    }

    let cancelled = false;
    void client.functions
      .invoke("online-game", {
        body: { action: "inspect_challenge", gameId: challengeGameId },
      })
      .then(({ data }) => {
        if (cancelled) return;
        setChallengeInfo((data?.challenge ?? null) as ChallengeInfo | null);
      });

    return () => {
      cancelled = true;
    };
  }, [client, session?.user.id, challengeGameId]);

  if (!isSupabaseConfigured || !client) {
    return (
      <div className="card">
        <div className="eyebrow">ONLINE</div>
        <h2>Online play</h2>
        <p>Connect Supabase to enable multiplayer.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card online-lobby-card challenge-entry-card">
        <div className="eyebrow">{challengeGameId ? "PRIVATE CHALLENGE" : "ONLINE"}</div>
        <h2>{challengeGameId ? "You were challenged." : "Online play"}</h2>
        <p className="muted">
          {challengeGameId
            ? "Sign in, then this invite will still be waiting for you."
            : "Sign in to create, join, and resume online games."}
        </p>
        <button className="primary-action" onClick={onSignIn}>Sign in</button>
      </div>
    );
  }

  const playerFor = (id: string | null) => (id ? profileMap[id] : undefined);
  const playerName = (id: string | null) => playerFor(id)?.username ?? "Player";
  const opponentFor = (game: GameRow) => {
    const opponentId = game.white_id === session.user.id ? game.black_id : game.white_id;
    return playerFor(opponentId);
  };

  const createGame = async () => {
    setMessage("");
    const { data, error } = await client.functions.invoke("online-game", {
      body: {
        action: "create_game",
        variant: "traditional",
        minutes: selectedMinutes,
      },
    });

    if (error) setMessage(error.message);
    else if (data?.gameId) onOpenGame(String(data.gameId));
  };

  const createPrivateChallenge = async () => {
    setMessage("");
    const { data, error } = await client.functions.invoke("online-game", {
      body: {
        action: "create_private_challenge",
        variant: "traditional",
        minutes: selectedMinutes,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.gameId) {
      setMessage("Private challenge ready — share the invite link below.");
      await load();
    }
  };

  const joinGame = async (gameId: string, consumeChallengeLink = false) => {
    setMessage("");
    const { data, error } = await client.functions.invoke("online-game", {
      body: {
        action: "join_game",
        gameId,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.gameId) {
      if (consumeChallengeLink) onChallengeHandled();
      onOpenGame(String(data.gameId));
    }
  };

  const shareChallenge = async (gameId: string) => {
    const url = challengeUrl(gameId);
    const shareData = {
      title: "Chess Universe challenge",
      text: `${profile?.username ?? "A player"} challenged you in Chess Universe. Black moves first.`,
      url,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setMessage("Challenge invite ready to send.");
        return;
      } catch {
        // Fall back to clipboard when native sharing is cancelled or unavailable.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setMessage("Challenge link copied.");
    } catch {
      setMessage(`Copy this challenge link: ${url}`);
    }
  };

  const linkedChallengeOwnedByMe = Boolean(
    challengeGameId &&
    myPrivateChallenges.some((game) => game.id === challengeGameId)
  );
  const challenger = challengeInfo?.challenger;

  return (
    <div className="card online-lobby-card">
      <div className="lobby-heading">
        <div>
          <div className="eyebrow">ONLINE</div>
          <h2>Find your table</h2>
          <p className="muted">Black moves first in every Chess Universe match. Online games now affect rating.</p>
        </div>

        {profile ? (
          <div className="online-record expanded">
            <div>
              <strong>{profile.rating}</strong>
              <span>rating</span>
            </div>
            <div>
              <strong>{profile.wins}-{profile.losses}-{profile.draws}</strong>
              <span>W-L-D</span>
            </div>
            <div>
              <strong>{totalGames(profile)}</strong>
              <span>games</span>
            </div>
            <div>
              <strong>{winRate(profile)}%</strong>
              <span>win rate</span>
            </div>
          </div>
        ) : null}
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      {challengeGameId ? (
        <section className="lobby-section private-challenge-card incoming">
          <div>
            <div className="eyebrow">PRIVATE CHALLENGE</div>
            <strong>
              {linkedChallengeOwnedByMe
                ? "This is your invite."
                : challenger
                  ? `${challenger.username} challenged you.`
                  : "Someone challenged you."}
            </strong>
            <span>
              {linkedChallengeOwnedByMe
                ? "Open the table or share this same link with the person you want to play."
                : challengeInfo
                  ? `${challengeInfo.isRematch ? "Rematch" : "Private match"} · ${timeLabel(challengeInfo.timeControlMinutes)} · ${challenger?.rating ?? "—"} rating`
                  : "Accepting takes you straight to the board and starts the match."}
            </span>
          </div>
          <div className="challenge-actions">
            {linkedChallengeOwnedByMe ? (
              <>
                <button className="primary-action compact" onClick={() => onOpenGame(challengeGameId)}>Open table</button>
                <button className="secondary-action compact" onClick={() => void shareChallenge(challengeGameId)}>Share invite</button>
              </>
            ) : (
              <button className="primary-action compact" onClick={() => void joinGame(challengeGameId, true)}>
                Accept challenge
              </button>
            )}
            <button className="text-button" onClick={onChallengeHandled}>Dismiss</button>
          </div>
        </section>
      ) : null}

      {incomingChallenges.length > 0 ? (
        <section className="lobby-section">
          <div className="section-heading">
            <div>
              <strong>Challenges for you</strong>
              <span>Private tables only you and the challenger can see here.</span>
            </div>
          </div>
          <div className="game-list">
            {incomingChallenges.map((game) => {
              const challengerProfile = playerFor(game.white_id);
              return (
                <div className="game-row private-game-row" key={game.id}>
                  <div>
                    <strong>
                      {game.rematch_of
                        ? `${challengerProfile?.username ?? "Opponent"} wants a rematch`
                        : `${challengerProfile?.username ?? "Player"} challenged you`}
                    </strong>
                    <span>
                      {timeLabel(game.time_control_minutes)} · {challengerProfile?.rating ?? "—"} rating · Black moves first
                    </span>
                  </div>
                  <button className="primary-action compact" onClick={() => void joinGame(game.id)}>
                    Accept
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeGames.length > 0 ? (
        <section className="lobby-section">
          <div className="section-heading">
            <div>
              <strong>My active games</strong>
              <span>Pick up from any signed-in device.</span>
            </div>
          </div>
          <div className="game-list compact-list">
            {activeGames.map((game) => {
              const opponent = opponentFor(game);
              return (
                <div className="game-row" key={game.id}>
                  <div>
                    <strong>vs {opponent?.username ?? "Opponent"} · {timeLabel(game.time_control_minutes)}</strong>
                    <span>{opponent?.rating ?? "—"} rating · {game.id.slice(0, 8)} · In progress</span>
                  </div>
                  <button className="primary-action compact" onClick={() => onOpenGame(game.id)}>
                    Resume
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="lobby-section leaderboard-section">
        <div className="section-heading">
          <div>
            <strong>Leaderboard</strong>
            <span>Top rated Chess Universe players.</span>
          </div>
        </div>

        <div className="leaderboard-list">
          {leaderboard.map((player, index) => (
            <button
              type="button"
              className={player.id === session.user.id ? "leaderboard-row me" : "leaderboard-row"}
              key={player.id}
              onClick={() => setSpotlightProfile(player)}
            >
              <span className="leaderboard-rank">#{index + 1}</span>
              <span className="leaderboard-player">
                <strong>{player.username}{player.id === session.user.id ? " · You" : ""}</strong>
                <small>{player.wins}-{player.losses}-{player.draws} · {totalGames(player)} games</small>
              </span>
              <strong className="leaderboard-rating">{player.rating}</strong>
            </button>
          ))}
        </div>

        {spotlightProfile ? (
          <div className="player-spotlight">
            <div>
              <div className="eyebrow">PLAYER PROFILE</div>
              <strong>{spotlightProfile.username}</strong>
              <span>{spotlightProfile.rating} rating</span>
            </div>
            <div className="player-spotlight-stats">
              <span><b>{spotlightProfile.wins}</b> wins</span>
              <span><b>{spotlightProfile.losses}</b> losses</span>
              <span><b>{spotlightProfile.draws}</b> draws</span>
              <span><b>{winRate(spotlightProfile)}%</b> win rate</span>
            </div>
            <button className="text-button" onClick={() => setSpotlightProfile(null)}>Close</button>
          </div>
        ) : null}
      </section>

      <section className="lobby-section create-table">
        <div className="section-heading">
          <div>
            <strong>Create a rated game</strong>
            <span>Pick the clock, then open a public table or send a private invite.</span>
          </div>
        </div>

        <div className="time-control-grid" role="group" aria-label="Time control">
          {timeOptions.map((option) => (
            <button
              type="button"
              key={option.minutes}
              className={selectedMinutes === option.minutes ? "time-choice active" : "time-choice"}
              onClick={() => setSelectedMinutes(option.minutes)}
            >
              <strong>{option.label}</strong>
              <span>{option.detail}</span>
            </button>
          ))}
        </div>

        <div className="create-game-actions">
          <button className="primary-action create-game-button" onClick={() => void createGame()}>
            Open public table
          </button>
          <button className="secondary-action create-game-button" onClick={() => void createPrivateChallenge()}>
            Create private challenge
          </button>
        </div>
        <p className="muted">
          Private challenges never appear in Open Tables. Completed online games update both players' ratings.
        </p>
      </section>

      {myPrivateChallenges.length > 0 ? (
        <section className="lobby-section">
          <div className="section-heading">
            <div>
              <strong>My private invites</strong>
              <span>Waiting for the other player.</span>
            </div>
          </div>
          <div className="game-list">
            {myPrivateChallenges.map((game) => (
              <div className="game-row private-game-row" key={game.id}>
                <div>
                  <strong>{game.rematch_of ? "Rematch" : "Private challenge"} · {timeLabel(game.time_control_minutes)}</strong>
                  <span>{game.id.slice(0, 8)} · Not listed publicly</span>
                </div>
                <div className="inline-game-actions">
                  <button className="secondary-action compact" onClick={() => void shareChallenge(game.id)}>Share</button>
                  <button className="primary-action compact" onClick={() => onOpenGame(game.id)}>Open</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="lobby-section">
        <div className="section-heading">
          <div>
            <strong>Open tables</strong>
            <span>Join another player's public waiting game.</span>
          </div>
        </div>

        <div className="game-list">
          {games.length === 0 ? (
            <p className="muted">No open games yet.</p>
          ) : (
            games.map((game) => {
              const creator = playerFor(game.white_id);
              return (
                <div className="game-row" key={game.id}>
                  <div>
                    <strong>{creator?.username ?? "Player"} · {timeLabel(game.time_control_minutes)}</strong>
                    <span>{creator?.rating ?? "—"} rating · {game.id.slice(0, 8)}</span>
                  </div>
                  {game.white_id === session.user.id ? (
                    <button className="secondary-action compact" onClick={() => onOpenGame(game.id)}>
                      Open table
                    </button>
                  ) : (
                    <button className="secondary-action compact" onClick={() => void joinGame(game.id)}>
                      Join
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {recentGames.length > 0 ? (
        <section className="lobby-section">
          <div className="section-heading">
            <div>
              <strong>Recent online games</strong>
              <span>Finished games stay available for replay.</span>
            </div>
          </div>

          <div className="game-list recent-online-games">
            {recentGames.map((game) => {
              const opponent = opponentFor(game);
              const delta = ratingDeltaForPlayer(game, session.user.id);
              return (
                <div className="game-row" key={game.id}>
                  <div>
                    <strong>
                      <span className={`online-result ${resultForPlayer(game, session.user.id).toLowerCase()}`}>
                        {resultForPlayer(game, session.user.id)}
                      </span>
                      {" · "}
                      vs {opponent?.username ?? "Opponent"}
                      {delta !== null ? (
                        <span className={delta > 0 ? "rating-inline up" : delta < 0 ? "rating-inline down" : "rating-inline"}>
                          {" · "}{delta > 0 ? "+" : ""}{delta}
                        </span>
                      ) : null}
                    </strong>
                    <span>
                      {endedLabel(game)}
                      {game.result_reason ? ` · ${game.result_reason.replaceAll("_", " ")}` : ""}
                      {" · "}
                      {timeLabel(game.time_control_minutes)}
                    </span>
                  </div>
                  <button className="secondary-action compact" onClick={() => onOpenGame(game.id)}>
                    Review
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
