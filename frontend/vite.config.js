import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: /^react(?=\/|$)/, replacement: fileURLToPath(new URL('./node_modules/react', import.meta.url)) },
      { find: /^\/shared(?=\/|$)/, replacement: fileURLToPath(new URL('../shared', import.meta.url)) },
    ],
  },
});
