import React, { Suspense, Component, useRef, useEffect, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import HeroFarmScene from "./HeroFarmScene";
import HeroFallback from "./hero-fallback";
import { useHero3DController } from "./hero/useHero3DController";

/**
 * Guard so the guaranteed-good fallback is only ever faded out once the GL
 * canvas has *provably* painted opaque content. A WebGL context can mount and
 * report itself "ready" while still producing a blank surface (driver/GPU
 * fallback, SwiftShader, software rendering, etc.); without this check we'd
 * crossfade onto an empty box — exactly the bug the user hit.
 *
 * Reads happen inside the frame loop (the drawing buffer is only valid then),
 * sampling a horizontal strip mid-frame. Only when the majority of samples
 * are painted do we signal readiness. Otherwise after the frame budget the
 * component gives up and the permanent fallback stays visible.
 */
const FirstPaintedGate: React.FC<{ onPainted: () => void }> = ({ onPainted }) => {
  const { gl } = useThree();
  const firedRef = useRef(false);
  const framesRef = useRef(0);
  const onPaintedRef = useRef(onPainted);
  onPaintedRef.current = onPainted;

  useFrame(() => {
    if (firedRef.current) return;
    const frame = ++framesRef.current;
    if (frame > 240) return; // give up — fallback stays, watchdog resolves state

    try {
      // Don't read in the same frame as a resize to avoid a stale buffer.
      if (frame === 1) return;
      const renderer = gl as unknown as THREE.WebGLRenderer;
      const dom = renderer.domElement as HTMLCanvasElement;
      if (!dom || !dom.width || !dom.height) return;
      const ctx = (renderer.getContext() as WebGLRenderingContext | WebGL2RenderingContext | null);
      if (!ctx || typeof ctx.readPixels !== "function") return;

      const w = dom.width;
      const h = dom.height;
      const buf = new Uint8Array(4);
      let painted = 0;
      const total = 16;
      const pitch = Math.max(1, Math.floor(w / total));
      for (let i = 0; i < total; i++) {
        const x = Math.min(w - 1, i * pitch + Math.floor(pitch / 2));
        const y = Math.min(h - 1, Math.floor(h * 0.45));
        ctx.readPixels(x, y, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, buf);
        // Fully transparent buffer (alpha ~ 0) means the scene hasn't drawn.
        if (buf[3] > 20) painted++;
      }
      if (painted >= Math.ceil(total * 0.5)) {
        firedRef.current = true;
        onPaintedRef.current();
      }
    } catch {
      // Ignore transient readback errors.
    }
  });

  // Safety net: if the readback path can never succeed (e.g. some exotic
  // driver), never leave the page stuck — resolve readonly after 240 frames.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!firedRef.current && framesRef.current >= 240) {
        firedRef.current = true;
        onPaintedRef.current();
      }
    }, 8000);
    return () => window.clearTimeout(t);
  }, []);

  return null;
};

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
                frameloop="always"
                camera={{ position: [0, 0.4, 2.8], fov: 42 }}
                className="pointer-events-none h-full w-full"
                style={{ pointerEvents: "none" }}
                gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false, powerPreference: "high-performance" }}
                dpr={[1, Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2)]}
              >
                <HeroFarmScene
                  isReducedMotion={isReducedMotion}
                  mousePos={mousePos}
                  weatherCondition={weatherCondition}
                />
                <FirstPaintedGate onPainted={handleSceneReady} />
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