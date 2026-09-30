import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./components/AuthPanel";
import { BattleChessGame } from "./components/BattleChessGame";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { FirstRunOnboarding } from "./components/FirstRunOnboarding";
import { GameLibrary } from "./components/GameLibrary";
import { HistoryMode } from "./components/HistoryMode";
import { InstallApp } from "./components/InstallApp";
import { LearnChess } from "./components/LearnChess";
import { LegalPage } from "./components/LegalPage";
import { LocalGame } from "./components/LocalGame";
import { EvolvingQueensGame } from "./components/EvolvingQueensGame";
import { MagicHorseGame } from "./components/MagicHorseGame";
import { OnlineGame } from "./components/OnlineGame";
import { OnlineLobby } from "./components/OnlineLobby";
import { PuzzleMode } from "./components/PuzzleMode";
import { UniverseHub } from "./components/UniverseHub";
import { clearLocalPlayerData, prepareLocalDataForUser } from "./lib/localPlayerData";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type View =
  | "home"
  | "play"
  | "library"
  | "puzzles"
  | "learn"
  | "history"
  | "universe"
  | "battle"
  | "queens"
  | "horse"
  | "online"
  | "account"
  | "feedback"
  | "privacy"
  | "terms";

const ONLINE_GAME_KEY = "chess-universe-online-game";
const CHALLENGE_PARAM = "challenge";

function challengeFromUrl() {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get(CHALLENGE_PARAM);
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function savedOnlineGame() {
  try {
    return window.localStorage.getItem(ONLINE_GAME_KEY);
  } catch {
    return null;
  }
}

export default function App() {
  const initialChallenge = challengeFromUrl();
  const [onlineGameId, setOnlineGameId] = useState<string | null>(() =>
    initialChallenge ? null : savedOnlineGame()
  );
  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(initialChallenge);
  const [view, setView] = useState<View>(() => (savedOnlineGame() || initialChallenge ? "online" : "home"));
  const [previousView, setPreviousView] = useState<View>("home");
  const [session, setSession] = useState<Session | null>(null);
  const [battleUnlockKeys, setBattleUnlockKeys] = useState<string[]>([]);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const navigate = (next: View) => {
    if (view !== "feedback" && view !== "privacy" && view !== "terms") {
      setPreviousView(view);
    }
    setView(next);
  };

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

    const applySession = (next: Session | null) => {
      if (next?.user.id) {
        const switchedAccounts = prepareLocalDataForUser(next.user.id);
        if (switchedAccounts) {
          setOnlineGameId(null);
          setView("home");
        }
      }
      setSession(next);
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      applySession(next);

      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setView("account");
      } else if (event === "SIGNED_OUT") {
        clearLocalPlayerData();
        setRecoveryMode(false);
        setOnlineGameId(null);
        setView("home");
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (pendingChallengeId) {
      // An invite URL must take precedence over a stale/saved table so the user
      // actually sees the challenge they opened. The saved table remains in
      // localStorage and can still be resumed from the lobby.
      setOnlineGameId(null);
      if (session) setView("online");
    }
  }, [session?.user.id, pendingChallengeId]);

  const clearChallengeLink = () => {
    setPendingChallengeId(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(CHALLENGE_PARAM);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Keep navigation working even when history APIs are unavailable.
    }
  };

  const openOnlineGame = (gameId: string) => {
    setOnlineGameId(gameId);
    setView("online");
    if (pendingChallengeId === gameId) clearChallengeLink();
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

  const goBackFromUtility = () => {
    setView(previousView === "feedback" || previousView === "privacy" || previousView === "terms" ? "home" : previousView);
  };

  return (
    <div className="site-shell">
        <header className="topbar">
          <button className="brand" onClick={() => navigate("home")}>
            <span className="brand-mark">♞</span>
            <span>Chess Universe</span>
          </button>

          <nav>
            <button className={view === "play" ? "active" : ""} onClick={() => navigate("play")}>
              Play
            </button>
            <button
              className={view === "universe" || view === "battle" || view === "queens" || view === "horse" ? "active" : ""}
              onClick={() => navigate("universe")}
            >
              Universe
            </button>
            <button className={view === "online" ? "active" : ""} onClick={() => navigate("online")}>
              Online
            </button>
            <button className={view === "account" ? "active" : ""} onClick={() => navigate("account")}>
              {session ? "Profile" : "Sign in"}
            </button>
          </nav>
        </header>

        {!isOnline ? (
          <div className="offline-banner" role="status">
            Offline mode — Learn, Practice, Puzzles, My Games, Legends, Queens, Horse, and Stockfish are available.
          </div>
        ) : !isSupabaseConfigured ? (
          <div className="config-banner">
            Local and AI chess are ready. Connect Supabase to unlock accounts and multiplayer.
          </div>
        ) : null}

        <main className="page">
          {view === "home" ? (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">CHESS, EVOLVED · BETA</div>
                  <h1>Classic strategy. New worlds.</h1>
                  <p>
                    Play Chess Universe with Black moving first, challenge the computer, then unlock
                    Chess Universe variants and live competition.
                  </p>

                  <div className="hero-actions">
                    <button className="primary-action" onClick={() => navigate("play")}>Play now</button>
                    <button className="secondary-action" onClick={() => navigate("learn")}>Learn chess</button>
                    <button className="secondary-action" onClick={() => navigate("puzzles")}>Puzzles</button>
                    <button className="secondary-action" onClick={() => navigate("history")}>Legends</button>
                    <button className="secondary-action" onClick={() => navigate("universe")}>Universe</button>
                    <button className="secondary-action" onClick={() => navigate("online")}>Find a game</button>
                  </div>

                  <div className="feature-grid">
                    <article>
                      <span>01</span>
                      <strong>Chess Academy</strong>
                      <p>Learn piece decisions, opening ideas, strategy, tactics, then practice them on interactive boards.</p>
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
              <InstallApp />
              <FirstRunOnboarding onChoose={(destination) => navigate(destination)} />
            </>
          ) : null}

          {view === "play" ? (
            <>
              <div className="practice-explore-bar">
                <span>
                  <strong>New to chess?</strong>
                  <small>Learn the basics or step into a famous position.</small>
                </span>
                <div>
                  <button className="secondary-action compact" onClick={() => navigate("learn")}>Learn</button>
                  <button className="secondary-action compact" onClick={() => navigate("history")}>Legends</button>
                  <button className="secondary-action compact" onClick={() => navigate("puzzles")}>Puzzles</button>
                  <button className="secondary-action compact" onClick={() => navigate("library")}>My Games</button>
                </div>
              </div>
              <LocalGame onOpenLibrary={() => navigate("library")} userId={session?.user.id} />
            </>
          ) : null}

          {view === "library" ? (
            <GameLibrary onBack={() => navigate("play")} onPractice={() => navigate("play")} userId={session?.user.id} />
          ) : null}

          {view === "puzzles" ? (
            <PuzzleMode onBack={() => navigate("play")} onPractice={() => navigate("play")} userId={session?.user.id} />
          ) : null}

          {view === "learn" ? (
            <LearnChess
              onBack={() => navigate("home")}
              onPractice={() => navigate("play")}
              onHistory={() => navigate("history")}
              onPuzzles={() => navigate("puzzles")}
            />
          ) : null}

          {view === "history" ? (
            <HistoryMode
              onBack={() => navigate("home")}
              onLearn={() => navigate("learn")}
              onPractice={() => navigate("play")}
              userId={session?.user.id}
            />
          ) : null}

          {view === "universe" ? (
            <UniverseHub
              session={session}
              onOpenHorse={() => navigate("horse")}
              onOpenQueens={() => navigate("queens")}
              onOpenBattle={(unlockKeys) => {
                setBattleUnlockKeys(unlockKeys);
                navigate("battle");
              }}
              onOpenOnline={() => navigate("online")}
              onSignIn={() => navigate("account")}
            />
          ) : null}

          {view === "battle" ? (
            battleUnlockKeys.includes("battle_chess") ? (
              <BattleChessGame
                unlockKeys={battleUnlockKeys}
                onBack={() => navigate("universe")}
              />
            ) : (
              <section className="card offline-card">
                <div className="eyebrow">LOCKED WORLD</div>
                <h2>Battle Chess is still locked.</h2>
                <p>Win 3 rated online games to unlock Formation Clash and the Back Rank Lab.</p>
                <button className="primary-action" onClick={() => navigate("universe")}>Back to Universe</button>
              </section>
            )
          ) : null}

          {view === "queens" ? <EvolvingQueensGame /> : null}
          {view === "horse" ? <MagicHorseGame /> : null}

          {view === "online" && !isOnline ? (
            <section className="card offline-card">
              <div className="eyebrow">OFFLINE</div>
              <h2>Online play needs a connection.</h2>
              <p>
                Your offline modes are still ready. Practice against Stockfish, solve puzzles, review saved games, learn the basics,
                play Legends moments, or use either chess variant while you wait to reconnect.
              </p>
              <div className="offline-actions">
                <button className="primary-action" onClick={() => navigate("play")}>Practice</button>
                <button className="secondary-action" onClick={() => navigate("history")}>Legends</button>
                <button className="secondary-action" onClick={() => navigate("learn")}>Learn</button>
                <button className="secondary-action" onClick={() => navigate("puzzles")}>Puzzles</button>
              </div>
            </section>
          ) : null}

          {view === "online" && isOnline && session && onlineGameId ? (
            <OnlineGame
              gameId={onlineGameId}
              session={session}
              onBack={leaveOnlineTable}
              onOpenGame={openOnlineGame}
            />
          ) : null}

          {view === "online" && isOnline && (!session || !onlineGameId) ? (
            <OnlineLobby
              session={session}
              onOpenGame={openOnlineGame}
              challengeGameId={pendingChallengeId}
              onChallengeHandled={clearChallengeLink}
              onSignIn={() => navigate("account")}
            />
          ) : null}

          {view === "account" && !isOnline ? (
            <section className="card offline-card">
              <div className="eyebrow">OFFLINE</div>
              <h2>Your account will be back when you reconnect.</h2>
              <p>
                Local practice progress and Legends medals stay on this device. Signing in,
                syncing profile data, and multiplayer need internet access.
              </p>
              <button className="primary-action" onClick={() => navigate("play")}>Keep playing offline</button>
            </section>
          ) : null}

          {view === "account" && isOnline ? (
            <AuthPanel
              session={session}
              recoveryMode={recoveryMode}
              onRecoveryComplete={() => setRecoveryMode(false)}
            />
          ) : null}

          {view === "feedback" ? (
            <FeedbackPanel
              userId={session?.user.id}
              appView={previousView}
              onBack={goBackFromUtility}
              onSignIn={() => {
                setPreviousView("feedback");
                setView("account");
              }}
            />
          ) : null}

          {view === "privacy" ? <LegalPage kind="privacy" onBack={goBackFromUtility} /> : null}
          {view === "terms" ? <LegalPage kind="terms" onBack={goBackFromUtility} /> : null}
        </main>

        {view !== "feedback" ? (
          <button className="beta-feedback-fab" onClick={() => navigate("feedback")}>
            Feedback
          </button>
        ) : null}

        <footer className="site-footer">
          <span>Chess Universe Beta</span>
          <div>
            <button onClick={() => navigate("feedback")}>Feedback</button>
            <button onClick={() => navigate("privacy")}>Privacy</button>
            <button onClick={() => navigate("terms")}>Beta Terms</button>
          </div>
        </footer>
    </div>
  );
}
