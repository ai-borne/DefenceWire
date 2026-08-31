/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5176,
    host: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/{unit,integration}/**/*.{test,spec}.ts']
  }
});
