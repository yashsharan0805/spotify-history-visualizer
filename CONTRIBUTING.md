# Contributing to Rewind

Fork the repository and create a branch in your fork. Use Node.js 22 or newer, run `npm ci`, copy `.env.example` to `.env.local` and follow the README for your own Spotify developer app. The history explorer works without a configured app.

Keep changes focused and explain the resulting behavior in your pull request. Run the checks relevant to your change:

```sh
python3 scripts/check-public-source.py
npm test
npm run build
```

For UI changes, check desktop/mobile layouts and keyboard access. Use synthetic history and mocked Spotify responses for browser tests. Report live verification separately from mocks; never run library mutations against someone else's account or selection.

Never contribute exports, real listening records, account screenshots, OAuth/browser sessions, receipts, local environment files, deployment-account metadata or credentials. Use fabricated identifiers and examples. See [SECURITY.md](SECURITY.md) for reporting sensitive findings privately.

Retain MIT and third-party license notices. Update `public/third-party-notices.txt` when production dependencies change, and distinguish reused code/assets from feature inspiration. Contributions are licensed under this repository's MIT license.
