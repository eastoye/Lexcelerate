import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html',
        'add-word': 'add-word.html',
        practice: 'practice.html',
        stats: 'stats.html'
      }
    }
  },
  publicDir: 'public'
})