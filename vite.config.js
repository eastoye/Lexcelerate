import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        'add-word': 'add-word.html',
        practice: 'practice.html',
        stats: 'stats.html'
      }
    }
  },
  publicDir: 'public'
})