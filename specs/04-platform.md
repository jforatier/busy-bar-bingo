# 04 — Platform

BUSY Bar facts this app relies on, verified on a real bar running firmware 1.4.1 (HTTP API `27.15.0`), then re-checked on 1.5.1 (`27.16.0`) by a full game whose captures match the 1.4.1 ones. The app needs no endpoint added in 1.5.1, so `api_version` stays `27.15.0`. Re-check this file after a firmware update.

## Display

- Front 72×16 in colour, back 160×80 in 16 greys; the system icons cover the back's right 12 px.
- The firmware's smallest readable font (`small`) needs about 8 px for two digits, so the host's board uses the app's own pixel digits, one `xpmbitmap` per row ([02](02-design.md#back-16080-greys)). One draw with about 95 text elements is accepted.
- **Brightness can't be set from an app.** `POST /display/brightness` answers `{"result":"OK"}` from an app, but the brightness does not change and `GET` keeps the user's value (`auto`); from a computer on USB or from the BUSY app it takes effect. The app therefore leaves the user's setting alone; with automatic brightness in a dim room the board is dimmer, and the catalog description suggests raising the brightness for a game night.

## The JavaScript engine

- **Never build a bitmap pixel by pixel on the bar.** Drawing a 72×16 cage per frame and a 148×80 board that way in the app blocked the engine until the bar restarted. The bitmaps are computed at build time; the board's rows are joined from cached pieces (the engine copies a string on every `+=`).
- The heap is raised to 256 KiB (`heap_size_kib`): the generated bitmaps (about 38 KB of text) live in memory with the display sender's copies of what it sent.
- The app takes about 4 s to start: the firmware shows its loading screen while the script and its generated data load, then the title plays.
- A screen change that builds the whole board (a new game) shows about 1.2 s after the press; a landing, which rebuilds one or two rows, is quick.

## Input

- Start, OK and Back arrive as themselves; the wheel arrives as `encoder` with `delta ±1`. Back + long press is the firmware's force quit.
- Simulated from a computer (`POST /api/input`), `down` reaches the app as the wheel turning clockwise; `up` does not reach it.

## Audio

- `busy-cli build` packs every file under `src/sounds/`, sub-folders included, **flat** into `sounds/`: two clips with the same name in different sub-folders overwrite each other. The voice clips are therefore named `<lang>_<key>.snd`.
- `audio/play` with a path that does not exist answers HTTP 200 with `{"error":"Failed to play audio"}`.
- One sound plays at a time and there is no "sound ended" event: the app chains clips by their known lengths, and a new sound cuts the one playing.

## Storage

- `localStorage` is text only and each write rewrites flash: the game is written once per ball ([03](03-draw.md#saved-game)).
