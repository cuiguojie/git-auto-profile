import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  minify: false,
  sourcemap: false,
  splitting: false,
  banner: {
    js: '#!/usr/bin/env node'
  }
})
