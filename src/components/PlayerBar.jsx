import React, { useMemo } from 'react'
import { usePlayerStore } from '../store'

export default function PlayerBar() {
  const current = usePlayerStore(s => s.currentTrack)
  const isPlaying = usePlayerStore(s => s.isPlaying)
  const progressSec = usePlayerStore(s => s.ytProgressSec)
  const durationSec = usePlayerStore(s => s.ytDurationSec)
  const volume = usePlayerStore(s => s.volume)
  const queue = usePlayerStore(s => s.queue)
  const playlist = usePlayerStore(s => s.playlist)
  const openPlaylist = usePlayerStore(s => s.openPlaylist)
  const togglePlay = usePlayerStore(s => s.togglePlay)
  const next = usePlayerStore(s => s.next)
  const stopAll = usePlayerStore(s => s.stopAll)
  const setVolume = usePlayerStore(s => s.setVolume)
  const seekTo = usePlayerStore(s => s.seekTo)
  const mode = usePlayerStore(s => s.mode)
  const setMode = usePlayerStore(s => s.setMode)
  const autoCloseOnEnd = usePlayerStore(s => s.autoCloseOnEnd)
  const setAutoCloseOnEnd = usePlayerStore(s => s.setAutoCloseOnEnd)

  const pct = useMemo(() => {
    if (!durationSec) return 0
    return Math.min(100, Math.floor((progressSec / durationSec) * 100))
  }, [progressSec, durationSec])

  const volPct = useMemo(() => `${Math.max(0, Math.min(100, volume))}%`, [volume])

  const fmt = (s) => {
    const n = Math.max(0, Math.floor(s || 0))
    const mm = Math.floor(n / 60).toString().padStart(2,'0')
    const ss = (n % 60).toString().padStart(2,'0')
    return `${mm}:${ss}`
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 glass border-t-2 border-blood flex items-center justify-between px-4 md:px-8" style={{ backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 200 200" className="text-silver">
          <path fill="currentColor" d="M20,120 C60,60 140,60 180,120 C160,110 130,105 120,130 C115,145 95,160 80,160 C60,160 40,150 30,140 C25,135 22,130 20,120 Z"></path>
        </svg>
        <div className="flex items-center gap-2">
          <div className="text-silver font-extrabold">{current ? `${current.title}` : 'Idle'}</div>
          <div className="text-blood text-xs">{current ? current.artist : '—'}</div>
          <div className="text-silver text-xs opacity-70">Queue: {queue.length}</div>
          <button onClick={openPlaylist} className="ml-2 px-2 py-1 bg-coal text-silver border border-blood jagged hover-blood text-xs" style={{ borderRadius: '8px' }} aria-label="Open Playlist">
            Playlist ({playlist.length})
          </button>
        </div>
      </div>

      <div className="flex-1 mx-6">
        <div className="w-full h-3 bg-black border-y border-blood/60 relative overflow-hidden cursor-pointer" onClick={(e)=>{
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const ratio = Math.max(0, Math.min(1, x / rect.width))
          const target = ratio * (durationSec || 0)
          seekTo(target)
        }}>
          <div className="h-full bg-blood" style={{ width: `${pct}%`, transition: 'width 100ms linear' }}></div>
          {/* Optional handle for visibility */}
          <div className="absolute top-1/2 -translate-y-1/2 h-3 w-[2px] bg-silver/70" style={{ left: `${pct}%` }} />
        </div>
        <div className="text-silver text-xs flex items-center justify-end gap-3 mt-1">
          <div className="text-silver/80 tabular-nums">{fmt(progressSec)} / {fmt(durationSec)}</div>
          <button onClick={togglePlay} className="px-3 py-1 bg-blood text-black font-black jagged hover-blood" style={{ borderRadius: '8px' }}>{isPlaying ? 'Pause' : 'Play'}</button>
          <button onClick={next} className="px-3 py-1 bg-coal text-silver border border-blood jagged hover-blood" style={{ borderRadius: '8px' }}>Next</button>
          <button onClick={stopAll} className="px-3 py-1 bg-coal text-silver border border-blood jagged hover-blood" style={{ borderRadius: '8px' }}>Stop</button>
          <div className="flex items-center gap-3">
            <span className="text-xs">Mode</span>
            <div className="relative inline-flex items-center select-none" aria-label="Toggle playback mode">
              <div className="relative w-36 h-9 bg-coal border border-blood jagged" style={{ borderRadius: '999px' }}>
                <div
                  className="absolute top-0 h-full w-1/2 bg-blood text-black jagged"
                  style={{ left: mode==='video' ? '50%' : '0%', borderRadius: '999px', transition: 'left 200ms ease' }}
                />
                <button
                  className="absolute left-0 top-0 z-10 w-1/2 h-full text-xs font-bold"
                  onClick={()=>setMode('music')}
                  aria-pressed={mode==='music'}
                >
                  Music
                </button>
                <button
                  className="absolute left-1/2 top-0 z-10 w-1/2 h-full text-xs font-bold"
                  onClick={()=>setMode('video')}
                  aria-pressed={mode==='video'}
                >
                  Video
                </button>
              </div>
            </div>
            <button onClick={()=>setAutoCloseOnEnd(!autoCloseOnEnd)} className={`ml-2 px-2 py-1 jagged bg-coal text-silver border border-blood hover-blood`} style={{ borderRadius: '8px' }} aria-pressed={autoCloseOnEnd} aria-label="Return to Search when video ends">
              {autoCloseOnEnd ? 'Auto-close: On' : 'Auto-close: Off'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-silver">Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e)=>setVolume(parseInt(e.target.value,10))}
              className="appearance-none vol-range"
              style={{ accentColor: '#8b0000', ['--val']: volPct }}
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  )
}