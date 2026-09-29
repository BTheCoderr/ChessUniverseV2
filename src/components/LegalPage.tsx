type Props = {
  kind: "privacy" | "terms";
  onBack: () => void;
};

export function LegalPage({ kind, onBack }: Props) {
  const privacy = kind === "privacy";

  return (
    <section className="legal-page card">
      <button className="text-button back-link" onClick={onBack}>← Back</button>
      <div className="eyebrow">CHESS UNIVERSE BETA</div>
      <h1>{privacy ? "Privacy" : "Beta Terms"}</h1>
      <p className="legal-updated">Effective September 29, 2026</p>

      {privacy ? (
        <div className="legal-copy">
          <h2>What Chess Universe stores</h2>
          <p>
            If you create an account, Chess Universe stores account information such as your email,
            username, player ID, rating and game record. The app can also store online games, moves,
            Puzzle and Legends progress, saved Practice games, preferences, and feedback you choose
            to submit.
          </p>

          <h2>Why it is used</h2>
          <p>
            This information is used to sign you in, run multiplayer games, sync your progress,
            improve the beta, investigate bugs, and keep the service working.
          </p>

          <h2>Service providers</h2>
          <p>
            Chess Universe currently uses Supabase for accounts, database, realtime multiplayer and
            server functions, and Netlify to host the web app. Those providers may process technical
            data needed to deliver the service.
          </p>

          <h2>Sharing</h2>
          <p>
            Chess Universe does not sell player data. Account data is not intentionally made public.
            Other signed-in players may see gameplay information that is necessary to play a match.
          </p>

          <h2>Your choices</h2>
          <p>
            You can sign out at any time and can delete your account from the Profile screen.
            Account deletion removes your account and synced personal progress. Completed match
            records may remain in de-identified form so the opponent's game history is not destroyed.
          </p>

          <h2>Beta software</h2>
          <p>
            Chess Universe is still being tested. Features and data structures may change while the
            beta is being improved. Use the in-app Feedback screen to report a privacy concern or bug.
          </p>
        </div>
      ) : (
        <div className="legal-copy">
          <h2>Beta access</h2>
          <p>
            Chess Universe is pre-release software. Features may change, break, reset, or be removed
            while the product is being tested.
          </p>

          <h2>Fair play</h2>
          <p>
            Do not exploit bugs, interfere with other players, automate abusive account or lobby
            activity, impersonate another person, or use the service to harass others.
          </p>

          <h2>No real-money wagering</h2>
          <p>
            Chess Universe beta does not provide real-money wagering. Do not use the service to
            arrange or operate gambling activity.
          </p>

          <h2>Availability</h2>
          <p>
            The beta is provided as available without a promise of uninterrupted service or
            permanent preservation of beta data. Offline features may continue to work even when
            online services are unavailable.
          </p>

          <h2>Feedback</h2>
          <p>
            You may submit ideas, bug reports, and usability feedback through the app. Feedback may
            be used to improve Chess Universe.
          </p>

          <h2>Accounts</h2>
          <p>
            Keep your account credentials private. You may delete your account from the Profile
            screen if you no longer want to participate in the beta.
          </p>
        </div>
      )}
    </section>
  );
}
