import type { ReactNode } from "react";
import {
  POLICY_EFFECTIVE_DATE,
  SUPPORT_EMAIL,
  type PublicPage,
} from "../lib/publicPages";
import { PublicPageHeader } from "./PublicPageHeader";

type Props = {
  kind: "privacy" | "terms";
  onBack: () => void;
  onNavigate: (page: PublicPage) => void;
};

function PolicySection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="policy-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

const PRIVACY_SECTIONS = [
  ["privacy-scope", "Who this covers"],
  ["privacy-provide", "Information you give us"],
  ["privacy-play", "Information created when you play"],
  ["privacy-device", "Information kept on your device"],
  ["privacy-technical", "Technical information"],
  ["privacy-use", "How we use information"],
  ["privacy-visible", "What other players can see"],
  ["privacy-providers", "Service providers"],
  ["privacy-retention", "How long we keep information"],
  ["privacy-deletion", "Deleting your account and data"],
  ["privacy-security", "Security"],
  ["privacy-children", "Children"],
  ["privacy-choices", "Your choices and requests"],
  ["privacy-changes", "Changes to this policy"],
  ["privacy-contact", "Contact"],
] as const;

export function LegalPage({ kind, onBack, onNavigate }: Props) {
  if (kind === "terms") {
    return (
      <article className="legal-page public-page card">
        <PublicPageHeader
          onBack={onBack}
          eyebrow="CHESS UNIVERSE BETA"
          title="Beta Terms"
          lede="The ground rules for playing Chess Universe while it is in beta."
        />
        <p className="legal-updated">Effective September 29, 2026</p>

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

          <h2>Privacy and help</h2>
          <p>
            How Chess Universe handles your information is described in the{" "}
            <a href="/privacy" onClick={(event) => { event.preventDefault(); onNavigate("privacy"); }}>Privacy Policy</a>.
            For help, visit <a href="/support" onClick={(event) => { event.preventDefault(); onNavigate("support"); }}>Support</a>{" "}
            or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="legal-page public-page card">
      <PublicPageHeader
        onBack={onBack}
        eyebrow="CHESS UNIVERSE"
        title="Privacy Policy"
        lede="What Chess Universe collects, why, who helps us run it, and how to delete it."
      />
      <p className="legal-updated">Effective {POLICY_EFFECTIVE_DATE}</p>

      <div className="policy-summary" role="note" aria-label="Privacy at a glance">
        <strong>At a glance</strong>
        <ul>
          <li>You can play Practice, Puzzles, Chess Academy and Legends without an account.</li>
          <li>An account stores your email, username, online games, rating and synced progress.</li>
          <li>We do not sell your data, show ads, or use third-party analytics or advertising trackers.</li>
          <li>You can delete your account and synced progress from the Profile screen.</li>
        </ul>
      </div>

      <nav className="policy-toc" aria-label="Privacy Policy sections">
        <strong>Contents</strong>
        <ol>
          {PRIVACY_SECTIONS.map(([id, label]) => (
            <li key={id}><a href={`#${id}`}>{label}</a></li>
          ))}
        </ol>
      </nav>

      <div className="legal-copy">
        <PolicySection id="privacy-scope" title="Who this covers">
          <p>
            This policy covers the Chess Universe website at chessuniverse.netlify.app and the Chess
            Universe iOS app (together, “Chess Universe”, “we”, or “us”). Both use the same account
            system, so one account works in either place.
          </p>
        </PolicySection>

        <PolicySection id="privacy-provide" title="Information you give us">
          <ul>
            <li>
              <strong>Account details.</strong> To create an account you provide an email address, a
              password, and a username. Passwords are handled by our authentication provider,
              Supabase Auth, and are never visible to Chess Universe.
            </li>
            <li>
              <strong>Feedback (website).</strong> If you send feedback from the website, we receive
              the category you choose, your message, the screen you were on, and your browser’s
              user-agent string (which describes the browser and device type). Feedback does not
              require an account and is not linked to one. Please do not include sensitive personal
              information in feedback.
            </li>
            <li>
              <strong>Support emails.</strong> If you email us, we receive your email address and
              whatever you include in your message.
            </li>
          </ul>
        </PolicySection>

        <PolicySection id="privacy-play" title="Information created when you play">
          <p>When you are signed in, Chess Universe stores the following with your account:</p>
          <ul>
            <li>
              <strong>Online games.</strong> Moves, positions, results, time controls, clock times,
              timestamps, and rating changes for each game, plus private challenges, rematch requests
              and draw offers you send or receive.
            </li>
            <li>
              <strong>Profile and competition records.</strong> Rating, wins, losses and draws,
              Battle Chess statistics, season and championship standings, tournament entries,
              achievements, titles, and unlocked rewards.
            </li>
            <li>
              <strong>Synced progress.</strong> Puzzle progress, Legends progress, Chess Academy
              progress from the iOS app, app preferences such as sound and haptics, and completed
              Practice games in your My Games library (mode, difficulty, time control, result, and moves).
            </li>
          </ul>
          <p>
            Online moves are checked by our server before they are accepted, so the server keeps
            the authoritative record of each online game.
          </p>
        </PolicySection>

        <PolicySection id="privacy-device" title="Information kept on your device">
          <p>
            Much of Chess Universe works offline. Practice games against the computer run entirely on
            your device: on the website the Stockfish chess engine runs inside your browser, and the
            iOS app uses a built-in practice opponent. On the website, finished Practice games are
            saved to My Games on your device, and they sync to your account only while you are
            signed in.
          </p>
          <p>
            The website keeps progress, saved games, and settings such as sound and haptics in your
            browser’s local storage. The iOS app keeps Academy and Puzzle progress in the app’s local
            storage on your iPhone. When you sign out on the website, Chess Universe removes your
            player-specific data, such as saved games and puzzle progress, from that browser.
            On iOS, local progress stays on the device until you delete the app.
          </p>
        </PolicySection>

        <PolicySection id="privacy-technical" title="Technical information">
          <p>
            Like most online services, our hosting and backend providers process technical
            information needed to deliver Chess Universe, such as IP addresses, device and browser
            type, and request logs. Chess Universe does not add its own analytics, advertising, or
            cross-app tracking tools, and does not use your information to track you across other
            companies’ apps or websites.
          </p>
        </PolicySection>

        <PolicySection id="privacy-use" title="How we use information">
          <ul>
            <li>Create and secure your account, sign you in, and reset your password.</li>
            <li>Run online matches, private challenges, ratings, seasons, and championships.</li>
            <li>Sync your progress between devices.</li>
            <li>Respond to support requests and fix bugs reported through feedback.</li>
            <li>Keep games fair and protect the service from abuse.</li>
          </ul>
        </PolicySection>

        <PolicySection id="privacy-visible" title="What other players can see">
          <p>
            Signed-in players can see your public profile, including your username, rating, record,
            rank, and trophy case, and the moves and results of games you play with them, including
            in standings and tournament brackets. Your email address is not shown to other players.
          </p>
        </PolicySection>

        <PolicySection id="privacy-providers" title="Service providers">
          <p>We share information only with the providers that run Chess Universe:</p>
          <ul>
            <li>
              <strong>Supabase</strong> provides authentication, our database, realtime multiplayer
              updates, and the server functions that validate moves and delete accounts.
            </li>
            <li>
              <strong>Netlify</strong> hosts the website and receives website feedback submissions.
            </li>
            <li>
              <strong>Apple</strong> distributes the iOS app through the App Store and TestFlight.
              Apple’s handling of your information is governed by Apple’s privacy policy.
            </li>
          </ul>
          <p>
            We do not sell your personal information or share it for advertising. We may disclose
            information if required by law.
          </p>
        </PolicySection>

        <PolicySection id="privacy-retention" title="How long we keep information">
          <ul>
            <li>Account, profile, and synced progress are kept while your account exists.</li>
            <li>
              Public open tables that nobody joins close automatically after 30 minutes, and unanswered
              private challenges close after 72 hours.
            </li>
            <li>
              Completed games are kept so both players keep their game history. If you delete your
              account, those games remain without being linked to you.
            </li>
            <li>Website feedback is kept in Netlify Forms until we remove it.</li>
            <li>
              Technical logs kept by Supabase and Netlify are retained according to those providers’
              own policies.
            </li>
          </ul>
        </PolicySection>

        <PolicySection id="privacy-deletion" title="Deleting your account and data">
          <p>
            Sign in on the Chess Universe website, open <strong>Profile</strong>, and use{" "}
            <strong>Delete account</strong>. Deletion is immediate and removes:
          </p>
          <ul>
            <li>Your sign-in account, email address, and username.</li>
            <li>Your rating, record, Battle Chess and season statistics, achievements, titles, and unlocks.</li>
            <li>Your synced puzzle, Legends, and Academy progress, preferences, and saved Practice games.</li>
            <li>Online games you are part of that have not finished, including open tables and challenges you created.</li>
          </ul>
          <p>
            Completed match records remain in de-identified form, meaning the moves and result stay
            but are no longer linked to your account, so your opponent does not lose their game
            history. Tournament results are kept the same way.
          </p>
          <p>
            Data stored only on your device is removed by signing out on the website, clearing your
            browser’s site data, or deleting the iOS app. You can also request deletion by emailing{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address on your account.
            For step-by-step help, see{" "}
            <a
              href="/support#delete-account"
              onClick={(event) => {
                event.preventDefault();
                onNavigate("support");
                window.setTimeout(() => document.getElementById("delete-account")?.scrollIntoView(), 0);
              }}
            >
              Support
            </a>.
          </p>
        </PolicySection>

        <PolicySection id="privacy-security" title="Security">
          <p>
            Chess Universe connects to its services over encrypted HTTPS. Database access rules
            restrict synced progress and saved games to your own account, and privileged
            operations such as validating online moves and deleting accounts run only on the
            server. No system is perfectly secure, so please use a unique password for your account.
          </p>
        </PolicySection>

        <PolicySection id="privacy-children" title="Children">
          <p>
            Chess Universe is not directed to children under 13, and we do not knowingly collect
            personal information from them. If you believe a child under 13 has created an account,
            contact us and we will delete it.
          </p>
        </PolicySection>

        <PolicySection id="privacy-choices" title="Your choices and requests">
          <p>
            You can play without an account, sign out at any time, and delete your account whenever
            you like. To ask for a copy of your account data, or for help with any privacy
            question, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </PolicySection>

        <PolicySection id="privacy-changes" title="Changes to this policy">
          <p>
            If Chess Universe starts handling information differently, we will update this policy
            and the effective date at the top of this page.
          </p>
        </PolicySection>

        <PolicySection id="privacy-contact" title="Contact">
          <p>
            Questions about privacy or your data: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </PolicySection>
      </div>
    </article>
  );
}
