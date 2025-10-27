import React, { useState, useEffect } from 'react'
import Login from './Auth/Login.jsx'
import Register from './Auth/Register.jsx'
import { useAuthStore } from '../storeAuth'
import { usePlayerStore } from '../store'
import { supabase } from '../lib/supabase'

export default function Header(){
  const [open, setOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  // Playlist moved to global modal
  const [tab, setTab] = useState('login')
  const user = useAuthStore(s => s.user)
  const signOut = useAuthStore(s => s.signOut)
  const authEnabled = !!supabase
  const history = usePlayerStore(s => s.history)
  const playlist = usePlayerStore(s => s.playlist)
  const queue = usePlayerStore(s => s.queue)
  const playNow = usePlayerStore(s => s.playNow)
  const addToPlaylist = usePlayerStore(s => s.addToPlaylist)
  const removeFromPlaylist = usePlayerStore(s => s.removeFromPlaylist)
  const removeFromQueue = usePlayerStore(s => s.removeFromQueue)
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const clearHistory = usePlayerStore(s => s.clearHistory)
  const openCommandBar = usePlayerStore(s => s.openCommandBar)
  const openPlaylist = usePlayerStore(s => s.openPlaylist)

  // Auto-close auth modal when a user session is present
  useEffect(() => {
    if (user) setShowAuth(false)
  }, [user])
  return (
    <header className="fixed top-0 left-0 right-0 h-12 flex items-center justify-between px-4 bg-black/70 border-b-2 border-blood z-50">
      <div className="flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 200 200" className="text-silver">
          <path fill="currentColor" d="M20,120 C60,60 140,60 180,120 C160,110 130,105 120,130 C115,145 95,160 80,160 C60,160 40,150 30,140 C25,135 22,130 20,120 Z"></path>
        </svg>
        <span className="font-metal tracking-wider">RavenHeartMusic</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={openCommandBar} className="px-3 py-1 bg-blood text-black font-black jagged hover-blood" style={{ borderRadius: '8px' }}>
          Search
        </button>
        {user && authEnabled && (
          <button onClick={signOut} className="px-3 py-1 bg-blood text-black font-black jagged hover-blood" style={{ borderRadius: '8px' }}>Leave</button>
        )}
        {!user && authEnabled && (
          <button onClick={()=>{ setShowAuth(true); setTab('login') }} className="px-3 py-1 bg-blood text-black font-black jagged hover-blood" style={{ borderRadius: '8px' }}>Enter</button>
        )}
        {!authEnabled && (
          <span className="px-3 py-1 text-silver/70 border border-blood jagged" style={{ borderRadius: '8px' }} title="Auth disabled — add Supabase env vars to enable">Auth disabled</span>
        )}
        <button onClick={()=>setOpen(!open)} className="w-10 h-10 flex items-center justify-center bg-coal jagged hover-blood" style={{ borderRadius: '8px' }} aria-label="Menu">
          {open ? (
            // Raven skull (simplified) when open
            <svg viewBox="0 0 24 24" width="24" height="24" className="text-blood">
              <path fill="currentColor" d="M12 2c-4.4 0-8 3.6-8 8 0 3.2 1.9 5.9 4.6 7l1.4 3h3l1.4-3C18.1 15.9 20 13.2 20 10c0-4.4-3.6-8-8-8zm-3 9a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
          ) : (
            // Hamburger when closed
            <svg viewBox="0 0 24 24" width="24" height="24" className="text-silver">
              <path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="absolute top-12 right-4 w-64 glass jagged p-3 border border-blood z-40" style={{ borderRadius: '8px' }}>
          <div className="text-silver font-bold mb-2">Menu</div>
          <button onClick={()=>setShowHistory(true)} className="w-full text-left px-3 py-2 bg-coal text-silver border border-blood jagged hover-blood mb-2" style={{ borderRadius: '8px' }}>
            History <span className="text-sm">({history.length})</span>
          </button>
          <button onClick={openPlaylist} className="w-full text-left px-3 py-2 bg-coal text-silver border border-blood jagged hover-blood mb-2" style={{ borderRadius: '8px' }}>
            Playlist <span className="text-sm">({playlist.length})</span>
          </button>
          {/* Removed Netflix menu entry */}
        </div>
      )}

      {/* Left-side sliding queue drawer (no jagged styling) */}
      <div
        className={`fixed top-12 left-0 bottom-20 w-[320px] glass border-r-2 border-blood z-50 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full pointer-events-none opacity-0'}`}
        style={{ borderRadius: '0 12px 12px 0' }}
        aria-hidden={!open}
      >
        <div className="p-3 h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-silver font-bold">Up Next</div>
            <div className="text-xs text-silver/70">{queue.length} item{queue.length===1?'':'s'}</div>
          </div>
          <div className="flex-1 overflow-auto grid grid-cols-1 gap-3">
            {queue.map((t) => (
              <div key={(t.youtube?.videoId)||t.id} className="bg-coal border border-blood p-3" style={{ borderRadius: '8px' }}>
                <div className="flex gap-3">
                  {t.albumArt && (
                    <img
                      src={t.albumArt}
                      alt={t.title}
                      className="w-14 h-14 object-cover desaturate"
                      onError={(e)=>{
                        try {
                          const vid = t.youtube?.videoId || ''
                          if (vid) e.currentTarget.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`
                        } catch {}
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-silver font-bold truncate">{t.title}</div>
                    <div className="text-blood text-xs truncate">{t.artist}</div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={()=>{ setOpen(false); playNow(t) }} className="px-2 py-1 bg-blood text-black font-black hover-blood text-xs" style={{ borderRadius: '8px' }}>Play</button>
                  <button onClick={()=>removeFromQueue((t.youtube?.videoId)||t.id)} className="px-2 py-1 bg-coal text-silver border border-blood hover-blood text-xs" style={{ borderRadius: '8px' }}>Remove</button>
                </div>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="text-center text-silver/80">Queue is empty.</div>
            )}
          </div>
          {currentTrack && (
            <div className="mt-3 text-xs text-silver/70">Now playing: <span className="text-silver">{currentTrack.title}</span></div>
          )}
        </div>
      </div>

      {showAuth && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={()=>setShowAuth(false)}>
          <div className="w-full max-w-md glass p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="flex gap-3 mb-4">
              <button onClick={()=>setTab('login')} className={`px-3 py-1 jagged ${tab==='login' ? 'bg-blood text-black' : 'bg-coal text-silver'} hover-blood`} style={{ borderRadius: '8px' }}>Login</button>
              <button onClick={()=>setTab('register')} className={`px-3 py-1 jagged ${tab==='register' ? 'bg-blood text-black' : 'bg-coal text-silver'} hover-blood`} style={{ borderRadius: '8px' }}>Register</button>
            </div>
            {tab === 'login' ? <Login onSuccess={()=>setShowAuth(false)} /> : <Register onSuccess={()=>setShowAuth(false)} />}
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={()=>setShowHistory(false)}>
          <div className="w-full max-w-2xl glass p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-silver font-bold">Play History</div>
              <button onClick={()=>clearHistory()} className="px-3 py-1 bg-coal text-silver border border-blood jagged hover-blood" style={{ borderRadius: '8px' }}>Clear</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-auto">
              {history.map((t) => (
                <div key={(t.youtube?.videoId)||t.id} className="bg-coal border border-blood p-3 jagged" style={{ borderRadius: '8px' }}>
                  <div className="flex gap-3">
                    {t.albumArt && (
                      <img
                        src={t.albumArt}
                        alt={t.title}
                        className="w-16 h-16 object-cover desaturate"
                        onError={(e)=>{
                          try {
                            const vid = t.youtube?.videoId || ''
                            if (vid) e.currentTarget.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`
                          } catch {}
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-silver font-bold">{t.title}</div>
                      <div className="text-blood text-sm">{t.artist}</div>
                      <div className="text-xs text-silver/70 mt-1">{new Date(t.playedAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={()=>{ setShowHistory(false); playNow(t) }} className="px-3 py-1 bg-blood text-black font-black jagged hover-blood" style={{ borderRadius: '8px' }}>Play</button>
                    <button onClick={()=>addToPlaylist(t)} className="px-3 py-1 bg-coal text-silver border border-blood jagged hover-blood" style={{ borderRadius: '8px' }}>Add to playlist</button>
                  </div>
                </div>
              ))}
              {history.length === 0 && <div className="text-center text-silver">No plays yet.</div>}
            </div>
          </div>
        </div>
      )}

    </header>
  )
}