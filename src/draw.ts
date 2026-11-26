// The draw, as pure data: no device call, so Node tests it directly (scripts/draw.test.mjs). Rules in specs/03-draw.md.

export type Game = 75 | 90;
export type Prize = "bingo" | "line" | "two_lines" | "full_house";

/** The prizes played in a game, in order: the game is over once the last one is won. */
export const PRIZES: Record<Game, readonly Prize[]> = {
  75: ["bingo"],
  90: ["line", "two_lines", "full_house"],
};

export interface State {
  game: Game;
  /** Balls in the order they were called. */
  called: number[];
  /** Index in PRIZES[game] of the prize at stake; equal to its length once the game is over. */
  prize: number;
}

export function newGame(game: Game): State {
  return { game, called: [], prize: 0 };
}

/** Balls still in the drum, in ascending order. */
export function remaining(s: State): number[] {
  const out: number[] = [];
  const seen: boolean[] = [];
  for (const n of s.called) seen[n] = true;
  for (let n = 1; n <= s.game; n++) if (!seen[n]) out.push(n);
  return out;
}

export function isOver(s: State): boolean {
  return s.prize >= PRIZES[s.game].length || s.called.length >= s.game;
}

/**
 * Draws one ball, uniformly among those left, and records it. Picking at random from what is left at each draw is the
 * same as drawing from a bag shuffled once, and the saved game needs only the balls called.
 * Returns null when the game is over.
 */
export function draw(s: State, random: () => number = Math.random): number | null {
  if (isOver(s)) return null;
  const left = remaining(s);
  const ball = left[Math.min(left.length - 1, Math.floor(random() * left.length))];
  s.called.push(ball);
  return ball;
}

/** The prize a player is calling for now, or null once the game is over. */
export function prizeAtStake(s: State): Prize | null {
  return PRIZES[s.game][s.prize] ?? null;
}

/** The host confirmed a winner: play moves on to the next prize. */
export function confirmWin(s: State): void {
  if (s.prize < PRIZES[s.game].length) s.prize++;
}

/** The column letter of a 75-ball number: B 1–15, I 16–30, N 31–45, G 46–60, O 61–75. */
export function letter(n: number): string {
  return "BINGO"[Math.floor((n - 1) / 15)];
}

/** How a ball is called: "N 42" in the 75-ball game, "42" in the 90-ball game. */
export function label(game: Game, n: number): string {
  return game === 75 ? `${letter(n)} ${n}` : String(n);
}

const SAVE_VERSION = 1;

export function save(s: State): string {
  return JSON.stringify({ v: SAVE_VERSION, game: s.game, called: s.called, prize: s.prize });
}

/** Reads a saved game; anything malformed (an old format, a corrupted store) gives null, never a broken game. */
export function restore(text: string | null): State | null {
  if (!text) return null;
  let d: unknown;
  try {
    d = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof d !== "object" || d === null) return null;
  const { v, game, called, prize } = d as Record<string, unknown>;
  if (v !== SAVE_VERSION || (game !== 75 && game !== 90)) return null;
  if (!Array.isArray(called) || called.length > game) return null;
  const seen: boolean[] = [];
  for (const n of called) {
    if (!Number.isInteger(n) || n < 1 || n > game || seen[n]) return null;
    seen[n] = true;
  }
  if (!Number.isInteger(prize) || (prize as number) < 0 || (prize as number) > PRIZES[game].length) return null;
  return { game, called: called as number[], prize: prize as number };
}
