# Security and privacy

Never post credentials or personal account data in a public issue, pull request, screenshot or log. Use GitHub's **Security → Report a vulnerability** on this repository for confidential reports. Include affected code, reproduction steps using fabricated data, impact and suggested mitigation where available. Do not include real tokens or exports. There is no promised response SLA.

The current main branch is the maintained version. Rewind is a browser application: imported history stays in memory or optional IndexedDB; Spotify OAuth tokens use tab-session storage. Disconnecting clears the session. Delete local history and disconnect before sharing a device or browser profile. Only static requests go to the host, and authorization/account requests go to Spotify.

The public Spotify Client ID is not a secret. Configure your own app for self-hosting. Never use or publish a client secret, access/refresh token, authorization code, PKCE verifier, Vercel token or GitHub token. History exports can contain personal fields and must remain outside Git even though the app strips unsupported fields during import.

The source guard checks every tracked file against publication paths/content rules; Gitleaks adds credential-pattern coverage. Reviewed synthetic PNG examples under `docs/screenshots/` are a narrow exception: their exact paths and SHA-256 hashes are pinned in the guard. Other images remain blocked. Scanners do not inspect rendered pixels; replacements require visual privacy review. Neither check guarantees detection of every possible secret or private datum. Review diffs and Git history before publishing, and keep test data synthetic.

If a real credential is exposed, revoke or rotate it first. Deleting a file in a later commit does not remove older revisions, forks, downloaded archives or caches. Coordinate private cleanup before republishing. Local `output/`, `.env*` (except `.env.example`), `.vercel/`, browser sessions, data exports and generated build/dependency directories are excluded from this source release.
