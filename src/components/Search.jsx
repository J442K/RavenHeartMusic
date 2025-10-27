import React, { useState } from 'react'
import { usePlayerStore } from '../store'
import { searchYouTube } from '../utils/youtube'

export default function Search({ onResults }) {
  const [term, setTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [noResults, setNoResults] = useState(false)
  const openCommandBar = usePlayerStore(s => s.openCommandBar)

  const runSearch = async (e) => {
    e?.preventDefault?.()
    if (!term.trim()) return
    setLoading(true)
    setError('')
    setNoResults(false)
    try {
      const yt = await searchYouTube(term, 12)
      const items = yt.map((y) => {
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
      })
      onResults(items)
      if (items.length === 0) setNoResults(true)
    } catch (err) {
      setError('Search failed. Please try again or check your API key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="px-4 md:px-8">
      <form onSubmit={runSearch} className="max-w-2xl mx-auto glass jagged p-4 md:p-6 rounded-md" style={{ borderRadius: '8px' }}>
        <label className="block text-silver mb-2">Find your funeral anthem…</label>
        <input
          className="w-full bg-coal text-silver p-3 border border-blood electric hover-blood jagged"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Type a track or artist"
          id="search-input"
          onFocus={()=>openCommandBar()}
          onClick={()=>openCommandBar()}
        />
        <div className="flex items-center gap-3 mt-4">
          <button type="submit" className="px-5 py-2 bg-blood text-silver font-bold tracking-wide hover-blood jagged" style={{ borderRadius: '8px' }}>Search</button>
          {loading && <span className="text-silver">Searching…</span>}
          {!loading && noResults && <span className="text-blood">No results found.</span>}
          {!loading && !!error && <span className="text-blood">{error}</span>}
        </div>
      </form>
    </section>
  )
}