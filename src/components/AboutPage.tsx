import { APP_STORE_URL, type PublicPage } from "../lib/publicPages";

type Props = {
  onBack: () => void;
  onNavigate: (page: PublicPage) => void;
  onPlay: () => void;
};

const PILLARS = [
  {
    label: "PLAY",
    title: "Practice",
    copy: "Play the computer at Beginner, Easy, Medium, or Hard, or pass the board to a friend. On the website, the Stockfish engine runs right in your browser, even offline. Every finished game lands in My Games for review.",
  },
  {
    label: "TRAIN",
    title: "Puzzles",
    copy: "One-move tactics and multi-move combinations. A wrong move gets a real explanation, so you understand why the answer works instead of just guessing again.",
  },
  {
    label: "LEARN",
    title: "Chess Academy",
    copy: "Take a quick placement, then follow a guided path through piece decisions, openings, responding to threats, tactics, and endgames. Review sessions bring back the ideas you find hardest.",
  },
  {
    label: "STUDY",
    title: "Legends",
    copy: "Walk through famous games from players like Morphy, Anderssen, and Fischer, jump to the turning point, and take over the position yourself.",
  },
  {
    label: "LIVE",
    title: "Online",
    copy: "Rated games at 10, 15, or 30 minutes, relaxed Untimed games, private challenge links, and rematches. Every move is validated by the server, with ratings, seasons, and championships on top.",
  },
] as const;

const VARIANTS = [
  {
    title: "Chess Universe rules",
    copy: "Familiar chess with one signature twist: Black moves first.",
  },
  {
    title: "Battle Chess",
    copy: "New back-rank formations with normal piece movement and no castling. It has its own rating and unlocks after 3 rated online wins.",
  },
  {
    title: "Evolving Queens",
    copy: "Queens change how they move across four evolution levels. Play the computer or a friend on one board.",
  },
  {
    title: "Magic Horse",
    copy: "Capture every queen using only knight routes, with harder levels to unlock as you go.",
  },
] as const;

export function AboutPage({ onBack, onNavigate, onPlay }: Props) {
  return (
    <article className="about-page public-page">
      <button type="button" className="text-button back-link" onClick={onBack}>← Back</button>

      <img
        className="about-banner"
        src="/brand/chess-universe-banner.jpg"
        alt="Chess Universe. Play, learn, compete."
        width={1024}
        height={438}
        decoding="async"
      />

      <section className="about-hero card" aria-labelledby="about-title">
        <div className="about-hero-copy">
          <div className="eyebrow">ABOUT CHESS UNIVERSE</div>
          <h1 id="about-title">Classic strategy. New worlds.</h1>
          <p className="public-lede">
            Chess Universe is one place to learn chess, sharpen your tactics, relive legendary games,
            explore new variants, and play people online, on the web and on iPhone.
          </p>
          <div className="about-actions">
            <button type="button" className="primary-action" onClick={onPlay}>Play on the web</button>
            {APP_STORE_URL ? (
              <a className="secondary-action about-store-link" href={APP_STORE_URL} target="_blank" rel="noreferrer">
                Download on the App Store
              </a>
            ) : (
              <span className="about-store-pending" role="note">iPhone app coming soon to the App Store</span>
            )}
          </div>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-modes">
        <h2 id="about-modes">Everything in the Universe</h2>
        <div className="about-grid">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="about-card">
              <span className="eyebrow">{pillar.label}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-variants">
        <h2 id="about-variants">Chess variants</h2>
        <div className="about-grid about-grid-variants">
          {VARIANTS.map((variant) => (
            <article key={variant.title} className="about-card">
              <h3>{variant.title}</h3>
              <p>{variant.copy}</p>
            </article>
          ))}
        </div>
        <p className="about-note">
          Evolving Queens and Magic Horse are on the website today. The iPhone app includes Practice,
          Puzzles, Chess Academy, Legends, My Games, and online Classic and Battle Chess.
        </p>
      </section>

      <section className="about-section about-footer-card card" aria-labelledby="about-more">
        <h2 id="about-more">Questions?</h2>
        <p>
          Visit <a href="/support" onClick={(event) => { event.preventDefault(); onNavigate("support"); }}>Support</a>{" "}
          for help, or read how we handle your data in the{" "}
          <a href="/privacy" onClick={(event) => { event.preventDefault(); onNavigate("privacy"); }}>Privacy Policy</a>.
        </p>
      </section>
    </article>
  );
}
