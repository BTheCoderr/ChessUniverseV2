import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { clearLocalPlayerData } from "../lib/localPlayerData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { rankForRating } from "../lib/progression";
import { ProfileTrophyCase } from "./ProfileTrophyCase";

type Props = {
  session: Session | null;
  recoveryMode?: boolean;
  onRecoveryComplete?: () => void;
};

type Profile = {
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
};

const PRODUCTION_SITE_URL = "https://chessuniverse.netlify.app";

export function AuthPanel({ session, recoveryMode = false, onRecoveryComplete }: Props) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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
        <p>Add the production Supabase environment variables in Netlify to enable accounts and online play.</p>
      </div>
    );
  }

  if (session && recoveryMode) {
    const updatePassword = async (event: React.FormEvent) => {
      event.preventDefault();
      setMessage("");

      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage(error.message);
        return;
      }

      setNewPassword("");
      setMessage("Password updated.");
      onRecoveryComplete?.();
    };

    return (
      <form className="card auth-card" onSubmit={updatePassword}>
        <div className="eyebrow">ACCOUNT RECOVERY</div>
        <h2>Choose a new password</h2>
        <p className="muted">You opened a valid password recovery link.</p>
        <input
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          type="password"
          placeholder="New password"
          minLength={8}
          required
        />
        <button className="primary-action" type="submit">Update password</button>
        {message ? <p className="form-message">{message}</p> : null}
      </form>
    );
  }

  if (session) {
    const displayName =
      profile?.username ||
      session.user.user_metadata.username ||
      session.user.email?.split("@")[0] ||
      "Player";

    const gamesPlayed = profile ? profile.wins + profile.losses + profile.draws : 0;
    const winRate = profile && gamesPlayed > 0
      ? Math.round((profile.wins / gamesPlayed) * 100)
      : 0;
    const rank = rankForRating(profile?.rating ?? 1200);

    const deleteAccount = async () => {
      if (deleteConfirm !== "DELETE") return;
      setDeleting(true);
      setMessage("");

      const { error } = await client.functions.invoke("delete-account", { body: {} });
      if (error) {
        setDeleting(false);
        setMessage(error.message);
        return;
      }

      clearLocalPlayerData();
      await client.auth.signOut({ scope: "local" });
      setDeleting(false);
    };

    return (
      <div className="card profile-card">
        <div className="eyebrow">PROFILE</div>
        <div className="profile-identity">
          <div>
            <h2>{profileLoading ? "Loading profile…" : displayName}</h2>
            <p>{session.user.email}</p>
          </div>
          {profile ? (
            <div className="profile-rank-stack">
              <span className="rank-pill">{rank.name}</span>
              <span className="rating-pill">{profile.rating}</span>
            </div>
          ) : null}
        </div>

        {profile ? (
          <>
            <div className="profile-rank-progress">
              <div>
                <strong>{rank.name}</strong>
                <span>{rank.next ? `${rank.pointsToNext} rating to ${rank.next.name}` : "Highest rank reached"}</span>
              </div>
              <div className="rank-progress-track" aria-label="Rank progress">
                <span style={{ width: `${rank.progress}%` }} />
              </div>
            </div>
            <div className="profile-stats profile-stats-expanded" aria-label="Player stats">
            <div><strong>{profile.wins}</strong><span>Wins</span></div>
            <div><strong>{profile.losses}</strong><span>Losses</span></div>
            <div><strong>{profile.draws}</strong><span>Draws</span></div>
            <div><strong>{gamesPlayed}</strong><span>Games</span></div>
            <div><strong>{winRate}%</strong><span>Win rate</span></div>
            </div>
          </>
        ) : (
          <p className="muted">Signed in and ready for online play.</p>
        )}

        <ProfileTrophyCase userId={session.user.id} editable />

        <button className="secondary-action profile-signout" onClick={() => void client.auth.signOut()}>
          Sign out
        </button>

        <div className="danger-zone">
          <div>
            <strong>Delete account</strong>
            <p>
              Deletes your Chess Universe account and synced personal progress. Completed matches
              stay in de-identified form so an opponent does not lose their game history.
            </p>
          </div>
          <label>
            Type DELETE to confirm
            <input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </label>
          <button
            className="secondary-action danger-action"
            disabled={deleteConfirm !== "DELETE" || deleting}
            onClick={() => void deleteAccount()}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
          {message ? <p className="form-message">{message}</p> : null}
        </div>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (mode === "forgot") {
      const redirectTo = import.meta.env.PROD
        ? PRODUCTION_SITE_URL
        : window.location.origin;

      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      setMessage(
        error?.message ??
          "If that email belongs to an account, check your inbox for the recovery link."
      );
      return;
    }

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
      return;
    }

    const { error } = await client.auth.signInWithPassword({ email, password });
    setMessage(error?.message ?? "Signed in.");
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <div className="eyebrow">ACCOUNT</div>
      <h2>
        {mode === "signin"
          ? "Welcome back"
          : mode === "signup"
            ? "Join Chess Universe"
            : "Reset your password"}
      </h2>

      {mode === "signup" ? (
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          minLength={3}
          maxLength={24}
          required
        />
      ) : null}

      <input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        placeholder="Email"
        required
      />

      {mode !== "forgot" ? (
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Password"
          minLength={8}
          required
        />
      ) : null}

      <button className="primary-action" type="submit">
        {mode === "signin"
          ? "Sign in"
          : mode === "signup"
            ? "Create account"
            : "Send recovery link"}
      </button>

      {mode === "signin" ? (
        <>
          <button className="text-button" type="button" onClick={() => setMode("forgot")}>
            Forgot password?
          </button>
          <button className="text-button" type="button" onClick={() => setMode("signup")}>
            Need an account? Sign up
          </button>
        </>
      ) : (
        <button className="text-button" type="button" onClick={() => setMode("signin")}>
          Back to sign in
        </button>
      )}

      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
