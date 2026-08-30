/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5176,
    host: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.ts']
  }
});
