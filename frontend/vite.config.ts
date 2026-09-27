import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// бэкенд живёт на :8080; проксируем API и картинки, чтобы не зависеть от CORS
const backend = process.env.BACKEND_URL ?? 'http://localhost:8080';
const proxy = {
  '/api': backend,
  '/uploads': backend,
};

export default defineConfig({
  plugins: [react()],
  // явный IPv4: иначе Vite может слушать только ::1, а Firefox открывает localhost как 127.0.0.1
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy },
});
