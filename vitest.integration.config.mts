import { defineConfig } from 'vitest/config'

/**
 * Integration tests run against a real PostgreSQL instance in an isolated
 * schema. They are kept out of the default `npm test` run so the unit suite
 * stays database-free.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      'server-only': new URL('./vitest.server-only.ts', import.meta.url)
        .pathname,
    },
  },
  test: {
    include: ['src/**/*.integration.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
})
