import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        test: {
          name: 'electron',
          include: ['electron/__tests__/**/*.test.ts'],
          environment: 'node'
        }
      },
      {
        test: {
          name: 'renderer',
          include: ['src/__tests__/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts']
        },
        resolve: {
          alias: {
            '@': resolve(__dirname, 'src')
          }
        }
      }
    ]
  }
})
