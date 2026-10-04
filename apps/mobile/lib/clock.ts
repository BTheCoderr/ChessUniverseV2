export type ClockPreset = { label: string; seconds: number; increment: number };

export const clockPresets: ClockPreset[] = [
  { label: "No timer", seconds: 0, increment: 0 },
  { label: "10 min", seconds: 600, increment: 0 },
  { label: "5 + 3", seconds: 300, increment: 3 },
  { label: "3 + 2", seconds: 180, increment: 2 },
];

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
