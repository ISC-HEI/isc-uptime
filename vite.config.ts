import { defineConfig } from "vite";

// Relative base so the same build works at isc-hei.github.io/<repo>/ and on a custom domain.
export default defineConfig({
  base: "./",
  build: { target: "es2022", assetsInlineLimit: 0 },
});
