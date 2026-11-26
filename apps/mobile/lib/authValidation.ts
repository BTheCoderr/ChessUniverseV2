export type AuthMode = "signin" | "signup" | "forgot";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side checks that mirror server constraints (profiles.username is
 * 3–24 characters; Supabase Auth requires an email and a 6+ character password).
 * Returns a user-facing message, or null when the form can be submitted.
 */
export function validateAuthInput(mode: AuthMode, email: string, password: string, username = ""): string | null {
  if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
  if (mode === "forgot") return null;
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (mode === "signup") {
    const name = username.trim();
    if (name.length < 3 || name.length > 24) return "Username must be 3 to 24 characters.";
  }
  return null;
}
