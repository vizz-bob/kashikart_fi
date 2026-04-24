import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    })
  ],
  base: './', // Use relative paths for Electron
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://13.232.38.191:8000',
        changeOrigin: true,
      }
    }
  }
})

