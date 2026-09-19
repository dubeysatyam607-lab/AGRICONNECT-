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
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const Hero3D: React.FC = () => {
  const {
    state,
    isReducedMotion,
    handleSceneReady,
    handleSceneError,
    handleRetry,
  } = useHero3DController();

  const is3DActive = state.status === "READY" || state.status === "DEGRADED";
  const showFallbackOnly = state.status === "UNSUPPORTED" || state.status === "FAILED";

  if (showFallbackOnly) {
    return (
      <HeroFallback />
    );
  }

  return (
    <Hero3DErrorBoundary
      fallback={<HeroFallback />}
      onError={() => handleSceneError("SHADER_FAILED")}
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10" aria-hidden="true">
        {/* First-Paint Fallback — always present initially, smoothly fades out over 600ms when 3D is ready */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            is3DActive ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <HeroFallback />
        </div>

        {/* 3D Canvas — smoothly fades in over 600ms when ready */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            is3DActive ? "opacity-100" : "opacity-0"
          }`}
        >
          <Suspense fallback={null}>
            <Canvas
              camera={{ position: [0, 0.5, 3], fov: 45 }}
              className="pointer-events-none h-full w-full"
              style={{ pointerEvents: "none" }}
              gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
              onCreated={() => {
                handleSceneReady();
              }}
            >
              <HeroFarmScene isReducedMotion={isReducedMotion} />
            </Canvas>
          </Suspense>
        </div>

        {/* Agricultural data scan line */}
        <div className="animate-field-scan pointer-events-none absolute inset-x-2 h-px bg-white/50" />
      </div>
    </Hero3DErrorBoundary>
  );
};

export default Hero3D;
