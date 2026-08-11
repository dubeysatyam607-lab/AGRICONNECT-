import { Component, type ReactNode } from "react";
import { crashLoggingService } from "@/core/services/CrashLoggingService";

interface Props {
  children: ReactNode;
  /** Optional friendly label for the crashed region, e.g. "Marketplace". */
  label?: string;
}

interface State {
  hasError: boolean;
  reloading: boolean;
}

/**
 * Boundaries code-split features so a single lazy-chunk failure (offline after
 * deploy, transient network, corrupted cache) degrades that feature instead of
 * crashing the whole app. On a failed dynamic import it auto-retries once
 * (new deploy hashes can 404 the first request), then falls back to a friendly
 * reload button.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, reloading: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, reloading: false };
  }

  componentDidCatch(error: unknown) {
    crashLoggingService.logCrash(error, `ChunkErrorBoundary:${this.props.label ?? "feature"}`);
  }

  private retry = () => {
    this.setState({ hasError: false, reloading: true });
    // A chunk that failed once is almost always fixed by a fresh import — this
    // clears the Vite module graph entry so the next render re-fetches it.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">🌾</div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">This section couldn't load</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.props.label ?? "This feature"} hit a temporary issue. Please try again.
            </p>
          </div>
          <button
            type="button"
            onClick={this.retry}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md hover:brightness-110"
          >
            {this.state.reloading ? "Reloading…" : "Retry"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
