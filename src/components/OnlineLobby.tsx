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
};

type ProfileStats = {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
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

function resultForPlayer(game: GameRow, userId: string) {
  if (game.result === "draw") return "Draw";
  if (game.result === "white") return game.white_id === userId ? "Win" : "Loss";
  if (game.result === "black") return game.black_id === userId ? "Win" : "Loss";
  return "Completed";
}

function endedLabel(game: GameRow) {
  const value = game.ended_at ?? game.created_at;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function OnlineLobby({
  session,
  onOpenGame,
}: {
  session: Session | null;
  onOpenGame: (gameId: string) => void;
}) {
  const client = supabase;
  const [games, setGames] = useState<GameRow[]>([]);
  const [activeGames, setActiveGames] = useState<GameRow[]>([]);
  const [recentGames, setRecentGames] = useState<GameRow[]>([]);
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!client || !session) return;

    const { data, error } = await client
      .from("games")
      .select("id,white_id,black_id,status,result,result_reason,variant,time_control_minutes,created_at,ended_at")
      .in("status", ["waiting", "active", "completed"])
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      setMessage(error.message);
      return;
    }

    const rows = (data ?? []) as GameRow[];
    setGames(rows.filter((game) => game.status === "waiting"));
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

    const { data: profileData, error: profileError } = await client
      .from("profiles")
      .select("rating,wins,losses,draws")
      .eq("id", session.user.id)
      .single();

    if (!profileError && profileData) {
      setProfile(profileData as ProfileStats);
    }
  };

  useEffect(() => {
    void load();
    if (!client || !session) return;

    const channel = client
      .channel("lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
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
  }, [session?.user.id]);

  if (!isSupabaseConfigured || !session || !client) {
    return (
      <div className="card">
        <div className="eyebrow">ONLINE</div>
        <h2>Online play</h2>
        <p>
          {!isSupabaseConfigured
            ? "Connect Supabase to enable multiplayer."
            : "Sign in to create or join a game."}
        </p>
      </div>
    );
  }

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

  const joinGame = async (gameId: string) => {
    setMessage("");
    const { data, error } = await client.functions.invoke("online-game", {
      body: {
        action: "join_game",
        gameId,
      },
    });

    if (error) setMessage(error.message);
    else if (data?.gameId) onOpenGame(String(data.gameId));
  };

  return (
    <div className="card online-lobby-card">
      <div className="lobby-heading">
        <div>
          <div className="eyebrow">ONLINE</div>
          <h2>Find your table</h2>
          <p className="muted">Black moves first in every Chess Universe match.</p>
        </div>

        {profile ? (
          <div className="online-record">
            <div>
              <strong>{profile.rating}</strong>
              <span>rating</span>
            </div>
            <div>
              <strong>{profile.wins}-{profile.losses}-{profile.draws}</strong>
              <span>W-L-D</span>
            </div>
          </div>
        ) : null}
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      {activeGames.length > 0 ? (
        <section className="lobby-section">
          <div className="section-heading">
            <div>
              <strong>My active games</strong>
              <span>Pick up from any signed-in device.</span>
            </div>
          </div>
          <div className="game-list compact-list">
            {activeGames.map((game) => (
              <div className="game-row" key={game.id}>
                <div>
                  <strong>{timeLabel(game.time_control_minutes)} · Traditional</strong>
                  <span>{game.id.slice(0, 8)} · In progress</span>
                </div>
                <button
                  className="primary-action compact"
                  onClick={() => onOpenGame(game.id)}
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="lobby-section create-table">
        <div className="section-heading">
          <div>
            <strong>Create a casual game</strong>
            <span>Untimed is best for learning or games you may finish later.</span>
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

        <button className="primary-action create-game-button" onClick={() => void createGame()}>
          Create {selectedMinutes === 0 ? "untimed" : `${selectedMinutes}-minute`} game
        </button>
        <p className="muted">
          Untimed games can be left and resumed. Timed games keep running after they begin.
        </p>
      </section>

      <section className="lobby-section">
        <div className="section-heading">
          <div>
            <strong>Open tables</strong>
            <span>Join another player's waiting game.</span>
          </div>
        </div>

        <div className="game-list">
          {games.length === 0 ? (
            <p className="muted">No open games yet.</p>
          ) : (
            games.map((game) => (
              <div className="game-row" key={game.id}>
                <div>
                  <strong>{timeLabel(game.time_control_minutes)} · Traditional</strong>
                  <span>{game.id.slice(0, 8)}</span>
                </div>
                {game.white_id === session.user.id ? (
                  <button
                    className="secondary-action compact"
                    onClick={() => onOpenGame(game.id)}
                  >
                    Open table
                  </button>
                ) : (
                  <button
                    className="secondary-action compact"
                    onClick={() => void joinGame(game.id)}
                  >
                    Join
                  </button>
                )}
              </div>
            ))
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
            {recentGames.map((game) => (
              <div className="game-row" key={game.id}>
                <div>
                  <strong>
                    <span className={`online-result ${resultForPlayer(game, session.user.id).toLowerCase()}`}>
                      {resultForPlayer(game, session.user.id)}
                    </span>
                    {" · "}
                    {timeLabel(game.time_control_minutes)}
                  </strong>
                  <span>
                    {endedLabel(game)}
                    {game.result_reason ? ` · ${game.result_reason.replaceAll("_", " ")}` : ""}
                    {" · "}
                    {game.id.slice(0, 8)}
                  </span>
                </div>
                <button
                  className="secondary-action compact"
                  onClick={() => onOpenGame(game.id)}
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
