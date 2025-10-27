import { getAccessToken } from '../lib/supabase'
const workerBase = import.meta.env.VITE_WORKER_BASE_URL || ''

// Resolve a pre-signed FLAC URL via the Cloudflare Worker.
// It fetches with Authorization header, follows 302 response, and returns the final URL.
export async function resolveSignedFlacUrl(pathname) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  const res = await fetch(`${workerBase}/stream/${pathname}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'manual',
  })
  if (res.status !== 302) throw new Error('Stream forbidden')
  const loc = res.headers.get('Location')
  if (!loc) throw new Error('Missing redirect')
  return loc
}

export async function playSecureFlac(pathname) {
  const url = await resolveSignedFlacUrl(pathname)
  const audio = new Audio(url)
  audio.play().catch(()=>{})
  return audio
}