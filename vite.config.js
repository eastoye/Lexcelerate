import { defineConfig } from 'vite';

export default defineConfig({
  root: 'docs',
  envDir: '..',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'docs/index.html'
      }
    }
  },
  server: {
    port: 3000
  }
});