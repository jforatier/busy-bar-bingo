# 00 — Index

> These specs describe **version 1.0.0** (2026-11-27), the app submitted to the BUSY Apps Catalog: no history here. Changes are in [CHANGELOG.md](../CHANGELOG.md), the rest is in git.

## Product

Bingo (`net.foratier.bingo`) turns a [BUSY Bar](https://busy.app) into the caller of a bingo or loto night. The bar runs the whole draw: it never calls a number twice, shows each ball big on the **front display for the room**, and keeps the board of called numbers on the **back display for the host**, who checks a winning card at a glance. The drum spins, the ball rolls out, a voice calls it.

Goals, in order:
1. **A real game-night tool**: no repeat, no lost game, a host who checks a card in seconds, a game that survives quitting the app.
2. **Both screens, both audiences**: the room watches the front, the host reads the back.
3. **A show**: the drum, the ball, the sounds, the voice and the "BINGO!" moment make the room feel the draw.

It is entered in the BUSY Bar Apps Hackathon (Nov–Dec 2026), category Games ([20](20-catalog.md)).

## Spec map

| # | File | Content |
|---|---|---|
| **Product** | | |
| 01 | [01-behaviour.md](01-behaviour.md) | The two games, the two draw modes, screens and controls, settings, the saved game |
| 02 | [02-design.md](02-design.md) | Intentions, front and back grids, palette, sounds and voice, icon |
| 03 | [03-draw.md](03-draw.md) | The draw: random source, no repeat, prizes, saved game |
| **Platform** | | |
| 04 | [04-platform.md](04-platform.md) | BUSY Bar facts the app relies on (display, engine, input, audio, storage) |
| **Cross-cutting** | | |
| 10 | [10-quality.md](10-quality.md) | Code map, conventions, checks, versions and changelog |
| 11 | [11-security.md](11-security.md) | What the app touches, the build, accepted risks, last audit |
| 12 | [12-performance.md](12-performance.md) | Start, frame rate, heap, sizes, measured on the bar |
| 13 | [13-legal.md](13-legal.md) | No money, what ships and why it is free to ship, the voice's licences, trademarks, privacy |
| **Release** | | |
| 20 | [20-catalog.md](20-catalog.md) | Catalog submission, contest checklist |

Every screen was checked on the real bar; the catalog screenshots in `screenshots/` are captures of it.

## Decisions

- **Name "Bingo"**, understood everywhere; the 90-ball game is the one played in the UK and in France (*loto*). No "BUSY" in the name: it is the maker's trademark. **App id `net.foratier.bingo`**, repo `jforatier/busy-bar-bingo`, category `games`, MIT.
- **Front = the room, back = the host.** The front (72×16) shows the ball just called; the back (160×80) shows the board of every number called.
- **The look** ([02](02-design.md)): the five column balls spell BINGO on the title screen; a called ball is a pixel bingo ball beside its number in big white digits; the drum is a spinning cage the ball rolls out of; the host's board is drawn in the app's own pixel digits so a full row stays readable.
- **Two games, one app**: US 75-ball (B-I-N-G-O columns) and 90-ball (UK / French loto). The game is chosen when a new game starts, not buried in the settings.
- **Two draw modes**: manual by default (Start spins, Start stops: the host runs the show), automatic as a setting (a random 2–4 s spin, a steady pace, Start pauses).
- **Controls**: Start draws (the bar's big button, the one people reach for); the wheel steps back through the called balls; OK announces a win; OK held starts a new game after a confirmation; Back quits. The game is saved after every ball, so quitting never loses it.
- **No repeat by construction**: a ball is drawn among those left.
- **Everything the bar shows or plays is made in this repo**, at build time: synthesized sounds, computed pixel art. The bar's engine only picks and moves them.
- **A synthetic voice calls the numbers and prizes, in English or French**, with its own setting apart from the sounds. The clips come from the Kokoro text-to-speech model (Apache-2.0), generated once and committed with their script, since the catalog builds offline ([13](13-legal.md)). In French the prizes keep their loto names (*quine*, *double quine*) and the full house is called "Bingo !".
- **Nicknames** of the numbers, off by default: all 90 traditional English calls, only the well-known French ones.
- **No money, no accounts, no network**: the app calls numbers; prizes and stakes are the organiser's business ([13](13-legal.md)).
- **Stack**: the official scaffold (`npm create @busy-app/app`), TypeScript, `@busy-app/busy-lib`, `busy-cli`, with a Windows fix for `busy-cli`, CI, tag-driven releases and a changelog checker.
