// Cloudflare Worker: gate /stream/* behind Supabase JWT and redirect to short-lived B2 pre-signed URL
// Deploy with wrangler. Set env: SUPABASE_JWT_SECRET, B2_* as needed.
import { jwtVerify } from 'https://cdn.skypack.dev/jose'

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    // RapidAPI secure proxy (server-side only)
    if (url.pathname.startsWith('/rapid/youtube/search')) {
      return rapidYouTubeSearch(url, env)
    }
    if (url.pathname.startsWith('/rapid/netflix/title/type')) {
      return rapidNetflixTitleType(url, env)
    }
    if (url.pathname.startsWith('/rapid/apple/track')) {
      return rapidAppleTrack(url, env)
    }

    // Piped playlist proxy (server-side only, CORS-friendly)
    if (url.pathname.startsWith('/piped/playlists/')) {
      const parts = url.pathname.split('/')
      const playlistId = parts[parts.length - 1]
      if (!playlistId) {
        return new Response(JSON.stringify({ videos: [] }), { status: 400, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })
      }
      const pipedBase = env.PIPED_BASE || 'https://piped.video'
      try {
        const r = await fetch(`${pipedBase}/api/v1/playlists/${playlistId}`)
        if (!r.ok) {
          return new Response(JSON.stringify({ videos: [] }), { status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })
        }
        const j = await r.json()
        return new Response(JSON.stringify(j), { status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })
      } catch (e) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })
      }
    }

    // Media token proxy (server-side, gated by Supabase JWT)
    if (url.pathname.startsWith('/media/token')) {
      return mediaTokenProxy(req, url, env)
    }

    // Secure FLAC streaming gate
    if (!url.pathname.startsWith('/stream/')) {
      return new Response('Not found', { status: 404 })
    }
    const token = req.headers.get('Authorization')?.split(' ')[1]
    if (!token) return new Response('Forbidden', { status: 401 })
    try {
      const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
      await jwtVerify(token, secret)
    } catch {
      return new Response('Forbidden', { status: 401 })
    }

    // TODO: implement a real B2 S3 pre-sign. For now, assume an internal presign endpoint.
    const b2Url = await signB2Url(env, url.pathname.replace('/stream/', ''))
    return Response.redirect(b2Url, 302)
  }
}

async function signB2Url(env, objectPath) {
  // Example placeholder: call an internal presign service or construct a short-lived URL.
  const endpoint = env.B2_PRESIGN_ENDPOINT
  if (!endpoint) throw new Error('No presign endpoint configured')
  const r = await fetch(`${endpoint}?path=${encodeURIComponent(objectPath)}&ttl=60`)
  if (!r.ok) throw new Error('Failed to presign')
  const { url } = await r.json()
  return url
}

// --- RapidAPI secure proxy helpers ---
async function rapidYouTubeSearch(url, env) {
  // Whitelisted RapidAPI host and endpoint
  const host = 'youtube-v3-alternative.p.rapidapi.com'
  const endpoint = 'https://youtube-v3-alternative.p.rapidapi.com/search'

  const q = url.searchParams.get('q') || ''
  const maxResults = url.searchParams.get('maxResults') || '12'
  if (!q) return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } })

  const headers = {
    'X-RapidAPI-Host': host,
    'X-RapidAPI-Proxy-Secret': env.RAPIDAPI_PROXY_SECRET || '',
  }
  // Optional Marketplace key if provided
  if (env.RAPIDAPI_KEY) headers['X-RapidAPI-Key'] = env.RAPIDAPI_KEY

  const target = `${endpoint}?query=${encodeURIComponent(q)}&maxResults=${encodeURIComponent(maxResults)}`
  const r = await fetch(target, { headers })
  if (!r.ok) return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
  const json = await r.json()
  return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } })
}

// --- RapidAPI: Netflix title type ---
async function rapidNetflixTitleType(url, env) {
  // Align with user's provided RapidAPI host for Netflix Data
  const host = 'netflix-data.p.rapidapi.com'
  const endpoint = 'https://netflix-data.p.rapidapi.com/title/type/'

  const ids = url.searchParams.get('ids') || url.searchParams.get('titleIds') || ''
  if (!ids) return new Response(JSON.stringify({ error: 'ids required' }), { status: 400, headers: { 'content-type': 'application/json' } })

  const headers = {
    'X-RapidAPI-Host': host,
    'X-RapidAPI-Proxy-Secret': env.RAPIDAPI_PROXY_SECRET || '',
    'Accept': 'application/json'
  }
  if (env.RAPIDAPI_KEY) headers['X-RapidAPI-Key'] = env.RAPIDAPI_KEY

  const target = `${endpoint}?ids=${encodeURIComponent(ids)}`
  const r = await fetch(target, { headers })
  if (!r.ok) {
    const text = await r.text().catch(()=> '')
    return new Response(JSON.stringify({ error: 'RapidAPI error', status: r.status, body: text }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
  const json = await r.json()
  return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } })
}

// --- RapidAPI: Apple Music track details ---
async function rapidAppleTrack(url, env) {
  const host = 'apple-music24.p.rapidapi.com'
  const endpoint = 'https://apple-music24.p.rapidapi.com/track/'

  const trackUrl = url.searchParams.get('url') || ''
  if (!trackUrl) {
    return new Response(JSON.stringify({ error: 'url required' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }

  const headers = {
    'X-RapidAPI-Host': host,
    'X-RapidAPI-Proxy-Secret': env.RAPIDAPI_PROXY_SECRET || '',
    'Accept': 'application/json'
  }
  if (env.RAPIDAPI_KEY) headers['X-RapidAPI-Key'] = env.RAPIDAPI_KEY

  const target = `${endpoint}?url=${encodeURIComponent(trackUrl)}`
  const r = await fetch(target, { headers })
  if (!r.ok) {
    const text = await r.text().catch(()=> '')
    return new Response(JSON.stringify({ error: 'RapidAPI error', status: r.status, body: text }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
  const json = await r.json()
  return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } })
}

// --- Media token proxy ---
async function mediaTokenProxy(req, url, env) {
  // Require Supabase JWT to prevent public scraping
  const token = req.headers.get('Authorization')?.split(' ')[1]
  if (!token) return new Response('Forbidden', { status: 401 })
  try {
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
    await jwtVerify(token, secret)
  } catch {
    return new Response('Forbidden', { status: 401 })
  }

  const endpoint = env.MEDIA_TOKEN_ENDPOINT
  const apiKey = env.MEDIA_API_KEY
  if (!endpoint || !apiKey) {
    return new Response(JSON.stringify({ error: 'Media token endpoint not configured' }), { status: 500, headers: { 'content-type': 'application/json' } })
  }

  // Forward minimal query params (e.g., kind, title). Adjust to your API.
  const kind = url.searchParams.get('kind') || 'movie'
  const title = url.searchParams.get('title') || ''
  const extra = url.searchParams.get('extra') || ''

  const r = await fetch(`${endpoint}?kind=${encodeURIComponent(kind)}&title=${encodeURIComponent(title)}&extra=${encodeURIComponent(extra)}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    }
  })
  if (!r.ok) {
    return new Response(JSON.stringify({ error: 'Token service error' }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
  const json = await r.json()
  // Return token payload as-is
  return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } })
}