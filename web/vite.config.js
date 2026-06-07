import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5180,
    strictPort: true, // Will fail if port is taken, instead of silently changing
  }
});
