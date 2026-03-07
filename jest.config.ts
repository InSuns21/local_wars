import type { Config } from 'jest';

const sharedConfig = {
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  transform: {
    '^.+\\.[tj]sx?$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2020',
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/coverage/', '<rootDir>/.jest-cache/'],
  watchPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/coverage/', '<rootDir>/.jest-cache/'],
} satisfies Partial<Config>;

const config: Config = {
  maxWorkers: process.env.JEST_MAX_WORKERS ?? '75%',
  workerIdleMemoryLimit: '512MB',
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/index.tsx'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  projects: [
    {
      ...sharedConfig,
      displayName: 'core',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts?(x)', '<rootDir>/tests/integration/**/*.test.ts?(x)'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.node.ts'],
      cacheDirectory: '<rootDir>/.jest-cache/core',
    },
    {
      ...sharedConfig,
      displayName: 'ui',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/ui/**/*.test.ts?(x)'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      cacheDirectory: '<rootDir>/.jest-cache/ui',
    },
  ],
};

export default config;
