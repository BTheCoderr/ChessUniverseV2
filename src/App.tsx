import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./components/AuthPanel";
import { LocalGame } from "./components/LocalGame";
import { EvolvingQueensGame } from "./components/EvolvingQueensGame";
import { MagicHorseGame } from "./components/MagicHorseGame";
import { OnlineGame } from "./components/OnlineGame";
import { OnlineLobby } from "./components/OnlineLobby";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type View = "home" | "play" | "queens" | "horse" | "online" | "account";
const ONLINE_GAME_KEY = "chess-universe-online-game";

function savedOnlineGame() {
  try {
    return window.localStorage.getItem(ONLINE_GAME_KEY);
  } catch {
    return null;
  }
}

export default function App() {
  const [onlineGameId, setOnlineGameId] = useState<string | null>(() => savedOnlineGame());
  const [view, setView] = useState<View>(() => (savedOnlineGame() ? "online" : "home"));
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const openOnlineGame = (gameId: string) => {
    setOnlineGameId(gameId);
    setView("online");
    try {
      window.localStorage.setItem(ONLINE_GAME_KEY, gameId);
    } catch {
      // Storage can be unavailable in privacy modes; the game still works for this session.
    }
  };

  const leaveOnlineTable = () => {
    setOnlineGameId(null);
    try {
      window.localStorage.removeItem(ONLINE_GAME_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("home")}>
          <span className="brand-mark">♞</span>
          <span>Chess Universe</span>
        </button>

        <nav>
          <button className={view === "play" ? "active" : ""} onClick={() => setView("play")}>
            Play
          </button>
          <button className={view === "queens" ? "active" : ""} onClick={() => setView("queens")}>
            Queens
          </button>
          <button className={view === "horse" ? "active" : ""} onClick={() => setView("horse")} aria-label="Magic Horse">
            Horse
          </button>
          <button className={view === "online" ? "active" : ""} onClick={() => setView("online")}>
            Online
          </button>
          <button className={view === "account" ? "active" : ""} onClick={() => setView("account")}>
            {session ? "Profile" : "Sign in"}
          </button>
        </nav>
      </header>

      {!isSupabaseConfigured ? (
        <div className="config-banner">
          Local and AI chess are ready. Connect Supabase to unlock accounts and multiplayer.
        </div>
      ) : null}

      <main className="page">
        {view === "home" ? (
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">CHESS, EVOLVED</div>
              <h1>Classic strategy. New worlds.</h1>
              <p>
                Play Chess Universe with Black moving first, challenge the computer, then unlock
                Chess Universe variants and live competition.
              </p>

              <div className="hero-actions">
                <button className="primary-action" onClick={() => setView("play")}>
                  Play now
                </button>
                <button className="secondary-action" onClick={() => setView("online")}>
                  Find a game
                </button>
              </div>

              <div className="feature-grid">
                <article>
                  <span>01</span>
                  <strong>Black first + AI</strong>
                  <p>Play locally or challenge Stockfish with Black making the opening move.</p>
                </article>
                <article>
                  <span>02</span>
                  <strong>Universe modes</strong>
                  <p>Evolving queens and Magic Horse are playable. Battle Chess and custom setups are next.</p>
                </article>
                <article>
                  <span>03</span>
                  <strong>Online</strong>
                  <p>Server-validated moves, persistent games, live clocks and realtime sync through Supabase.</p>
                </article>
              </div>
            </div>

            <div className="hero-piece">♛</div>
          </section>
        ) : null}

        {view === "play" ? <LocalGame /> : null}
        {view === "queens" ? <EvolvingQueensGame /> : null}
        {view === "horse" ? <MagicHorseGame /> : null}
        {view === "online" && session && onlineGameId ? (
          <OnlineGame gameId={onlineGameId} session={session} onBack={leaveOnlineTable} />
        ) : null}
        {view === "online" && (!session || !onlineGameId) ? (
          <OnlineLobby session={session} onOpenGame={openOnlineGame} />
        ) : null}
        {view === "account" ? <AuthPanel session={session} /> : null}
      </main>
    </div>
  );
}
