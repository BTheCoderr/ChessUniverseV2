import { useState } from "react";
import { supabase } from "../lib/supabase";
import { NETLIFY_FEEDBACK_FORM, submitNetlifyFeedback } from "../lib/netlifyFeedback";

type Props = {
  userId?: string | null;
  appView: string;
  onBack: () => void;
  onSignIn: () => void;
};

type Category = "bug" | "idea" | "confusing" | "other";

export function FeedbackPanel({ userId, appView, onBack, onSignIn }: Props) {
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const client = supabase;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = message.trim();
    if (clean.length < 10) {
      setStatus("Give us a little more detail so we can reproduce it.");
      return;
    }

    setSending(true);
    setStatus("");

    let sentThroughAccount = false;

    if (userId && client) {
      const { error } = await client.from("beta_feedback").insert({
        user_id: userId,
        category,
        message: clean,
        app_view: appView,
        user_agent: navigator.userAgent.slice(0, 500),
      });
      sentThroughAccount = !error;
    }

    if (!sentThroughAccount) {
      try {
        await submitNetlifyFeedback({
          category,
          message: clean,
          appView,
          userAgent: navigator.userAgent.slice(0, 500),
        });
      } catch (error) {
        setSending(false);
        setStatus(error instanceof Error ? error.message : "Could not send feedback.");
        return;
      }
    }

    setSending(false);
    setMessage("");
    setStatus(
      sentThroughAccount
        ? "Sent. Thank you — this report is attached to your beta account."
        : "Sent through the public feedback channel. Thank you — this is exactly what the beta is for."
    );
  };

  return (
    <section className="card feedback-page">
      <button className="text-button back-link" onClick={onBack}>← Back</button>
      <div className="eyebrow">BETA FEEDBACK</div>
      <h1>Help us break it.</h1>
      <p>Tell us what broke, felt confusing, or would make Chess Universe better.</p>
      {!userId ? (
        <div className="feedback-public-note">
          <strong>No sign-in required.</strong>
          <span>Your report will use the public Netlify feedback channel. Sign in only if you want the report tied to your beta account.</span>
          <button className="text-button" type="button" onClick={onSignIn}>Sign in instead</button>
        </div>
      ) : null}

      <form
        className="feedback-form"
        name={NETLIFY_FEEDBACK_FORM}
        method="POST"
        data-netlify="true"
        netlify-honeypot="bot-field"
        onSubmit={submit}
      >
        <input type="hidden" name="form-name" value={NETLIFY_FEEDBACK_FORM} />
        <p className="visually-hidden" aria-hidden="true">
          <label>
            Leave this field empty
            <input name="bot-field" tabIndex={-1} autoComplete="off" />
          </label>
        </p>
        <label>
          What kind of feedback?
          <select name="category" value={category} onChange={(event) => setCategory(event.target.value as Category)}>
            <option value="bug">Something broke</option>
            <option value="confusing">Something was confusing</option>
            <option value="idea">I have an idea</option>
            <option value="other">Something else</option>
          </select>
        </label>

        <label>
          What happened?
          <textarea
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            minLength={10}
            maxLength={2000}
            rows={8}
            placeholder="What were you trying to do? What happened instead?"
            required
          />
        </label>

        <input type="hidden" name="app_view" value={appView} />
        <input type="hidden" name="user_agent" value={typeof navigator === "undefined" ? "" : navigator.userAgent.slice(0, 500)} />

        <button className="primary-action" type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send feedback"}
        </button>
        {status ? <p className="form-message">{status}</p> : null}
      </form>
    </section>
  );
}
