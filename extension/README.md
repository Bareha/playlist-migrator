# Playlist Migrator (Chrome Extension)

Migrates a Spotify playlist — public, or your own private one — into a new private
YouTube playlist, matching each track to a YouTube video.

This is a from-scratch TypeScript rewrite of the Java CLI at `../pconv`. The core
matching/pagination/quota logic is a faithful 1:1 port (see `src/core/`); the auth model
changed to fit a browser extension (Spotify: Authorization Code + PKCE, no client secret;
YouTube: `chrome.identity`, no manual token storage).

## One-time setup (required before the extension will actually work)

The extension ID is pinned to `hpjaoeeafidabahejobfehgjleocjnkd` (via the `key` in
`manifest.config.ts`, matching the keypair in `extension/keys/`, which is gitignored — do
not lose or regenerate it, both registrations below depend on this exact ID). Do not
regenerate the keypair; if you ever need to, you'll have to redo both steps below.

### 1. Install dependencies

```
cd extension
npm install
```

### 2. Register a Spotify app (PKCE, no secret)

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Add this **Redirect URI** exactly: `https://hpjaoeeafidabahejobfehgjleocjnkd.chromiumapp.org/`
3. Copy the **Client ID**.

Note: new Spotify apps start in "Development Mode", capped at 25 allowlisted users. Fine
for personal use; you'd need Spotify's Extended Quota Mode approval to distribute this
more widely.

### 3. Register a Google Cloud OAuth client (Chrome Extension type)

1. Create/select a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **YouTube Data API v3**.
3. Configure the OAuth consent screen (add the `youtube.force-ssl` scope; while it's in
   "Testing" status, add your own Google account as a test user — anyone else will see an
   "unverified app" warning, since this scope is sensitive and full verification is a
   multi-week process).
4. Create an **OAuth Client ID** of type **Chrome Extension**, entering
   `hpjaoeeafidabahejobfehgjleocjnkd` as the item/extension ID.
5. Copy the **Client ID** (no secret is issued for this client type — that's what makes
   `chrome.identity.getAuthToken` safe to call directly from the extension).

### 4. Configure environment

```
cp .env.example .env
```

Fill in `VITE_SPOTIFY_CLIENT_ID` and `VITE_GOOGLE_OAUTH_CLIENT_ID` with the values from
steps 2 and 3.

### 5. Build and load

```
npm run build
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
select `extension/dist`.

## Development

- `npm run dev` — Vite dev server with HMR (still needs to be loaded as an unpacked
  extension once; `@crxjs/vite-plugin` handles reloading).
- `npm test` — Vitest unit tests (pure logic + mocked-chrome tests; see below for what
  isn't covered here).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run build` — production build to `dist/`.

## What's unit-tested vs. what needs manual testing

Unit tests (`npm test`) cover: the query-builder/pagination/quota-estimate logic ported
from the Java tests, HTTP status validation, PKCE verifier/challenge generation, and the
migration orchestrator's state machine (resume-from-checkpoint, no-double-insert-on-resume,
skip-on-no-match) against a mocked `chrome.storage` and mocked API modules.

Real OAuth flows and live API calls can't be meaningfully mocked, so the following needs a
manual pass in an actually-loaded extension:

- [ ] Spotify PKCE consent screen completes and the redirect URI round-trips correctly.
- [ ] YouTube `getAuthToken` consent screen completes (including the "unverified app"
      warning while the OAuth consent screen is in Testing status).
- [ ] Migrating a **public** playlist end-to-end.
- [ ] Migrating **your own private** playlist (proves the PKCE scopes actually work).
- [ ] A playlist with **>100 tracks** (proves pagination via `tracks.next`).
- [ ] A playlist containing a **removed/local track** (null `track` item — must be
      skipped, not crash).
- [ ] An **invalid playlist ID** (should surface a clear fetch error, not a misleading
      "make it public" message).
- [ ] A migration large enough to **exceed the default 10,000-unit daily YouTube quota**
      (~65+ tracks) — confirm the popup's upfront warning and that a quota failure mid-run
      doesn't corrupt the resumable state.
- [ ] **Kill the service worker mid-migration** (`chrome://extensions` → "service worker"
      link → inspect → close/terminate) and confirm the `chrome.alarms`-driven resume picks
      back up within ~1 minute with no duplicate `playlistItems.insert` calls.
- [ ] **Close and reopen the popup mid-migration** and confirm it rehydrates the in-progress
      view instead of resetting to the form.
- [ ] Spotify **token refresh** path (wait past `expires_at`, or shorten it locally, and
      confirm a request transparently refreshes instead of failing).
- [ ] YouTube token invalidation/re-prompt path (a `401` should trigger one silent retry
      after `removeCachedAuthToken`).

## Architecture

See the design plan for the full rationale (module-by-module Java→TS mapping, the MV3
service-worker-lifetime problem and its checkpointed-resume solution, staged build order):
`C:\Users\Bareha\.claude\plans\transient-spinning-badger.md`

Quick orientation:
- `src/core/` — pure ported logic (query building, pagination, quota estimate, HTTP
  validation). No `chrome.*` or `fetch` calls; fully unit-testable.
- `src/spotify/`, `src/youtube/` — auth + REST API clients for each service.
- `src/migration/` — `orchestrator.ts` (the resumable state machine),
  `state.ts` (checkpoint persistence), `messages.ts` (popup↔background message contract).
- `src/background/service-worker.ts` — wires the `chrome.alarms` resume mechanism and the
  popup message-port handler; this is where all `chrome.*` side effects are centralized.
- `src/popup/` — plain TypeScript + DOM UI (no framework), driven entirely by messages
  from the background worker.
