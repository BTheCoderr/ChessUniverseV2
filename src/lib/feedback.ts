import { isNativeApp, nativeImpact } from "./nativeRuntime";

export const FEEDBACK_SETTINGS_KEY = "chess-universe-feedback-v1";

export type FeedbackSettings = {
  sound: boolean;
  haptics: boolean;
};

export type FeedbackKind = "move" | "capture" | "check" | "mate";

export const DEFAULT_FEEDBACK_SETTINGS: FeedbackSettings = {
  sound: true,
  haptics: true,
};

export function normalizeFeedbackSettings(value: unknown): FeedbackSettings {
  if (!value || typeof value !== "object") return DEFAULT_FEEDBACK_SETTINGS;
  const settings = value as Record<string, unknown>;
  return {
    sound: settings.sound !== false,
    haptics: settings.haptics !== false,
  };
}

export function loadFeedbackSettings() {
  if (typeof window === "undefined") return DEFAULT_FEEDBACK_SETTINGS;
  try {
    const raw = window.localStorage.getItem(FEEDBACK_SETTINGS_KEY);
    return raw ? normalizeFeedbackSettings(JSON.parse(raw)) : DEFAULT_FEEDBACK_SETTINGS;
  } catch {
    return DEFAULT_FEEDBACK_SETTINGS;
  }
}

export function saveFeedbackSettings(settings: FeedbackSettings) {
  try {
    window.localStorage.setItem(FEEDBACK_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Feedback settings are optional.
  }
}

export function playChessFeedback(kind: FeedbackKind, settings: FeedbackSettings) {
  if (typeof window === "undefined") return;

  if (settings.haptics) {
    if (isNativeApp()) {
      nativeImpact(kind === "mate" ? "heavy" : kind === "check" || kind === "capture" ? "medium" : "light");
    } else if ("vibrate" in navigator) {
      const vibration = kind === "mate" ? [35, 35, 70] : kind === "check" ? [25, 25, 25] : kind === "capture" ? 28 : 14;
      navigator.vibrate(vibration);
    }
  }

  if (!settings.sound) return;

  try {
    const AudioContextCtor = window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const frequency = kind === "mate" ? 330 : kind === "check" ? 520 : kind === "capture" ? 180 : 260;
    const duration = kind === "mate" ? 0.18 : kind === "check" ? 0.12 : 0.07;

    oscillator.type = kind === "capture" ? "square" : "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Audio feedback must never interrupt gameplay.
  }
}
