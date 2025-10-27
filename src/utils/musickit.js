const devToken = import.meta.env.VITE_MUSICKIT_TOKEN || import.meta.env.REACT_APP_MUSICKIT_TOKEN;
const STOREFRONT = 'us';

export async function initMusicKit() {
  return new Promise((resolve, reject) => {
    const wait = () => {
      if (window.MusicKit) {
        try {
          window.MusicKit.configure({
            developerToken: devToken,
            app: { name: 'RavenHeartMedia', build: '1.0.0' },
          });
          resolve(window.MusicKit.getInstance());
        } catch (e) {
          reject(e);
        }
      } else {
        setTimeout(wait, 100);
      }
    };
    wait();
  });
}

export async function searchApple(term, limit = 12) {
  if (!devToken) return [];
  const url = `https://api.music.apple.com/v1/catalog/${STOREFRONT}/search?term=${encodeURIComponent(term)}&types=songs&limit=${limit}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${devToken}` } });
  if (!res.ok) return [];
  const json = await res.json();
  const songs = json?.results?.songs?.data || [];
  return songs.map((s) => {
    const a = s.attributes;
    const art = a.artwork?.url?.replace('{w}', '300').replace('{h}', '300') || '';
    const preview = a.previews?.[0]?.url || '';
    return {
      id: s.id,
      title: a.name,
      artist: a.artistName,
      albumArt: art,
      previewUrl: preview,
      durationMs: 30000,
    };
  });
}