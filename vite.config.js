import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const { PORT = '5000' } = loadEnv(mode, process.cwd(), 'PORT')

  return {
    plugins: [react(), tailwindcss()],
    server: { proxy: { '/api': `http://127.0.0.1:${PORT}` } },
  }
})
