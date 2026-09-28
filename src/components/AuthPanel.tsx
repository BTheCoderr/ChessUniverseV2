import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Props = { session: Session | null };

type Profile = {
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
};

const PRODUCTION_SITE_URL = "https://chessuniverse.netlify.app";

export function AuthPanel({ session }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const client = supabase;

  useEffect(() => {
    if (!client || !session) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    void client
      .from("profiles")
      .select("username,rating,wins,losses,draws")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setProfile(data as Profile);
        else setProfile(null);
        setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, session?.user.id]);

  if (!isSupabaseConfigured || !client) {
    return (
      <div className="card">
        <div className="eyebrow">ACCOUNT</div>
        <h2>Supabase connection needed</h2>
        <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in Netlify to enable accounts and online play.</p>
      </div>
    );
  }

  if (session) {
    const displayName =
      profile?.username ||
      session.user.user_metadata.username ||
      session.user.email?.split("@")[0] ||
      "Player";

    return (
      <div className="card profile-card">
        <div className="eyebrow">PROFILE</div>
        <div className="profile-identity">
          <div>
            <h2>{profileLoading ? "Loading profile…" : displayName}</h2>
            <p>{session.user.email}</p>
          </div>
          {profile ? <span className="rating-pill">{profile.rating}</span> : null}
        </div>

        {profile ? (
          <div className="profile-stats" aria-label="Player stats">
            <div><strong>{profile.wins}</strong><span>Wins</span></div>
            <div><strong>{profile.losses}</strong><span>Losses</span></div>
            <div><strong>{profile.draws}</strong><span>Draws</span></div>
          </div>
        ) : (
          <p className="muted">Signed in and ready for online play.</p>
        )}

        <button className="secondary-action profile-signout" onClick={() => void client.auth.signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (mode === "signup") {
      const emailRedirectTo = import.meta.env.PROD
        ? PRODUCTION_SITE_URL
        : window.location.origin;

      const { error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo,
        },
      });
      setMessage(error?.message ?? "Account created. Check your email if confirmation is enabled.");
    } else {
      const { error } = await client.auth.signInWithPassword({ email, password });
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
