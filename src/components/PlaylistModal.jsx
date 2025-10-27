import React from 'react'
import { usePlayerStore } from '../store'

export default function PlaylistModal() {
  const show = usePlayerStore(s => s.isPlaylistOpen)
  const close = usePlayerStore(s => s.closePlaylist)
  const playlist = usePlayerStore(s => s.playlist)
  const playNow = usePlayerStore(s => s.playNow)
  const removeFromPlaylist = usePlayerStore(s => s.removeFromPlaylist)

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={close}>
      <div className="w-full max-w-2xl glass p-4" onClick={(e)=>e.stopPropagation()}>
        <div className="text-silver font-bold mb-3">My Playlist</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-auto">
          {playlist.map((t) => (
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
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={()=>{ close(); playNow(t) }} className="px-3 py-1 bg-blood text-black font-black jagged hover-blood" style={{ borderRadius: '8px' }}>Play</button>
                <button onClick={()=>removeFromPlaylist((t.youtube?.videoId)||t.id)} className="px-3 py-1 bg-coal text-silver border border-blood jagged hover-blood" style={{ borderRadius: '8px' }}>Remove</button>
              </div>
            </div>
          ))}
          {playlist.length === 0 && <div className="text-center text-silver">Your playlist is empty.</div>}
        </div>
      </div>
    </div>
  )
}