import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit to 1000kb (1MB)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunking to split large dependencies
        manualChunks: {
          // React and React Router
          'react-vendor': ['react', 'react-dom', 'react-router'],
          // UI components
          'ui-vendor': ['lucide-react@0.487.0', 'sonner@2.0.3'],
          // Large utilities and data
          'data-vendor': ['./data/prompts/index.ts', './data/personas.ts'],
        },
      },
    },
  },
});
