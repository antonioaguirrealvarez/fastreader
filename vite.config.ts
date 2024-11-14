import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'framer-motion'],
          'vendor-auth': ['@supabase/supabase-js'],
          'app-components': [
            './src/components/ui',
            './src/components/reader'
          ],
          'app-pages': [
            './src/pages/Reader',
            './src/pages/Library',
            './src/pages/AddBook'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: true
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: true
  }
});