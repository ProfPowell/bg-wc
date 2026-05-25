import { defineConfig } from 'vite';

// Library build. preserveModules keeps dist/ mirroring src/ with stable,
// unhashed filenames, so the 55 dynamic import() preset chunks and the public
// ./presets/* subpath export keep working.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: {
        'gl-wc': 'src/gl-wc.js',
        'data-bg': 'src/data-bg.js',
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
    },
  },
});
