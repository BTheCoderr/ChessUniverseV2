import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { crashed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Chess Universe UI crash", error, info);
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    return (
      <main className="fatal-error-shell">
        <section className="card fatal-error-card">
          <div className="eyebrow">CHESS UNIVERSE</div>
          <h1>That screen crashed.</h1>
          <p>
            Your saved games and account are still there. Reload the app and try the move again.
          </p>
          <div className="hero-actions">
            <button className="primary-action" onClick={() => window.location.reload()}>
              Reload app
            </button>
            <button
              className="secondary-action"
              onClick={() => {
                try {
                  window.localStorage.removeItem("chess-universe-online-game");
                } catch {
                  // Reload is still available when storage is blocked.
                }
                window.location.reload();
              }}
            >
              Reload without saved table
            </button>
          </div>
        </section>
      </main>
    );
  }
}
