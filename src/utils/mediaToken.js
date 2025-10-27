import { getAccessToken } from '../lib/supabase'
const workerBase = import.meta.env.VITE_WORKER_BASE_URL || ''

// Fetch a server-side media token via the Cloudflare Worker.
// The Worker requires a Supabase JWT in Authorization: Bearer <token>.
export async function getMediaToken({ kind = 'movie', title = '', extra = '' } = {}) {
  const jwt = await getAccessToken()
  if (!jwt) throw new Error('Not authenticated')
  const url = `${workerBase}/media/token?kind=${encodeURIComponent(kind)}&title=${encodeURIComponent(title)}&extra=${encodeURIComponent(extra)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } })
  if (!res.ok) throw new Error('Media token fetch failed')
  return await res.json()
}

// Optional helper to derive a playback URL if the token API returns such a field.
export function extractPlaybackUrl(tokenPayload) {
  return tokenPayload?.playbackUrl || tokenPayload?.url || ''
}