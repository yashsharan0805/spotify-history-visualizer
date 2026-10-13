# Rewind

A browser-only Spotify dashboard, library-curation tool and optional listening-history explorer. Sign in to filter current Spotify data without a ZIP. Import Extended Streaming History when you want historical play/skip statistics. No backend database, history uploads, analytics trackers, or client secret.

[Live website](https://spotify-history-visualizer-gamma.vercel.app/) · [Architecture](docs/architecture.md) · [Validation](docs/validation.md) · [MIT license](LICENSE)

## Features

- **Spotify workspace, no import required:** current Liked Songs, saved-date and artist-credit summaries, owned/collaborative playlists, top tracks/artists across three Spotify time windows, a recent-play sample, current playback and other saved content.
- **Data-source toggle:** choose **Spotify API** or **History export** above the workspace. Each source uses its own data and filters; switching clears selection and remembers your source preference on this browser.
- **API-backed filters:** song/artist/album search, saved/added dates, release years, explicit content, track length, last returned recent-play date, plays in the returned recent sample, membership in Spotify's returned top 50 and playlist membership/duplicates. Each API source shows its own fetch time.
- **Playlist exploration:** distinct-track and duplicate counts, overlap between two accessible playlists, and reviewed song actions. Bulk destinations remain playlists you own.
- **Other saved content:** paginated albums, followed artists, podcast shows, saved episodes and audiobooks, with search and the date/genre fields that Spotify actually returns.
- **Playback:** a read-only now-playing snapshot, active device, progress, shuffle and repeat; optional 30-second refresh while the view is visible. No inferred skip tracking.

- **History overview:** listening timeline, top artists/tracks, daily calendar, and playback-attempts versus skip-rate scatterplot.
- **History explorer:** search, sorting, date/timezone/content/device/shuffle filters, minimum attempts and skip rate, maximum meaningful listens, last-listened date, song-event details, and CSV export.
- **History patterns:** artist rank/flow views, weekday/hour heatmap, listening duration before skips, playback outcomes, devices and connection countries.
- **Library curation:** match current Liked Songs by track URI, select multiple songs, then Unlike, Add to playlist, or Move to playlist. Choose a playlist you own or create a private one.
- **Review and recovery:** explicit confirmation, verified playlist additions before Move removes likes, downloadable receipts, and restoration of removed likes.
- **Local workspace:** ZIP or multiple JSON imports, optional remembering on this device, deletion controls, and synthetic sample data. Sample tracks cannot change Spotify; real Liked Songs remain actionable when exploring the sample.

## Before you start

The connected Spotify workspace works without a history import. History exploration also works without Spotify login. Account data and library actions require a Spotify app registered **once by the site owner**. Visitors use their normal Spotify accounts; they never create developer apps or enter Client IDs.

Local development requires Git and Node.js 22 or newer; Node.js 24 is recommended. This repository is public and MIT licensed. Clone it to explore locally, or fork it into your own GitHub account for an independent Vercel deployment with your own Spotify app.

**Spotify access limits, checked 13 October 2026:** new development-mode apps require the owner to maintain Spotify Premium and allow five approved Spotify users. Add every intended account in User Management. Public website hosting does not remove that limit. Extended access requires separate approval; Spotify currently accepts new partner applications from organizations, with eligibility criteria including at least 250,000 monthly active users. See [Spotify quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

## Run locally

Clone the public repository; GitHub login is not required:

```sh
git clone https://github.com/yashsharan0805/spotify-history-visualizer.git
cd spotify-history-visualizer
npm ci
cp .env.example .env.local
npm run dev
```

Open **http://127.0.0.1:5174/**. Try the synthetic sample or import your history. The empty environment template is sufficient for history analysis; Spotify connection is unavailable until configured.

For local Spotify login, follow [Spotify developer app setup](#spotify-developer-app-setup-site-owner-only), register this callback, and edit `.env.local`:

```text
http://127.0.0.1:5174/auth/spotify/callback
```

```dotenv
VITE_SPOTIFY_CLIENT_ID=YOUR_32_CHARACTER_PUBLIC_CLIENT_ID
```

Replace the placeholder with your actual public Client ID and restart the dev server. Use `127.0.0.1`, because Spotify does not accept `localhost` callbacks. The app derives its callback from the browser's current origin; use the registered host and port. [Redirect URI requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)

## Self-host on Vercel

These steps create an independent deployment with your own accounts. No database, server functions, or storage service is needed. Vercel's free Hobby plan is for personal, non-commercial use; check the [current plan terms](https://vercel.com/docs/plans/hobby).

### 1. Import your repository

Fork this repository into your GitHub account. Sign in to Vercel, choose **Add New → Project**, and import your fork. Grant Vercel access to the intended repository if needed. Use the project root, not a parent directory containing other projects.

The included `vercel.json` supplies framework/build/output settings, the OAuth callback rewrite and security headers. Confirm:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | Repository root (`.`) |
| Production branch | `main` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js version | 24.x |

Deploy once without a Spotify environment variable. History analysis already works. Copy the stable production address, for example `https://YOUR-PROJECT.vercel.app`; avoid a deployment-specific preview address. [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)

### 2. Create your Spotify app

Follow the [developer setup below](#spotify-developer-app-setup-site-owner-only). Use your production address as the app website and register this exact callback, replacing `YOUR-PROJECT`:

```text
https://YOUR-PROJECT.vercel.app/auth/spotify/callback
```

### 3. Configure the shared Client ID and redeploy

Open the Vercel project's **Settings → Environment Variables** and add:

| Name | Value | Environment |
| --- | --- | --- |
| `VITE_SPOTIFY_CLIENT_ID` | Public Client ID from your own Spotify app | Production |

Do not add a client secret. This ID is public and is included in the browser bundle. Vite reads it at build time, so changing the variable requires a new deployment. Open **Deployments**, select the latest production deployment, and **Redeploy**. Configure Preview/Development separately only if needed and their exact callback origins are registered. [Vercel environment variables](https://vercel.com/docs/environment-variables)

### 4. Verify your deployment

1. Open the stable production URL and click **Connect Spotify**. It should go directly to Spotify's consent screen showing your app name.
2. Sign in with an account approved in User Management and grant the requested permissions.
3. Confirm the site returns to the homepage with your account name and current Liked Songs in **Spotify workspace**. History import is optional; choose **History export** when testing historical analytics.
4. Review a small selection before testing a real library action. Add-to-playlist preserves likes; Move verifies membership before removing likes. Filters never trigger changes automatically.

When connected through Vercel's Git integration, pushes to the production branch create deployments. Environment changes still require a rebuild. To connect an existing deployed Vercel project to this repository, use that project's **Settings → Git**; retain its production environment variable and callback domain.

### Optional: Vercel CLI

After creating your Spotify app and choosing the intended Vercel project:

```sh
npx vercel login
npx vercel link
npx vercel env add VITE_SPOTIFY_CLIENT_ID production
npx vercel --prod
```

Enter only the public Client ID at the prompt. The first deployment can establish the domain before registering its callback in Spotify. `vercel link` creates ignored account metadata in `.vercel/`; keep it and local environment files out of Git.

## Spotify developer app setup (site owner only)

1. Sign in to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) with the account that will own the app. Development-mode functionality requires that owner to have Premium.
2. Choose **Create app**. Use a recognizable name, such as **Rewind**, and a description, such as “Browser-only listening-history explorer and Spotify library curation.” Visitors see this name on the consent screen.
3. Set **Website** to your production URL and select **Web API**. This project does not use the playback, ads or mobile SDKs.
4. Add the exact production **Redirect URI** ending in `/auth/spotify/callback`. Optionally add `http://127.0.0.1:5174/auth/spotify/callback` for local development. Review Spotify's Developer Terms and Design Guidelines before accepting them and saving.
5. Open **Basic Information** or settings and copy the **Client ID**, a 32-character public identifier. This project neither needs nor uses the **Client Secret**.
6. Open **User Management** (sometimes under Settings). Add the name and Spotify-account email of every intended user, including your own account. Development mode allows five users; unapproved accounts can sometimes complete login but still receive API `403` responses.
7. Set `VITE_SPOTIFY_CLIENT_ID` in Vercel Production or `.env.local`, then redeploy/restart as described above.

Production callbacks must use HTTPS and match the actual origin/path exactly. Register each domain separately, including custom domains; do not use wildcard callbacks. Before switching domains, register the new callback and retain only callbacks you use. [Spotify apps](https://developer.spotify.com/documentation/web-api/concepts/apps) · [Redirect rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)

### Permissions and authentication

Authorization Code with PKCE uses a one-time state and code challenge; the browser never uses a client secret. Tokens stay in tab-session storage and are cleared on disconnect. Each deployment uses one configured app ID, with no visitor overrides. [Spotify PKCE flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)

| Scope | Purpose |
| --- | --- |
| `user-library-read` | Read Liked Songs, saved albums, shows, episodes and audiobooks; check saved status |
| `user-library-modify` | Unlike selected tracks and restore removed likes |
| `playlist-read-private` | Read private playlists and verify destination membership |
| `playlist-read-collaborative` | Include collaborative playlists in exploration |
| `user-top-read` | Read Spotify’s top tracks/artists by affinity |
| `user-read-recently-played` | Read the recent music-play sample |
| `user-read-playback-state` | Read now-playing state, progress and device |
| `user-follow-read` | Read currently followed artists |
| `playlist-modify-private` | Create/update private playlists |
| `playlist-modify-public` | Add tracks to owned public playlists |

Existing sessions retain their original permissions. Choose **Reconnect Spotify** once to allow the additional read scopes; until then the current library remains usable and unauthorized insight requests are not sent. Token refresh preserves the granted scope set.

Actions target music track URIs and playlists owned by the connected account. Every bulk change requires review and confirmation. Access can also be revoked through Spotify's connected-app settings.

## Use Spotify data without an export

1. Choose **Explore my Spotify**, sign in and approve the displayed permissions.
2. The connected **Spotify workspace** opens directly. The **Spotify API / History export** toggle switches between fresh account snapshots and your imported files. Use its Dashboard, Liked Songs, Playlists, Top items, Recent activity, Now playing and Saved content views.
3. Filter current metadata and returned evidence, select eligible music tracks and review Unlike/Add/Move actions. No historical ZIP or sample workspace is needed.
4. Use **Refresh Spotify data** or the source-specific refresh buttons. Last-successful snapshots remain labelled when a refresh fails; partial collections are never presented as complete.

Top ranks are affinity rankings, not play counts. Recent counts cover only the up-to-50 returned music events and do not establish all-time counts or never-played status. Track length is catalog duration, not actual time listened. Playlist duplicate dates use the latest returned added date for each URI. Saved-date summaries include only items still saved, not removed items or net library growth. See [API data and freshness](docs/spotify-api-data.md).

## Import your listening history

1. Request **Extended Streaming History** from [Spotify Account Privacy](https://www.spotify.com/account/privacy/), rather than the shorter Account Data export. Spotify supplies the download when ready.
2. Import the ZIP or select multiple `Streaming_History_Audio_*.json`, `Streaming_History_Video_*.json`, or compatible `endsong*.json` files. Login is not required for import.
3. Choose date range, content type and timezone, then explore. Optionally enable **Remember on this device**. **Delete local history** clears the remembered workspace.
4. Connect Spotify to join your history with current Liked Songs, filter a shortlist, and review the selected action.

Spotify login does not fetch Extended Streaming History or historical skip counts. The export supplies historical play/skip statistics; the API supplies current account data and reviewed changes. History views explicitly show their record cutoff. This version has no real-time skip tracking.

## Metrics and safeguards

| Metric | Definition |
| --- | --- |
| Attempts | All exact-row-deduplicated playback events, including zero-duration events |
| Meaningful listens | At least 30 seconds of `ms_played`; a listen can also end in a skip |
| Completions | `reason_end=trackdone`, without claiming every second was heard |
| Next-track skips | Music events with `reason_end=fwdbtn` from 1 January 2022 onward |
| Skip rate | Next-track skips / eligible music attempts from 2022 onward, within selected filters |
| Spotify skip flags | Separate counts of the `skipped` boolean; older exports differ |
| Listening time | Sum of `ms_played`, attributed to playback-end dates in the selected timezone |

Earlier events can contribute to other statistics but do not enter skip counts or the skip-rate denominator. All-time attempts and eligible skip attempts can therefore differ. Empty months mean no recorded activity. Unmatched liked songs mean no matching imported history, rather than proof a song was never played. Different track URIs remain distinct even when titles match.

Unlike/restore requests use batches of 40; playlist additions use batches of 100. Existing destination tracks are not duplicated. Move reads back playlist membership before removing likes. Unknown write outcomes stop processing and are not automatically replayed. Download receipts and refresh before retrying partial actions. Restoring likes can change saved dates/order and does not undo playlist additions.

## Privacy and repository contents

A Web Worker parses/aggregates imports and strips IP addresses and arbitrary personal fields before returning normalized events or storing them. History stays in memory or optional browser-local IndexedDB. OAuth navigation can use a temporary local checkpoint that expires after one hour and is cleared on return.

Spotify receives authorization and the selected account-data/library/playlist requests; the host receives static-page requests. Rewind has no history-upload endpoint or analytics tracker. Tokens are session-scoped. Browser storage is specific to the origin/device; changing domains does not transfer a workspace.

Commit source, the lockfile, `.env.example`, tests and license notices. Never commit/deploy raw history, real-data screenshots, browser sessions, OAuth tokens, client secrets, `.env.local`, `.vercel/`, `output/`, or `node_modules/`. Git/deployment ignore files exclude these local artifacts. Repository privacy is separate from deployed website accessibility.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| New insight views ask to reconnect | Reconnect once to approve the new read scopes. Previously granted library permissions remain usable. |
| A song is absent from recent/top results | These are limited returned samples and affinity rankings, not lifetime playback history. |
| Connection unavailable | Set a valid 32-character `VITE_SPOTIFY_CLIENT_ID` in the intended environment, then redeploy Vercel or restart Vite. |
| Invalid redirect / callback failure | Register the browser's exact origin plus `/auth/spotify/callback`; check HTTPS, custom/preview domains, spelling and port. Do not use `localhost`. |
| Login succeeds but API refuses access (`403`) | Add the exact Spotify-account email in User Management, confirm owner Premium and permissions, then reconnect. |
| Login expired or could not be verified | Restart Connect Spotify in the same tab/origin. State is one-use and expires after ten minutes; do not reuse callback URLs. |
| Callback returns `404` | Preserve the `vercel.json` rewrite serving the callback with `index.html`. |
| Vercel login appears before the app | Check deployment protection and use the intended stable production domain. Repository privacy and website protection are independent. |
| No recorded history for a liked song | Import relevant files, widen filters and check track versions/URIs. Current Liked Songs are not a historical export. |
| Destination playlist missing | Only playlists owned by the connected account are eligible; refresh the library. |
| Request limit (`429`) | Wait for Spotify's retry window/quota to recover; avoid repeatedly retrying bulk changes. |
| Partial action failure | Download the receipt, refresh library/destination, and inspect successful changes before choosing a new selection. |

## Development and verification

```sh
npm test
npm run build
npm run preview
```

Preview serves the production build at `http://127.0.0.1:5174/`. Environment values are embedded in that build; rebuild after editing them. If a port is occupied, use the URL Vite prints and register its callback when testing login.

Tests cover metric/timezone/privacy contracts and bulk-action failures. The [API-workspace and source-toggle audit](docs/api-workspace-audit.md) records 78 passing functional scenarios across the API/history views, imports, source switching, filters, library actions, OAuth errors and mobile/keyboard flows. All 23 maintained unit tests and the production build passed; the [earlier audit](docs/browser-audit.md) records the original history-only coverage. [Validation](docs/validation.md) records real account checks separately from synthetic mocks. Keep browser fixtures synthetic; a live mutation needs a specifically authorized selection and read-back verification.

The app uses React, TypeScript, Vite, Recharts, Lucide and fflate. See [architecture](docs/architecture.md) for boundaries, storage and failure semantics. Other static hosts must serve `dist`, embed the public app ID at build time and reproduce callback routing/security headers before testing OAuth.

## Open-source credits and license

Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). For privacy rules and confidential vulnerability reporting, see [SECURITY.md](SECURITY.md). The [publication audit](docs/publication-audit.md) explains what was checked before release. Run `python3 scripts/check-public-source.py` before contributing files.

### Reused libraries

Rewind uses these open-source packages directly. Their code is reused as dependencies; the roles below describe where they contribute to the application. License identifiers were checked against the installed versions recorded in `package-lock.json`.

| Project and credit | What Rewind reuses it for | License |
| --- | --- | --- |
| [React and React DOM](https://github.com/react/react) — Meta Platforms and contributors | UI components, state/effects and browser rendering | MIT |
| [Recharts](https://github.com/recharts/recharts) — Recharts contributors | Interactive timelines, scatterplots, artist rank/flow charts and playback charts | MIT |
| [Lucide React](https://github.com/lucide-icons/lucide) — Lucide contributors; portions originate in Cole Bemis's Feather icons | Interface icons for navigation, filters, import/export and actions | ISC; the bundled notice also preserves the Feather attribution |
| [fflate](https://github.com/101arrowz/fflate) — Arjun Barrett | Reading and decompressing uploaded history ZIP archives in the import worker | MIT |

Development also relies on these tools:

| Project and credit | Use | License |
| --- | --- | --- |
| [Vite](https://github.com/vitejs/vite) — Evan You and Vite contributors | Local development server and production bundling | MIT |
| [Vite React plugin](https://github.com/vitejs/vite-plugin-react) — Vite contributors | React integration and development refresh | MIT |
| [TypeScript](https://github.com/microsoft/TypeScript) — Microsoft and contributors | Static types and compile-time checking | Apache-2.0 |
| [tsx](https://github.com/privatenumber/tsx) — Hiroki Osame and contributors | Running TypeScript tests with Node's test runner | MIT |
| [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) — Microsoft and community contributors | `@types/react`, `@types/react-dom` and `@types/node` definitions | MIT |

Recharts also brings in [Victory's vendor package](https://github.com/FormidableLabs/victory) and [D3](https://d3js.org/) modules for chart geometry, scales, shapes and interpolation. Credit belongs to Formidable/Victory contributors, Mike Bostock and the respective D3/module contributors; their MIT/ISC and other applicable dependency notices are preserved below.

Transitive packages are credited in [third-party-notices.txt](public/third-party-notices.txt), which includes the full license/copyright notices for the locked production dependency tree, including Victory's vendored modules, and is shipped with the static site. Development-tool license files are included in their installed packages. The README's tables supplement those notices rather than replacing them. Retain the applicable license notices when redistributing Rewind, and refresh the notice file when updating dependency versions.

### Feature inspiration and visualization references

These projects and research informed feature choices and chart ideas. Rewind's import pipeline, analytics, interface and Spotify action handling were independently implemented; no source code, templates, screenshots or other assets from these references were copied into this repository.

| Reference and credit | What it informed |
| --- | --- |
| [Spotify History](https://github.com/nischolas/spotify-history) — **nischolas** | Extended-history import, per-song exploration and skip statistics |
| [Visplorify: Interactive Visual Analysis of Spotify Listening Histories](https://diglib.eg.org/items/29c0cb4c-37bc-4f41-aebb-bfa5622ff340) — **Louis Franzke, Christofer Meinecke, Jeremias Schebera and Daniel Wiegreffe**, EuroVis 2024 Posters, [DOI: 10.2312/evp.20241094](https://doi.org/10.2312/evp.20241094) | Interactive personal-history exploration, calendars and linked views |
| [Spotify bump charts](https://github.com/hyrographic/spotify_bump_chart) — **hyrographic** | Showing how artist rankings change across listening periods |
| [A4 Streamgraph with Spotify](https://observablehq.com/@yksravani/a4-streamgraph-with-spotify) — **Sravani YK (@yksravani)** | Stacked listening-flow visualization across time |

### Services, assets and application license

[Spotify Web API](https://developer.spotify.com/documentation/web-api) supplies account/library access and playlist operations; Spotify's [PKCE documentation](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow) is the authentication reference. Spotify and Vercel are service integrations, separate from the open-source libraries above. Rewind's branding, CSS artwork and interface were created for this project; Lucide supplies the reused interface icon set.

Rewind's original application code is [MIT licensed](LICENSE). That license does not replace third-party package licenses or grant rights to Spotify's content or trademarks. This is an independent project, not affiliated with Spotify; Spotify names and marks belong to Spotify.
