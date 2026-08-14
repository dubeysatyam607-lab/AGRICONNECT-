import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Use jsdom environment for DOM APIs like window
    environment: 'jsdom',
    // Enable globals (describe, it, expect) without imports
    globals: true,
    // Setup file to run before all tests
    setupFiles: './vitest.setup.ts',
    // Exclude end-to-end or irrelevant tests if needed
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/staging/**', 'tests/e2e/**'],
  },
});
