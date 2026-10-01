import { useState } from "react";
import { NETLIFY_FEEDBACK_FORM, submitNetlifyFeedback } from "../lib/netlifyFeedback";
import { supabase } from "../lib/supabase";

type Props = {
  userId?: string | null;
  appView: string;
  onBack: () => void;
};

type Category = "bug" | "idea" | "confusing" | "other";

export function FeedbackPanel({ userId, appView, onBack }: Props) {
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = message.trim();

    if (clean.length < 10) {
      setStatus("Give us a little more detail so we can reproduce it.");
      return;
    }

    setSending(true);
    setStatus("");

    let storedInSupabase = false;

    if (userId && supabase) {
      const { error } = await supabase.from("beta_feedback").insert({
        user_id: userId,
        category,
        message: clean,
        app_view: appView,
        user_agent: navigator.userAgent.slice(0, 500),
      });

      storedInSupabase = !error;
    }

    if (!storedInSupabase) {
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
      storedInSupabase
        ? "Sent. Thank you — this report is tied to your signed-in beta session."
        : "Sent through the public Netlify fallback. Thank you — this is exactly what the beta is for."
    );
  };

  return (
    <section className="card feedback-page">
      <button className="text-button back-link" onClick={onBack}>← Back</button>
      <div className="eyebrow">BETA FEEDBACK</div>
      <h1>Help us break it.</h1>
      <p>Tell us what broke, felt confusing, or would make Chess Universe better.</p>

      <div className="feedback-public-note">
        <strong>No sign-in required.</strong>
        <span>
          Signed-in reports stay linked to the beta session in Supabase. Signed-out reports — or reports sent while Supabase is unavailable — go through the public Netlify fallback.
        </span>
      </div>

      <form
        className="feedback-form"
        name={NETLIFY_FEEDBACK_FORM}
        method="POST"
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
        <input
          type="hidden"
          name="user_agent"
          value={typeof navigator === "undefined" ? "" : navigator.userAgent.slice(0, 500)}
        />

        <button className="primary-action" type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send feedback"}
        </button>
        {status ? <p className="form-message">{status}</p> : null}
      </form>
    </section>
  );
}
