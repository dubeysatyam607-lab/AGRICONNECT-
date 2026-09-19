// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  hero3DReducer,
  initialHero3DState,
  type Hero3DMachineState,
} from "./hero3d-state";

describe("Hero 3D Reducer — State Machine Transitions", () => {
  it("transitions INITIAL -> FALLBACK_VISIBLE on MOUNT", () => {
    const next = hero3DReducer(initialHero3DState, {
      type: "MOUNT",
      timestamp: 100,
    });
    expect(next.status).toBe("FALLBACK_VISIBLE");
    expect(next.startedAt).toBe(100);
    expect(next.errorCode).toBeNull();
  });

  it("transitions FALLBACK_VISIBLE -> LOADING_ASSETS on WEBGL_READY", () => {
    const s1 = hero3DReducer(initialHero3DState, { type: "MOUNT", timestamp: 100 });
    const s2 = hero3DReducer(s1, { type: "WEBGL_READY", timestamp: 150 });
    expect(s2.status).toBe("LOADING_ASSETS");
    expect(s2.webglReady).toBe(true);
    expect(s2.assetsStartedAt).toBe(150);
  });

  it("transitions FALLBACK_VISIBLE -> UNSUPPORTED on WEBGL_UNSUPPORTED", () => {
    const s1 = hero3DReducer(initialHero3DState, { type: "MOUNT", timestamp: 100 });
    const s2 = hero3DReducer(s1, { type: "WEBGL_UNSUPPORTED" });
    expect(s2.status).toBe("UNSUPPORTED");
    expect(s2.errorCode).toBe("WEBGL_UNAVAILABLE");
    expect(s2.qualityProfile).toBe("STATIC");
  });

  it("transitions LOADING_WEBGL -> LOADING_ASSETS on WEBGL_READY", () => {
    const s1 = hero3DReducer(initialHero3DState, { type: "MOUNT", timestamp: 100 });
    const s2 = hero3DReducer(s1, { type: "START_WEBGL_CHECK" });
    expect(s2.status).toBe("LOADING_WEBGL");
    const s3 = hero3DReducer(s2, { type: "WEBGL_READY", timestamp: 200 });
    expect(s3.status).toBe("LOADING_ASSETS");
    expect(s3.webglReady).toBe(true);
  });

  it("transitions LOADING_WEBGL -> FAILED on RUNTIME_ERROR", () => {
    const s1 = hero3DReducer(initialHero3DState, { type: "MOUNT", timestamp: 100 });
    const s2 = hero3DReducer(s1, { type: "START_WEBGL_CHECK" });
    const s3 = hero3DReducer(s2, {
      type: "RUNTIME_ERROR",
      errorCode: "WEBGL_INIT_FAILED",
    });
    expect(s3.status).toBe("FAILED");
    expect(s3.errorCode).toBe("WEBGL_INIT_FAILED");
  });

  it("transitions LOADING_ASSETS -> READY on ASSETS_READY", () => {
    const s1: Hero3DMachineState = {
      ...initialHero3DState,
      status: "LOADING_ASSETS",
      webglReady: true,
    };
    const s2 = hero3DReducer(s1, { type: "ASSETS_READY", timestamp: 500 });
    expect(s2.status).toBe("READY");
    expect(s2.criticalAssetsReady).toBe(true);
    expect(s2.readyAt).toBe(500);
  });

  it("transitions LOADING_ASSETS -> DEGRADED on OPTIONAL_ASSET_FAILED", () => {
    const s1: Hero3DMachineState = {
      ...initialHero3DState,
      status: "LOADING_ASSETS",
      webglReady: true,
    };
    const s2 = hero3DReducer(s1, {
      type: "OPTIONAL_ASSET_FAILED",
      assetId: "tree_background_01",
    });
    expect(s2.status).toBe("DEGRADED");
    expect(s2.optionalAssetFailures).toContain("tree_background_01");
  });

  it("transitions LOADING_ASSETS -> FAILED on CRITICAL_ASSET_FAILED", () => {
    const s1: Hero3DMachineState = {
      ...initialHero3DState,
      status: "LOADING_ASSETS",
      webglReady: true,
    };
    const s2 = hero3DReducer(s1, {
      type: "CRITICAL_ASSET_FAILED",
      errorCode: "CRITICAL_ASSET_FAILED",
    });
    expect(s2.status).toBe("FAILED");
    expect(s2.errorCode).toBe("CRITICAL_ASSET_FAILED");
  });

  it("handles performance degradation and recovery", () => {
    const readyState: Hero3DMachineState = {
      ...initialHero3DState,
      status: "READY",
      criticalAssetsReady: true,
    };
    const degraded = hero3DReducer(readyState, { type: "PERFORMANCE_DEGRADED" });
    expect(degraded.status).toBe("DEGRADED");
    expect(degraded.qualityProfile).toBe("MEDIUM");

    const recovered = hero3DReducer(degraded, { type: "PERFORMANCE_RECOVERED" });
    expect(recovered.status).toBe("READY");
    expect(recovered.qualityProfile).toBe("HIGH");
  });

  it("handles retry requests up to maximum 1 attempt", () => {
    const failedState: Hero3DMachineState = {
      ...initialHero3DState,
      status: "FAILED",
      errorCode: "CRITICAL_ASSET_FAILED",
      retryCount: 0,
    };
    const retrying = hero3DReducer(failedState, { type: "RETRY_REQUESTED" });
    expect(retrying.status).toBe("RETRYING");
    expect(retrying.retryCount).toBe(1);

    // Second retry should be rejected
    const failedAgain: Hero3DMachineState = {
      ...retrying,
      status: "FAILED",
    };
    const noRetry = hero3DReducer(failedAgain, { type: "RETRY_REQUESTED" });
    expect(noRetry.status).toBe("FAILED");
    expect(noRetry.retryCount).toBe(1);
  });

  it("ignores invalid events for given states", () => {
    const readyState: Hero3DMachineState = {
      ...initialHero3DState,
      status: "READY",
    };
    expect(hero3DReducer(readyState, { type: "MOUNT", timestamp: 100 })).toBe(readyState);
    expect(hero3DReducer(readyState, { type: "WEBGL_READY" })).toBe(readyState);

    const unsupportedState: Hero3DMachineState = {
      ...initialHero3DState,
      status: "UNSUPPORTED",
    };
    expect(hero3DReducer(unsupportedState, { type: "RETRY_REQUESTED" })).toBe(unsupportedState);
  });
});
