export const NETLIFY_FEEDBACK_FORM = "chess-universe-feedback";

export type PublicFeedbackPayload = {
  category: "bug" | "idea" | "confusing" | "other";
  message: string;
  appView: string;
  userAgent: string;
};

export async function submitNetlifyFeedback(payload: PublicFeedbackPayload) {
  const body = new URLSearchParams({
    "form-name": NETLIFY_FEEDBACK_FORM,
    "bot-field": "",
    category: payload.category,
    message: payload.message,
    app_view: payload.appView,
    user_agent: payload.userAgent,
  });

  const response = await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("The public feedback channel could not accept this report.");
  }
}
