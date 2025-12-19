import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'mobile',
    environment: 'jsdom',
    globals: true,
    setupFiles: './client/src/tests/mobile/setupTests.ts',
    include: ['./client/src/tests/mobile/**/*.test.{ts,tsx}']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@assets': path.resolve(__dirname, './attached_assets')
    }
  }
})