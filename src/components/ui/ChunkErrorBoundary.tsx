import { Component, type ReactNode } from "react";
import { Sprout } from "lucide-react";
import { crashLoggingService } from "@/core/services/CrashLoggingService";

interface Props {
  children: ReactNode;
  /** Optional friendly label for the crashed region, e.g. "Marketplace". */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
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
    this.state = { hasError: false, error: null, errorInfo: null, reloading: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    crashLoggingService.logCrash(error, `ChunkErrorBoundary:${this.props.label ?? "feature"}`);
    this.setState({ error, errorInfo });
    console.error("[ChunkErrorBoundary caught error]:", error, errorInfo);
  }

  private retry = () => {
    const isChunkError = this.state.error?.message?.includes("Failed to fetch dynamically imported module") ||
      this.state.error?.message?.includes("Importing a module script failed");
    this.setState({ hasError: false, error: null, errorInfo: null, reloading: false });
    if (isChunkError && typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center bg-destructive/5 rounded-2xl border border-destructive/20 m-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"><Sprout className="h-6 w-6 text-destructive" strokeWidth={1.6} /></div>
          <div className="max-w-xl text-left w-full">
            <h2 className="text-lg font-semibold text-destructive text-center">This section couldn't load ({this.props.label})</h2>
            <p className="mt-1 text-sm text-muted-foreground text-center">
              {this.props.label ?? "This feature"} hit an issue. Details below:
            </p>
            
            {/* DEBUG ERROR EXPOSURE */}
            <div className="mt-4 p-4 bg-background border border-destructive/30 rounded-lg text-xs font-mono overflow-auto max-h-96 text-foreground space-y-2">
              <div className="font-bold text-destructive">
                Error: {this.state.error?.name || "Error"} — {this.state.error?.message || "Unknown error"}
              </div>
              {this.state.error?.stack && (
                <div>
                  <div className="font-semibold text-muted-foreground mt-2">Stack Trace:</div>
                  <pre className="text-[11px] whitespace-pre-wrap opacity-90">{this.state.error.stack}</pre>
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <div>
                  <div className="font-semibold text-muted-foreground mt-2">Component Stack:</div>
                  <pre className="text-[11px] whitespace-pre-wrap opacity-90">{this.state.errorInfo.componentStack}</pre>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={this.retry}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md hover:brightness-110"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
