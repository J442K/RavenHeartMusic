import { defineConfig } from 'vite'

// Dev proxy to Cloudflare Worker for RapidAPI search fallback.
// Set VITE_WORKER_BASE_URL in your .env to the Worker URL, e.g.
// https://your-worker.your-subdomain.workers.dev
// If not set, it will try local wrangler dev at http://localhost:8787

const workerBase = process.env.VITE_WORKER_BASE_URL || 'http://localhost:8787'
const base = process.env.VITE_GHPAGES_BASE || '/'

export default defineConfig({
  base,
  server: {
    proxy: {
      '/rapid': {
        target: workerBase,
        changeOrigin: true,
        // Preserve path; Cloudflare Worker handles /rapid/youtube/search
        rewrite: (path) => path,
      },
      '/media': {
        target: workerBase,
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/stream': {
        target: workerBase,
        changeOrigin: true,
        rewrite: (path) => path,
      },
    }
  }
})