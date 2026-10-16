# Validation

Run `npm test` for metric, timezone, privacy-normalization, metadata/filter and Spotify API-contract tests. Run `npm run build` for TypeScript and production Vite verification. The source-only publication changes did not modify application behavior.

## Automated and browser checks — 13 October 2026

- The production TypeScript/Vite build and all 23 maintained unit tests passed.
- All 78 isolated headless Chrome scenarios passed with zero uncaught page errors. See [API workspace coverage](api-workspace-audit.md) and [sanitized scenario results](api-workspace-audit-results.json).
- The [earlier 64-scenario audit](browser-audit.md) records the original history/UI coverage and regression fixes. Its [scenario results](browser-audit-results.json) contain only synthetic test descriptions and outcomes.
- Imports, normalization, deduplication, zero-duration attempts, timezone boundaries, pre-2022 skip exclusions and CSV escaping were checked with synthetic fixtures. A local real-export comparison also passed; personal counts, records and screenshots are excluded from public documentation.
- Synthetic large-import checks exercised paginated rendering and search. They do not establish a cross-device performance guarantee.
- Mocked Spotify checks verify PKCE/state recovery, token refresh and granted-scope preservation, pagination failures, quota handling, revoked-session recovery, old-scope behavior, response races, filters and source isolation.
- Mocked writes verify review, current account/membership checks, Unlike/Add/Move/Restore, batching and duplicate prevention. Move verifies additions before removing likes; ambiguous write outcomes stop processing.
- Responsive/keyboard checks cover 320, 390, 768 and 1440 pixel layouts, theme/credits, import, charts, selection, dialogs and focus.

## Live verification and limits

With explicit account-owner approval, production PKCE consent and the clean callback completed. Read-only checks passed for current Liked Songs, owned playlist contents and comparison, top tracks/artists, recent activity, every saved-content category and the no-active-playback state. Live metadata search and recent-sample frequency filters produced the expected rows. The source toggle switched to the optional history-import view and back to the connected API dashboard.

An earlier, separately authorized one-song Unlike was verified through the receipt, Spotify membership read-back and a complete library refresh. The subsequent API/source-toggle update performed no live mutations. Personal account identity, listening details, library totals, playlist names, deployment identifiers and screenshots are excluded from the public repository.

Collaborative playlist contents and active track/episode playback were verified with mocks; they were unavailable during the live account check. Mocked checks establish application behavior, not Spotify service availability or write permission for another account. Audit scripts and raw local evidence are not a maintained Playwright test-runner suite.

## Repeat verification safely

Use synthetic imports and an isolated browser profile. Intercept Spotify routes for write scenarios. Never put real exports, tokens, browser sessions or account screenshots in fixtures or public issues. A real mutation requires a specifically reviewed selection and read-back verification. Current account snapshots can change between runs; do not hardcode personal counts as expected results.

Deployment checks verify the homepage, OAuth callback route and third-party notices return HTTP 200 with security headers. Self-hosting must reproduce callback routing and headers, and register its own exact Spotify callback. See [README setup](../README.md) and [publication audit](publication-audit.md).

## Vercel Web Analytics — 16 October 2026

- Added the production React integration, privacy filter and MIT dependency notice. Development/local preview skip the analytics script. The existing same-origin CSP remains intact.
- All 26 unit tests passed, including query/fragment removal and rejection of OAuth callbacks, arbitrary paths, custom events, invalid URLs and embedded credentials. The production build, publication source checks and credential scan passed.
- Deployment reached READY and the production alias was updated using the owner's personal Vercel account. Web Analytics was already enabled for the project.
- Vercel's script intentionally suppresses headless-browser traffic. A normal in-app-browser visit was recorded; a separate isolated Playwright context with a standard Chrome user agent verified the production collection request returned HTTP 200. Its page URL was only the origin and root path, despite a synthetic query/fragment on the test navigation. The payload contained SDK metadata and an empty referrer, with no application or Spotify data.
- Vercel's authenticated reporting API confirmed nonzero production visitors/page views after verification. No aggregate account metrics, credentials or deployment identifiers are included here.
- Synthetic history import, pattern navigation and the updated privacy disclosure passed with zero page errors. These interactions produced no custom events or extra collection requests. This integration measures website visits; individual UI views share one URL.
