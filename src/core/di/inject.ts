import { useMemo } from 'react';
import { container } from './Container';
import './init';

/**
 * Custom React Hook to inject an enterprise dependency cleanly into a ViewModel or Component.
 */
export function useInject<T>(token: string | symbol): T {
  return useMemo(() => container.resolve<T>(token as symbol), [token]);
}

/**
 * Helper to resolve dependency directly in non-React code (e.g. inside repositories or Use Cases)
 */
export function inject<T>(token: string | symbol): T {
  return container.resolve<T>(token as symbol);
}
