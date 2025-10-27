const ytKey = import.meta.env.VITE_YOUTUBE_API_KEY || import.meta.env.REACT_APP_YOUTUBE_API_KEY;
const workerProxyEnabled = true; // always available if Worker is deployed
const workerBase = import.meta.env.VITE_WORKER_BASE_URL || ''
const pipedBase = import.meta.env.VITE_PIPED_BASE || 'https://piped.video'
const invidiousBase = import.meta.env.VITE_INVIDIOUS_BASE || 'https://yewtu.be'

let apiReadyPromise;
export function ensureYouTubeIframeAPI() {
  if (apiReadyPromise) return apiReadyPromise;
  apiReadyPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return apiReadyPromise;
}

export async function searchYouTube(term, limit = 12) {
  // Try direct Google API first if key exists
  if (ytKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limit}&q=${encodeURIComponent(term)}&key=${ytKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return (json.items || []).map((item) => {
          const videoId = item.id.videoId
          const fallback = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''
          return {
            videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || fallback,
          }
        });
      }
    } catch {}
  }
  // Fallback to Cloudflare Worker RapidAPI proxy
  if (workerProxyEnabled) {
    try {
      const url = `${workerBase}/rapid/youtube/search?q=${encodeURIComponent(term)}&maxResults=${limit}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      const items = json.items || [];
      const mappedFromWorker = items.map((item) => {
        const videoId = item.id?.videoId || item.video?.videoId || item.id || ''
        const fallback = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''
        return {
          videoId,
          title: item.title || item?.snippet?.title || '',
          channelTitle: item.channelTitle || item?.snippet?.channelTitle || '',
          thumbnail: item.thumbnail || item?.snippet?.thumbnails?.medium?.url || fallback,
        }
      });
      if (mappedFromWorker.length) return mappedFromWorker
    } catch {
      // swallow and try public fallbacks
    }
  }
  // Public fallback: Piped API
  try {
    const url = `${pipedBase}/api/v1/search?q=${encodeURIComponent(term)}`
    const res = await fetch(url)
    if (res.ok) {
      const json = await res.json()
      const items = Array.isArray(json) ? json : (json.items || [])
      const mapped = items
        .filter((i) => (i.type || 'video') === 'video')
        .slice(0, limit)
        .map((i) => {
          const videoId = i.id || i.url?.split('v=')[1] || ''
          const fallback = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''
          return {
            videoId,
            title: i.title || '',
            channelTitle: i.uploaderName || i.uploader || '',
            thumbnail: i.thumbnail || fallback,
          }
        })
      if (mapped.length) return mapped
    }
  } catch {}

  // Public fallback: Invidious API
  try {
    const url = `${invidiousBase}/api/v1/search?q=${encodeURIComponent(term)}&type=video`
    const res = await fetch(url)
    if (res.ok) {
      const items = await res.json()
      const mapped = (items || [])
        .slice(0, limit)
        .map((i) => {
          const videoId = i.videoId || ''
          const fallback = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''
          return {
            videoId,
            title: i.title || '',
            channelTitle: i.author || '',
            thumbnail: (i.videoThumbnails || [])?.[1]?.url || (i.videoThumbnails || [])?.[0]?.url || fallback,
          }
        })
      if (mapped.length) return mapped
    }
  } catch {}
  return [];
}

export async function createHiddenYouTubePlayer(containerId, videoId, onReady, options = {}) {
  const { autoplay = 1 } = options
  await ensureYouTubeIframeAPI();
  const player = new window.YT.Player(containerId, {
    host: 'https://www.youtube-nocookie.com',
    videoId,
    width: 1,
    height: 1,
    playerVars: {
      autoplay,
      controls: 0,
      rel: 0,
      iv_load_policy: 3, // disable annotations
      modestbranding: 1,
      disablekb: 1,
      fs: 0,
      playsinline: 1,
    },
    events: {
      onReady: (e) => {
        try { e.target.unMute(); e.target.setVolume?.(100); if (autoplay) { e.target.playVideo?.() } } catch {}
        onReady?.(e.target);
      },
    }
  });
  return player;
}

export async function createVisibleYouTubePlayer(containerId, videoId, onReady, options = {}) {
  const { autoplay = 1 } = options
  await ensureYouTubeIframeAPI();
  const player = new window.YT.Player(containerId, {
    host: 'https://www.youtube-nocookie.com',
    videoId,
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay,
      controls: 1, // show standard YouTube controls
      playsinline: 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      disablekb: 0,
      fs: 1, // enable fullscreen button
    },
    events: {
      onReady: (e) => {
        try { e.target.unMute(); e.target.setVolume?.(100); if (autoplay) { e.target.playVideo?.() } } catch {}
        try {
          const iframe = e.target.getIframe?.();
          iframe?.setAttribute?.('allowfullscreen', 'true');
          iframe?.setAttribute?.('allowFullScreen', 'true');
          const curAllow = iframe?.getAttribute?.('allow') || ''
          iframe?.setAttribute?.('allow', (curAllow ? curAllow + '; ' : '') + 'autoplay; fullscreen; picture-in-picture')
        } catch {}
        onReady?.(e.target);
      },
    }
  });
  return player;
}

// --- URL and Playlist Helpers ---
export function parseYouTubeUrl(input) {
  try {
    const url = new URL(input)
    if (!/youtube\.com|youtu\.be/.test(url.hostname)) return null
    const playlistId = url.searchParams.get('list') || null
    let videoId = url.searchParams.get('v') || null
    if (!videoId && url.hostname.includes('youtu.be')) {
      const path = (url.pathname || '').replace(/^\//, '')
      videoId = path || null
    }
    return { videoId, playlistId, url: input }
  } catch {
    return null
  }
}

export async function fetchYouTubeVideoInfo(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  // Prefer oEmbed when available
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`)
    if (r.ok) {
      const j = await r.json()
      return {
        videoId,
        title: j.title || 'YouTube Video',
        channelTitle: j.author_name || 'YouTube',
        thumbnail: j.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      }
    }
  } catch {}
  // Fallback to Piped
  try {
    const r = await fetch(`${pipedBase}/api/v1/videos/${videoId}`)
    if (r.ok) {
      const j = await r.json()
      return {
        videoId,
        title: j.title || 'YouTube Video',
        channelTitle: j.uploader || 'YouTube',
        thumbnail: j.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      }
    }
  } catch {}
  return {
    videoId,
    title: 'YouTube Video',
    channelTitle: 'YouTube',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  }
}

export async function fetchYouTubePlaylistItems(playlistId, maxItems = 200) {
  // Try Cloudflare Worker proxy first (bypasses CORS)
  if (workerProxyEnabled && workerBase) {
    try {
      const r = await fetch(`${workerBase}/piped/playlists/${playlistId}`)
      if (r.ok) {
        const j = await r.json()
        const list = (j.relatedStreams || j.videos || [])
        const items = list.slice(0, maxItems).map((it) => {
          let videoId = it.id || it.videoId || null
          if (!videoId && it.url) {
            try { const u = new URL('https://youtube.com' + it.url); videoId = u.searchParams.get('v') } catch {}
          }
          const thumbnail = it.thumbnail || it.thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '')
          return {
            videoId,
            title: it.title || 'YouTube Video',
            channelTitle: it.uploader || it.uploaderName || it.author || 'YouTube',
            thumbnail,
          }
        }).filter((x) => x.videoId)
        if (items.length) return items
      }
    } catch {}
  }
  // Try Piped first
  try {
    const r = await fetch(`${pipedBase}/api/v1/playlists/${playlistId}`)
    if (r.ok) {
      const j = await r.json()
      const items = (j.relatedStreams || j.videos || [])
      return items.slice(0, maxItems).map((it) => {
        let videoId = it.id || it.videoId || null
        if (!videoId && it.url) {
          try { const u = new URL('https://youtube.com' + it.url); videoId = u.searchParams.get('v') } catch {}
        }
        const thumbnail = it.thumbnail || it.thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '')
        return {
          videoId,
          title: it.title || 'YouTube Video',
          channelTitle: it.uploader || it.uploaderName || it.author || 'YouTube',
          thumbnail,
        }
      }).filter((x) => x.videoId)
    }
  } catch {}

  // Try alternate Piped instance
  try {
    const alt = 'https://pipedapi.kavin.rocks'
    const r = await fetch(`${alt}/api/v1/playlists/${playlistId}`)
    if (r.ok) {
      const j = await r.json()
      const items = (j.relatedStreams || j.videos || [])
      return items.slice(0, maxItems).map((it) => {
        let videoId = it.id || it.videoId || null
        if (!videoId && it.url) {
          try { const u = new URL('https://youtube.com' + it.url); videoId = u.searchParams.get('v') } catch {}
        }
        const thumbnail = it.thumbnail || it.thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '')
        return {
          videoId,
          title: it.title || 'YouTube Video',
          channelTitle: it.uploader || it.uploaderName || it.author || 'YouTube',
          thumbnail,
        }
      }).filter((x) => x.videoId)
    }
  } catch {}
  // Try additional Piped instances
  try {
    const alt = 'https://piped.moomoo.me'
    const r = await fetch(`${alt}/api/v1/playlists/${playlistId}`)
    if (r.ok) {
      const j = await r.json()
      const items = (j.relatedStreams || j.videos || [])
      return items.slice(0, maxItems).map((it) => {
        let videoId = it.id || it.videoId || null
        if (!videoId && it.url) {
          try { const u = new URL('https://youtube.com' + it.url); videoId = u.searchParams.get('v') } catch {}
        }
        const thumbnail = it.thumbnail || it.thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '')
        return {
          videoId,
          title: it.title || 'YouTube Video',
          channelTitle: it.uploader || it.uploaderName || it.author || 'YouTube',
          thumbnail,
        }
      }).filter((x) => x.videoId)
    }
  } catch {}
  try {
    const alt = 'https://piped.syncpundit.com'
    const r = await fetch(`${alt}/api/v1/playlists/${playlistId}`)
    if (r.ok) {
      const j = await r.json()
      const items = (j.relatedStreams || j.videos || [])
      return items.slice(0, maxItems).map((it) => {
        let videoId = it.id || it.videoId || null
        if (!videoId && it.url) {
          try { const u = new URL('https://youtube.com' + it.url); videoId = u.searchParams.get('v') } catch {}
        }
        const thumbnail = it.thumbnail || it.thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '')
        return {
          videoId,
          title: it.title || 'YouTube Video',
          channelTitle: it.uploader || it.uploaderName || it.author || 'YouTube',
          thumbnail,
        }
      }).filter((x) => x.videoId)
    }
  } catch {}
  // Fallback to Invidious
  try {
    const r = await fetch(`${invidiousBase}/api/v1/playlists/${playlistId}`)
    if (r.ok) {
      const j = await r.json()
      const items = j.videos || []
      return items.slice(0, maxItems).map((it) => ({
        videoId: it.videoId,
        title: it.title || 'YouTube Video',
        channelTitle: it.author || 'YouTube',
        thumbnail: (it.videoThumbnails?.[1]?.url) || (it.videoThumbnails?.[0]?.url) || (it.videoId ? `https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg` : ''),
      }))
    }
  } catch {}
  try {
    const altInv = 'https://invidious.flokinet.to'
    const r = await fetch(`${altInv}/api/v1/playlists/${playlistId}`)
    if (r.ok) {
      const j = await r.json()
      const items = j.videos || []
      return items.slice(0, maxItems).map((it) => ({
        videoId: it.videoId,
        title: it.title || 'YouTube Video',
        channelTitle: it.author || 'YouTube',
        thumbnail: (it.videoThumbnails?.[1]?.url) || (it.videoThumbnails?.[0]?.url) || (it.videoId ? `https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg` : ''),
      }))
    }
  } catch {}
  try {
    const altInv = 'https://iv.ggtyler.dev'
    const r = await fetch(`${altInv}/api/v1/playlists/${playlistId}`)
    if (r.ok) {
      const j = await r.json()
      const items = j.videos || []
      return items.slice(0, maxItems).map((it) => ({
        videoId: it.videoId,
        title: it.title || 'YouTube Video',
        channelTitle: it.author || 'YouTube',
        thumbnail: (it.videoThumbnails?.[1]?.url) || (it.videoThumbnails?.[0]?.url) || (it.videoId ? `https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg` : ''),
      }))
    }
  } catch {}
  try {
    const altInv = 'https://vid.puffyan.us'
    const r = await fetch(`${altInv}/api/v1/playlists/${playlistId}`)
    if (r.ok) {
      const j = await r.json()
      const items = j.videos || []
      return items.slice(0, maxItems).map((it) => ({
        videoId: it.videoId,
        title: it.title || 'YouTube Video',
        channelTitle: it.author || 'YouTube',
        thumbnail: (it.videoThumbnails?.[1]?.url) || (it.videoThumbnails?.[0]?.url) || (it.videoId ? `https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg` : ''),
      }))
    }
  } catch {}
  try {
    const altInv = 'https://inv.nadeko.net'
    const r = await fetch(`${altInv}/api/v1/playlists/${playlistId}`)
    if (r.ok) {
      const j = await r.json()
      const items = j.videos || []
      return items.slice(0, maxItems).map((it) => ({
        videoId: it.videoId,
        title: it.title || 'YouTube Video',
        channelTitle: it.author || 'YouTube',
        thumbnail: (it.videoThumbnails?.[1]?.url) || (it.videoThumbnails?.[0]?.url) || (it.videoId ? `https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg` : ''),
      }))
    }
  } catch {}
  return []
}