import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite conexiones desde otras máquinas
    port: 5173, // el puerto que estás usando
    allowedHosts: ['.ngrok-free.dev'] // permite cualquier subdominio de ngrok
  }
});
