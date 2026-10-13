import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { AboutPage } from "./components/AboutPage";
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
import { NativeTabBar } from "./components/NativeTabBar";
import { SupportPage } from "./components/SupportPage";
import { UniverseHub } from "./components/UniverseHub";
import { clearLocalPlayerData, prepareLocalDataForUser } from "./lib/localPlayerData";
import {
  PUBLIC_PAGE_PATHS,
  documentTitleFor,
  isPublicPage,
  publicPageFromPath,
  type PublicPage,
} from "./lib/publicPages";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { challengeIdFromUrl } from "./lib/nativeLinks";
import { isNativeApp, registerNativeUrlListener } from "./lib/nativeRuntime";
import type { TrainingMoment } from "./lib/postGameCoach";

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
  | PublicPage;

const ONLINE_GAME_KEY = "chess-universe-online-game";
const CHALLENGE_PARAM = "challenge";

function isUtilityView(view: View) {
  return view === "feedback" || isPublicPage(view);
}

function challengeFromUrl() {
  if (typeof window === "undefined") return null;
  return challengeIdFromUrl(window.location.href);
}

function publicPageFromLocation() {
  if (typeof window === "undefined") return null;
  return publicPageFromPath(window.location.pathname);
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
  const [view, setView] = useState<View>(() =>
    publicPageFromLocation() ?? (savedOnlineGame() || initialChallenge ? "online" : "home")
  );
  const [previousView, setPreviousView] = useState<View>("home");
  const previousViewRef = useRef<View>("home");
  previousViewRef.current = previousView;
  const [session, setSession] = useState<Session | null>(null);
  const [battleUnlockKeys, setBattleUnlockKeys] = useState<string[]>([]);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [libraryGameId, setLibraryGameId] = useState<string | null>(null);
  const [trainingMoment, setTrainingMoment] = useState<TrainingMoment | null>(null);

  const navigate = (next: View) => {
    if (!isUtilityView(view)) {
      setPreviousView(view);
    }
    setView(next);
    if (isPublicPage(next)) window.scrollTo(0, 0);
  };

  const followPageLink = (page: PublicPage) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigate(page);
  };

  useEffect(() => {
    const page = isPublicPage(view) ? view : null;
    document.title = documentTitleFor(page);

    const path = page ? PUBLIC_PAGE_PATHS[page] : "/";
    const onPublicPath = publicPageFromPath(window.location.pathname) !== null;
    if (page ? publicPageFromPath(window.location.pathname) !== page : onPublicPath) {
      try {
        window.history.pushState({}, "", path);
      } catch {
        // Navigation still works in-app when history APIs are unavailable.
      }
    }
  }, [view]);

  useEffect(() => {
    const handlePopState = () => {
      const page = publicPageFromPath(window.location.pathname);
      if (page) {
        setView(page);
        return;
      }
      setView((current) => {
        if (!isUtilityView(current)) return current;
        const previous = previousViewRef.current;
        return isUtilityView(previous) ? "home" : previous;
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
    let active = true;
    let removeListener: (() => Promise<void>) | null = null;

    void registerNativeUrlListener((url) => {
      if (!active) return;
      const challengeId = challengeIdFromUrl(url);
      if (!challengeId) return;

      setPendingChallengeId(challengeId);
      setOnlineGameId(null);
      setView("online");
    }).then((listener) => {
      if (!listener) return;
      if (!active) {
        void listener.remove();
        return;
      }
      removeListener = () => listener.remove();
    });

    return () => {
      active = false;
      if (removeListener) void removeListener();
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
    setView(isUtilityView(previousView) ? "home" : previousView);
  };

  const openLibrary = (gameId: string | null = null) => {
    setLibraryGameId(gameId);
    setTrainingMoment(null);
    navigate("library");
  };

  const trainSavedMoment = (moment: TrainingMoment) => {
    setLibraryGameId(moment.gameId);
    setTrainingMoment(moment);
    navigate("library");
  };

  const leaveLibrary = () => {
    setLibraryGameId(null);
    setTrainingMoment(null);
    navigate("play");
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
                      <p>Take a quick placement, follow a guided course path, and learn piece decisions, openings, tactics, endgames, and your own weak concepts.</p>
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
                  <button className="secondary-action compact" onClick={() => openLibrary()}>My Games</button>
                </div>
              </div>
              <LocalGame
                onOpenLibrary={(gameId) => openLibrary(gameId ?? null)}
                onTrainMoment={trainSavedMoment}
                userId={session?.user.id}
              />
            </>
          ) : null}

          {view === "library" ? (
            <GameLibrary
              onBack={leaveLibrary}
              onPractice={leaveLibrary}
              userId={session?.user.id}
              initialGameId={libraryGameId}
              trainingMoment={trainingMoment}
            />
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
            <FeedbackPanel appView={previousView} onBack={goBackFromUtility} />
          ) : null}

          {view === "privacy" ? <LegalPage kind="privacy" onBack={goBackFromUtility} onNavigate={navigate} /> : null}
          {view === "terms" ? <LegalPage kind="terms" onBack={goBackFromUtility} onNavigate={navigate} /> : null}
          {view === "support" ? (
            <SupportPage
              onBack={goBackFromUtility}
              onNavigate={navigate}
              onOpenFeedback={() => navigate("feedback")}
              onOpenAccount={() => navigate("account")}
            />
          ) : null}
          {view === "about" ? (
            <AboutPage
              onBack={goBackFromUtility}
              onNavigate={navigate}
              onPlay={() => navigate("play")}
            />
          ) : null}
        </main>

        {view !== "feedback" ? (
          <button className="beta-feedback-fab" onClick={() => navigate("feedback")}>
            Feedback
          </button>
        ) : null}

        {isNativeApp() ? (
          <NativeTabBar
            activeView={view}
            onNavigate={(destination) => navigate(destination)}
          />
        ) : null}

        <footer className="site-footer">
          <span>Chess Universe Beta</span>
          <nav aria-label="Chess Universe information">
            <a href={PUBLIC_PAGE_PATHS.support} onClick={followPageLink("support")}>Support</a>
            <a href={PUBLIC_PAGE_PATHS.privacy} onClick={followPageLink("privacy")}>Privacy Policy</a>
            <a href={PUBLIC_PAGE_PATHS.about} onClick={followPageLink("about")}>About</a>
            <a href={PUBLIC_PAGE_PATHS.terms} onClick={followPageLink("terms")}>Beta Terms</a>
            <button onClick={() => navigate("feedback")}>Feedback</button>
          </nav>
        </footer>
    </div>
  );
}
