import React, { Suspense, Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import HeroFarmScene from "./HeroFarmScene";
import HeroFallback from "./hero-fallback";
import { useHero3DController } from "./hero/useHero3DController";

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
  onError?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class Hero3DErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[Hero3D] WebGL / 3D Canvas rendering issue caught silently:", error);
    if (this.props.onError) {
      setTimeout(() => {
        try { this.props.onError?.(); } catch { /* ignore */ }
      }, 0);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface Hero3DProps {
  mousePos?: { x: number; y: number };
  weatherCondition?: string;
}

const Hero3DInner: React.FC<Hero3DProps> = ({
  mousePos = { x: 0, y: 0 },
  weatherCondition = "",
}) => {
  const {
    state,
    isReducedMotion,
    handleSceneReady,
    handleSceneError,
  } = useHero3DController();

  // Once WebGL is confirmed, the Canvas may initialize and report readiness
  // through its own onCreated callback (breaking the old mount deadlock).
  const canMountCanvas = state.webglReady;

  // The 3D scene is live only after ASSETS_READY resolves.
  const is3DActive = state.status === "READY" || state.status === "DEGRADED";
  const showFallback = !is3DActive;

  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden="true">
      {/* Permanent agricultural base layer — never a blank box. Crossfades out
          only once the live 3D scene is confirmed on screen. */}
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{ opacity: showFallback ? 1 : 0 }}
      >
        <HeroFallback weatherCondition={weatherCondition} />
      </div>

      {canMountCanvas && (
        <Hero3DErrorBoundary
          fallback={<HeroFallback weatherCondition={weatherCondition} />}
          onError={() => handleSceneError("SHADER_FAILED")}
        >
          <div
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{ opacity: is3DActive ? 1 : 0 }}
          >
            <Suspense fallback={null}>
              <Canvas
                camera={{ position: [0, 0.4, 2.8], fov: 42 }}
                className="pointer-events-none h-full w-full"
                style={{ pointerEvents: "none" }}
                gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false, powerPreference: "high-performance" }}
                dpr={[1, Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2)]}
                onCreated={() => {
                  // Only report ready once the GL loop has actually painted a
                  // frame — otherwise we'd crossfade onto a blank surface.
                  let raf = 0;
                  const paintAndReady = () => {
                    if (++raf < 2) {
                      requestAnimationFrame(paintAndReady);
                      return;
                    }
                    handleSceneReady();
                  };
                  requestAnimationFrame(paintAndReady);
                }}
              >
                <HeroFarmScene
                  isReducedMotion={isReducedMotion}
                  mousePos={mousePos}
                  weatherCondition={weatherCondition}
                />
              </Canvas>
            </Suspense>
          </div>
        </Hero3DErrorBoundary>
      )}

      {/* Agricultural live telemetry boundary scan line */}
      <div className="animate-field-scan pointer-events-none absolute inset-x-2 h-px bg-[#00C26E]/40" />
    </div>
  );
};

export const Hero3D: React.FC<Hero3DProps> = (props) => {
  return (
    <Hero3DErrorBoundary fallback={<HeroFallback weatherCondition={props.weatherCondition} />}>
      <Hero3DInner {...props} />
    </Hero3DErrorBoundary>
  );
};

export default Hero3D;