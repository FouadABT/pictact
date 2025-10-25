import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "../../dist/client",
    rollupOptions: {
      input: {
        main: "index.html",
        app: "app.js",
      },
    },
  },
});
