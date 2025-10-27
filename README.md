# RavenHeartTunes

Dark-emotional single-page music site. Apple Music 30s previews + YouTube background streaming (hidden, auto-mute for autoplay, unmute on crossfade). Built with React 18, Vite, TailwindCSS, Zustand.

## Setup

- Node 18+
- Copy `.env.example` to `.env` and fill keys.

### Apple MusicKit Developer Token
- Create an Apple Developer account.
- Generate a MusicKit developer token.
- Docs: https://developer.apple.com/documentation/musickitjs

### YouTube Data API v3
- Enable YouTube Data API v3 in Google Cloud console.
- Create an API key.
- Docs: https://developers.google.com/youtube/v3/getting-started

## Scripts

- `npm i`
- `npm run dev` (http://localhost:5173)
- `npm run build`
- `npm run preview`

## Notes
- Apple previews only (30s). Full tracks require OAuth user token and subscription; not used here.

## Accounts (Supabase Auth)

- Create a Supabase project, turn on Username as required identity, optional email, and disable confirm_email.
- Keep RLS enabled.
- Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
- Login/Register forms are in `src/components/Auth/` and wired via the header “Enter” button.

### Security posture
- Supabase returns short-lived access JWTs and long-lived refresh tokens. Prefer HttpOnly cookies for refresh on server stacks; the SPA client manages refresh automatically.
- Do not expose raw FLAC URLs in the DOM.

## Secure Streaming (Cloudflare Worker + Backblaze B2)

1. Store FLACs in Backblaze B2 (S3-compatible).
2. Deploy `cloudflare/worker.js` with Wrangler. Set env `SUPABASE_JWT_SECRET` and B2 presign endpoint vars in `wrangler.toml`.
3. The Worker verifies Supabase JWT and 302 redirects to a 60s pre-signed B2 URL.
4. Client uses `src/utils/secureStream.js` to fetch the redirect with `Authorization: Bearer <jwt>` and then loads the resulting URL into an `Audio` element.

### Rate-limiting & brute-force
- Enable Supabase captcha in Auth settings.
- Use Cloudflare rate-limit (example in `wrangler.toml`: `10 req/IP/10s`).

### GDPR / data minimisation
- Only collect email when provided.
- Choose EU region in Supabase if targeting EU users.
- Provide account deletion: can be added via Supabase Admin API.

## RapidAPI (Server-side only)

If you need to use RapidAPI endpoints, never put secrets in the frontend. Use the included Cloudflare Worker proxy:

- Set in `cloudflare/wrangler.toml`:
  - `RAPIDAPI_PROXY_SECRET` (required for Enterprise proxies)
  - `RAPIDAPI_KEY` (optional Marketplace key, if applicable)
- Deploy the Worker (`wrangler deploy`).
- Call the whitelisted YouTube search proxy from the client:
  - `GET /rapid/youtube/search?q=<term>&maxResults=12`
  - The Worker forwards to `youtube-v3-alternative.p.rapidapi.com` with the secret.

### Netflix (RapidAPI example)

This project includes a whitelisted Netflix endpoint proxy:

- `GET /rapid/netflix/title/type?titleIds=<comma-separated-ids>`
- Proxies to `https://netflix-api8.p.rapidapi.com/api/title/type` with your RapidAPI credentials.

Example curl equivalent:

```
curl --request GET \
  --url 'https://your-app.example.com/rapid/netflix/title/type?titleIds=70140425,81566729,81171201,70172929'
```

Client-side example:

```js
// From the SPA (no secrets in browser)
const ids = ['70140425','81566729','81171201','70172929']
const res = await fetch(`/rapid/netflix/title/type?titleIds=${encodeURIComponent(ids.join(','))}`)
const json = await res.json()
```

Notes:
- Set `RAPIDAPI_KEY` via Wrangler secrets (and `RAPIDAPI_PROXY_SECRET` if your org uses it).
- Do not place RapidAPI keys in `.env` for the SPA; they must remain server-side in the Worker.

Recommended: store secrets using Wrangler rather than committing in `wrangler.toml`:

```
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put RAPIDAPI_PROXY_SECRET
wrangler secret put MEDIA_API_KEY
```

### Cloudflare Worker Setup Steps

- Install Wrangler: `npm i -g wrangler`
- In `cloudflare/wrangler.toml`, set:
  - `SUPABASE_JWT_SECRET` to your Supabase JWT secret (Project Settings → API).
  - `RAPIDAPI_PROXY_SECRET` to your organization or proxy secret.
  - Optional `RAPIDAPI_KEY` if you use Marketplace access.
  - `MEDIA_TOKEN_ENDPOINT` to your token service base URL.
  - `MEDIA_API_KEY` to your server-side token API key.
- From `cloudflare/`, run: `wrangler deploy`
- Access locally via Preview or in production via your Worker route.

### Client Behavior

- `src/utils/youtube.js` will try Google’s API key first if `VITE_YOUTUBE_API_KEY` is set.
- If the key is missing or the request fails (e.g., 403), it falls back automatically to the Worker proxy at `/rapid/youtube/search`.
- No RapidAPI secrets are ever shipped to the browser.

### Media Token Proxy

- Worker route: `GET /media/token?kind=<movie|show>&title=<Title>&extra=<optional>`
- Requires `Authorization: Bearer <Supabase JWT>`; otherwise returns 401.
- Worker forwards to `MEDIA_TOKEN_ENDPOINT` using `MEDIA_API_KEY` and returns the JSON payload.

Client utility usage:

```js
import { getMediaToken, extractPlaybackUrl } from './utils/mediaToken'

const payload = await getMediaToken({ kind: 'movie', title: 'Dracula' })
const playback = extractPlaybackUrl(payload)
```

Integrate the result where you need playback or asset access. Ensure the user is logged in so a JWT is available.

Notes:
- Do not add `RAPIDAPI_PROXY_SECRET` to `.env` in the SPA; it must remain server-side.
- Extend the Worker with additional whitelisted endpoints if you need other RapidAPI APIs.