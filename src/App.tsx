import { Suspense, lazy, useState, useRef, useEffect } from "react";
import { LocationProvider } from '@/features/location/LocationContext';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChunkErrorBoundary } from "@/components/ui/ChunkErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import { RoleProvider } from "@/contexts/RoleContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RequireAdmin } from "@/core/auth/RequireAdmin";
import MarketingLayout from "./shared/layouts/MarketingLayout";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support-config";
import { LoginPage, RegisterPage, OtpPage, ForgotPasswordPage, ResetPasswordPage } from "@/pages/auth/AuthWrappers";
import { AuthCallback } from "@/pages/auth/AuthCallback";

// SEO / Marketing Pages (code-split for performance)
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const StateLanding = lazy(() => import("./pages/StateLanding"));
const Features = lazy(() => import("./pages/Features"));
const KnowledgeHub = lazy(() => import("./pages/KnowledgeHub"));
const Blog = lazy(() => import("./pages/Blog"));
const FutureFarming = lazy(() => import("./pages/FutureFarming"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));

// Admin Console (code-split — only reachable by role-gated /admin route)
const AdminDashboard = lazy(() => import("@/features/admin/presentation/AdminDashboard"));

// Auth / Onboarding flow (code-split — off the startup critical path)
const Login = lazy(() => import("./pages/Login"));

// Enterprise Architecture Foundations
import { ThemeManagerProvider } from "@/core/theme/ThemeManager";
import { SnackbarContainer } from "@/core/services/SnackbarService";
import { DialogContainer } from "@/core/services/DialogService";
import { OfflineBanner } from "@/shared/states/OfflineState";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: true,
    },
  },
});

const BTN_SIZE = 60;
const BTN_MARGIN = 8;
const BOTTOM_OFFSET = 80; // clears the bottom nav bar
const POS_KEY = "agri_whatsapp_pos";

const defaultPos = () => ({
  x: typeof window === "undefined" ? 0 : window.innerWidth - BTN_SIZE - 16,
  y: typeof window === "undefined" ? 0 : window.innerHeight - BTN_SIZE - BOTTOM_OFFSET,
});

const FloatingWhatsApp = () => {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return defaultPos();
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          return { x: parsed.x, y: parsed.y };
        }
      }
    } catch {
      // ignore malformed saved position
    }
    return defaultPos();
  });
  const drag = useRef<{ id: number; startX: number; startY: number; btnX: number; btnY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const btnRef = useRef<HTMLAnchorElement | null>(null);

  const clamp = (x: number, y: number) => ({
    x: Math.max(BTN_MARGIN, Math.min(x, window.innerWidth - BTN_SIZE - BTN_MARGIN)),
    y: Math.max(BTN_MARGIN, Math.min(y, window.innerHeight - BTN_SIZE - BTN_MARGIN)),
  });

  const applyDrag = (clientX: number, clientY: number) => {
    const d = drag.current;
    if (!d) return;
    const dx = clientX - d.startX;
    const dy = clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 8) return; // still a tap, not a drag
    d.moved = true;
    setPos(clamp(d.btnX + dx, d.btnY + dy));
  };

  const endDrag = () => {
    if (drag.current?.moved) {
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 100);
    }
    drag.current = null;
  };

  // Persist the dragged position so it stays where the user put it.
  useEffect(() => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(pos));
    } catch {
      // storage unavailable (private mode) — ignore
    }
  }, [pos]);

  // Clamp the restored position on mount (viewport may differ from when saved).
  useEffect(() => {
    setPos((p) => clamp(p.x, p.y));
  }, []);

  // Keep the button on-screen if the viewport resizes (rotation, address bar, etc.)
  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Track moves/ups at the window level so the drag keeps working even if the
  // pointer leaves the small button and element-level pointer capture is
  // unsupported (older iOS WebViews, etc.).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      applyDrag(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      const d = drag.current;
      if (d && d.id === e.pointerId) endDrag();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Touch-event fallback for browsers/WebViews without PointerEvent support.
  useEffect(() => {
    if (typeof window !== "undefined" && "PointerEvent" in window) return;
    const onTouchStart = (e: TouchEvent) => {
      const btn = btnRef.current;
      if (!btn || !e.touches[0]) return;
      const t = e.touches[0];
      const rect = btn.getBoundingClientRect();
      if (t.clientX < rect.left || t.clientX > rect.right || t.clientY < rect.top || t.clientY > rect.bottom) return;
      drag.current = { id: 1, startX: t.clientX, startY: t.clientY, btnX: pos.x, btnY: pos.y, moved: false };
      suppressClick.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!drag.current) return;
      e.preventDefault();
      const t = e.touches[0];
      applyDrag(t.clientX, t.clientY);
    };
    const onTouchEnd = () => endDrag();
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (!e.isPrimary) return;
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      btnX: pos.x,
      btnY: pos.y,
      moved: false,
    };
    suppressClick.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture not supported — window-level move/up listeners still track the drag
    }
  };

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  };

  return (
    <aside aria-label="WhatsApp support" className="contents">
      <a
        ref={btnRef}
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Contact Agricultural Helpdesk on WhatsApp (drag to move, tap to chat)"
        onClick={onClick}
        onPointerDown={onPointerDown}
        className="fixed z-50 bg-[#25D366] text-white p-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border-2 border-white/20 cursor-grab active:cursor-grabbing select-none touch-none"
        style={{ left: pos.x, top: pos.y, width: BTN_SIZE, height: BTN_SIZE }}
      >
        <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" draggable={false} className="pointer-events-none">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      </a>
    </aside>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeManagerProvider defaultTheme="light">
      <AuthProvider>
        <LanguageProvider>
          <RoleProvider>
            <LocationProvider>
              <TooltipProvider>
              {/* Enterprise UI Containers */}
              <OfflineBanner />
              <SnackbarContainer />
              <DialogContainer />
              <Toaster />
              <Sonner />
              
              <BrowserRouter>
                <ScrollToTop />
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
                >
                  Skip to main content
                </a>
                <FloatingWhatsApp />
                <Routes>
                  {/* ── Auth Routes ─────────────────────────── */}
                  {/* Premium WelcomeFlow: Splash → Language → Onboarding →
                      Login/OTP → Farmer Profile Setup → Dashboard */}
                  <Route path="/auth/login" element={<SafeLazy><LoginPage /></SafeLazy>} />
                <Route path="/auth/register" element={<SafeLazy><RegisterPage /></SafeLazy>} />
                <Route path="/auth/otp" element={<SafeLazy><OtpPage /></SafeLazy>} />
                <Route path="/auth/forgot" element={<SafeLazy><ForgotPasswordPage /></SafeLazy>} />
                <Route path="/auth/reset" element={<SafeLazy><ResetPasswordPage /></SafeLazy>} />
                <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* ── Core App / Public Landing ───────────── */}
                  {/* Authenticated farmers → app dashboard; anonymous
                      visitors & crawlers → indexable SEO landing. */}
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/market" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/ai" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/services" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/wallet" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/farm" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/crop-scan" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/mandi" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/agri-store" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/machinery" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/schemes" element={<ProtectedRoute><Index /></ProtectedRoute>} />

                  {/* ── SEO / Marketing Pages ───────────────── */}
                  <Route path="/about" element={<SafeLazy><MarketingLayout><About /></MarketingLayout></SafeLazy>} />
                  <Route path="/contact" element={<SafeLazy><MarketingLayout><Contact /></MarketingLayout></SafeLazy>} />
                  <Route path="/faq" element={<SafeLazy><MarketingLayout><FAQ /></MarketingLayout></SafeLazy>} />
                  <Route path="/pricing" element={<SafeLazy><MarketingLayout><Pricing /></MarketingLayout></SafeLazy>} />
                  <Route path="/privacy-policy" element={<SafeLazy><MarketingLayout><PrivacyPolicy /></MarketingLayout></SafeLazy>} />
                  <Route path="/terms" element={<SafeLazy><MarketingLayout><Terms /></MarketingLayout></SafeLazy>} />
                  <Route path="/features" element={<SafeLazy><MarketingLayout><Features /></MarketingLayout></SafeLazy>} />
                  <Route path="/knowledge-hub" element={<SafeLazy><MarketingLayout><KnowledgeHub /></MarketingLayout></SafeLazy>} />
                  <Route path="/blogs" element={<SafeLazy><MarketingLayout><Blog /></MarketingLayout></SafeLazy>} />
<Route path="/blogs/future-of-farming" element={<SafeLazy><MarketingLayout><FutureFarming /></MarketingLayout></SafeLazy>} />
                  <Route path="/help-center" element={<SafeLazy><MarketingLayout><HelpCenter /></MarketingLayout></SafeLazy>} />

                  {/* ── Local SEO Landing Pages ─────────────── */}
                  {/* Mandi Prices / Schemes by State */}
                  <Route path="/mandi-prices/:slug" element={<SafeLazy><MarketingLayout><StateLanding /></MarketingLayout></SafeLazy>} />
                  <Route path="/schemes/:slug" element={<SafeLazy><MarketingLayout><StateLanding /></MarketingLayout></SafeLazy>} />
                  {/* Weather / Tractor Rental by City */}
                  <Route path="/weather/:slug" element={<SafeLazy><MarketingLayout><StateLanding /></MarketingLayout></SafeLazy>} />
                  <Route path="/tractor-rental/:slug" element={<SafeLazy><MarketingLayout><StateLanding /></MarketingLayout></SafeLazy>} />

                  {/* ── Admin Console (role-gated) ─────────────── */}
                  <Route path="/admin" element={<ProtectedRoute><RequireAdmin><SafeLazy><AdminDashboard /></SafeLazy></RequireAdmin></ProtectedRoute>} />
<Route path="/admin/*" element={<ProtectedRoute><RequireAdmin><SafeLazy><AdminDashboard /></SafeLazy></RequireAdmin></ProtectedRoute>} />

                  {/* ── 404 ─────────────────────────────────── */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
            </LocationProvider>
          </RoleProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeManagerProvider>
  </QueryClientProvider>
);

/** Lightweight loading fallback for lazy SEO pages. */
const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <span className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      <span className="text-sm text-muted-foreground font-medium">Loading…</span>
    </div>
  </div>
);

/** Chunk-error-safe wrapper: a lazy feature failure never crashes the app. */
const SafeLazy = ({ children }: { children: React.ReactNode }) => (
  <ChunkErrorBoundary>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </ChunkErrorBoundary>
);

export default App;
