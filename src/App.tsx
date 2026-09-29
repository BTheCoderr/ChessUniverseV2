import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./components/AuthPanel";
import { LocalGame } from "./components/LocalGame";
import { EvolvingQueensGame } from "./components/EvolvingQueensGame";
import { MagicHorseGame } from "./components/MagicHorseGame";
import { OnlineGame } from "./components/OnlineGame";
import { OnlineLobby } from "./components/OnlineLobby";
import { LearnChess } from "./components/LearnChess";
import { HistoryMode } from "./components/HistoryMode";
import { GameLibrary } from "./components/GameLibrary";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type View = "home" | "play" | "library" | "learn" | "history" | "queens" | "horse" | "online" | "account";
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
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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

      {!isOnline ? (
        <div className="offline-banner" role="status">
          Offline mode — Learn, Practice, My Games, Legends, Queens, Horse, and Stockfish are available.
        </div>
      ) : !isSupabaseConfigured ? (
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
                <button className="secondary-action" onClick={() => setView("learn")}>
                  Learn chess
                </button>
                <button className="secondary-action" onClick={() => setView("history")}>
                  History mode
                </button>
                <button className="secondary-action" onClick={() => setView("online")}>
                  Find a game
                </button>
              </div>

              <div className="feature-grid">
                <article>
                  <span>01</span>
                  <strong>Learn → Practice</strong>
                  <p>Interactive beginner lessons lead straight into no-pressure practice against Stockfish.</p>
                </article>
                <article>
                  <span>02</span>
                  <strong>Legends & moments</strong>
                  <p>Walk through legendary games, jump to the turning point, then take over against the AI.</p>
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

        {view === "play" ? (
          <>
            <div className="practice-explore-bar">
              <span>
                <strong>New to chess?</strong>
                <small>Learn the basics or step into a famous position.</small>
              </span>
              <div>
                <button className="secondary-action compact" onClick={() => setView("learn")}>Learn</button>
                <button className="secondary-action compact" onClick={() => setView("history")}>Legends</button>
                <button className="secondary-action compact" onClick={() => setView("library")}>My Games</button>
              </div>
            </div>
            <LocalGame onOpenLibrary={() => setView("library")} />
          </>
        ) : null}
        {view === "library" ? (
          <GameLibrary onBack={() => setView("play")} onPractice={() => setView("play")} />
        ) : null}
        {view === "learn" ? (
          <LearnChess
            onBack={() => setView("home")}
            onPractice={() => setView("play")}
            onHistory={() => setView("history")}
          />
        ) : null}
        {view === "history" ? (
          <HistoryMode
            onBack={() => setView("home")}
            onLearn={() => setView("learn")}
            onPractice={() => setView("play")}
          />
        ) : null}
        {view === "queens" ? <EvolvingQueensGame /> : null}
        {view === "horse" ? <MagicHorseGame /> : null}
        {view === "online" && !isOnline ? (
          <section className="card offline-card">
            <div className="eyebrow">OFFLINE</div>
            <h2>Online play needs a connection.</h2>
            <p>
              Your offline modes are still ready. Practice against Stockfish, review saved games, learn the basics,
              play Legends moments, or use either chess variant while you wait to reconnect.
            </p>
            <div className="offline-actions">
              <button className="primary-action" onClick={() => setView("play")}>Practice</button>
              <button className="secondary-action" onClick={() => setView("history")}>Legends</button>
              <button className="secondary-action" onClick={() => setView("learn")}>Learn</button>
            </div>
          </section>
        ) : null}
        {view === "online" && isOnline && session && onlineGameId ? (
          <OnlineGame gameId={onlineGameId} session={session} onBack={leaveOnlineTable} />
        ) : null}
        {view === "online" && isOnline && (!session || !onlineGameId) ? (
          <OnlineLobby session={session} onOpenGame={openOnlineGame} />
        ) : null}
        {view === "account" && !isOnline ? (
          <section className="card offline-card">
            <div className="eyebrow">OFFLINE</div>
            <h2>Your account will be back when you reconnect.</h2>
            <p>
              Local practice progress and Legends medals stay on this device. Signing in,
              syncing profile data, and multiplayer need internet access.
            </p>
            <button className="primary-action" onClick={() => setView("play")}>Keep playing offline</button>
          </section>
        ) : null}
        {view === "account" && isOnline ? <AuthPanel session={session} /> : null}
      </main>
    </div>
  );
}
