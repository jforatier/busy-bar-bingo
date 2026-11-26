// What the app still assembles itself (specs/02): the host's board, one bitmap per row, from a 3×5 or 3×7 digit font.
// The balls and the cage are computed at build time (scripts/pixels.mjs → src/art.gen.ts). Pure, tested from Node.
import { letter, type Game } from "./draw.ts";

/** The key of a ball's colour in the generated art: its column letter in the 75-ball game, A (amber) in the 90. */
export function keyOf(game: Game, n: number): string {
  return game === 75 ? letter(n) : "A";
}

const DIGITS: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "011", "001", "111"],
  "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "001", "010", "010"],
  "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"],
};
/** 3×7: the 3×5 digits with their two inner gaps doubled, for the 75-ball board's taller rows. */
const TALL: Record<string, string[]> = {};
for (const ch in DIGITS) {
  const d = DIGITS[ch];
  TALL[ch] = [d[0], d[1], d[1], d[2], d[3], d[3], d[4]];
}
TALL["1"] = ["010", "110", "010", "010", "010", "010", "111"];

/** Board geometry (specs/02): 75 = 5 rows of 15 after the letter column, 90 = 9 rows of ten. */
export const BOARD = {
  75: { rows: 5, cols: 15, x0: 10, cw: 9, y0: 10, pitch: 14, font: TALL },
  90: { rows: 9, cols: 10, x0: 4, cw: 14, y0: 8, pitch: 8, font: DIGITS },
} as const;

const BOARD_W = 148;

const dots: string[] = [""];
const dotsOf = (n: number): string => {
  while (dots.length <= n) dots.push(dots[dots.length - 1] + ".");
  return dots[n];
};

const glyphs: Record<string, string> = {};
/** One row of a digit, 3 characters: lit "W", faint "F", or "x" = inverted (digit dark on the white box). */
function glyph(font: Record<string, string[]>, d: string, j: number, ink: string): string {
  const id = `${font === TALL ? "t" : "s"}${d}${j}${ink}`;
  let g = glyphs[id];
  if (g === undefined) {
    g = "";
    for (const bit of font[d][j]) g += ink === "x" ? (bit === "1" ? "." : "W") : bit === "1" ? ink : ".";
    glyphs[id] = g;
  }
  return g;
}

/**
 * Row r of the board as XPM2 (148 px wide, the font's height + 2): numbers called (on[n]) white, the others faint, the
 * marked one inverted (a white box, its digits left dark). Built from cached pieces joined once per line: the bar's
 * engine copies a string on every `+=`, and a pixel-by-pixel build was enough to restart the bar.
 */
export function boardRow(game: Game, r: number, on: boolean[], mark: number | null): string {
  const { cols, x0, cw, font } = BOARD[game];
  const fh = font["0"].length;
  const lines: string[] = [];
  for (let j = 0; j < fh + 2; j++) {
    const parts: string[] = [dotsOf(x0)];
    for (let c = 0; c < cols; c++) {
      const n = r * cols + c + 1;
      const s = String(n);
      const w = 4 * s.length - 1;
      const off = Math.floor((cw - w) / 2);
      const edge = j === 0 || j === fh + 1; // above and below the digits
      if (n === mark) {
        parts.push(dotsOf(off - 1));
        if (edge) parts.push(s.length === 1 ? "WWWWW" : "WWWWWWWWW");
        else {
          parts.push("W", glyph(font, s[0], j - 1, "x"));
          if (s.length === 2) parts.push("W", glyph(font, s[1], j - 1, "x"));
          parts.push("W");
        }
        parts.push(dotsOf(cw - off - w - 1));
      } else if (edge) {
        parts.push(dotsOf(cw));
      } else {
        const ink = on[n] ? "W" : "F";
        parts.push(dotsOf(off), glyph(font, s[0], j - 1, ink));
        if (s.length === 2) parts.push(".", glyph(font, s[1], j - 1, ink));
        parts.push(dotsOf(cw - off - w));
      }
    }
    parts.push(dotsOf(BOARD_W - x0 - cols * cw));
    lines.push(parts.join(""));
  }
  return `! XPM2\n${BOARD_W} ${fh + 2} 3 1\n. c None\nW c #FFFFFF\nF c #3C3C3C\n${lines.join("\n")}`;
}

/** The y of row r, and its signature: what it shows, so an unchanged row is not rebuilt. */
export function rowY(game: Game, r: number): number {
  return BOARD[game].y0 + r * BOARD[game].pitch;
}

export function rowKey(game: Game, r: number, on: boolean[], mark: number | null): string {
  const { cols } = BOARD[game];
  let key = "";
  for (let n = r * cols + 1; n <= (r + 1) * cols; n++) key += n === mark ? "M" : on[n] ? "1" : "0";
  return key;
}
