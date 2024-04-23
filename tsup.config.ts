import { defineConfig } from 'tsup'

export default defineConfig({
  clean: true,
  entry: [
    'src/index.ts',
    'src/persist.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
})
