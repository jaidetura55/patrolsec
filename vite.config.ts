import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vite configuration for PatrolSEC
// Enforces HTTPS using the provided certificates for secure deployment on youngpapi.com
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    host: true,
    port: 3000,
    https: fs.existsSync('/etc/letsencrypt/live/youngpapi.com/privkey.pem') 
      ? {
          key: fs.readFileSync('/etc/letsencrypt/live/youngpapi.com/privkey.pem'),
          cert: fs.readFileSync('/etc/letsencrypt/live/youngpapi.com/fullchain.pem'),
        }
      : undefined,
  },
});