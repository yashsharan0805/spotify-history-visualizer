# Screenshot examples

Captured on 13 October 2026 from Rewind's unchanged application UI in an isolated headless Chromium profile using Playwright. The screenshots are page captures without browser chrome. Desktop views use a 1440-pixel viewport; the mobile example uses 390 pixels.

| File | Example | Data source |
| --- | --- | --- |
| `spotify-workspace.png` | API dashboard and source toggle | Mocked responses for fictional Example listener |
| `spotify-curation.png` | Recent-sample filter, multiselect and bulk controls | The same fictional library; no writes executed |
| `history-overview.png` | Statistics, monthly timeline and artist bars | Built-in synthetic history |
| `history-filters.png` | Frequently skipped shortlist | Built-in synthetic history |
| `history-patterns.png` | Artist ranking evolution | Built-in synthetic history |
| `mobile-workspace.png` | Responsive API dashboard | Mocked responses for fictional Example listener |

History playback events come from [`demoDataset`](../../src/analytics.ts). Its catalog names are examples and its playback records are generated. API account, tracks, artists, playlists, save dates, rankings and recent events were fabricated locally. All Spotify requests were intercepted; authorization requests were blocked, and the mock rejected write requests. No real account, token, export, receipt, album artwork or production-session screenshot was used.

Each image was visually reviewed. The PNG files contain only image chunks (IHDR, IDAT and IEND) and optional sRGB color information, with no text or EXIF metadata. The public-source checker permits these exact image paths only when their SHA-256 hashes match the reviewed files; other images remain blocked. Credential scanners do not inspect rendered pixels, so visual privacy review is required.

To replace an example, capture it in an isolated profile using synthetic/mocked data, inspect the visible content and PNG metadata, then update its reviewed hash in `scripts/check-public-source.py`. Never substitute a live account screenshot. Raw capture scripts and intermediate images remain in ignored `output/playwright/readme-examples/`.
