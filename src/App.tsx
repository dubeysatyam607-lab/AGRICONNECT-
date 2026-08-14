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

const FloatingWhatsApp = () => {
  const [pos, setPos] = useState(() => ({
    x: typeof window === "undefined" ? 0 : window.innerWidth - BTN_SIZE - 16,
    y: typeof window === "undefined" ? 0 : window.innerHeight - BTN_SIZE - BOTTOM_OFFSET,
  }));
  const drag = useRef<{ id: number; startX: number; startY: number; btnX: number; btnY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const clamp = (x: number, y: number) => ({
    x: Math.max(BTN_MARGIN, Math.min(x, window.innerWidth - BTN_SIZE - BTN_MARGIN)),
    y: Math.max(BTN_MARGIN, Math.min(y, window.innerHeight - BTN_SIZE - BTN_MARGIN)),
  });

  // Keep the button on-screen if the viewport resizes (rotation, address bar, etc.)
  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLAnchorElement>) => {
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      btnX: pos.x,
      btnY: pos.y,
      moved: false,
    };
    suppressClick.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 8) return; // still a tap, not a drag
    d.moved = true;
    setPos(clamp(d.btnX + dx, d.btnY + dy));
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (d && d.moved) suppressClick.current = true; // dragged → don't open WhatsApp
    drag.current = null;
  };

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (suppressClick.current) {
      e.preventDefault();
      suppressClick.current = false;
    }
  };

  return (
    <aside aria-label="WhatsApp support" className="contents">
      <a
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Contact Agricultural Helpdesk on WhatsApp (drag to move, tap to chat)"
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="fixed z-50 bg-[#25D366] text-white p-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border-2 border-white/20 cursor-grab active:cursor-grabbing select-none touch-none"
        style={{ left: pos.x, top: pos.y, width: BTN_SIZE, height: BTN_SIZE }}
      >
        <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" draggable={false}>
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
                  <Route path="/login" element={<SafeLazy><Login /></SafeLazy>} />
                  <Route path="/auth" element={<SafeLazy><Login /></SafeLazy>} />
                  <Route path="/welcome" element={<SafeLazy><Login /></SafeLazy>} />
                  <Route path="/onboarding" element={<SafeLazy><Login /></SafeLazy>} />

                  {/* ── Core App / Public Landing ───────────── */}
                  {/* Authenticated farmers → app dashboard; anonymous
                      visitors & crawlers → indexable SEO landing. */}
                  <Route path="/" element={<Index />} />

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
