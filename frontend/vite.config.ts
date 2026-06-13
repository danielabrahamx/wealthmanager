import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(rootDir, '..');

export default defineConfig({
  plugins: [react()],
  // The workspace directory is a junction (.deepseekgui -> .kun). Without this,
  // Vite realpath-resolves source files across the junction and fails to load
  // them, serving raw untransformed TSX (white screen).
  resolve: { preserveSymlinks: true },
  server: {
    port: 5173,
    fs: { strict: false, allow: [workspaceRoot] },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
