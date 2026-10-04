import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BATTLE_FORMATIONS } from "../lib/battleChess";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { SeasonProgression } from "./SeasonProgression";
import { SeasonChampionship } from "./SeasonChampionship";
import { ProfileTrophyCase } from "./ProfileTrophyCase";
import { publicChallengeUrl } from "../lib/nativeRuntime";

type GameRow = {
  id: string;
  white_id: string | null;
  black_id: string | null;
  status: "waiting" | "active" | "completed" | "cancelled";
  result: "white" | "black" | "draw" | null;
  result_reason: string | null;
  variant: string;
  battle_formation_key: string | null;
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
  battle_white_rating_before: number | null;
  battle_white_rating_after: number | null;
  battle_black_rating_before: number | null;
  battle_black_rating_after: number | null;
};

type PlayerProfile = {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
};

type BattleStats = {
  user_id: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
};

type BattleFormationStats = {
  user_id: string;
  formation_key: string;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
};

type ChallengeInfo = {
  gameId: string;
  timeControlMinutes: number;
  isRematch: boolean;
  variant: string;
  formationKey: string | null;
  challenger: PlayerProfile | null;
  challengerBattleStats: BattleStats | null;
};

const timeOptions = [
  { minutes: 0, label: "Untimed", detail: "Unrated casual · resumable" },
  { minutes: 10, label: "10 min", detail: "Rated quick game" },
  { minutes: 15, label: "15 min", detail: "Rated · more thinking time" },
  { minutes: 30, label: "30 min", detail: "Rated · relaxed clock" },
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

function battleRatingDeltaForPlayer(game: GameRow, userId: string) {
  const before =
    game.white_id === userId
      ? game.battle_white_rating_before
      : game.black_id === userId
        ? game.battle_black_rating_before
        : null;
  const after =
    game.white_id === userId
      ? game.battle_white_rating_after
      : game.black_id === userId
        ? game.battle_black_rating_after
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
  return publicChallengeUrl(gameId);
}

function formationName(key: string | null) {
  return BATTLE_FORMATIONS.find((formation) => formation.key === key)?.name ?? "Classic Line";
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
  const [battleGames, setBattleGames] = useState<GameRow[]>([]);
  const [activeGames, setActiveGames] = useState<GameRow[]>([]);
  const [incomingChallenges, setIncomingChallenges] = useState<GameRow[]>([]);
  const [myPrivateChallenges, setMyPrivateChallenges] = useState<GameRow[]>([]);
  const [recentGames, setRecentGames] = useState<GameRow[]>([]);
  const [recentBattleGames, setRecentBattleGames] = useState<GameRow[]>([]);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, PlayerProfile>>({});
  const [leaderboard, setLeaderboard] = useState<PlayerProfile[]>([]);
  const [battleLeaderboard, setBattleLeaderboard] = useState<BattleStats[]>([]);
  const [battleStatsMap, setBattleStatsMap] = useState<Record<string, BattleStats>>({});
  const [battleFormationStats, setBattleFormationStats] = useState<BattleFormationStats[]>([]);
  const [battleUnlockKeys, setBattleUnlockKeys] = useState<string[]>([]);
  const [spotlightProfile, setSpotlightProfile] = useState<PlayerProfile | null>(null);
  const [challengeInfo, setChallengeInfo] = useState<ChallengeInfo | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeLookupError, setChallengeLookupError] = useState<string | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [selectedBattleFormation, setSelectedBattleFormation] = useState("classic");
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!client || !session) return;

    const { error: cleanupError } = await client.functions.invoke("online-game", {
      body: { action: "refresh_lobby" },
    });
    if (cleanupError) setMessage(cleanupError.message);

    const gameSelect = "id,white_id,black_id,status,result,result_reason,variant,battle_formation_key,time_control_minutes,created_at,ended_at,is_private,invited_user_id,rematch_of,white_rating_before,white_rating_after,black_rating_before,black_rating_after,battle_white_rating_before,battle_white_rating_after,battle_black_rating_before,battle_black_rating_after";
    const participantFilter =
      `white_id.eq.${session.user.id},black_id.eq.${session.user.id},invited_user_id.eq.${session.user.id}`;
    const completedFilter =
      `white_id.eq.${session.user.id},black_id.eq.${session.user.id}`;

    const [
      publicWaitingResult,
      myLiveResult,
      myCompletedResult,
    ] = await Promise.all([
      client
        .from("games")
        .select(gameSelect)
        .eq("status", "waiting")
        .eq("is_private", false)
        .order("created_at", { ascending: false })
        .limit(80),
      client
        .from("games")
        .select(gameSelect)
        .in("status", ["waiting", "active"])
        .or(participantFilter)
        .order("created_at", { ascending: false }),
      client
        .from("games")
        .select(gameSelect)
        .eq("status", "completed")
        .or(completedFilter)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

    const gameError =
      publicWaitingResult.error ?? myLiveResult.error ?? myCompletedResult.error;

    if (gameError) {
      setMessage(gameError.message);
      return;
    }

    const rows = Array.from(
      new Map(
        [
          ...((myLiveResult.data ?? []) as GameRow[]),
          ...((myCompletedResult.data ?? []) as GameRow[]),
          ...((publicWaitingResult.data ?? []) as GameRow[]),
        ].map((game) => [game.id, game] as const)
      ).values()
    );
    setGames(rows.filter((game) => game.status === "waiting" && !game.is_private && game.variant !== "battle"));
    setBattleGames(rows.filter((game) => game.status === "waiting" && !game.is_private && game.variant === "battle"));
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

    const completedMine = rows
      .filter(
        (game) =>
          game.status === "completed" &&
          (game.white_id === session.user.id || game.black_id === session.user.id)
      )
      .sort((a, b) => Date.parse(b.ended_at ?? b.created_at) - Date.parse(a.ended_at ?? a.created_at));

    setRecentGames(completedMine.filter((game) => game.variant !== "battle").slice(0, 8));
    setRecentBattleGames(completedMine.filter((game) => game.variant === "battle").slice(0, 8));

    const [
      { data: traditionalLeaderboard },
      { data: battleLeaderboardRows },
      { data: unlockRows },
      { data: formationRows },
    ] = await Promise.all([
      client
        .from("profiles")
        .select("id,username,rating,wins,losses,draws")
        .order("rating", { ascending: false })
        .order("wins", { ascending: false })
        .order("username", { ascending: true })
        .limit(10),
      client
        .from("battle_player_stats")
        .select("user_id,rating,wins,losses,draws,games_played")
        .gt("games_played", 0)
        .order("rating", { ascending: false })
        .order("wins", { ascending: false })
        .limit(10),
      client
        .from("player_unlocks")
        .select("reward_key")
        .eq("user_id", session.user.id),
      client
        .from("battle_formation_stats")
        .select("user_id,formation_key,wins,losses,draws,games_played")
        .eq("user_id", session.user.id)
        .order("games_played", { ascending: false }),
    ]);

    setLeaderboard((traditionalLeaderboard ?? []) as PlayerProfile[]);
    const topBattle = (battleLeaderboardRows ?? []) as BattleStats[];
    setBattleLeaderboard(topBattle);
    const nextUnlockKeys = (unlockRows ?? []).map((row) => String(row.reward_key));
    setBattleUnlockKeys(nextUnlockKeys);
    setBattleFormationStats((formationRows ?? []) as BattleFormationStats[]);

    const nextAvailableFormations = BATTLE_FORMATIONS.filter(
      (formation) => !formation.requires || nextUnlockKeys.includes(formation.requires)
    );
    if (!nextAvailableFormations.some((formation) => formation.key === selectedBattleFormation)) {
      setSelectedBattleFormation(nextAvailableFormations[0]?.key ?? "classic");
    }

    const participantIds = Array.from(
      new Set(
        [
          session.user.id,
          ...rows.flatMap((game) => [game.white_id, game.black_id, game.invited_user_id]),
          ...topBattle.map((row) => row.user_id),
        ].filter((id): id is string => Boolean(id))
      )
    );

    if (participantIds.length > 0) {
      const [{ data: participantData }, { data: participantBattleData }] = await Promise.all([
        client
          .from("profiles")
          .select("id,username,rating,wins,losses,draws")
          .in("id", participantIds),
        client
          .from("battle_player_stats")
          .select("user_id,rating,wins,losses,draws,games_played")
          .in("user_id", participantIds),
      ]);

      const nextProfileMap: Record<string, PlayerProfile> = {};
      for (const player of (participantData ?? []) as PlayerProfile[]) {
        nextProfileMap[player.id] = player;
      }
      setProfileMap(nextProfileMap);
      setProfile(nextProfileMap[session.user.id] ?? null);

      const nextBattleMap: Record<string, BattleStats> = {};
      for (const stats of (participantBattleData ?? []) as BattleStats[]) {
        nextBattleMap[stats.user_id] = stats;
      }
      setBattleStatsMap(nextBattleMap);
    }
  };

  useEffect(() => {
    void load();
    if (!client || !session) return;

    const channel = client
      .channel("lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => void load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_player_stats" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_formation_stats" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "player_unlocks" }, () => void load())
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!client || !session || !challengeGameId) {
      setChallengeInfo(null);
      setChallengeLoading(false);
      setChallengeLookupError(null);
      return;
    }

    let cancelled = false;
    setChallengeInfo(null);
    setChallengeLookupError(null);
    setChallengeLoading(true);

    void client.functions
      .invoke("online-game", {
        body: { action: "inspect_challenge", gameId: challengeGameId },
      })
      .then(({ data, error }) => {
        if (cancelled) return;

        const challenge = (data?.challenge ?? null) as ChallengeInfo | null;
        if (error || !challenge) {
          setChallengeInfo(null);
          setChallengeLookupError(
            "This challenge is unavailable, expired, or belongs to another player."
          );
          return;
        }

        setChallengeInfo(challenge);
      })
      .finally(() => {
        if (!cancelled) setChallengeLoading(false);
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
  const opponentFor = (game: GameRow) => {
    const opponentId = game.white_id === session.user.id ? game.black_id : game.white_id;
    return playerFor(opponentId);
  };
  const battleStatsFor = (id: string | null) => (id ? battleStatsMap[id] : undefined);
  const battleUnlocked = battleUnlockKeys.includes("battle_chess");
  const availableBattleFormations = BATTLE_FORMATIONS.filter(
    (formation) => !formation.requires || battleUnlockKeys.includes(formation.requires)
  );
  const favoriteFormation = battleFormationStats[0]?.formation_key ?? null;
  const myBattleStats = battleStatsFor(session.user.id) ?? {
    user_id: session.user.id,
    rating: 1200,
    wins: 0,
    losses: 0,
    draws: 0,
    games_played: 0,
  };

  const createTraditionalGame = async (isPrivate: boolean) => {
    setMessage("");
    const { data, error } = await client.functions.invoke("online-game", {
      body: {
        action: isPrivate ? "create_private_challenge" : "create_game",
        variant: "traditional",
        minutes: selectedMinutes,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.gameId) {
      if (isPrivate) {
        setMessage("Private challenge ready — share the invite link below.");
        await load();
      } else {
        onOpenGame(String(data.gameId));
      }
    }
  };

  const createBattleGame = async (isPrivate: boolean) => {
    setMessage("");
    const { data, error } = await client.functions.invoke("online-game", {
      body: {
        action: isPrivate ? "create_private_challenge" : "create_game",
        variant: "battle",
        minutes: selectedMinutes,
        formationKey: selectedBattleFormation,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.gameId) {
      if (isPrivate) {
        setMessage(`Private Battle challenge ready — ${formationName(selectedBattleFormation)} is locked in.`);
        await load();
      } else {
        onOpenGame(String(data.gameId));
      }
    }
  };

  const joinGame = async (gameId: string, consumeChallengeLink = false) => {
    setMessage("");
    const { data, error } = await client.functions.invoke("online-game", {
      body: { action: "join_game", gameId },
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

  const cancelGame = async (gameId: string, dismissLinkedChallenge = false) => {
    setMessage("");
    const { error } = await client.functions.invoke("online-game", {
      body: { action: "cancel_game", gameId },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (dismissLinkedChallenge) onChallengeHandled();
    setMessage("Waiting game cancelled.");
    await load();
  };

  const shareChallenge = async (gameId: string) => {
    const allRows = [...incomingChallenges, ...myPrivateChallenges, ...activeGames, ...games, ...battleGames];
    const challenge = allRows.find((game) => game.id === gameId);
    const battle = challenge?.variant === "battle" || challengeInfo?.gameId === gameId && challengeInfo.variant === "battle";
    const formation = challenge?.battle_formation_key ?? challengeInfo?.formationKey ?? null;
    const url = challengeUrl(gameId);
    const shareData = {
      title: battle ? "Chess Universe Battle challenge" : "Chess Universe challenge",
      text: battle
        ? `${profile?.username ?? "A player"} challenged you to Battle Chess · ${formationName(formation)}. Black moves first.`
        : `${profile?.username ?? "A player"} challenged you in Chess Universe. Black moves first.`,
      url,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setMessage("Challenge invite ready to send.");
        return;
      } catch {
        // Fall back to clipboard.
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
    (
      challengeInfo?.challenger?.id === session.user.id ||
      myPrivateChallenges.some((game) => game.id === challengeGameId)
    )
  );
  const challenger = challengeInfo?.challenger;
  const challengeRating =
    challengeInfo?.variant === "battle"
      ? challengeInfo.challengerBattleStats?.rating
      : challenger?.rating;

  return (
    <div className="card online-lobby-card">
      <div className="lobby-heading">
        <div>
          <div className="eyebrow">ONLINE</div>
          <h2>Find your table</h2>
          <p className="muted">Traditional and Battle ratings are tracked separately. Black moves first in both.</p>
        </div>

        {profile ? (
          <div className="online-record expanded">
            <div><strong>{profile.rating}</strong><span>classic rating</span></div>
            <div><strong>{profile.wins}-{profile.losses}-{profile.draws}</strong><span>classic W-L-D</span></div>
            <div><strong>{totalGames(profile)}</strong><span>classic games</span></div>
            <div><strong>{winRate(profile)}%</strong><span>classic win rate</span></div>
          </div>
        ) : null}
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      <SeasonProgression session={session} />
      <SeasonChampionship session={session} onOpenGame={onOpenGame} />

      {challengeGameId ? (
        <section className={challengeInfo?.variant === "battle" ? "lobby-section private-challenge-card incoming battle-challenge" : "lobby-section private-challenge-card incoming"}>
          <div>
            <div className="eyebrow">
              {challengeLookupError
                ? "CHALLENGE UNAVAILABLE"
                : challengeInfo?.variant === "battle"
                  ? "BATTLE CHALLENGE"
                  : "PRIVATE CHALLENGE"}
            </div>
            <strong>
              {challengeLoading
                ? "Checking challenge…"
                : challengeLookupError
                  ? "This invite can’t be accepted."
                  : linkedChallengeOwnedByMe
                    ? "This is your invite."
                    : challenger
                      ? `${challenger.username} challenged you.`
                      : "Challenge ready."}
            </strong>
            <span>
              {challengeLoading
                ? "Verifying the invite before showing any action."
                : challengeLookupError
                  ? challengeLookupError
                  : linkedChallengeOwnedByMe
                    ? "Open the table or share this same link with the person you want to play."
                    : challengeInfo
                      ? `${challengeInfo.isRematch ? "Rematch" : challengeInfo.variant === "battle" ? "Formation Clash" : "Private match"} · ${challengeInfo.variant === "battle" ? formationName(challengeInfo.formationKey) + " · " : ""}${timeLabel(challengeInfo.timeControlMinutes)} · ${challengeRating ?? "—"} rating`
                      : "Challenge details are loading."}
            </span>
          </div>
          <div className="challenge-actions">
            {challengeLoading || challengeLookupError ? null : linkedChallengeOwnedByMe ? (
              <>
                <button className="primary-action compact" onClick={() => onOpenGame(challengeGameId)}>Open table</button>
                <button className="secondary-action compact" onClick={() => void shareChallenge(challengeGameId)}>Share invite</button>
                <button className="text-button" onClick={() => void cancelGame(challengeGameId, true)}>Cancel invite</button>
              </>
            ) : challengeInfo ? (
              <button className="primary-action compact" onClick={() => void joinGame(challengeGameId, true)}>
                Accept challenge
              </button>
            ) : null}
            <button className="text-button" onClick={onChallengeHandled}>Dismiss</button>
          </div>
        </section>
      ) : null}

      {incomingChallenges.length > 0 ? (
        <section className="lobby-section">
          <div className="section-heading">
            <div>
              <strong>Challenges for you</strong>
              <span>Private Classic and Battle tables only you and the challenger can see.</span>
            </div>
          </div>
          <div className="game-list">
            {incomingChallenges.map((game) => {
              const challengerProfile = playerFor(game.white_id);
              const challengerBattle = battleStatsFor(game.white_id);
              const rating = game.variant === "battle" ? challengerBattle?.rating : challengerProfile?.rating;
              return (
                <div className={game.variant === "battle" ? "game-row private-game-row battle-game-row" : "game-row private-game-row"} key={game.id}>
                  <div>
                    <strong>
                      {game.rematch_of
                        ? `${challengerProfile?.username ?? "Opponent"} wants a rematch`
                        : `${challengerProfile?.username ?? "Player"} challenged you`}
                    </strong>
                    <span>
                      {game.variant === "battle" ? `Battle · ${formationName(game.battle_formation_key)} · ` : ""}
                      {timeLabel(game.time_control_minutes)} · {rating ?? "—"} rating · Black moves first
                    </span>
                  </div>
                  <button className="primary-action compact" onClick={() => void joinGame(game.id)}>Accept</button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeGames.length > 0 ? (
        <section className="lobby-section">
          <div className="section-heading">
            <div><strong>My active games</strong><span>Pick up from any signed-in device.</span></div>
          </div>
          <div className="game-list compact-list">
            {activeGames.map((game) => {
              const opponent = opponentFor(game);
              const battleOpponent = battleStatsFor(game.white_id === session.user.id ? game.black_id : game.white_id);
              const rating = game.variant === "battle" ? battleOpponent?.rating : opponent?.rating;
              return (
                <div className={game.variant === "battle" ? "game-row battle-game-row" : "game-row"} key={game.id}>
                  <div>
                    <strong>
                      {game.variant === "battle" ? "Battle · " : ""}
                      vs {opponent?.username ?? "Opponent"} · {timeLabel(game.time_control_minutes)}
                    </strong>
                    <span>
                      {game.variant === "battle" ? formationName(game.battle_formation_key) + " · " : ""}
                      {rating ?? "—"} rating · {game.id.slice(0, 8)} · In progress
                    </span>
                  </div>
                  <button className="primary-action compact" onClick={() => onOpenGame(game.id)}>Resume</button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {battleUnlocked ? (
        <section className="lobby-section battle-online-section">
          <div className="battle-online-heading">
            <div>
              <div className="eyebrow">BATTLE ONLINE</div>
              <strong>Formation Clash Arena</strong>
              <span>Battle Elo is separate from Classic Elo. Pick an unlocked formation, then challenge the world.</span>
            </div>
            <div className="battle-online-record">
              <div><strong>{myBattleStats.rating}</strong><span>Battle rating</span></div>
              <div><strong>{myBattleStats.wins}-{myBattleStats.losses}-{myBattleStats.draws}</strong><span>Battle W-L-D</span></div>
              <div><strong>{favoriteFormation ? formationName(favoriteFormation) : "—"}</strong><span>favorite formation</span></div>
            </div>
          </div>

          <div className="battle-online-formations">
            {availableBattleFormations.map((formation) => (
              <button
                type="button"
                key={formation.key}
                className={selectedBattleFormation === formation.key ? "battle-online-formation active" : "battle-online-formation"}
                onClick={() => setSelectedBattleFormation(formation.key)}
              >
                <code>{formation.backRank.toUpperCase()}</code>
                <strong>{formation.name}</strong>
                <span>{formation.description}</span>
              </button>
            ))}
          </div>

          <div className="time-control-grid" role="group" aria-label="Battle time control">
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
            <button className="primary-action create-game-button" onClick={() => void createBattleGame(false)}>
              Open Battle table
            </button>
            <button className="secondary-action create-game-button" onClick={() => void createBattleGame(true)}>
              Private Battle challenge
            </button>
          </div>

          <div className="battle-online-columns">
            <div>
              <div className="section-heading">
                <div><strong>Open Battle tables</strong><span>Join another unlocked Battle player.</span></div>
              </div>
              <div className="game-list">
                {battleGames.length === 0 ? (
                  <p className="muted">No Battle tables waiting yet.</p>
                ) : battleGames.map((game) => {
                  const creator = playerFor(game.white_id);
                  const stats = battleStatsFor(game.white_id);
                  return (
                    <div className="game-row battle-game-row" key={game.id}>
                      <div>
                        <strong>{creator?.username ?? "Player"} · {formationName(game.battle_formation_key)}</strong>
                        <span>{stats?.rating ?? 1200} Battle rating · {timeLabel(game.time_control_minutes)}</span>
                      </div>
                      {game.white_id === session.user.id ? (
                        <div className="inline-game-actions">
                          <button className="secondary-action compact" onClick={() => onOpenGame(game.id)}>Open</button>
                          <button className="text-button" onClick={() => void cancelGame(game.id)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="secondary-action compact" onClick={() => void joinGame(game.id)}>Join Battle</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="section-heading">
                <div><strong>Battle leaderboard</strong><span>Separate Formation Clash rating.</span></div>
              </div>
              <div className="leaderboard-list compact-battle-leaderboard">
                {battleLeaderboard.map((stats, index) => (
                  <div className={stats.user_id === session.user.id ? "leaderboard-row me" : "leaderboard-row"} key={stats.user_id}>
                    <span className="leaderboard-rank">#{index + 1}</span>
                    <span className="leaderboard-player">
                      <strong>{playerFor(stats.user_id)?.username ?? "Player"}{stats.user_id === session.user.id ? " · You" : ""}</strong>
                      <small>{stats.wins}-{stats.losses}-{stats.draws} · {stats.games_played} battles</small>
                    </span>
                    <strong className="leaderboard-rating">{stats.rating}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="lobby-section battle-online-locked">
          <div>
            <div className="eyebrow">BATTLE ONLINE · LOCKED</div>
            <strong>Win 3 rated Classic games to enter Formation Clash online.</strong>
            <span>Your Battle rating starts separately at 1200 when the world unlocks.</span>
          </div>
        </section>
      )}

      <section className="lobby-section leaderboard-section">
        <div className="section-heading">
          <div><strong>Classic leaderboard</strong><span>Top rated traditional Chess Universe players.</span></div>
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
              <span>{spotlightProfile.rating} Classic rating</span>
            </div>
            <div className="player-spotlight-stats">
              <span><b>{spotlightProfile.wins}</b> wins</span>
              <span><b>{spotlightProfile.losses}</b> losses</span>
              <span><b>{spotlightProfile.draws}</b> draws</span>
              <span><b>{winRate(spotlightProfile)}%</b> win rate</span>
            </div>
            <ProfileTrophyCase userId={spotlightProfile.id} compact onOpenGame={onOpenGame} />
            <button className="text-button" onClick={() => setSpotlightProfile(null)}>Close</button>
          </div>
        ) : null}
      </section>

      <section className="lobby-section create-table">
        <div className="section-heading">
          <div><strong>Create a Classic game</strong><span>Untimed is casual and unrated. Timed games affect Classic Elo and Season standings.</span></div>
        </div>

        <div className="time-control-grid" role="group" aria-label="Classic time control">
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
          <button className="primary-action create-game-button" onClick={() => void createTraditionalGame(false)}>
            Open Classic table
          </button>
          <button className="secondary-action create-game-button" onClick={() => void createTraditionalGame(true)}>
            Private Classic challenge
          </button>
        </div>
        <p className="muted">Untimed Classic is unrated. Timed Classic affects all-time Elo and Season standings. Battle uses separate Battle Elo.</p>
      </section>

      {myPrivateChallenges.length > 0 ? (
        <section className="lobby-section">
          <div className="section-heading">
            <div><strong>My private invites</strong><span>Waiting for the other player.</span></div>
          </div>
          <div className="game-list">
            {myPrivateChallenges.map((game) => (
              <div className={game.variant === "battle" ? "game-row private-game-row battle-game-row" : "game-row private-game-row"} key={game.id}>
                <div>
                  <strong>
                    {game.rematch_of ? "Rematch" : game.variant === "battle" ? "Battle challenge" : "Classic challenge"}
                    {" · "}{timeLabel(game.time_control_minutes)}
                  </strong>
                  <span>
                    {game.variant === "battle" ? formationName(game.battle_formation_key) + " · " : ""}
                    {game.id.slice(0, 8)} · Not listed publicly
                  </span>
                </div>
                <div className="inline-game-actions">
                  <button className="secondary-action compact" onClick={() => void shareChallenge(game.id)}>Share</button>
                  <button className="primary-action compact" onClick={() => onOpenGame(game.id)}>Open</button>
                  <button className="text-button" onClick={() => void cancelGame(game.id)}>Cancel</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="lobby-section">
        <div className="section-heading">
          <div><strong>Open Classic tables</strong><span>Join another player's traditional waiting game.</span></div>
        </div>
        <div className="game-list">
          {games.length === 0 ? (
            <p className="muted">No open Classic games yet.</p>
          ) : games.map((game) => {
            const creator = playerFor(game.white_id);
            return (
              <div className="game-row" key={game.id}>
                <div>
                  <strong>{creator?.username ?? "Player"} · {timeLabel(game.time_control_minutes)}</strong>
                  <span>{creator?.rating ?? "—"} rating · {game.id.slice(0, 8)}</span>
                </div>
                {game.white_id === session.user.id ? (
                  <div className="inline-game-actions">
                    <button className="secondary-action compact" onClick={() => onOpenGame(game.id)}>Open table</button>
                    <button className="text-button" onClick={() => void cancelGame(game.id)}>Cancel</button>
                  </div>
                ) : (
                  <button className="secondary-action compact" onClick={() => void joinGame(game.id)}>Join</button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {recentBattleGames.length > 0 ? (
        <section className="lobby-section battle-history-section">
          <div className="section-heading">
            <div><strong>Recent Battle games</strong><span>Formation Clash history and Battle Elo movement.</span></div>
          </div>
          <div className="game-list recent-online-games">
            {recentBattleGames.map((game) => {
              const opponent = opponentFor(game);
              const delta = battleRatingDeltaForPlayer(game, session.user.id);
              return (
                <div className="game-row battle-game-row" key={game.id}>
                  <div>
                    <strong>
                      <span className={`online-result ${resultForPlayer(game, session.user.id).toLowerCase()}`}>
                        {resultForPlayer(game, session.user.id)}
                      </span>
                      {" · "}vs {opponent?.username ?? "Opponent"}
                      {delta !== null ? (
                        <span className={delta > 0 ? "rating-inline up" : delta < 0 ? "rating-inline down" : "rating-inline"}>
                          {" · "}{delta > 0 ? "+" : ""}{delta}
                        </span>
                      ) : null}
                    </strong>
                    <span>{formationName(game.battle_formation_key)} · {endedLabel(game)} · {timeLabel(game.time_control_minutes)}</span>
                  </div>
                  <button className="secondary-action compact" onClick={() => onOpenGame(game.id)}>Review</button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {recentGames.length > 0 ? (
        <section className="lobby-section">
          <div className="section-heading">
            <div><strong>Recent Classic games</strong><span>Finished traditional games stay available for replay.</span></div>
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
                      {" · "}vs {opponent?.username ?? "Opponent"}
                      {delta !== null ? (
                        <span className={delta > 0 ? "rating-inline up" : delta < 0 ? "rating-inline down" : "rating-inline"}>
                          {" · "}{delta > 0 ? "+" : ""}{delta}
                        </span>
                      ) : null}
                    </strong>
                    <span>
                      {endedLabel(game)}
                      {game.result_reason ? ` · ${game.result_reason.replaceAll("_", " ")}` : ""}
                      {" · "}{timeLabel(game.time_control_minutes)}
                    </span>
                  </div>
                  <button className="secondary-action compact" onClick={() => onOpenGame(game.id)}>Review</button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
