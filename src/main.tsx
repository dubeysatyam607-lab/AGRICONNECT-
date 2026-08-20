import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeDIContainer } from "./core/di/init";
import { initAnalytics } from "./lib/analytics";
import { initGoogleAnalytics } from "./lib/google-analytics";
import { crashLoggingService } from "./core/services/CrashLoggingService";

// 1. Initialize Enterprise Dependency Injection Container (Service Locator)
initializeDIContainer();

// 1b. Bootstrap analytics (GA4 / GTM)
// initGoogleAnalytics() removed — it duplicates initAnalytics() and overwrites gtag.
// Configure VITE_GA4_ID=G-548945014 in .env to enable GA4 via initAnalytics().
initAnalytics();

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

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[ErrorBoundary] App crashed:", error, info);
    crashLoggingService.logCrash(error, "RootErrorBoundary");
  }

  render() {
    if (this.state.hasError) {
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
          <div style={{ fontSize: "40px" }}>🌱</div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: "14px", margin: 0, color: "#57534e" }}>
            Please reload the page. If it keeps happening, check your connection.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "8px",
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
