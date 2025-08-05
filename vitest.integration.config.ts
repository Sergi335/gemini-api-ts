import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*integration*.test.{js,ts}', '**/*.integration.test.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**']
  }
})
