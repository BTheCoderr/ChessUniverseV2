import { useEffect, type ReactNode } from "react";
import { IOS_APP_VERSION, SUPPORT_EMAIL, type PublicPage } from "../lib/publicPages";
import { PublicPageHeader } from "./PublicPageHeader";

type Props = {
  onBack: () => void;
  onNavigate: (page: PublicPage) => void;
  onOpenFeedback: () => void;
  onOpenAccount: () => void;
};

type Faq = { question: string; answer: ReactNode };

const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Chess Universe support")}`;

function FaqGroup({ id, title, items }: { id: string; title: string; items: Faq[] }) {
  return (
    <section className="support-faq-group" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      {items.map((item) => (
        <details key={item.question} className="support-faq">
          <summary>{item.question}</summary>
          <div>{item.answer}</div>
        </details>
      ))}
    </section>
  );
}

export function SupportPage({ onBack, onNavigate, onOpenFeedback, onOpenAccount }: Props) {
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target) document.getElementById(target)?.scrollIntoView();
  }, []);

  const pageLink = (page: PublicPage, label: string) => (
    <a href={`/${page}`} onClick={(event) => { event.preventDefault(); onNavigate(page); }}>{label}</a>
  );

  const accounts: Faq[] = [
    {
      question: "Do I need an account?",
      answer: (
        <p>
          No. Practice, Puzzles, Chess Academy, and Legends work without one. An account is needed
          for online games, ratings, Universe rewards, and syncing progress between devices.
        </p>
      ),
    },
    {
      question: "Does my account work on both the website and iPhone?",
      answer: <p>Yes. Sign in with the same email and password on chessuniverse.netlify.app and in the iOS app.</p>,
    },
    {
      question: "I forgot my password.",
      answer: (
        <p>
          On the sign-in screen, choose <strong>Forgot password?</strong> and enter your account email.
          Open the reset link from that email to choose a new password. If it does not arrive within a
          few minutes, check your spam or junk folder and request it again.
        </p>
      ),
    },
    {
      question: "I signed up but can’t sign in yet.",
      answer: (
        <p>
          If you were asked to confirm your email, open the confirmation link in that message first,
          then sign in again.
        </p>
      ),
    },
  ];

  const gameplay: Faq[] = [
    {
      question: "Why does Black move first?",
      answer: (
        <p>
          It is the signature Chess Universe rule. Black moves first in website games and in all online
          matches, including Battle Chess. Practice in the iOS app currently uses standard rules, with you
          playing White.
        </p>
      ),
    },
    {
      question: "How do I move pieces?",
      answer: <p>Tap a piece and then tap its destination, or drag the piece to the square you want.</p>,
    },
    {
      question: "What are the Universe variants?",
      answer: (
        <p>
          On the website, <strong>Magic Horse</strong> challenges you to capture queens using knight
          routes, and <strong>Evolving Queens</strong> changes how queens move across four levels.{" "}
          <strong>Battle Chess</strong> rearranges the back rank with new formations; it unlocks after
          you win 3 rated online games. See {pageLink("about", "About")} for more.
        </p>
      ),
    },
  ];

  const puzzles: Faq[] = [
    {
      question: "How do Puzzles work?",
      answer: (
        <p>
          Find the best move, or the best sequence in multi-move puzzles. If you play a legal move that
          isn’t the answer, Chess Universe explains what it misses so you can try again.
        </p>
      ),
    },
    {
      question: "Will I lose my puzzle progress?",
      answer: (
        <p>
          Puzzle progress is saved on your device. When you are signed in, it also syncs to your account
          on both the website and the iOS app.
        </p>
      ),
    },
  ];

  const online: Faq[] = [
    {
      question: "What time controls are available?",
      answer: (
        <p>
          Rated games at 10, 15, or 30 minutes, plus Untimed casual games that are unrated and can be
          resumed later. Classic and Battle Chess ratings are tracked separately.
        </p>
      ),
    },
    {
      question: "How do private challenges work?",
      answer: (
        <p>
          Create a private challenge in the Online lobby and share its link. Your friend signs in and
          opens the link to accept. Unanswered private challenges close after 72 hours, and public open
          tables close after 30 minutes if nobody joins.
        </p>
      ),
    },
    {
      question: "Is online play fair?",
      answer: (
        <p>
          Every online move is checked by the Chess Universe server before it is accepted, and clocks
          are tracked on the server.
        </p>
      ),
    },
    {
      question: "I lost a timed game after disconnecting.",
      answer: (
        <p>
          Timed games keep their clocks running, so leaving a timed game can lose on time. If you want
          to play at your own pace, choose Untimed.
        </p>
      ),
    },
  ];

  const syncing: Faq[] = [
    {
      question: "What syncs to my account?",
      answer: (
        <>
          <p>When you are signed in:</p>
          <ul>
            <li>Website: puzzle progress, Legends progress, completed Practice games in My Games, and sound and haptics settings.</li>
            <li>iOS app: Chess Academy and puzzle progress.</li>
            <li>Everywhere: online games, ratings, records, achievements, and Universe rewards.</li>
          </ul>
          <p>Chess Academy progress on the website is saved in that browser only.</p>
        </>
      ),
    },
    {
      question: "My progress isn’t showing on another device.",
      answer: (
        <p>
          Make sure you are signed in to the same account on both devices and connected to the
          internet, then reopen the mode. Progress made while signed out stays on the device where you
          made it.
        </p>
      ),
    },
    {
      question: "Someone else uses this browser.",
      answer: (
        <p>
          Signing out removes your player-specific progress from that browser. When a different account
          signs in, the previous player’s local progress is cleared first.
        </p>
      ),
    },
  ];

  return (
    <article className="support-page public-page card">
      <PublicPageHeader
        onBack={onBack}
        eyebrow="HELP CENTER"
        title="Chess Universe Support"
        lede="Answers to common questions, quick fixes, and a direct line to the team."
      />

      <section className="support-contact" aria-labelledby="support-contact">
        <div>
          <h2 id="support-contact">Contact support</h2>
          <p>
            Email us and include your username, your device, and what happened. For account requests,
            write from the email address on your account.
          </p>
        </div>
        <div className="support-contact-actions">
          <a className="primary-action support-email" href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
          <button type="button" className="secondary-action" onClick={onOpenFeedback}>Send feedback in the app</button>
        </div>
      </section>

      <section className="support-section" aria-labelledby="support-quick-fixes">
        <h2 id="support-quick-fixes">Quick fixes</h2>
        <ul className="support-checklist">
          <li>
            <strong>Online games won’t load.</strong> Check your internet connection. Practice, Puzzles,
            Chess Academy, and Legends keep working offline.
          </li>
          <li>
            <strong>The website looks out of date.</strong> Close every Chess Universe tab and reopen it.
            The installed web app updates itself the next time it starts.
          </li>
          <li>
            <strong>A challenge link won’t open.</strong> Sign in first, then open the link again. Private
            challenges expire after 72 hours.
          </li>
          <li>
            <strong>The iPhone app is acting up.</strong> Fully close and reopen it. Make sure you have the
            latest version from TestFlight or the App Store.
          </li>
          <li>
            <strong>Still stuck?</strong> Email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> with your
            device, app version, and the steps that cause the problem.
          </li>
        </ul>
      </section>

      <section className="support-section" aria-labelledby="support-faq">
        <h2 id="support-faq">Frequently asked questions</h2>
        <FaqGroup id="faq-accounts" title="Accounts" items={accounts} />
        <FaqGroup id="faq-gameplay" title="Gameplay" items={gameplay} />
        <FaqGroup id="faq-puzzles" title="Puzzles" items={puzzles} />
        <FaqGroup id="faq-online" title="Online matches" items={online} />
        <FaqGroup id="faq-sync" title="Progress syncing" items={syncing} />
      </section>

      <section id="delete-account" className="support-section support-delete" aria-labelledby="support-delete">
        <h2 id="support-delete">Delete your account and data</h2>
        <p>
          Your website and iPhone use the same account, so deleting it once removes it everywhere.
        </p>
        <ol>
          <li>Go to chessuniverse.netlify.app and <button type="button" className="inline-link" onClick={onOpenAccount}>sign in</button>.</li>
          <li>Open <strong>Profile</strong> and scroll to <strong>Delete account</strong>.</li>
          <li>Type <strong>DELETE</strong> to confirm, then choose <strong>Delete my account</strong>.</li>
        </ol>
        <p>
          Deletion happens immediately. It removes your sign-in account, email, username, rating,
          records, achievements, unlocks, synced progress, saved Practice games, and any unfinished
          online games you are part of. Completed matches stay in de-identified form so your opponents
          keep their game history.
        </p>
        <p>
          To clear progress stored only on your device, sign out on the website or clear its site data,
          and delete the iOS app from your iPhone. Can’t sign in? Email{" "}
          <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> from your account’s email address to request
          deletion. Details are in the {pageLink("privacy", "Privacy Policy")}.
        </p>
      </section>

      <section className="support-section support-version" aria-labelledby="support-version">
        <h2 id="support-version">App version</h2>
        <dl>
          <div>
            <dt>iOS app</dt>
            <dd>Version {IOS_APP_VERSION} beta. In TestFlight, tap Chess Universe to see the exact version and build.</dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>Always the latest release. Reopen the site to pick up updates.</dd>
          </div>
        </dl>
      </section>
    </article>
  );
}
