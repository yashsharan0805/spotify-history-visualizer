# Headless browser audit — 13 October 2026

64 functional scenarios passed in isolated headless Chrome through the Playwright CLI, with zero uncaught page errors. The production TypeScript/Vite build and all 13 focused unit tests passed. [Detailed scenario results](browser-audit-results.json) record the checks.

| Area | Passed | Coverage |
| --- | ---: | --- |
| Views and components | 15 | Landing, credits, theme persistence, statistics, timeline drilldown, artist bars, skip scatter/detail, calendar, favourites, presets, artist rankings/flow/legend, heatmap, skip timing, playback outcomes, countries, devices, disconnected library |
| Imports and analysis | 16 | JSON/ZIP, deduplication/invalid records, exact song metrics, nine sorts, pagination, selection, search, confidence/skip/listen filters, old data, timezone/date boundaries, devices, shuffle, audio/video, podcasts/books, CSV quoting/formula escaping, local remembering/deletion and malformed inputs |
| Spotify library actions | 15 | Library pagination/history matching, reviewed selection/cancel/download, Unlike/receipt/Restore, Add/Move, owned playlist restriction, duplicate avoidance, new private playlist/name guard, ambiguous/unverified failures, account mismatch, busy-action guards, 107-track batching, real-library actions in sample mode, synthetic-track protection and disconnect |
| Authorization and failures | 9 | Invalid/denied OAuth, PKCE/state/scopes/callback cleanup, checkpoint recovery, token refresh, one 401 retry, bounded 429 handling, 403/network/partial-page errors, revoked-token UI recovery |
| Responsive and keyboard | 9 | 320/390/768/1440 px layouts, mobile theme/credits, chart/calendar/table scrolling, selection/detail access, sparse rank markers, labelled heatmap, empty-data recovery, skip link/dialog focus, drag/drop and file import |

## Fixtures and isolation

Synthetic imports contain 70 source rows across two files: 68 usable events, one exact duplicate and one invalid row. They yield 65 music playback attempts and 41 distinct music tracks. The focused song has 11 attempts, six listens of at least 30 seconds, three natural completions and eight next-track skips over ten eligible attempts since 2022 (80%). A UTC/India midnight boundary, pre-2022 data, podcasts, an audiobook, video, quoted CSV values and a formula-like title exercise edge cases.

Spotify routes were intercepted in the isolated test profile. The mock library contains 107 liked tracks across three pages; bulk Move and Restore verify request order, maximum batch sizes and read-back membership. Mock OAuth uses synthetic tokens and verifies the actual S256 challenge. These checks do not prove Spotify's live write permissions or service behavior. Real user history and credentials were not copied into fixtures or the repository.

Development screenshots and raw reports remain in ignored `output/playwright/headless-audit/`. They are evidence from this audit, not a permanent automated browser suite. `npm test` runs the maintained metric and API-contract tests.

## Regressions fixed

- Sample mode previously disabled actions for every selection, including real Liked Songs. Actions now depend on valid real track identifiers and current library membership. Synthetic history tracks remain blocked.
- An invalid refresh token cleared token storage but left the connected account/library visible. Failed refresh now clears that stale view and enables reconnecting.
- Mobile/tablet layouts hid theme and credits controls. A header options dialog makes both reachable.
- The skip-to-content target could not receive keyboard focus. The main content is now focusable through that link.
- Sparse artist rankings had no visible line segments or markers. Markers now show isolated observations with colors matching the legend while preserving gaps.

## Rechecking

Run `npm ci`, `npm test`, `npm run build` and `npm run dev` with Node 22+. For browser QA, use a separate headless profile with synthetic fixtures; intercept Spotify routes for write scenarios. Repeat sample-track protection and real-library selection separately. Test imports, chart drilldowns, date/timezone filters, search/sort/selection, remembering/deletion, account errors, receipts and restoration. Check narrow layouts and keyboard navigation. Any real Spotify mutation requires a specifically authorized selection and independent read-back verification.

Live deployment and the owner-authorized one-song Unlike check are recorded separately in [validation](validation.md).
