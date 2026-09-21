import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeDIContainer } from "./core/di/init";
import { initAnalytics } from "./lib/analytics";
import { initGoogleAnalytics } from "./lib/google-analytics";
import { crashLoggingService } from "./core/services/CrashLoggingService";

// 1. Initialize Enterprise Dependency Injection Container (Service Locator)
try {
  initializeDIContainer();
} catch (err) {
  console.warn('[Bootstrap] DI initialization warning:', err);
}

// 1b. Bootstrap analytics (GA4 / GTM)
try {
  initAnalytics();
} catch (err) {
  console.warn('[Bootstrap] Analytics initialization warning:', err);
}

// 1c. Check edge function deployment (logs warnings for missing functions)
import("./lib/check-edge-functions").then(({ checkEdgeFunctions }) => {
  checkEdgeFunctions();
}).catch(() => {
  // Best-effort — never block app startup
});

// 2. Register Service Worker for offline support in production only
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        if (import.meta.env.DEV) console.log('[ServiceWorker] Registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('[ServiceWorker] Registration warning:', error);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Unregister existing service workers in development mode to prevent stale HMR caching
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | unknown;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[ErrorBoundary] App crashed:", error, info);
    crashLoggingService.logCrash(error, "RootErrorBoundary");
  }

  handleClearAndReload = () => {
    try {
      sessionStorage.clear();
      // Keep essential tokens if needed or clear corrupted cached keys
      const keysToClear = ['agri_cache', 'weather:home', 'tractor_bookings_cache'];
      keysToClear.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore storage errors
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errMsg =
        this.state.error instanceof Error
          ? this.state.error.message
          : typeof this.state.error === 'string'
          ? this.state.error
          : null;

      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "24px",
          background: "#fafaf9",
          color: "#1c1917",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 20h10" />
            <path d="M12 17v3" />
            <path d="M16 3c-1.6 0-4 .7-5.2 2-1.2 1.3-1.8 3.7-1.8 5 1.6-.3 3.5-.3 4.9-1.3C11.5 9 9 8.6 6.6 9.4c0 2.4 1 4.6 3 6 1.4-.8 2.4-2.5 2.8-4.6.5-2.7 1.6-4.9 3.6-6.8z"/>
          </svg>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: "14px", margin: 0, color: "#57534e", maxWidth: "400px" }}>
            Please reload the page or return to the homepage. If it keeps happening, check your connection.
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: "999px",
                background: "#15803d",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
            <button
              onClick={this.handleClearAndReload}
              style={{
                padding: "10px 20px",
                border: "1px solid #d6d3d1",
                borderRadius: "999px",
                background: "#ffffff",
                color: "#1c1917",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go to Home
            </button>
          </div>
          {errMsg && (
            <details style={{ marginTop: "16px", maxWidth: "500px", textAlign: "left", fontSize: "12px", color: "#78716c" }}>
              <summary style={{ cursor: "pointer", marginBottom: "4px" }}>Error details</summary>
              <pre style={{ background: "#f5f5f4", padding: "8px 12px", borderRadius: "8px", overflowX: "auto" }}>
                {errMsg}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
