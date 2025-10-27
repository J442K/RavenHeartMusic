import React, { useState } from 'react'

export default function Netflix() {
  const [idsInput, setIdsInput] = useState('70140425,81566729,81171201,70172929')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])

  const fetchTypes = async (e) => {
    e?.preventDefault?.()
    const raw = idsInput.trim()
    if (!raw) return
    const ids = raw.split(',').map(s => s.trim()).filter(Boolean)
    if (!ids.length) return
    setLoading(true)
    setError('')
    try {
      const workerBase = import.meta.env.VITE_WORKER_BASE_URL || ''
      const url = `${workerBase}/rapid/netflix/title/type?titleIds=${encodeURIComponent(ids.join(','))}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('RapidAPI error')
      const json = await res.json()
      const videos = json?.data?.videos || []
      const mapped = videos.map(v => ({
        id: String(v.videoId),
        type: v.__typename,
        hasLiveEvent: v.hasLiveEvent ?? false,
        nextLiveEvent: v.nextLiveEvent ?? v.liveEvent ?? null,
      }))
      setItems(mapped)
    } catch (err) {
      setError('Failed to fetch Netflix data.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="netflix-section" className="px-4 md:px-8 mt-8" style={{ scrollMarginTop: '4rem', scrollMarginBottom: '6rem' }}>
      <div className="max-w-3xl mx-auto glass jagged p-4 md:p-6" style={{ borderRadius: '8px' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-silver font-bold text-lg">Netflix</div>
          <div className="text-silver/70 text-sm">RapidAPI: Title Type</div>
        </div>
        <form onSubmit={fetchTypes} className="flex items-center gap-3">
          <input
            className="flex-1 bg-coal text-silver p-3 border border-blood electric hover-blood jagged"
            placeholder="Comma-separated Netflix title IDs"
            value={idsInput}
            onChange={(e)=>setIdsInput(e.target.value)}
            aria-label="Netflix Title IDs"
            style={{ borderRadius: '8px' }}
          />
          <button type="submit" className="px-4 py-2 bg-blood text-black font-black jagged hover-blood" style={{ borderRadius: '8px' }}>Fetch</button>
        </form>
        <div className="mt-3">
          {loading && <span className="text-silver">Loading…</span>}
          {!loading && !!error && <span className="text-blood">{error}</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {items.map((item) => (
            <div key={item.id} className="bg-coal border border-blood p-3 jagged" style={{ borderRadius: '8px' }}>
              <div className="text-silver font-bold">{item.id}</div>
              <div className="text-sm text-blood">{item.type}</div>
              {item.hasLiveEvent && <div className="text-xs text-silver mt-1">Live event</div>}
              {item.nextLiveEvent && <div className="text-xs text-silver/70 mt-1">Next: {String(item.nextLiveEvent)}</div>}
            </div>
          ))}
          {!loading && items.length === 0 && <div className="text-silver/70">Enter IDs and fetch to see types.</div>}
        </div>
      </div>
    </section>
  )
}