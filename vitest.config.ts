import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts?(x)', 'tests/integration/**/*.test.ts?(x)'],
          setupFiles: ['tests/setup.node.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['tests/ui/**/*.test.ts?(x)'],
          setupFiles: ['tests/setup.ts'],
        },
      },
    ],
    exclude: ['node_modules/**', 'dist/**', 'coverage/**', '.jest-cache/**'],
    watchExclude: ['dist/**', 'coverage/**', '.jest-cache/**'],
    maxWorkers: 4,
    testTimeout: 20000,
    hookTimeout: 20000,
    sequence: {
      hooks: 'list',
    },
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov', 'html'],
    },
  },
}));
