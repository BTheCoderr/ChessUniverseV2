import { useRef, useState } from "react";
import {
  buildAcademyExport,
  importAcademyExport,
  parseAcademyImport,
  resetAcademyProgress,
} from "../lib/academyTransfer";

export function AcademyDataTools({ onChanged }: { onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("");
  const [resetArmed, setResetArmed] = useState(false);

  const exportProgress = () => {
    const data = buildAcademyExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `chess-universe-academy-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setStatus("Academy progress exported.");
  };

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseAcademyImport(JSON.parse(text));
      importAcademyExport(parsed);
      setStatus("Academy progress imported.");
      setResetArmed(false);
      onChanged();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import that Academy file.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const reset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      setStatus("Press reset again to confirm. This only clears local Academy learning progress.");
      return;
    }

    resetAcademyProgress();
    setResetArmed(false);
    setStatus("Local Academy progress reset.");
    onChanged();
  };

  return (
    <section className="academy-data-tools" aria-labelledby="academy-data-title">
      <div>
        <div className="eyebrow">LOCAL DATA</div>
        <h3 id="academy-data-title">Own your Academy progress.</h3>
        <p>
          Export a JSON backup, move it to another browser, or reset only the local Academy learning data.
          Saved games and online account data are not touched.
        </p>
      </div>

      <div className="academy-data-actions">
        <button className="secondary-action" type="button" onClick={exportProgress}>
          Export progress
        </button>
        <button className="secondary-action" type="button" onClick={() => inputRef.current?.click()}>
          Import progress
        </button>
        <button className={resetArmed ? "secondary-action danger-action" : "text-button"} type="button" onClick={reset}>
          {resetArmed ? "Confirm reset" : "Reset Academy"}
        </button>
      </div>

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importFile(file);
        }}
      />

      {status ? <p className="form-message" role="status">{status}</p> : null}
    </section>
  );
}
