# 02 — Design

The intentions behind every screen. Every screen is judged on the real bar, not in a PC render: the catalog screenshots in `screenshots/` are captures of it. Behaviour is in [01](01-behaviour.md).

## Intentions

1. **Readable from the back of the room.** The number just called is the one focal point, in the largest font that fits (`extra_large`), centred. Everything else on the front gives way to it.
2. **A draw you can feel.** A ball is never just printed: the drum spins, a ball rolls out and lands, the sound follows the motion. The suspense lasts about two seconds, long enough to build, short enough to keep a game moving.
3. **The host reads, the room watches.** The back is a calm, dense, high-contrast board; the front is the show.
4. **Use the platform, don't fight it.** Firmware fonts, reused element ids, no blank frame, the motion computed from the clock so a slow frame never slows the draw.

## Front (72×16)

| Role | Shape / font | Position | Notes |
|---|---|---|---|
| Title | the five column balls (B I N G O), overlapping | x = −2, then every 14 px | Spells the game's name with its own balls |
| Ball | 16×16 pixel ball in its column colour, light from the top right; 75-ball game: a white disc (radius 5) with the letter in black `bold` | x 0–15 | Anyone recognises a bingo ball at a glance |
| Number | `extra_large`, white | centred on x = 45, y = 1 | The focal point: white reads best from across a room |
| Drum | a grey cage (radius 7.5) with three turning spokes and nine 2×2 balls tumbling | centred on x = 36 | spins until the host stops it (or for a random 2–4 s in automatic mode), slows over its last 0.3 s, then one ball rolls out left and grows into the ball (0.6 s, ease-out, a small bounce) |
| Title | the five balls drop in one by one, 0.16 s apart, each with one bounce | | about 1 s |
| New game | an 8×8 ball and the game's number in `bold` for each game, 75 at x 6, 90 at x 40 | | the game not chosen at 35 % |
| Win check | the prize with "?" in amber `bold`, centred ("BINGO?", "LINE?") | | steady: nothing blinks while the host checks |
| Celebration | 75: the five title balls hop in a wave; 90: the prize name in rainbow `bold` letters riding a wave | | 2.2 s, on the fanfare. French prize names wider than 72 px ("DOUBLE QUINE !", "CARTON PLEIN !") take two lines |
| Nickname | the number moves up to a `bold` line (x 19, y −2), the nickname scrolls once in `small` underneath (y 6) at 32 px/s, in the column's colour, sliding out of sight behind the ball (a black 16×16 square under the ball, over the text); then the big number comes back | | starts 0.3 s after the voice; a new draw or the history stops it |
| History | the ball in its colour, its number in grey (`#FFFFFF99`), its rank in `small` at the top right ("#22") | | grey says "not the ball in play" without hiding it |

Every bitmap is computed at build time by `scripts/pixels.mjs` (src/art.gen.ts): the 16×16 balls, the 8×8 balls, 24 frames of the spinning cage (16×16, a loop) per game, and 8 sizes of the ball rolling out. The app only picks a frame and moves it, from the time since the press, so a slow frame never slows the draw; the bar shows about 9 cage frames a second. The ball that rolls out is the one called. Row 15 carries descenders only; no `tiny` text anywhere a person reads.

## Back (160×80, greys)

Usable width 146 px (the system icons cover x ≥ 148). Brightness carries the meaning: **white = called**, **faint `#3C3C3C` = not yet**, **inverted (a white box, the digits left dark) = the last ball**. A header in `small`: "LAST  N 42" on the left, "23 / 75" dimmed on the right.

| Game | Board | Cell | Digits |
|---|---|---|---|
| 75 | 5 rows, the letter in `bold`, then its 15 numbers | 9 px wide, rows every 14 px from y = 10 | 3×7 pixels, as tall as the letters |
| 90 | 9 rows of ten (1–10 … 81–90), as a loto board | 14 px wide, rows every 8 px from y = 8 | 3×5 pixels |

The board is **one `xpmbitmap` per row** in the app's own pixel digit font, assembled by `src/art.ts` from cached pieces, and a row is rebuilt only when what it shows changes (a landing touches one or two rows). The firmware's `small` font needs about 8 px for two digits, so fifteen numbers a row ran together ("1415"), and black text drawn over a white box does not read. 

## Palette

The US 75-ball game colours its balls by column, a convention players know. Each colour means one thing everywhere:

| Colour | Meaning |
|---|---|
| Blue `#2F6BFF`, red `#FF2E2E`, grey `#8C8C8C`, green `#22D35A`, amber `#FFB000` | the columns B, I, N, G, O (75-ball game). N, white on real balls, is grey here so its ring stands apart from the white disc |
| Amber `#FFB000` | the ball in the 90-ball game; the count |
| Rainbow | a win: BINGO, LINE, FULL HOUSE |

## Sound

Synthesized by `scripts/sfx.mjs` during the build (no sample, the same bytes on every build) and kept above ~400 Hz for the bar's small speaker. The bar plays one sound at a time, so each sound is timed to the animation it goes with, and the next one cuts it:

| Sound | Length | When |
|---|---|---|
| `title` | 1 s | one bonk per title ball, up a major chord |
| `spin` | up to 10 s | balls rattling in the cage, sparse while it gets going |
| `out` | 0.85 s | the drum stops (cuts `spin`), the ball rolls out with ticks spaced wider and wider, a wooden clack at 0.6 s as it lands |
| `check` | 0.5 s | two rising notes, a question, while the host checks a card |
| `win` | 1.9 s | a fanfare up to a held, shimmering top note over a chord |

The **voice** comes 120 ms after the clack, so the room sees the ball a beat before it hears it. In the 75-ball game it says the letter, then the number, two clips chained by their lengths ("B." then "Seven!"); a confirmed prize is called before the fanfare. A new sound (the next spin) cuts an announcement still playing.

| | English | French |
|---|---|---|
| Voice | `af_heart` | `ff_siwis` |
| Clips | 1–90, B I N G O, Bingo!, Line!, Two lines!, Full house! | 1–90, B I N G O, Bingo !, Quine !, Double quine !, Bingo ! (full house) |

The clips come from the Kokoro text-to-speech model, generated once by `scripts/voice_gen.py` (speed 0.95, silence trimmed, high-passed at 250 Hz, loudness-normalized) and committed in `voice/<lang>/` at 22 050 Hz, about 3.5 MB a language: the catalog builds offline, without Python or the model. `scripts/voice.mjs` doubles their rate into the bar's `.snd` during the build. The package is about 7.5 MB (45 s to install over USB).

## Icon

The blue B ball of the title, 8×8 with a white disc (front), and an 11×11 grey ring around a transparent disc (back), both previewed 1:1 on the bar. They follow the firmware's icon guidelines (`applications_js/AGENTS.md`): one object of the app, filled, no text, three tones of blue lit from the top right. The disc stays plain white, because a shaded disc reads smaller and blurrier at 8×8. On the back it is a hole in a solid ball, the same disc as the front; a smaller hole reads as a "+", and a dot for the number would be a lone pixel. Blue stands apart from the many amber icons in the launcher. The launcher keeps a cached icon until the bar restarts.
