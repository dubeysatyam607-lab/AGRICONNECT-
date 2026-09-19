export type Hero3DState =
  | "INITIAL"
  | "FALLBACK_VISIBLE"
  | "LOADING_WEBGL"
  | "LOADING_ASSETS"
  | "READY"
  | "DEGRADED"
  | "RETRYING"
  | "FAILED"
  | "UNSUPPORTED";

export type Hero3DErrorCode =
  | "WEBGL_UNAVAILABLE"
  | "WEBGL_INIT_FAILED"
  | "CRITICAL_ASSET_FAILED"
  | "OPTIONAL_ASSET_FAILED"
  | "SHADER_FAILED"
  | "CONTEXT_LOST"
  | "PERFORMANCE_FAILURE"
  | "UNKNOWN";

export interface Hero3DMachineState {
  status: Hero3DState;
  errorCode: Hero3DErrorCode | null;
  retryCount: number;
  qualityProfile: "HIGH" | "MEDIUM" | "LOW" | "STATIC";
  webglReady: boolean;
  criticalAssetsReady: boolean;
  optionalAssetFailures: string[];
  startedAt: number | null;
  assetsStartedAt: number | null;
  readyAt: number | null;
}

export const initialHero3DState: Hero3DMachineState = {
  status: "INITIAL",
  errorCode: null,
  retryCount: 0,
  qualityProfile: "HIGH",
  webglReady: false,
  criticalAssetsReady: false,
  optionalAssetFailures: [],
  startedAt: null,
  assetsStartedAt: null,
  readyAt: null,
};

export type Hero3DEvent =
  | { type: "MOUNT"; timestamp: number }
  | { type: "START_WEBGL_CHECK" }
  | { type: "WEBGL_READY"; timestamp?: number }
  | { type: "WEBGL_UNSUPPORTED" }
  | { type: "ASSETS_LOADING"; timestamp: number }
  | { type: "ASSETS_READY"; timestamp: number }
  | { type: "OPTIONAL_ASSET_FAILED"; assetId: string }
  | { type: "CRITICAL_ASSET_FAILED"; errorCode?: Hero3DErrorCode }
  | { type: "PERFORMANCE_DEGRADED" }
  | { type: "PERFORMANCE_RECOVERED" }
  | { type: "RUNTIME_ERROR"; errorCode?: Hero3DErrorCode }
  | { type: "RETRY_REQUESTED" }
  | { type: "UNMOUNT" };

export function hero3DReducer(
  state: Hero3DMachineState,
  event: Hero3DEvent
): Hero3DMachineState {
  switch (state.status) {
    case "INITIAL":
      if (event.type === "MOUNT") {
        return {
          ...state,
          status: "FALLBACK_VISIBLE",
          startedAt: event.timestamp,
          errorCode: null,
        };
      }
      return state;

    case "FALLBACK_VISIBLE":
      if (event.type === "START_WEBGL_CHECK") {
        return {
          ...state,
          status: "LOADING_WEBGL",
        };
      }

      if (event.type === "WEBGL_READY") {
        return {
          ...state,
          status: "LOADING_ASSETS",
          webglReady: true,
          errorCode: null,
          assetsStartedAt: event.timestamp ?? null,
        };
      }

      if (event.type === "WEBGL_UNSUPPORTED") {
        return {
          ...state,
          status: "UNSUPPORTED",
          errorCode: "WEBGL_UNAVAILABLE",
          qualityProfile: "STATIC",
        };
      }

      return state;

    case "LOADING_WEBGL":
      if (event.type === "WEBGL_READY") {
        return {
          ...state,
          status: "LOADING_ASSETS",
          webglReady: true,
          assetsStartedAt: event.timestamp ?? null,
          errorCode: null,
        };
      }

      if (event.type === "WEBGL_UNSUPPORTED") {
        return {
          ...state,
          status: "UNSUPPORTED",
          errorCode: "WEBGL_UNAVAILABLE",
          qualityProfile: "STATIC",
        };
      }

      if (event.type === "RUNTIME_ERROR") {
        return {
          ...state,
          status: "FAILED",
          errorCode: event.errorCode ?? "WEBGL_INIT_FAILED",
        };
      }

      return state;

    case "LOADING_ASSETS":
      if (event.type === "ASSETS_READY") {
        return {
          ...state,
          status: "READY",
          criticalAssetsReady: true,
          readyAt: event.timestamp,
          errorCode: null,
        };
      }

      if (event.type === "OPTIONAL_ASSET_FAILED") {
        return {
          ...state,
          status: "DEGRADED",
          optionalAssetFailures: [...state.optionalAssetFailures, event.assetId],
        };
      }

      if (event.type === "CRITICAL_ASSET_FAILED") {
        return {
          ...state,
          status: "FAILED",
          errorCode: event.errorCode ?? "CRITICAL_ASSET_FAILED",
        };
      }

      if (event.type === "RUNTIME_ERROR") {
        return {
          ...state,
          status: "FAILED",
          errorCode: event.errorCode ?? "UNKNOWN",
        };
      }

      return state;

    case "READY":
      if (event.type === "PERFORMANCE_DEGRADED") {
        return {
          ...state,
          status: "DEGRADED",
          qualityProfile: "MEDIUM",
        };
      }

      if (event.type === "RUNTIME_ERROR") {
        return {
          ...state,
          status: "FAILED",
          errorCode: event.errorCode ?? "UNKNOWN",
        };
      }

      return state;

    case "DEGRADED":
      if (event.type === "PERFORMANCE_RECOVERED") {
        return {
          ...state,
          status: "READY",
          qualityProfile: "HIGH",
        };
      }

      if (event.type === "RUNTIME_ERROR") {
        return {
          ...state,
          status: "FAILED",
          errorCode: event.errorCode ?? "UNKNOWN",
        };
      }

      return state;

    case "FAILED":
      if (event.type === "RETRY_REQUESTED" && state.retryCount < 1) {
        return {
          ...initialHero3DState,
          status: "RETRYING",
          retryCount: state.retryCount + 1,
        };
      }

      if (event.type === "MOUNT") {
        return {
          ...state,
          status: "FALLBACK_VISIBLE",
          startedAt: event.timestamp,
        };
      }

      return state;

    case "RETRYING":
      if (event.type === "WEBGL_READY") {
        return {
          ...state,
          status: "LOADING_ASSETS",
          webglReady: true,
          assetsStartedAt: event.timestamp ?? null,
          errorCode: null,
        };
      }

      if (event.type === "WEBGL_UNSUPPORTED") {
        return {
          ...state,
          status: "UNSUPPORTED",
          errorCode: "WEBGL_UNAVAILABLE",
          qualityProfile: "STATIC",
        };
      }

      if (event.type === "RUNTIME_ERROR") {
        return {
          ...state,
          status: "FAILED",
          errorCode: event.errorCode ?? "UNKNOWN",
        };
      }

      return state;

    case "UNSUPPORTED":
      return state;

    default:
      return state;
  }
}
