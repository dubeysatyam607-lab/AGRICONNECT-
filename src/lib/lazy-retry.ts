import { lazy, ComponentType, LazyExoticComponent } from "react";

/**
 * Wraps dynamic React component imports with automatic exponential retry.
 * Resilient against temporary network drops, Vite HMR reload windows, and post-deploy hash transitions.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  delayMs = 300
): LazyExoticComponent<T> {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (remaining: number, currentDelay: number) => {
        factory()
          .then(resolve)
          .catch((error) => {
            const isChunkError =
              error?.message?.includes("Failed to fetch dynamically imported module") ||
              error?.message?.includes("Importing a module script failed");

            if (remaining > 0 && isChunkError) {
              setTimeout(() => {
                attempt(remaining - 1, currentDelay * 1.5);
              }, currentDelay);
            } else {
              reject(error);
            }
          });
      };
      attempt(retries, delayMs);
    })
  );
}
