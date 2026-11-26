# 10 — Quality

How the code is kept small and reviewable. The BUSY catalog runs automated checks and an AI review on code, texts and images before a moderator decides, and the contest jury scores code quality: the repo must explain itself.

## Code map

| Path | Role |
|---|---|
| `src/main.ts` | The app: the screens of [01](01-behaviour.md) as a state machine (`screen`), the clock (`tick`, every 40 ms), the inputs, the sound and voice sequencer (`chain`) |
| `src/draw.ts` | The draw, pure: no repeat, prizes in order, save and restore ([03](03-draw.md)) |
| `src/art.ts` | The host's board, one bitmap per row, assembled from cached digit pieces; colour keys |
| `src/display.ts` | The single display sender (only what changed, removed elements parked off-screen) and the element helpers |
| `src/appmeta/` | Manifest, settings schema, launcher icons |
| `shared/device.ts` | The device client (official template) |
| `scripts/sfx.mjs` | Sound effects, synthesized (build) |
| `scripts/pixels.mjs` | Balls, cage frames, growing ball as XPM bitmaps (build) |
| `scripts/voice.mjs` | Committed voice clips → the bar's `.snd`, with their lengths (build) |
| `scripts/nicknames.mjs` | The nickname lists, with their widths measured in the bar's font (build) |
| `scripts/voice_gen.py` | Generates the voice clips with a speech model (run by hand, not by the build) |
| `scripts/changelog.mjs`, `scripts/patch-busy-cli.mjs` | Changelog checker; a fix for `@busy-app/cli` on Windows (postinstall) |
| `scripts/*.test.mjs` | Unit tests (`node --test`) |
| `voice/<lang>/` | Voice clips, 22 050 Hz raw PCM, committed |
| `specs/ui-mockups/` | Design rounds drawn live on the bar from a computer, their captures, the drive and measure scripts |
| `.github/` | CI, release and Dependabot; issue forms and the pull request template |

Generated files (`src/*.gen.ts`, `src/sounds/`) are git-ignored and rebuilt by every build through `vite.config.mjs`.

## Conventions

- **TypeScript, strict**, the template's `tsconfig`. Logic that can be pure is pure and tested (`draw.ts`, `art.ts`, the build scripts).
- **Work at build time, not on the bar**: bitmaps, sounds, text widths and clip lengths are computed in Node. The bar's engine is too slow for pixel work and restarted the bar when asked to do it ([04](04-platform.md)).
- **One display sender**: no other code calls `display/draw`. A screen that does not move is built once (`still`) and passed again unchanged, so nothing is re-sent.
- **One sound at a time**: every sound goes through `chain`, which cancels what was queued.
- **Comments say why**, never what. A known limit is marked `shortcut: <limit>, <when to upgrade>`.
- **No dependency** beyond the BUSY toolchain and TypeScript.

## Checks

Run before every commit; CI runs the same on each push and pull request:

```sh
npm test            # node --test: draw, board rows, bitmaps, sounds, voice clips, nicknames, changelog
npm run changelog   # CHANGELOG.md format, versions in sync
npm run build       # busy-cli build → dist/net.foratier.bingo.tgz; generates the sounds, voice, bitmaps, nicknames first
npm run typecheck   # tsc, after the build (it imports the generated src/*.gen.ts)
```

A check counts only if its own summary line was seen (test count, `Done → dist/…`). A screen counts as done once it has been seen on the bar or the emulator: `specs/ui-mockups/drive.py` plays a game with simulated buttons and captures both displays (the wheel backwards and a long press can't be simulated: test those by hand).

## Versions and changelog

**[Semantic Versioning 2.0.0](https://semver.org/)**, like the platform. For an app, the public interface is what the user sees and keeps:

| Bump | When | Examples |
|---|---|---|
| MAJOR | the user loses something | stored settings or saved games reset, a setting or feature removed, a higher minimum firmware |
| MINOR | the user gains something | a new game variant, language, setting or screen |
| PATCH | nothing visible changes but a fix | a display or sound fix, performance, docs, dependencies |

`0.x` is pre-release; the first catalog release is `1.0.0`.

**[`CHANGELOG.md`](../CHANGELOG.md)** follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and every release opens with **`### Highlights`**, 1–5 bullets written for users: `node scripts/changelog.mjs notes <version> --highlights` gives the catalog's changelog field. Every change that matters lands in `## [Unreleased]` in the same commit. To release: rename `Unreleased` to `[x.y.z] - YYYY-MM-DD`, open a new empty `Unreleased`, set the same version in `src/appmeta/manifest.json` and `package.json`, commit, tag `x.y.z`, push the tag; the release workflow builds the `.tgz`.
