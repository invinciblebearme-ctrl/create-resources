import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: 'https://invinciblebearme-ctrl.github.io/create-resources/',
});
