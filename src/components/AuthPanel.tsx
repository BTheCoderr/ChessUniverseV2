import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Props = { session: Session | null };

export function AuthPanel({ session }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="card">
        <div className="eyebrow">ACCOUNT</div>
        <h2>Supabase connection needed</h2>
        <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in Netlify to enable accounts and online play.</p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="card">
        <div className="eyebrow">ACCOUNT</div>
        <h2>{session.user.user_metadata.username || session.user.email}</h2>
        <p>Signed in and ready for online play.</p>
        <button className="secondary-action" onClick={() => void supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      setMessage(error?.message ?? "Account created. Check your email if confirmation is enabled.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setMessage(error?.message ?? "Signed in.");
    }
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <div className="eyebrow">ACCOUNT</div>
      <h2>{mode === "signin" ? "Welcome back" : "Join Chess Universe"}</h2>
      {mode === "signup" ? (
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" minLength={3} maxLength={24} required />
      ) : null}
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" minLength={8} required />
      <button className="primary-action" type="submit">{mode === "signin" ? "Sign in" : "Create account"}</button>
      <button className="text-button" type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
