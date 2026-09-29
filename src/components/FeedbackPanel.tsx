import { useState } from "react";
import { supabase } from "../lib/supabase";

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

  if (!userId || !supabase) {
    return (
      <section className="card feedback-page">
        <button className="text-button back-link" onClick={onBack}>← Back</button>
        <div className="eyebrow">BETA FEEDBACK</div>
        <h1>Help us make it better.</h1>
        <p>Sign in first so we can tie a bug report to the right beta session.</p>
        <button className="primary-action" onClick={onSignIn}>Sign in</button>
      </section>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = message.trim();
    if (clean.length < 10) {
      setStatus("Give us a little more detail so we can reproduce it.");
      return;
    }

    setSending(true);
    setStatus("");

    const { error } = await supabase.from("beta_feedback").insert({
      user_id: userId,
      category,
      message: clean,
      app_view: appView,
      user_agent: navigator.userAgent.slice(0, 500),
    });

    setSending(false);
    if (error) {
      setStatus(error.message);
      return;
    }

    setMessage("");
    setStatus("Sent. Thank you — this is exactly what the beta is for.");
  };

  return (
    <section className="card feedback-page">
      <button className="text-button back-link" onClick={onBack}>← Back</button>
      <div className="eyebrow">BETA FEEDBACK</div>
      <h1>Help us break it.</h1>
      <p>Tell us what broke, felt confusing, or would make Chess Universe better.</p>

      <form className="feedback-form" onSubmit={submit}>
        <label>
          What kind of feedback?
          <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
            <option value="bug">Something broke</option>
            <option value="confusing">Something was confusing</option>
            <option value="idea">I have an idea</option>
            <option value="other">Something else</option>
          </select>
        </label>

        <label>
          What happened?
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            minLength={10}
            maxLength={2000}
            rows={8}
            placeholder="What were you trying to do? What happened instead?"
            required
          />
        </label>

        <button className="primary-action" type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send feedback"}
        </button>
        {status ? <p className="form-message">{status}</p> : null}
      </form>
    </section>
  );
}
