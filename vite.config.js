import { defineConfig } from 'vite';

// Library build. preserveModules keeps dist/ mirroring src/ with stable,
// unhashed filenames, so the 55 dynamic import() preset chunks and the public
// ./presets/* subpath export keep working.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    lib: {
      entry: {
        'bg-wc': 'src/bg-wc.js',
        'data-background': 'src/data-background.js',
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
