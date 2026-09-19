import React, { Suspense, Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import HeroFarmScene from "./HeroFarmScene";
import HeroFallback from "./hero-fallback";
import FarmSceneLoader from "./FarmSceneLoader";

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
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
    console.warn("[Hero3D] WebGL / 3D Canvas error caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export const Hero3D: React.FC = () => {
  if (typeof window === "undefined" || !isWebGLAvailable()) {
    return <HeroFallback />;
  }

  return (
    <Hero3DErrorBoundary fallback={<HeroFallback />}>
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10" aria-hidden="true">
        <Suspense fallback={<FarmSceneLoader />}>
          <Canvas
            camera={{ position: [0, 0.5, 3], fov: 45 }}
            className="pointer-events-none h-full w-full"
            style={{ pointerEvents: "none" }}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
          >
            <HeroFarmScene />
          </Canvas>
        </Suspense>
        {/* Subtle agricultural data scan line over the 3D scene */}
        <div className="animate-field-scan pointer-events-none absolute inset-x-2 h-px bg-white/50" />
      </div>
    </Hero3DErrorBoundary>
  );
};

export default Hero3D;
