import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Загружаем env переменные
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.APP_PORT),
      proxy: {
        '/api': {
          target: env.API_URL,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})