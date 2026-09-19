import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import {
  hero3DReducer,
  initialHero3DState,
  type Hero3DMachineState,
  type Hero3DEvent,
} from "./hero3d-state";

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

export function useHero3DController() {
  const [state, dispatch] = useReducer(hero3DReducer, initialHero3DState);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const generationRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    const gen = ++generationRef.current;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();

    dispatch({ type: "MOUNT", timestamp: now });
    dispatch({ type: "START_WEBGL_CHECK" });

    // WebGL support check
    if (!isWebGLAvailable()) {
      if (isMountedRef.current && generationRef.current === gen) {
        dispatch({ type: "WEBGL_UNSUPPORTED" });
      }
    } else {
      if (isMountedRef.current && generationRef.current === gen) {
        dispatch({ type: "WEBGL_READY", timestamp: typeof performance !== "undefined" ? performance.now() : Date.now() });
      }
    }

    return () => {
      isMountedRef.current = false;
      dispatch({ type: "UNMOUNT" });
    };
  }, []);

  // Listen for prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsReducedMotion(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  const handleSceneReady = useCallback(() => {
    if (!isMountedRef.current) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    dispatch({ type: "ASSETS_READY", timestamp: now });
  }, []);

  const handleSceneError = useCallback((errorCode?: string) => {
    if (!isMountedRef.current) return;
    dispatch({
      type: "RUNTIME_ERROR",
      errorCode: errorCode as any ?? "UNKNOWN",
    });
  }, []);

  const handleRetry = useCallback(() => {
    if (!isMountedRef.current) return;
    const gen = ++generationRef.current;
    dispatch({ type: "RETRY_REQUESTED" });

    if (!isWebGLAvailable()) {
      if (isMountedRef.current && generationRef.current === gen) {
        dispatch({ type: "WEBGL_UNSUPPORTED" });
      }
    } else {
      if (isMountedRef.current && generationRef.current === gen) {
        dispatch({ type: "WEBGL_READY", timestamp: typeof performance !== "undefined" ? performance.now() : Date.now() });
      }
    }
  }, []);

  return {
    state,
    isReducedMotion,
    handleSceneReady,
    handleSceneError,
    handleRetry,
  };
}

export default useHero3DController;
