# Spotify account data and freshness

The Spotify workspace is available immediately after sign-in, without a ZIP, JSON import or synthetic sample. History views remain optional and labelled with the imported record cutoff. A visible **Spotify API / History export** toggle switches sources, clears the selection and remembers the source preference locally. Remembering the source does not automatically remember an export; the separate history-remembering checkbox controls dataset storage.

| Source | Filters / views | Meaning and limits |
| --- | --- | --- |
| Liked Songs | Search, artist credits, saved date (UTC), release year, explicit status, catalog track length; multiselect Unlike/Add/Move | A complete paginated snapshot of valid music tracks. Saved date is not last listened date. |
| Playlists | Owned/collaborative contents, membership/absence, duplicate entries, overlap | Contents are readable only when Spotify allows ownership/collaboration access. Duplicate tracks use the latest returned added date; rows and action selections are deduplicated by URI. Action destinations remain owned playlists. |
| Top items | Tracks/artists, search, selected 4-week / 6-month / roughly 1-year window, rank and top-50 membership | Spotify affinity rankings, up to 50 per type, not exact play counts. Not returned means outside the returned list, not never played. |
| Recent activity | Search, last returned play date (UTC), sample-frequency thresholds, seen / absent filters | Up to 50 music events, with timestamps. Counts cover only this returned sample; there is no skip flag, actual time listened or full-history guarantee. |
| Playback | Track/episode, progress, active device, shuffle, repeat; manual / opt-in visible-page refresh | A current snapshot only. Inactive playback may return HTTP 204. No skip inference or historical logging. |
| Other saved content | Albums, followed artists, podcast shows, saved episodes, audiobooks; search, returned save dates and artist genres | Each category is paginated independently. Artist follow dates and audiobook saved dates are not supplied. Genres are optional/deprecated metadata, not guaranteed. No unsave actions for these content types. |

Each source reports its own last-successful fetch time. Sources are fetched on demand where possible; changing the ranking window replaces its source data and ignores late responses from older requests. Failed refreshes preserve any last-successful snapshot with an error and its timestamp. A failed first read is unknown, not an empty listening history. Dependent recent/top/membership filters are disabled until their source is successfully loaded.

Current metadata cannot provide exact historical plays, meaningful listens, completions, listening hours or skip ratios. Those remain explicitly imported-history statistics. The saved-date summary covers items still liked; it is not net library growth. A catalog track's duration is not how much of it the user listened to.

## Permissions

The deployment still uses one public Client ID and Authorization Code with PKCE. New read permissions are `user-top-read`, `user-read-recently-played`, `user-read-playback-state`, `user-follow-read` and `playlist-read-collaborative`. Existing visitors must reconnect to approve these permissions. Existing library access continues to work; missing scopes prevent the corresponding new insight requests. No client secret or additional server/database is required.

Current playback auto-refresh is opt-in, once every 30 seconds while the view is visible, and stops after an error. Development-mode API quotas are shared across the developer account. Explicit quota-exceeded responses are not retried automatically.

## Official references

- [Saved tracks](https://developer.spotify.com/documentation/web-api/reference/get-users-saved-tracks)
- [Playlist items and ownership/collaboration restrictions](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items)
- [Top items and time windows](https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks)
- [Recently played](https://developer.spotify.com/documentation/web-api/reference/get-recently-played)
- [Current playback](https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback)
- [Scopes](https://developer.spotify.com/documentation/web-api/concepts/scopes)
- [July 2026 quota changes](https://developer.spotify.com/documentation/web-api/references/changes/july-2026)
