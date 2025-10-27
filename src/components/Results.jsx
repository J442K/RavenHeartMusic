import React from 'react'
import { usePlayerStore } from '../store'
import { createHiddenYouTubePlayer, createVisibleYouTubePlayer } from '../utils/youtube'

export default function Results({ items }) {
  const playNow = usePlayerStore(s => s.playNow)
  const addToQueue = usePlayerStore(s => s.addToQueue)
  const toggleFavorite = usePlayerStore(s => s.toggleFavorite)
  const addToPlaylist = usePlayerStore(s => s.addToPlaylist)
  const setYouTubePlayer = usePlayerStore(s => s.setYouTubePlayer)
  const ytPlayer = usePlayerStore(s => s.youtubePlayer)
  const mode = usePlayerStore(s => s.mode)

  const onPlay = async (item) => {
    // vinyl scratch sound effect
    const scratch = new Audio('https://cdn.jsdelivr.net/gh/TraeAI/cdn-assets@main/audio/vinyl-scratch.mp3')
    scratch.volume = 0.4
    scratch.play().catch(() => {})

    // If a player exists, just load the video; otherwise create hidden player
    if (ytPlayer) {
      playNow(item)
      return
    }
    if (item.youtube?.videoId) {
      const useVisible = mode === 'video'
      const containerId = useVisible ? 'yt-visible-player' : 'yt-hidden-root'
      let container = document.getElementById(containerId)
      if (!container) {
        container = document.createElement('div')
        container.id = containerId
        if (useVisible) {
          // Fallback: clean rectangular overlay if App hasn't rendered yet
          const overlay = document.createElement('div')
          overlay.className = 'fixed inset-0 bg-black/85 flex items-center justify-center z-[60]'
          overlay.onclick = () => {
            try { usePlayerStore.getState().setMode('music') } catch {}
          }
          const frame = document.createElement('div')
          frame.style.width = 'min(95vw, 1280px)'
          frame.style.maxHeight = '90vh'
          frame.style.padding = '12px'
          frame.style.borderRadius = '12px'
          frame.style.background = 'transparent'
          frame.style.border = '1px solid #333'
          const box = document.createElement('div')
          box.style.aspectRatio = '16/9'
          box.style.background = 'black'
          box.style.borderRadius = '10px'
          box.style.position = 'relative'
          frame.appendChild(box)
          box.appendChild(container)
          // Add custom fullscreen button in fallback overlay
          const fsBtn = document.createElement('button')
          fsBtn.textContent = 'Fullscreen'
          fsBtn.setAttribute('aria-label', 'Fullscreen')
          fsBtn.style.position = 'absolute'
          fsBtn.style.top = '8px'
          fsBtn.style.right = '8px'
          fsBtn.style.padding = '6px 10px'
          fsBtn.style.borderRadius = '8px'
          fsBtn.style.border = '1px solid #8b0000'
          fsBtn.style.background = '#8b0000'
          fsBtn.style.color = '#000'
          fsBtn.onclick = (ev) => {
            ev.stopPropagation()
            try {
              const el = box
              const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
              if (document.fullscreenElement) {
                document.exitFullscreen?.()
              } else {
                req?.call(el)
              }
            } catch {}
          }
          box.appendChild(fsBtn)
          overlay.appendChild(frame)
          document.body.appendChild(overlay)
        } else {
          container.style.width = '1px'
          container.style.height = '1px'
          container.style.opacity = '0'
          container.style.pointerEvents = 'none'
          document.body.appendChild(container)
        }
      }
      const creator = useVisible ? createVisibleYouTubePlayer : createHiddenYouTubePlayer
      const player = await creator(containerId, item.youtube.videoId, (p) => setYouTubePlayer(p))
      setYouTubePlayer(player)
      playNow(item)
    }
  }

  return (
    <section className="px-4 md:px-8 mt-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="card relative bg-coal border border-blood jagged hover-blood cursor-pointer" onClick={() => onPlay(item)} style={{ borderRadius: '8px' }}>
            <img
              src={item.albumArt}
              alt={item.title}
              className="w-full h-56 object-cover desaturate"
              onError={(e)=>{
                try {
                  const vid = item.youtube?.videoId || ''
                  if (vid) e.currentTarget.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`
                } catch {}
              }}
            />
            <div className="p-3">
              <div className="text-silver font-extrabold uppercase tracking-wide">{item.title}</div>
              <div className="text-blood text-sm">{item.artist}</div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={(e)=>{ e.stopPropagation(); onPlay(item) }} className="px-3 py-1 bg-blood text-black font-black jagged hover-blood" style={{ borderRadius: '8px' }}>Play now</button>
                <button onClick={(e)=>{ e.stopPropagation(); addToQueue(item) }} className="px-3 py-1 bg-coal text-silver border border-blood jagged hover-blood" style={{ borderRadius: '8px' }}>Add to queue</button>
                <button onClick={(e)=>{ e.stopPropagation(); addToPlaylist(item) }} className="px-3 py-1 bg-coal text-silver border border-blood jagged hover-blood" style={{ borderRadius: '8px' }}>Add to playlist</button>
                <button onClick={(e)=>{ e.stopPropagation(); toggleFavorite(item) }} className="px-3 py-1 bg-coal text-silver border border-blood jagged hover-blood" style={{ borderRadius: '8px' }} aria-label="Favorite">★</button>
              </div>
            </div>
            <div className="blood-overlay"></div>
          </div>
        ))}
      </div>
    </section>
  )
}