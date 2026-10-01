import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:8080'
  const realtimeBaseUrl = env.VITE_REALTIME_BASE_URL || 'http://localhost:8081'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/sse': {
          target: realtimeBaseUrl,
          changeOrigin: true,
        },
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
        '/oauth2': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
        '/ws': {
          target: realtimeBaseUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
