/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup/test-utils.tsx'],
    testTimeout: 10000,
    bail: 0, // Don't stop on first failure
    passWithNoTests: false,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
    reporters: ['default', 'html'],
    outputFile: {
      html: './test-results/index.html'
    }
  },
}); 