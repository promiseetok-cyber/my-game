import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // MapLibre stays behind a lazy view toggle; its vendor chunk is ~1.06 MB minified (~290 KB gzip).
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three'],
          'maplibre-vendor': ['maplibre-gl'],
          'ui-vendor': ['react', 'react-dom', 'lucide-react'],
          'socket-vendor': ['socket.io-client'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
