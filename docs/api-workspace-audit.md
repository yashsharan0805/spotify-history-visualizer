# API workspace and source-toggle audit — 13 October 2026

78 functional browser scenarios passed in isolated headless Chrome with zero uncaught page errors. The production TypeScript/Vite build and all 23 maintained unit tests passed. [Scenario results](api-workspace-audit-results.json) contain the checks.

| Area | Passing scenarios |
| --- | ---: |
| History views, charts, dialogs, theme, sample protection | 15 |
| Imports, metrics, timezone/content/filter/selection/CSV/persistence contracts | 16 |
| PKCE, state/consent/callback recovery, token/scope refresh, HTTP failures | 10 |
| History mobile/tablet/desktop, keyboard, drag/drop and file input | 9 |
| API dashboard, metadata/evidence filters, playlists, top/recent/playback/saved content, bulk actions, response races, old/revoked sessions and responsive layouts | 23 |
| Episode playback, supported request types and HTTP 204 | 1 |
| Source toggle, selection isolation, imported/current metadata separation, remembered preference/dataset and responsive layouts | 4 |

## API checks

The synthetic library contains 107 liked tracks across three API pages. Source reads expose different saved dates, release years, explicit flags, durations and missing metadata. Top lists vary with the selected ranking window and include a currently unliked track. Four recent events contain repeat plays; tests check only returned-sample frequencies and last returned dates. Owned and collaborative playlists contain overlap and duplicate entries. Other saved-content fixtures exercise wrapped albums/shows/episodes, followed-artist cursors and flat audiobook items; 51 albums exercise pagination.

Unlike, Add, Move and Restore tests use intercepted mock writes. They verify current membership, reviewed selection, owned destinations, preserved likes for Add, read-back playlist verification before Move, receipts and no unsafe retries/removals after uncertain writes. Playback tests verify track/episode display, HTTP 204 and one actual opt-in refresh after 30 seconds. No real Spotify songs or playlists were changed during this audit.

An older scope set continues to read the current library and sends no unauthorized top/recent/playback requests. Invalid refresh tokens clear the account view even when failure occurs during an insight refresh. Refresh responses that omit scope preserve previously granted permissions. Quota-exceeded responses stop without automatic retries. Failed/partial reads preserve labelled last-successful snapshots rather than becoming false empty histories.

## Source toggle checks

The toggle uses accessible pressed states and is available at 320, 390, 768 and 1440 pixels. The imported fixture deliberately has an older date and different song/artist/album metadata for the same URI as the API track. Switching retains the optional export but the API view displays current metadata; selections never carry across sources. Clicking the already active source preserves its selection. Remembered source preference and separately remembered history survive reload.

## Evidence and limits

Raw reports, CLI scripts and screenshots remain ignored under `output/playwright/api-workspace/`. No real export, OAuth session, personal-account screenshot or secret is in these fixtures or results. These are audit scripts, not a maintained Playwright test-runner suite. `npm test` runs the maintained metric, normalization, filter and API-contract tests.

Mocked checks establish application behavior, not Spotify production availability or account permissions. Separately, the owner approved reconnecting and live production reads passed for the library, owned playlist contents/comparison, top tracks/artists, recent activity, playback empty state and every saved-content category. No real writes were performed for this update. Live observations and remaining mock-only coverage are documented in [validation](validation.md). Use the [API-data guide](spotify-api-data.md) for source limits and freshness.
