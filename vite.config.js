import { defineConfig } from 'vite'

// Dev proxy to Cloudflare Worker for RapidAPI search fallback.
// Set VITE_WORKER_BASE_URL in your .env to the Worker URL, e.g.
// https://your-worker.your-subdomain.workers.dev
// If not set, it will try local wrangler dev at http://localhost:8787

const workerBase = process.env.VITE_WORKER_BASE_URL || 'http://localhost:8787'

// Auto-detect GitHub Pages base when building in CI.
// Priority:
// 1) Use explicit VITE_GHPAGES_BASE if provided
// 2) If running in GitHub Actions, derive "/<repo>/" from GITHUB_REPOSITORY
// 3) Fallback to "/" for local/dev or other hosts
const base = (() => {
  const explicit = process.env.VITE_GHPAGES_BASE
  if (explicit) return explicit
  if (process.env.GITHUB_ACTIONS) {
    const repo = (process.env.GITHUB_REPOSITORY || '').split('/')[1] || ''
    return repo ? `/${repo}/` : '/'
  }
  return '/'
})()

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