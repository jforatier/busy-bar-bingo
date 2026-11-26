# 21 — Promotion

How the app presents itself, and how each visual is made. The catalog submission itself is in [20](20-catalog.md).

## Positioning

- **For whom**: anyone running a bingo or loto night with a BUSY Bar on the table: a family at Christmas, an office party, a club, a classroom.
- **The promise, in one line** (the reference sentence, reused word for word: catalog `short_description`, GitHub About, README):
  > Run a bingo night from your BUSY Bar: the drum spins, a voice calls each ball, the host checks cards on the back.
- **Short form** (manifest and `package.json`, where space is tight): *Run a bingo night from your BUSY Bar: drum, voice and the host's board.*
- **Three things that set it apart**, in this order:
  1. **Both sides, two audiences**: the room on the front, the host's board on the back.
  2. **A draw you can feel and hear**: the drum, the ball, a voice calling it in English or French, the win.
  3. **A tool you can trust for a real game**: never a repeat, the game survives quitting, 75 or 90 balls.
- **What it is not**: a gambling app, or a card generator.

## Where it appears

| Channel | What people see | Source in the repo |
|---|---|---|
| BUSY Apps Catalog | short description, description, changelog, screenshots | `catalog.json`, `CATALOG.md`, `CHANGELOG.md` Highlights, `screenshots/` |
| The catalog's Discord forum | a post per submission, thumbnail = the **centre 16×16 square of `front-1`** (x 28–44) | `screenshots/front-1.png` |
| GitHub repository | About, social preview, README | the reference sentence, `docs/media/social-preview.png`, `README.md` |
| GitHub Releases | release notes | `CHANGELOG.md` |

## Visual assets

All visuals are **real captures** from the bar, never mockups, made by one script: `python -I specs/ui-mockups/shots.py` (bar on USB, app installed). It opens the app on prepared games, captures, and puts the settings back.

| Asset | Shows | Notes |
|---|---|---|
| `screenshots/front-1.png` | the title: five balls spelling BINGO | the catalog's first image; its centre 16×16 square (x 28–44, the grey N ball) is the thumbnail of the catalog's Discord post |
| `screenshots/front-2.png` | the cage spinning | |
| `screenshots/front-3.png` | a called ball, G 52 | the same moment as `back-1` |
| `screenshots/front-4.png` | a nickname scrolling under the number | the `nicknames` setting on |
| `screenshots/front-5.png` | FULL HOUSE! at the end of a 90-ball game | |
| `screenshots/back-1.png` | the 75-ball board, 23 balls, G 52 inverted | raw 160×80 capture with the system icons |
| `screenshots/back-2.png` | the 90-ball board while the host checks a card | |
| `docs/media/bingo.gif` | a real draw: the previous ball, the cage, the new ball | `shots.py gif` records it again |
| `docs/media/back.png` | `back-1` as LED dots | |
| `docs/media/social-preview.png` (1280×640) | `front-1`, the reference sentence's first half, `front-3` and `back-1` as LED dots | upload in the repo's settings |
| Launcher icons | the blue ball, 8×8 colour and 11×11 grey | `specs/ui-mockups/02-show/icons.py` |

The catalog and the README can't play sound: a short video of the bar with the sound on (the app's own sounds only) shows the voice and the drum.

## Rules

- True and checkable claims, updated with each release.
- No money: never present the app as a way to win anything.
- "BUSY" is descriptive only ("for the BUSY Bar"); the app is named **Bingo**.
- Sponsored or contest posts say so (`#ad`, or the hashtag the organiser requires).
- Videos and GIFs play only the app's own sounds and voice, never other music.
- A change of wording starts here, then reaches every channel above.
