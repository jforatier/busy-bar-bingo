# 01 — Behaviour

What the app does, screen by screen. Layout and motion are in [02](02-design.md); the draw itself in 03-draw.md.

## The two games

| | US 75-ball | 90-ball (UK, French *loto*) |
|---|---|---|
| Numbers | 1–75 | 1–90 |
| How a ball is called | letter + number: B 1–15, I 16–30, N 31–45, G 46–60, O 61–75 ("N 42") | the number alone ("42") |
| Players' cards | 5×5 grid, free centre | 3 rows × 9 columns, 15 numbers |
| What wins, in order | BINGO (the pattern the organiser announced) | one line, two lines, full house (*quine*, *double quine*, *carton plein*) |
| Back display board | 5 rows B-I-N-G-O × 15 numbers | 9 rows of ten (1–10 … 81–90) |

Players bring their own cards (printed, bought, home-made): the app is the caller and the board, not the cards.

## Two ways to run the draw

| | Manual (default) | Automatic |
|---|---|---|
| For | a host who runs the show, one press per step | a host who also plays, or a long game with few hands on the bar |
| A ball | Start sets the drum spinning; Start again stops it and the ball rolls out. A drum left spinning releases its ball by itself after 10 s | the drum spins for a random 2–4 s, so no two draws feel the same, then the ball rolls out; the next draw starts after the pace set in `auto_pace` |
| Start | spin, then stop | play / pause the run of draws |
| OK | a player calls a win | a player calls a win, playing or paused: the run pauses during the check and goes on after it if it was playing |

## Screens and controls

| Screen | Front (the room) | Back (the host) | Controls |
|---|---|---|---|
| **New game** | the two games, the chosen one lit | rules of the chosen game, "START to begin" | wheel: choose the game · Start: begin |
| **Title** | the five column balls drop in, B-I-N-G-O, each on a note | the board of the game in progress | about 1 s, then Waiting (or New game when there is none) |
| **Waiting** (before a ball, or between balls) | the last ball called, still | the board, the last ball inverted, the count called | Start: draw (manual) or play/pause (automatic) · wheel: history · OK: a player calls a win |
| **Drawing** | the drum spins, then a ball rolls out and lands, big | the board updates when the ball lands | manual: Start stops the drum; other inputs wait until the ball has landed |
| **History** (whenever the drum is still, game over included) | an earlier ball in its colour, its number in grey, its rank small at the top right ("#5") | the board, that ball inverted | wheel: step (from the last ball, a turn either way goes back one) · Start or 5 s idle: back to the last ball |
| **Win check** | the prize at stake in amber: BINGO? (75); 90: LINE?, TWO LINES?, FULL HOUSE? (*QUINE ?, DOUBLE QUINE ?, CARTON ?* in French) | "CHECK THE CARD", the board | OK: confirmed (the voice calls the prize, then the fanfare; 75: the title balls hop in a wave, 90: the prize name in rainbow letters, and the game moves to the next prize; in French the full house is called and shown as *BINGO !*) · Back: false call, play on |
| **Game over** | the last prize won, or "ALL BALLS OUT" | the full board | Start: new game |

- **Opening the app resumes the game in progress**, on its last ball. A new game is started on purpose: a long press on OK asks "NEW GAME?", Start confirms, Back keeps the current game.
- Back quits; the game is already saved (a ball still spinning is not, so it goes back in the drum). Back + long press is the firmware's force quit.
- In automatic mode the front shows a thin amber line filling up to the next ball while it plays, and "II" at the top right when paused; the back's header says PLAY or PAUSED.
- The firmware's own volume control stays the way to set the sound level; the wheel belongs to the history.

## Settings

Set in the bar's settings menu or the BUSY web UI (`src/appmeta/settings.json`).

| Field | Values | Default | Effect |
|---|---|---|---|
| `language` | English, Francais | English | the caller's voice and the prize names on the front |
| `voice` | on, off | on | a voice calls each ball once it lands ("B… seven!", *quarante-deux !*) and each confirmed prize, independently of `sounds` |
| `nicknames` | on, off | off | after the call, the ball's traditional nickname scrolls once under its number ("Two little ducks" for 22); every number has one in English, only the well-known ones in French (*L'age du Christ* for 33) |
| `sounds` | on, off | on | drum, ball and celebration sounds |
| `mode` | manual, automatic | manual | how a ball is drawn (above) |
| `auto_pace` | 15 s, 20 s, 30 s, 45 s, 60 s | 30 s | automatic mode: time between two balls, long enough to mark the cards |

## Saved game

When a ball lands and when a win is confirmed, the app writes the game (which game, the balls in order, the prize at stake) to `localStorage`, on the bar's flash, at once: one small write each time. A game therefore survives quitting, another app or a BUSY session taking over the bar, a flat battery, a reinstall of the same version and a restart of the bar; opening the app goes back to the last ball.

- A ball still spinning when the app stops is not saved: it goes back in the drum.
- Automatic mode always comes back paused, so nothing is drawn before the host is ready.
- Settings are read when the app opens.
- A save the app can't read (power lost in the middle of the write) gives a new game rather than a broken one.
