# 03 — The draw

How a ball is chosen, which prize is at stake, and how a game is saved. The code is `src/draw.ts`, pure (no device call), tested by `scripts/draw.test.mjs`.

## A ball

- At each draw the app picks **uniformly among the balls still in the drum** (`Math.random`). This is the same as drawing from a bag shuffled once, and the saved game only needs the balls already called.
- A ball is never called twice: it is chosen among those left, by construction. When none is left, or the last prize is won, the draw returns nothing and the game is over.
- `Math.random` is not a cryptographic source. That fits a game night with no money involved ([13](13-legal.md)); the test suite checks the spread over 30,000 first draws.

## How a ball is called

| Game | Numbers | Label |
|---|---|---|
| 75 | 1–75, column letter by fifteen: B 1–15, I 16–30, N 31–45, G 46–60, O 61–75 | "N 42" |
| 90 | 1–90 | "42" |

## Prizes

The prizes of a game, in order: `bingo` for the 75-ball game; `line`, `two_lines`, `full_house` for the 90-ball game. The host confirms a winner and play moves on to the next prize; after the last one the game is over.

## Saved game

`save()` writes `{"v":1,"game":75|90,"called":[…],"prize":n}` (about 300 bytes for a full 90-ball game), once per ball and once per confirmed prize. `restore()` accepts only a well-formed save: the right version, a known game, each ball an integer in range and called once, a prize index in range. Anything else (a corrupted store, a future format) gives no game rather than a broken one, and the app offers a new game.
