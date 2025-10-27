import React, { useEffect, useState } from 'react'
import Hero from './components/Hero.jsx'
// Removed standalone Search and Netflix sections; consolidated into CommandBar
import CommandBar from './components/CommandBar.jsx'
import PlayerBar from './components/PlayerBar.jsx'
import PlaylistModal from './components/PlaylistModal.jsx'
import Header from './components/Header.jsx'
import MusicProgress from './components/MusicProgress.jsx'
import { initAuthListener } from './storeAuth'
import { usePlayerStore } from './store'
import { useAuthStore } from './storeAuth'

export default function App() {
  // Results now managed via CommandBar; standalone results state removed
  const user = useAuthStore(s => s.user)
  const mode = usePlayerStore(s => s.mode)
  const setMode = usePlayerStore(s => s.setMode)
  const ytPlayer = usePlayerStore(s => s.youtubePlayer)

  useEffect(() => {
    initAuthListener()
    // initialize player store from localStorage
    try { usePlayerStore.getState().init() } catch {}
    // Attempt local resume even before login
    try { usePlayerStore.getState().resumeFromLastState?.() } catch {}
  }, [])

  useEffect(() => {
    // When user logs in, load per-account queue/favorites
    if (user) {
      ;(async () => {
        try { await usePlayerStore.getState().loadRemoteData() } catch {}
        try { await usePlayerStore.getState().resumeFromLastState?.() } catch {}
      })()
    }
  }, [user])

  return (
    <div className="min-h-screen bg-transparent text-silver pb-28">
      <Header />
      <MusicProgress />
      <PlaylistModal />
      <CommandBar />
      <Hero />
      {/* Divider removed */}
      {/* Search and Netflix functionality lives inside CommandBar overlay */}
      {mode === 'video' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]" onClick={()=>setMode('music')}>
          {/* Branded frame around minimized player */}
          <div
            className="glass border border-blood shadow-2xl relative p-3"
            onClick={(e)=>e.stopPropagation()}
            style={{ borderRadius: '12px', width: 'min(90vw, 1200px)', maxHeight: '80vh' }}
          >
            <div
              className="bg-black border border-blood/60 relative"
              style={{ borderRadius: '8px', aspectRatio: '16/9' }}
            >
              <div id="yt-visible-player" className="w-full h-full"></div>
              {/* Site branding overlay (non-interactive); hidden naturally in fullscreen */}
              <div className="absolute top-2 left-2 z-[65] pointer-events-none bg-black/60 text-silver font-extrabold border border-blood px-3 py-1" style={{ borderRadius: '8px' }}>
                RavenHeartTunes
              </div>
              {/* Custom fullscreen button */}
              <button
                className="absolute top-2 right-2 z-[66] px-3 py-1 bg-blood text-black font-black border border-blood hover-blood"
                style={{ borderRadius: '8px' }}
                onClick={(e)=>{
                  e.stopPropagation()
                  try {
                    const p = usePlayerStore.getState().youtubePlayer
                    const iframe = p?.getIframe?.()
                    const el = iframe || document.getElementById('yt-visible-player')
                    if (!el) return
                    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
                    if (document.fullscreenElement) {
                      document.exitFullscreen?.()
                    } else {
                      req?.call(el)
                    }
                  } catch {}
                }}
                aria-label="Fullscreen"
              >
                Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}
      <PlayerBar />
    </div>
  )
}