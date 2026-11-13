import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/** Drops the woff fallback from Fontsource CSS, which would otherwise add a second copy of every font to the file. */
function woff2Only(): Plugin {
  return {
    name: "woff2-only",
    enforce: "pre",
    transform(code, id) {
      if (/@fontsource\/.*\.css/.test(id)) return code.replace(/,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g, "");
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [woff2Only(), react(), tailwindcss(), viteSingleFile()],
  build: {
    target: "es2022",
    cssCodeSplit: false,
    assetsInlineLimit: Infinity,
    modulePreload: false,
    sourcemap: false,
  },
});
