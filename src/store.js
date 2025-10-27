import { create } from 'zustand'
import { supabase } from './lib/supabase'

const LS_QUEUE = 'raven.queue'
const LS_FAVORITES = 'raven.favorites'
const LS_VOLUME = 'raven.volume'
const LS_HISTORY = 'raven.history'
const LS_PLAYLIST = 'raven.playlist'
const LS_MODE = 'raven.mode'
const LS_AUTO_CLOSE = 'raven.autoClose'
const LS_USER_STATE = 'raven.userState'

export const usePlayerStore = create((set, get) => ({
  queue: [],
  favorites: [],
  history: [],
  playlist: [],
  isPlaylistOpen: false,
  currentTrack: null,
  isPlaying: false,
  youtubePlayer: null,
  ytProgressSec: 0,
  ytDurationSec: 0,
  volume: 100,
  mode: 'music',
  autoCloseOnEnd: true,
  showCommandBar: false,
  _progressTimer: null,
  _lastProgressPersistTs: 0,

  // Persistence
  init: () => {
    try {
      const q = JSON.parse(localStorage.getItem(LS_QUEUE) || '[]')
      const f = JSON.parse(localStorage.getItem(LS_FAVORITES) || '[]')
      const h = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]')
      const p = JSON.parse(localStorage.getItem(LS_PLAYLIST) || '[]')
      const v = parseInt(localStorage.getItem(LS_VOLUME) || '100', 10)
      const m = (localStorage.getItem(LS_MODE) || 'music')
      const ac = (localStorage.getItem(LS_AUTO_CLOSE) || 'true')
      set({ queue: q, favorites: f, history: h, playlist: p, volume: isNaN(v) ? 100 : v, mode: (m === 'video' ? 'video' : 'music'), autoCloseOnEnd: ac === 'false' ? false : true })
    } catch {}
  },
  _saveQueue: () => {
    try { localStorage.setItem(LS_QUEUE, JSON.stringify(get().queue)) } catch {}
  },
  _saveFavorites: () => {
    try { localStorage.setItem(LS_FAVORITES, JSON.stringify(get().favorites)) } catch {}
  },
  _saveHistory: () => {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(get().history)) } catch {}
  },
  _savePlaylist: () => {
    try { localStorage.setItem(LS_PLAYLIST, JSON.stringify(get().playlist)) } catch {}
  },
  _saveVolume: () => {
    try { localStorage.setItem(LS_VOLUME, String(get().volume)) } catch {}
  },
  _saveMode: () => {
    try { localStorage.setItem(LS_MODE, String(get().mode)) } catch {}
  },
  _saveAutoClose: () => {
    try { localStorage.setItem(LS_AUTO_CLOSE, String(get().autoCloseOnEnd)) } catch {}
  },
  _saveUserStateLocal: () => {
    try {
      const state = {
        lastVideoId: get().currentTrack?.youtube?.videoId || get().currentTrack?.id || null,
        progressSec: get().ytProgressSec || 0,
        volume: get().volume || 100,
        mode: get().mode || 'music',
        updatedAt: Date.now(),
      }
      localStorage.setItem(LS_USER_STATE, JSON.stringify(state))
    } catch {}
  },
  _saveUserStateRemote: async (partial = {}) => {
    try {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      const userId = data?.session?.user?.id
      if (!userId) return
      const full = {
        user_id: userId,
        last_video_id: get().currentTrack?.youtube?.videoId || get().currentTrack?.id || null,
        progress_sec: get().ytProgressSec || 0,
        volume: get().volume || 100,
        mode: get().mode || 'music',
        updated_at: new Date().toISOString(),
        ...partial,
      }
      // replace existing state for this user (works even if no unique index)
      await supabase.from('user_state').delete().eq('user_id', userId)
      await supabase.from('user_state').insert([full])
    } catch {}
  },
  setAutoCloseOnEnd: (val) => {
    set({ autoCloseOnEnd: !!val })
    get()._saveAutoClose()
  },
  openCommandBar: () => set({ showCommandBar: true }),
  closeCommandBar: () => set({ showCommandBar: false }),
  openPlaylist: () => set({ isPlaylistOpen: true }),
  closePlaylist: () => set({ isPlaylistOpen: false }),

  // Basic setters
  setQueue: (q) => { set({ queue: q }); get()._saveQueue(); get()._saveQueueRemote() },
  _saveQueueRemote: async () => {
    try {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      const userId = data?.session?.user?.id
      if (!userId) return
      const items = get().queue
      // Replace user queue with current
      await supabase.from('queue_items').delete().eq('user_id', userId)
      const payload = items.map((t, idx) => ({
        user_id: userId,
        video_id: t.youtube?.videoId || t.id || '',
        title: t.title || '',
        artist: t.artist || '',
        thumbnail: t.albumArt || '',
        position: idx,
      }))
      if (payload.length) await supabase.from('queue_items').insert(payload)
    } catch {}
  },
  setCurrentTrack: (t) => set({ currentTrack: t }),
  resumeFromLastState: async () => {
    try {
      let last = null
      // Prefer remote state if available
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession()
          const userId = data?.session?.user?.id
          if (userId) {
            const { data: rows } = await supabase.from('user_state').select('*').eq('user_id', userId).limit(1)
            if (Array.isArray(rows) && rows[0]) {
              last = rows[0]
            }
          }
        }
      } catch {}
      if (!last) {
        try { last = JSON.parse(localStorage.getItem(LS_USER_STATE) || 'null') } catch {}
      }
      const videoId = last?.last_video_id || last?.lastVideoId
      const progressSec = Number(last?.progress_sec ?? last?.progressSec ?? 0) || 0
      const mode = (last?.mode === 'video') ? 'video' : 'music'
      const volume = Number(last?.volume ?? get().volume) || get().volume
      if (!videoId) return
      const track = { id: videoId, title: '', artist: '', albumArt: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, previewUrl: '', durationMs: 0, youtube: { videoId } }
      set({ currentTrack: track, mode })
      // Ensure hidden container exists for music mode only
      try {
        let hidden = document.getElementById('yt-hidden-root')
        if (!hidden) {
          hidden = document.createElement('div')
          hidden.id = 'yt-hidden-root'
          hidden.style.width = '1px'
          hidden.style.height = '1px'
          hidden.style.opacity = '0'
          hidden.style.pointerEvents = 'none'
          document.body.appendChild(hidden)
        }
      } catch {}
      try {
        const { createHiddenYouTubePlayer } = await import('./utils/youtube')
        const { createVisibleYouTubePlayer } = await import('./utils/youtube')
        const containerId = mode === 'video' ? 'yt-visible-player' : 'yt-hidden-root'
        const creator = mode === 'video' ? createVisibleYouTubePlayer : createHiddenYouTubePlayer
        const player = await creator(containerId, videoId, (p) => {
          try { p.setVolume?.(volume) } catch {}
        }, { autoplay: 0 })
        set({ youtubePlayer: player })
        try {
          player.pauseVideo?.()
          player.seekTo?.(progressSec, true)
        } catch {}
        set({ isPlaying: false, volume })
      } catch {}
    } catch {}
  },

  // Player binding and telemetry
  setYouTubePlayer: (p) => {
    const prevTimer = get()._progressTimer
    if (prevTimer) { try { clearInterval(prevTimer) } catch {} }
    set({ youtubePlayer: p })
    try {
      // Attach state change listener for auto-play tracking and queue advancement
      p.addEventListener('onStateChange', (state) => {
        if (state === 1) set({ isPlaying: true })
        if (state === 2) set({ isPlaying: false })
        if (state === 0) {
          // ENDED → auto-next
          const wasPlaying = get().isPlaying
          const next = get().queue[0]
          if (!wasPlaying) {
            set({ isPlaying: false })
            return
          }
          if (next && next.youtube?.videoId) {
            get().playNow(next)
            // consume from queue
            const rest = get().queue.slice(1)
            set({ queue: rest })
            get()._saveQueue();
            get()._saveQueueRemote()
          } else {
            set({ isPlaying: false })
            try {
              if (get().mode === 'video' && get().autoCloseOnEnd) {
                get().setMode('music')
                try { document.getElementById('search-input')?.focus?.() } catch {}
              }
            } catch {}
          }
        }
      })
    } catch {}
    // Set stored volume
    try { p.setVolume?.(get().volume) } catch {}
    const timer = setInterval(() => {
      try {
        const cur = p.getCurrentTime?.() || 0
        const dur = p.getDuration?.() || 0
        set({ ytProgressSec: cur, ytDurationSec: dur })
        const now = Date.now()
        // Persist local every tick, remote at most every 5s
        get()._saveUserStateLocal()
        if (now - (get()._lastProgressPersistTs || 0) > 5000) {
          set({ _lastProgressPersistTs: now })
          get()._saveUserStateRemote()
        }
      } catch {}
    }, 500)
    set({ _progressTimer: timer })
  },


  // Mode switching (music vs video)
  setMode: async (mode) => {
    const prev = get().mode
    if (mode !== 'music' && mode !== 'video') return
    if (mode === prev) return
    set({ mode })
    get()._saveMode()
    get()._saveUserStateRemote({ mode })
    const yt = get().youtubePlayer
    const track = get().currentTrack
    try {
      // Destroy existing player to reattach cleanly
      yt?.destroy?.()
    } catch {}
    // Clear reference so subsequent actions recreate properly
    set({ youtubePlayer: null })
    if (!track?.youtube?.videoId) return
    try {
      // Ensure hidden container exists for music mode only; visible container is rendered by App
      let hidden = document.getElementById('yt-hidden-root')
      if (!hidden) {
        hidden = document.createElement('div')
        hidden.id = 'yt-hidden-root'
        hidden.style.width = '1px'
        hidden.style.height = '1px'
        hidden.style.opacity = '0'
        hidden.style.pointerEvents = 'none'
        document.body.appendChild(hidden)
      }
    } catch {}
    try {
      const { createHiddenYouTubePlayer } = await import('./utils/youtube')
      const { createVisibleYouTubePlayer } = await import('./utils/youtube')
      const containerId = mode === 'video' ? 'yt-visible-player' : 'yt-hidden-root'
      const creator = mode === 'video' ? createVisibleYouTubePlayer : createHiddenYouTubePlayer
      const player = await creator(containerId, track.youtube.videoId, (p) => {
        try { p.setVolume?.(get().volume) } catch {}
      })
      set({ youtubePlayer: player })
      try { player.unMute?.(); player.playVideo?.() } catch {}
    } catch {}
  },

  // Playback controls
  playNow: (track) => {
    set({ currentTrack: track, isPlaying: true })
    get()._saveUserStateLocal()
    get()._saveUserStateRemote({ last_video_id: track.youtube?.videoId || track.id || null, progress_sec: 0 })
    ;(async () => {
      try {
        if (!track?.youtube?.videoId) return
        let yt = get().youtubePlayer
        // If no player exists yet, create based on current mode
        if (!yt) {
          try {
            // Ensure hidden container exists for music mode only; visible container is rendered by App
            let hidden = document.getElementById('yt-hidden-root')
            if (!hidden) {
              hidden = document.createElement('div')
              hidden.id = 'yt-hidden-root'
              hidden.style.width = '1px'
              hidden.style.height = '1px'
              hidden.style.opacity = '0'
              hidden.style.pointerEvents = 'none'
              document.body.appendChild(hidden)
            }
          } catch {}
          try {
            const { createHiddenYouTubePlayer } = await import('./utils/youtube')
            const { createVisibleYouTubePlayer } = await import('./utils/youtube')
            const mode = get().mode
            const containerId = mode === 'video' ? 'yt-visible-player' : 'yt-hidden-root'
            const creator = mode === 'video' ? createVisibleYouTubePlayer : createHiddenYouTubePlayer
            yt = await creator(containerId, track.youtube.videoId, (p) => {
              try { p.setVolume?.(get().volume) } catch {}
            })
            set({ youtubePlayer: yt })
          } catch {}
        } else {
          try { yt.loadVideoById(track.youtube.videoId) } catch {}
        }
        try { yt.unMute?.(); yt.setVolume?.(get().volume); yt.playVideo?.() } catch {}
      } catch {}
    })()
    // record history
    const now = Date.now()
    const entry = { ...track, playedAt: now }
    const h = [entry, ...get().history].slice(0, 100)
    set({ history: h })
    get()._saveHistory()
    // Save remote history append
    ;(async () => {
      try {
        if (!supabase) return
        const { data } = await supabase.auth.getSession()
        const userId = data?.session?.user?.id
        if (!userId) return
        await supabase.from('play_history').insert({
          user_id: userId,
          video_id: track.youtube?.videoId || track.id || '',
          title: track.title || '',
          artist: track.artist || '',
          thumbnail: track.albumArt || '',
          played_at: new Date(now).toISOString(),
        })
      } catch {}
    })()
  },
  addToQueue: (track) => {
    const q = [...get().queue, track]
    set({ queue: q })
    get()._saveQueue()
    get()._saveQueueRemote()
  },
  addManyToQueue: (tracks) => {
    const cur = get().queue
    const seen = new Set(cur.map((t) => t.youtube?.videoId || t.id))
    const merged = [...cur]
    for (const t of tracks) {
      const id = t.youtube?.videoId || t.id
      if (!id || seen.has(id)) continue
      seen.add(id)
      merged.push(t)
    }
    set({ queue: merged })
    get()._saveQueue()
    get()._saveQueueRemote()
  },
  removeFromQueue: (id) => {
    const q = get().queue.filter((t) => (t.youtube?.videoId || t.id) !== id)
    set({ queue: q })
    get()._saveQueue()
    get()._saveQueueRemote()
  },
  togglePlay: () => {
    let yt = get().youtubePlayer
    const playing = get().isPlaying
    const cur = get().currentTrack
    // If no player yet but we have something to play, start it
    if (!yt) {
      if (cur && (cur.youtube?.videoId || cur.id)) {
        get().playNow(cur)
        return
      }
      const first = get().queue[0]
      if (first) {
        get().playNow(first)
        // consume the first since it becomes current
        const rest = get().queue.slice(1)
        set({ queue: rest })
        get()._saveQueue();
        get()._saveQueueRemote()
        return
      }
      return
    }
    try {
      if (playing) { yt.pauseVideo?.() } else { yt.playVideo?.() }
      set({ isPlaying: !playing })
    } catch {}
  },
  next: () => {
    const next = get().queue[0]
    if (!next) return
    get().playNow(next)
    const rest = get().queue.slice(1)
    set({ queue: rest })
    get()._saveQueue();
    get()._saveQueueRemote()
  },
  stopAll: () => {
    const yt = get().youtubePlayer
    if (yt) { try { yt.stopVideo?.() } catch {} }
    set({ isPlaying: false })
  },
  setVolume: (v) => {
    const vol = Math.max(0, Math.min(100, v))
    set({ volume: vol })
    try {
      const yt = get().youtubePlayer
      if (yt) {
        yt.unMute?.()
        yt.setVolume?.(vol)
      }
    } catch {}
    get()._saveVolume()
    get()._saveUserStateRemote({ volume: vol })
  },
  seekTo: (sec) => {
    try { get().youtubePlayer?.seekTo?.(sec, true) } catch {}
  },

  // Favorites
  toggleFavorite: (track) => {
    const favs = get().favorites
    const exists = favs.find((f) => f.id === track.id)
    const next = exists ? favs.filter((f) => f.id !== track.id) : [...favs, track]
    set({ favorites: next })
    get()._saveFavorites()
    // Save remote
    ;(async () => {
      try {
        if (!supabase) return
        const { data } = await supabase.auth.getSession()
        const userId = data?.session?.user?.id
        if (!userId) return
        await supabase.from('favorite_items').delete().eq('user_id', userId)
        const payload = next.map((t) => ({
          user_id: userId,
          video_id: t.youtube?.videoId || t.id || '',
          title: t.title || '',
          artist: t.artist || '',
          thumbnail: t.albumArt || '',
        }))
        if (payload.length) await supabase.from('favorite_items').insert(payload)
      } catch {}
    })()
  },

  // Playlist
  addToPlaylist: (track) => {
    const curPlaylist = get().playlist
    const id = track.youtube?.videoId || track.id
    const existsInPlaylist = curPlaylist.some((t) => (t.youtube?.videoId || t.id) === id)
    const p = existsInPlaylist ? curPlaylist : [...curPlaylist, track]
    set({ playlist: p })
    get()._savePlaylist()
    get()._savePlaylistRemote()

    // Also place into Queue (planned items live in Queue)
    const curQueue = get().queue
    const existsInQueue = curQueue.some((t) => (t.youtube?.videoId || t.id) === id)
    if (!existsInQueue) {
      const q = [...curQueue, track]
      set({ queue: q })
      get()._saveQueue()
      get()._saveQueueRemote()
    }
  },
  removeFromPlaylist: (id) => {
    const p = get().playlist.filter((t) => (t.youtube?.videoId || t.id) !== id)
    set({ playlist: p })
    get()._savePlaylist()
    get()._savePlaylistRemote()
  },
  clearHistory: () => {
    set({ history: [] })
    get()._saveHistory()
    ;(async () => { try { if (!supabase) return; const { data } = await supabase.auth.getSession(); const uid = data?.session?.user?.id; if (!uid) return; await supabase.from('play_history').delete().eq('user_id', uid) } catch {} })()
  },

  // Load remote state for authenticated user
  loadRemoteData: async () => {
    try {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      const userId = data?.session?.user?.id
      if (!userId) return
      const { data: qRows } = await supabase.from('queue_items').select('*').eq('user_id', userId).order('position', { ascending: true })
      const { data: fRows } = await supabase.from('favorite_items').select('*').eq('user_id', userId)
      const { data: pRows } = await supabase.from('playlist_items').select('*').eq('user_id', userId).order('position', { ascending: true })
      const { data: hRows } = await supabase.from('play_history').select('*').eq('user_id', userId).order('played_at', { ascending: false })
      const mapRow = (r) => ({
        id: r.video_id,
        title: r.title,
        artist: r.artist,
        albumArt: r.thumbnail,
        previewUrl: '',
        durationMs: 0,
        youtube: { videoId: r.video_id },
      })
      const q = Array.isArray(qRows) ? qRows.map(mapRow) : []
      const f = Array.isArray(fRows) ? fRows.map(mapRow) : []
      const p = Array.isArray(pRows) ? pRows.map(mapRow) : []
      const h = Array.isArray(hRows) ? hRows.map((r) => ({ ...mapRow(r), playedAt: Date.parse(r.played_at) || Date.now() })) : []
      set({ queue: q, favorites: f, playlist: p, history: h })
      get()._saveQueue()
      get()._saveFavorites()
      get()._savePlaylist()
      get()._saveHistory()
    } catch {}
  },

  _savePlaylistRemote: async () => {
    try {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      const userId = data?.session?.user?.id
      if (!userId) return
      const items = get().playlist
      await supabase.from('playlist_items').delete().eq('user_id', userId)
      const payload = items.map((t, idx) => ({
        user_id: userId,
        video_id: t.youtube?.videoId || t.id || '',
        title: t.title || '',
        artist: t.artist || '',
        thumbnail: t.albumArt || '',
        position: idx,
      }))
      if (payload.length) await supabase.from('playlist_items').insert(payload)
    } catch {}
  },
  _saveHistoryRemote: async () => {
    try {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      const userId = data?.session?.user?.id
      if (!userId) return
      await supabase.from('play_history').delete().eq('user_id', userId)
      const payload = get().history.map((t) => ({
        user_id: userId,
        video_id: t.youtube?.videoId || t.id || '',
        title: t.title || '',
        artist: t.artist || '',
        thumbnail: t.albumArt || '',
        played_at: new Date(t.playedAt || Date.now()).toISOString(),
      }))
      if (payload.length) await supabase.from('play_history').insert(payload)
    } catch {}
  },
}))