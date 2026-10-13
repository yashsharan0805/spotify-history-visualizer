# Open-source publication audit — 13 October 2026

## Release scope

The public release contains application source, synthetic tests, sanitized audit results, setup documentation, an empty environment template, the MIT license and third-party notices. Every tracked file was read and reviewed by the publication scanner; Gitleaks also scanned the source snapshot, exported archive and Git history. Raw local reports and release staging files stay in ignored `output/`.

The original private history was inspected before release. It contained personal validation observations, a machine-specific path in an audit result and work-email commit metadata. These are excluded from the public release. The original repository/history is retained privately; the public repository starts from a clean sanitized source snapshot instead of exposing older revisions.

## Checks

- Source-path allowlist and full UTF-8 content checks cover every published file, including dotfiles and JSON results. Binary archives, account screenshots, raw exports, local environment/deployment metadata, browser sessions and generated dependencies/build output are excluded.
- Gitleaks found no credential leaks in the original private history. Repeat scans of the sanitized public source, exported archive and public history found no leaks.
- The source guard rejects local machine paths, account emails outside preserved third-party legal notices, deployment account identifiers, populated environment assignments, common credential formats and raw streaming-history JSON arrays. The empty `.env.example` contains no configured app ID or secret.
- Production-dependency notice headers match all 46 locked production package entries. MIT, ISC, BSD and other applicable third-party copyright/license texts remain intact. Inspiration credits remain distinct from reused libraries/assets.
- A fresh source copy installs from the lockfile, passes all 23 unit tests and builds successfully. The existing 78-scenario browser audit remains applicable because publication changed source packaging/documentation, not application behavior.
- The public root commit uses the maintainer's GitHub no-reply identity. Personal account totals, song/playlist names, export metrics, machine paths and deployment identifiers are absent from public validation notes.

## Documentation screenshot update

Six visually reviewed examples were added under `docs/screenshots/`, using generated history or intercepted API responses for a fictional account. They contain no personal account/history data and no PNG text or EXIF metadata. Their exact paths and SHA-256 hashes are pinned in the source checker; other binaries and images remain excluded. See [screenshot provenance](screenshots/README.md). This documentation update does not change application behavior.

## Repeatable source checks

```sh
python3 scripts/check-public-source.py
gitleaks git --redact --log-opts="--all" .
```

For an archive, extract it into a clean directory and run `python3 scripts/check-public-source.py --directory PATH_TO_EXTRACTED_SOURCE` plus `gitleaks dir --redact PATH_TO_EXTRACTED_SOURCE`. Review new file types before extending the allowlist. Scanner results are evidence, not a guarantee that every possible secret/private datum can be detected. See [SECURITY.md](../SECURITY.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).
