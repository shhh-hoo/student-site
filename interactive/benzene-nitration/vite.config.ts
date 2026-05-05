import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const routeRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: routeRoot,
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "assets",
    lib: {
      entry: resolve(routeRoot, "src/main.tsx"),
      formats: ["es"],
      fileName: () => "benzene-nitration.js",
    },
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
});
