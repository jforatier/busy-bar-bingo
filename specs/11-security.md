# 11 — Security

## What the app touches

- **No network**: the app calls only the bar's local API (display, audio, settings, its own `localStorage`). It has no account, no token, no secret.
- **Stored data**: the game in progress and the last game played, in the app's `localStorage` on the bar. `restore()` accepts only a well-formed save ([03](03-draw.md#saved-game)): a corrupted or crafted file gives a new game, never a broken state.
- **Inputs**: the bar's buttons and the app's settings, read once at start and checked against known values (unknown values fall back to the defaults).

## The build

- The build runs only this repo's scripts, in Node, from committed files: no download, no external binary. The catalog builds it offline with `npm ci` (no install scripts) and `busy-cli build`.
- `scripts/voice_gen.py` downloads a speech model, but it is run by hand to regenerate `voice/`, never by the build or CI.
- Runtime dependency: `@busy-app/busy-lib` (MIT, official). Development: `@busy-app/cli`, `typescript`, `vite`, at the versions of the official template. The lockfile is committed; CI uses `npm ci` and `npm audit --omit=dev`.

## Accepted risks

- `npm audit` reports Vite advisories (`launch-editor`, the dev server's file serving). They concern Vite's **dev server**, which this project never runs (`busy-cli build` only); nothing of Vite ships in the package. Vite follows the version `@busy-app/cli` accepts.
- `Math.random` draws the balls: fair enough for a game night with no money ([03](03-draw.md)), not a cryptographic source.

## Last audit

Version 1.0.0: `npm audit --omit=dev` finds 0 vulnerabilities (nothing that ships). The full audit reports only Vite's dev server (above). No network code, no secrets in the tree. Earlier audits are in git.
