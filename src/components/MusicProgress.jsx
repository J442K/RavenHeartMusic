import React, { useMemo } from 'react'
import { usePlayerStore } from '../store'

export default function MusicProgress() {
  const mode = usePlayerStore(s => s.mode)
  const progressSec = usePlayerStore(s => s.ytProgressSec)
  const durationSec = usePlayerStore(s => s.ytDurationSec)
  const seekTo = usePlayerStore(s => s.seekTo)

  const pct = useMemo(() => {
    if (!durationSec) return 0
    return Math.min(100, Math.floor((progressSec / durationSec) * 100))
  }, [progressSec, durationSec])

  if (mode !== 'music') return null

  return (
    <div
      className={`fixed top-12 left-0 right-0 z-40 h-[6px] border-t border-b border-blood/60 ${durationSec ? 'bg-black/90 cursor-pointer' : 'bg-black/70 cursor-default'}`}
      onClick={(e)=>{
        if (!durationSec) return
        try {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const target = Math.floor((x / rect.width) * (durationSec || 0))
          seekTo(target)
        } catch {}
      }}
      aria-label="Music progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={durationSec || 0}
      aria-valuenow={progressSec || 0}
    >
      <div
        className="h-full bg-blood transition-[width] duration-150 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}