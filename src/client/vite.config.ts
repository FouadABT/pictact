import { defineConfig } from "vite";
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    outDir: "../../dist/client",
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'create-event': resolve(__dirname, 'create-event.html'),
        'event-details': resolve(__dirname, 'event-details.html'),
        'event-game': resolve(__dirname, 'event-game.html'),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
        sourcemapFileNames: "[name].js.map",
      },
    },
  },
});

// Force rebuild to include event-game.html
