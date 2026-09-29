import { useState } from "react";

export const ONBOARDING_KEY = "chess-universe-onboarding-v1";

export type OnboardingDestination = "learn" | "play" | "online";

function shouldShow() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) !== "done";
  } catch {
    return true;
  }
}

type Props = {
  onChoose: (destination: OnboardingDestination) => void;
};

export function FirstRunOnboarding({ onChoose }: Props) {
  const [visible, setVisible] = useState(shouldShow);
  if (!visible) return null;

  const finish = (destination?: OnboardingDestination) => {
    try {
      window.localStorage.setItem(ONBOARDING_KEY, "done");
    } catch {
      // Onboarding can still close without storage.
    }
    setVisible(false);
    if (destination) onChoose(destination);
  };

  return (
    <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <section className="onboarding-card">
        <div className="eyebrow">WELCOME TO CHESS UNIVERSE</div>
        <h2 id="onboarding-title">Where should we start you?</h2>
        <p>Pick the lane that fits you. You can jump between every mode later.</p>

        <div className="onboarding-choices">
          <button onClick={() => finish("learn")}>
            <span>01</span>
            <strong>I’m new to chess</strong>
            <small>Learn how every piece moves, checkmate, and the Black-first Universe rule.</small>
          </button>
          <button onClick={() => finish("play")}>
            <span>02</span>
            <strong>I know how to play</strong>
            <small>Go straight to Practice, AI difficulty, Puzzles, and your local game library.</small>
          </button>
          <button onClick={() => finish("online")}>
            <span>03</span>
            <strong>I want competition</strong>
            <small>Head toward online play. Practice and review stay available offline too.</small>
          </button>
        </div>

        <button className="text-button onboarding-skip" onClick={() => finish()}>I’ll explore on my own</button>
      </section>
    </div>
  );
}
