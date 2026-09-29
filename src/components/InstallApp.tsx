import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const ios = isIos();

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed) return null;
  if (!promptEvent && !ios) return null;

  const install = async () => {
    if (!promptEvent) {
      setShowIosHelp(true);
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setPromptEvent(null);
    }
  };

  return (
    <div className="install-card">
      <div>
        <div className="eyebrow">PLAY ANYWHERE</div>
        <strong>Install Chess Universe</strong>
        <span>Open it like an app and keep Learn, Practice, Puzzles, Legends, My Games, and Stockfish available offline.</span>
        {ios && showIosHelp ? (
          <small>On iPhone or iPad: tap Share in Safari, then choose “Add to Home Screen.”</small>
        ) : null}
      </div>
      <button className="secondary-action" onClick={() => void install()}>
        {ios && !promptEvent ? "How to install" : "Install app"}
      </button>
    </div>
  );
}
