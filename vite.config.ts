import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import zlib from "zlib";
import { componentTagger } from "lovable-tagger";
import type { PluginOption } from "vite";

/**
 * Gzip + Brotli precompression plugin.
 * Generates .gz and .br files for static assets at build time so that
 * hosting/CDN layers can serve them with the matching Content-Encoding
 * header — improving Time to First Byte (TTFB) and overall performance.
 */
function precompressPlugin(): PluginOption {
  return {
    name: "agri-precompress",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const compressible = [".js", ".css", ".html", ".svg", ".json", ".txt", ".xml"];
      for (const key of Object.keys(bundle)) {
        const asset = bundle[key];
        if (!asset || "fileName" in asset === false) continue;
        const name = asset.fileName;
        if (!compressible.some((ext) => name.endsWith(ext))) continue;

        let code: string | Uint8Array;
        if ("code" in asset && typeof asset.code === "string") {
          code = asset.code;
        } else if ("source" in asset && typeof asset.source === "string") {
          code = asset.source;
        } else if ("source" in asset && asset.source instanceof Uint8Array) {
          code = Buffer.from(asset.source);
        } else {
          continue;
        }

        const buf = Buffer.isBuffer(code) ? code : Buffer.from(code);

        // Brotli (best ratio, supported by all modern browsers)
        const br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
        this.emitFile({
          type: "asset",
          fileName: `${name}.br`,
          source: br,
        });

        // Gzip (maximum compatibility)
        const gz = zlib.gzipSync(buf, { level: 9 });
        this.emitFile({
          type: "asset",
          fileName: `${name}.gz`,
          source: gz,
        });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: true,
    cors: true,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    precompressPlugin(),
    mode === "development" && process.env.LOVABLE === "true" && componentTagger(),
  ].filter(Boolean),
  build: {
    // StorageMap's on-demand chunk (mapbox-gl, ~1.7 MB) is the only chunk over
    // 900 kB — it is lazy-loaded solely when the user opens the Cold Storage map,
    // so the threshold is raised rather than accepting a misleading warning.
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks: {
          // clsx + tailwind-merge must live here (not with recharts) so the
          // 433 KB recharts vendor chunk stays lazy — otherwise cn() in
          // src/lib/utils.ts eagerly pulls it into the startup bundle.
          "vendor-react": ["react", "react-dom", "react-router-dom", "clsx", "tailwind-merge"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-icons": ["lucide-react"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
    "process.env": {},
  },
}));
