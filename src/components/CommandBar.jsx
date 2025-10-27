import React, { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store'
import { searchYouTube, parseYouTubeUrl, fetchYouTubePlaylistItems, fetchYouTubeVideoInfo } from '../utils/youtube'
import { useAuthStore } from '../storeAuth'
import Login from './Auth/Login.jsx'
import Register from './Auth/Register.jsx'

export default function CommandBar() {
  const show = usePlayerStore(s => s.showCommandBar)
  const close = usePlayerStore(s => s.closeCommandBar)
  const open = usePlayerStore(s => s.openCommandBar)
  const setMode = usePlayerStore(s => s.setMode)
  const inputRef = useRef(null)
  const [term, setTerm] = useState('')
  const [ytResults, setYtResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPlaylist, setIsPlaylist] = useState(false)
  const [playlistCount, setPlaylistCount] = useState(0)
  const user = useAuthStore(s => s.user)
  const [showAuth, setShowAuth] = useState(false)
  const [authTab, setAuthTab] = useState('login')
  

  useEffect(() => {
    const handler = (e) => {
      const key = (e.key || '').toLowerCase()
      const isCtrlK = key === 'k' && (e.ctrlKey || e.metaKey)
      const isSlash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey
      if (!show && (isCtrlK || isSlash)) {
        e.preventDefault()
        open()
        return
      }
      if (show) {
        if (key === 'escape') { e.preventDefault(); close(); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [show, open, close])

  useEffect(() => {
    // reset on open
    if (show) {
      setTerm('')
      setYtResults([])
      setError('')
      setIsPlaylist(false)
      setPlaylistCount(0)
    }
  }, [show])

  useEffect(() => {
    if (show) {
      setTimeout(() => { try { inputRef.current?.focus?.() } catch {} }, 50)
    }
  }, [show])

  const playNow = usePlayerStore(s => s.playNow)
  const addToPlaylist = usePlayerStore(s => s.addToPlaylist)
  const addManyToQueue = usePlayerStore(s => s.addManyToQueue)

  const toTrack = (y) => {
    const thumb = y.thumbnail || (y.videoId ? `https://i.ytimg.com/vi/${y.videoId}/hqdefault.jpg` : '')
    return {
      id: y.videoId || y.title,
      title: y.title,
      artist: y.channelTitle || 'YouTube',
      albumArt: thumb,
      previewUrl: '',
      durationMs: 0,
      youtube: y,
    }
  }
  const selectTrack = (y) => {
    const track = toTrack(y)
    // default to video mode for reliable user-gesture playback
    setMode('video')
    playNow(track)
    close()
  }

  const runSearch = async () => {
    const input = term.trim()
    if (!input) return
    setLoading(true)
    setError('')
    try {
      // Detect YouTube URL or Playlist
      const parsed = parseYouTubeUrl(input)
      if (parsed?.playlistId) {
        const items = await fetchYouTubePlaylistItems(parsed.playlistId, 200)
        setYtResults(items)
        setIsPlaylist(true)
        setPlaylistCount(items.length)
        if (items.length === 0) {
          setError('No items found. The playlist may be private or blocked by source. Try again in a moment.')
        }
      } else if (parsed?.videoId) {
        const info = await fetchYouTubeVideoInfo(parsed.videoId)
        setYtResults([info])
        setIsPlaylist(false)
        setPlaylistCount(0)
      } else {
        const yt = await searchYouTube(input, 12)
        setYtResults(yt)
        setIsPlaylist(false)
        setPlaylistCount(0)
        if (yt.length === 0) {
          setError('No results found. Try a different query or paste a link.')
        }
      }
    } catch (err) {
      setError('Search failed. Please try again or check your API key.')
    } finally {
      setLoading(false)
    }
  }

  const addAllToQueue = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (!user) {
      setShowAuth(true)
      setAuthTab('login')
      return
    }
    const tracks = ytResults.map(toTrack)
    addManyToQueue(tracks)
    close()
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={close}>
      <div className="w-full max-w-2xl bg-coal/90 border border-blood jagged p-4 md:p-6 commandbar-panel" onClick={(e)=>e.stopPropagation()} style={{ borderRadius: '10px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="text-silver font-bold mb-3">YouTube Search</div>
        <div className="mt-4">
          <div>
            <input
              ref={inputRef}
              value={term}
              onChange={(e)=>setTerm(e.target.value)}
              onKeyDown={(e)=>{ if (e.key==='Enter') { e.preventDefault(); runSearch() } }}
              placeholder="Search or paste a YouTube link or playlist URL"
              className="w-full bg-coal text-silver p-3 border border-blood electric jagged"
              style={{ borderRadius: '8px' }}
            />
            <div className="flex items-center gap-3 mt-3">
              <button onClick={runSearch} className="px-4 py-2 bg-blood text-black font-black jagged hover-blood" style={{ borderRadius: '8px' }}>Search</button>
              {loading && <span className="text-silver">Working…</span>}
              {!loading && !!error && <span className="text-blood">{error}</span>}
              {!loading && isPlaylist && ytResults.length > 0 && (
                user ? (
                  <button onClick={addAllToQueue} className="px-4 py-2 bg-coal text-silver border border-blood jagged hover-blood" style={{ borderRadius: '8px' }}>
                    Add all to Queue ({playlistCount})
                  </button>
                ) : (
                  <button onClick={addAllToQueue} className="px-4 py-2 bg-coal text-silver border border-blood jagged hover-blood" style={{ borderRadius: '8px' }}>
                    Sign in to add all
                  </button>
                )
              )}
            </div>
            <div className="mt-4 max-h-[50vh] overflow-auto grid grid-cols-1 md:grid-cols-2 gap-3 commandbar-results">
              {ytResults.map((y) => (
                <button key={y.videoId || y.title} onClick={()=>selectTrack(y)} className="text-left bg-coal border border-blood p-3 hover-blood" style={{ borderRadius: '8px' }}>
                  <div className="flex items-start gap-3">
                    <img
                      src={y.thumbnail || (y.videoId ? `https://i.ytimg.com/vi/${y.videoId}/hqdefault.jpg` : '')}
                      alt={y.title}
                      className="w-24 h-14 object-cover rounded"
                      onError={(e)=>{
                        try {
                          if (y.videoId) e.currentTarget.src = `https://i.ytimg.com/vi/${y.videoId}/hqdefault.jpg`
                        } catch {}
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-silver leading-snug">{y.title}</div>
                      <div className="text-blood text-xs mt-1">{y.channelTitle}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          className="px-3 py-1 bg-coal text-silver border border-blood jagged hover-blood"
                          style={{ borderRadius: '8px' }}
                          onClick={(e)=>{ e.stopPropagation(); addToPlaylist(toTrack(y)) }}
                        >Add to playlist</button>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {!loading && ytResults.length===0 && term && <div className="text-silver/60">No results.</div>}
            </div>
          </div>
        </div>
        <div className="text-silver/70 text-xs mt-3">Press <span className="text-silver">Esc</span> to close. Open anywhere with <span className="text-silver">Ctrl+K</span> or <span className="text-silver">/</span>.</div>
      </div>
      {showAuth && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]" onClick={()=>setShowAuth(false)}>
          <div className="w-full max-w-md glass p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="flex gap-3 mb-4">
              <button onClick={()=>setAuthTab('login')} className={`px-3 py-1 jagged ${authTab==='login' ? 'bg-blood text-black' : 'bg-coal text-silver'} hover-blood`} style={{ borderRadius: '8px' }}>Login</button>
              <button onClick={()=>setAuthTab('register')} className={`px-3 py-1 jagged ${authTab==='register' ? 'bg-blood text-black' : 'bg-coal text-silver'} hover-blood`} style={{ borderRadius: '8px' }}>Register</button>
            </div>
            {authTab === 'login' ? (
              <Login onSuccess={()=>setShowAuth(false)} />
            ) : (
              <Register onSuccess={()=>setShowAuth(false)} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}