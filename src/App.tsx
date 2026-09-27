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

export default function App() {
  const [view, setView] = useState<View>("home");
  const [session, setSession] = useState<Session | null>(null);
  const [onlineGameId, setOnlineGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="site-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("home")}>
          <span className="brand-mark">♞</span>
          <span>Chess Universe</span>
        </button>

        <nav>
          <button
            className={view === "play" ? "active" : ""}
            onClick={() => setView("play")}
          >
            Play
          </button>
          <button className={view === "queens" ? "active" : ""} onClick={() => setView("queens")}>Queens</button>
          <button className={view === "horse" ? "active" : ""} onClick={() => setView("horse")} aria-label="Magic Horse">
            Horse
          </button>
          <button
            className={view === "online" ? "active" : ""}
            onClick={() => {
              setView("online");
              setOnlineGameId(null);
            }}
          >
            Online
          </button>
          <button
            className={view === "account" ? "active" : ""}
            onClick={() => setView("account")}
          >
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
                <button
                  className="secondary-action"
                  onClick={() => {
                    setView("online");
                    setOnlineGameId(null);
                  }}
                >
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
                  <p>Supabase auth, persistent games and realtime matchmaking without a separate server.</p>
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
          <OnlineGame
            gameId={onlineGameId}
            session={session}
            onBack={() => setOnlineGameId(null)}
          />
        ) : null}
        {view === "online" && (!session || !onlineGameId) ? (
          <OnlineLobby session={session} onOpenGame={setOnlineGameId} />
        ) : null}
        {view === "account" ? <AuthPanel session={session} /> : null}
      </main>
    </div>
  );
}
