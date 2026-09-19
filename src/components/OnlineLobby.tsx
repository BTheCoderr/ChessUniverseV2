import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type GameRow = {
  id: string;
  white_id: string;
  black_id: string | null;
  status: "waiting" | "active" | "completed" | "cancelled";
  variant: string;
  time_control_minutes: number;
  created_at: string;
};

export function OnlineLobby({ session }: { session: Session | null }) {
  const client = supabase;
  const [games, setGames] = useState<GameRow[]>([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!client || !session) return;
    const { data, error } = await client
      .from("games")
      .select("id,white_id,black_id,status,variant,time_control_minutes,created_at")
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) setMessage(error.message);
    else setGames((data ?? []) as GameRow[]);
  };

  useEffect(() => {
    void load();
    if (!client || !session) return;

    const channel = client
      .channel("lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      void client?.removeChannel(channel);
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
    const { error } = await client.from("games").insert({
      white_id: session.user.id,
      status: "waiting",
      variant: "traditional",
      time_control_minutes: 10,
    });

    if (error) setMessage(error.message);
    else setMessage("Game created. Waiting for an opponent.");
  };

  const joinGame = async (gameId: string) => {
    setMessage("");
    const { data, error } = await client.rpc("join_waiting_game", {
      target_game_id: gameId,
    });

    if (error) setMessage(error.message);
    else setMessage(`Joined game ${String(data).slice(0, 8)}. Live board sync is next.`);
  };

  return (
    <div className="card">
      <div className="lobby-heading">
        <div>
          <div className="eyebrow">ONLINE</div>
          <h2>Open tables</h2>
        </div>
        <button className="primary-action compact" onClick={createGame}>
          Create game
        </button>
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      <div className="game-list">
        {games.length === 0 ? (
          <p className="muted">No open games yet.</p>
        ) : (
          games.map((game) => (
            <div className="game-row" key={game.id}>
              <div>
                <strong>{game.time_control_minutes} min · Traditional</strong>
                <span>{game.id.slice(0, 8)}</span>
              </div>
              {game.white_id === session.user.id ? (
                <span className="waiting-pill">Your table</span>
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
    </div>
  );
}
