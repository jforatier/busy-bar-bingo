// Bingo: the screens and controls of specs/01, drawn as specs/02 describes. The draw itself is src/draw.ts; the bitmaps
// are computed at build time (src/art.gen.ts) and the board's rows by src/art.ts. This file holds the state machine,
// the clock and the inputs. Nothing here works pixel by pixel: the bar's engine is too slow for it.
import { device } from "@shared/device";
import { APP, type El, rect, report, show, text } from "./display.ts";
import {
  type Game, type Prize, type State, PRIZES, confirmWin, draw, isOver, label, letter, newGame, prizeAtStake, remaining,
  restore, save,
} from "./draw.ts";
import { BOARD, boardRow, keyOf, rowKey, rowY } from "./art.ts";
import { ART, CAGE_FRAMES, GROW_STEPS } from "./art.gen.ts";
import { VOICE_MS } from "./voice.gen.ts";
import { NICKNAMES } from "./nicknames.gen.ts";

// ---------- Timing ----------

const TICK_MS = 40;
/** Title ball k lands at TITLE_FIRST + k × TITLE_STEP seconds, on its note in sounds/title.snd (scripts/sfx.mjs). */
const TITLE_FIRST = 0.15;
const TITLE_STEP = 0.16;
const TITLE_S = 1.6;
/** The longest spin, in seconds: the length of sounds/spin.snd. */
const SPIN_MAX_S = 10;
/** Seconds the drum takes to stop and the ball to land after the stop (the clack of sounds/out.snd). */
const LAND_S = 0.6;
/** Turns of the cage loop per second while it spins. */
const CAGE_LOOPS_PER_S = 1;
/** The celebration lasts the announced prize plus this, in seconds. */
const WIN_S = 2.2;
/** Between the letter and the number of a call, and after the clack before the voice. */
const VOICE_GAP_MS = 120;
/** Nicknames scroll at this speed (px/s), about five letters a second, once, after the call. */
const NICK_SPEED = 32;
const HISTORY_IDLE_MS = 5000;

// ---------- Colours and texts ----------

const WHITE = "#FFFFFFFF";
const BLACK = "#000000FF";
const DIM = "#FFFFFF59";
const GREY = "#FFFFFF99";
const AMBER = "#FFB000FF";
const RAINBOW = ["#FF3D8BFF", "#FFB000FF", "#FFE14DFF", "#3DDC84FF", "#3DDCFFFF", "#B04DFFFF"];
/** The text colour of a call: its column's colour (N, grey on the ball, is white here), amber in the 90-ball game. */
const INK: Record<string, string> = { B: "#2F6BFFFF", I: "#FF2E2EFF", N: WHITE, G: "#22D35AFF", O: AMBER, A: AMBER };
/** `bold` advances, spacing included, measured with busy-lib's `textWidth`; 7 for the others. */
const BOLD: Record<string, number> = { E: 6, F: 6, I: 5, J: 6, L: 6, M: 10, N: 8, V: 8, W: 11, "!": 4, " ": 5 };
type Lang = "en" | "fr";
/** What the screen asks while the host checks a card, then what it celebrates (specs/01). */
const CHECK: Record<Lang, Record<Prize, string>> = {
  en: { bingo: "BINGO?", line: "LINE?", two_lines: "TWO LINES?", full_house: "FULL HOUSE?" },
  fr: { bingo: "BINGO ?", line: "QUINE ?", two_lines: "DOUBLE QUINE ?", full_house: "CARTON ?" },
};
const WIN: Record<Lang, Record<Prize, string>> = {
  en: { bingo: "BINGO!", line: "LINE!", two_lines: "TWO LINES!", full_house: "FULL HOUSE!" },
  fr: { bingo: "BINGO !", line: "QUINE !", two_lines: "DOUBLE QUINE !", full_house: "BINGO !" },
};

// ---------- Settings (src/appmeta/settings.json) ----------

let auto = false;
let paceMs = 30000;
let sounds = true;
let voiceOn = true;
let nicknamesOn = false;
let lang: Lang = "en";

async function loadSettings(): Promise<void> {
  try {
    const v = ((await device.AppsSettingsGet({ app_id: APP })).values ?? {}) as Record<string, unknown>;
    auto = v.mode === "auto";
    paceMs = (Number(v.auto_pace) || 30) * 1000;
    sounds = v.sounds !== false;
    voiceOn = v.voice !== false;
    nicknamesOn = v.nicknames === true;
    lang = v.language === "fr" ? "fr" : "en";
  } catch {
    // no stored values yet: the defaults
  }
}

/** A sound to play and how long to wait before the next one: the bar plays one sound at a time, with no end event. */
type Step = [path: string, ms: number];
let chainTimer: ReturnType<typeof setTimeout> | undefined;

/** Plays steps one after another, after `delay` ms; a new chain cancels what was still queued. */
function chain(steps: Step[], delay = 0): void {
  if (chainTimer !== undefined) clearTimeout(chainTimer);
  chainTimer = undefined;
  let i = 0;
  const next = () => {
    if (i >= steps.length) return;
    const [path, ms] = steps[i++];
    device.AudioPlay({ application_name: APP, path }).catch(report);
    chainTimer = setTimeout(next, ms);
  };
  if (steps.length) chainTimer = setTimeout(next, delay);
}

/** A sound effect (setting `sounds`). */
const fx = (name: string): Step[] => (sounds ? [[`sounds/${name}.snd`, 0]] : []);

/** Voice clips (setting `voice`), in the chosen language. */
function voice(keys: string[]): Step[] {
  if (!voiceOn) return [];
  const ms = VOICE_MS[lang] as Record<string, number>;
  return keys.map((k): Step => [`sounds/${lang}_${k}.snd`, ms[k] + VOICE_GAP_MS]);
}

const voiceMs = (steps: Step[]) => steps.reduce((sum, [, ms]) => sum + ms, 0);

function sound(name: string): void {
  chain(fx(name));
}

// ---------- State ----------

type Screen = "title" | "new" | "confirm" | "wait" | "spin" | "history" | "check" | "win" | "over";
let screen: Screen = "title";
let since = 0; // when the screen started (ms)
let game: State | null = null;
let pick: Game = 75; // the game chosen on the new-game screen
let ball = 0; // the ball being drawn
let stopAt = Infinity; // seconds from the spin's start when the drum was stopped
let spinFor = 0; // automatic mode: how long this spin lasts
let running = false; // automatic mode: playing or paused
let wasRunning = false;
let nextAt = 0; // automatic mode: when the next spin starts
let histIndex = 0;
let histAt = 0;
let won: Prize = "bingo";
let winS = WIN_S;
/** The last ball's nickname, scrolling from nickFrom to nickUntil (ms), or null. */
let nick: [string, number] | null = null;
let nickFrom = 0;
let nickUntil = 0;
/** The screen's still frame, rebuilt only when what it shows changes. */
let still: El[] | null = null;

function go(s: Screen): void {
  screen = s;
  since = Date.now();
  still = null;
  tick();
}

function store(): void {
  try {
    if (game) localStorage.setItem("game", save(game)); // once per ball or prize: each write rewrites flash
  } catch (err) {
    report(err);
  }
}

// ---------- Front (72×16) ----------

const xpmEl = (id: string, data: string, x = 0, y = 0, extra: object = {}): El => ({
  id, type: "xpmbitmap", x, y, data, align: "top_left", z_index: 0, ...extra,
});

/** The 16×16 ball of a number, in its column's colour (75) or amber (90). */
const ball16 = (g: Game, n: number) => ART.ball16[keyOf(g, n) as keyof typeof ART.ball16];

/** The called ball: the 16×16 ball (75: its letter on the white disc) and the number, big. */
function frontBall(g: Game, n: number, colour: string): El[] {
  const els = [xpmEl("ball", ball16(g, n)), text("num", String(n), "extra_large", 45, 1, colour, { align: "top_mid" })];
  if (g === 75) els.push(text("letter", letter(n), "bold", 8, 2, BLACK, { align: "top_mid", z_index: 2 }));
  return els;
}

/** The five title balls B-I-N-G-O, ball k raised by lift[k] pixels, with their letters. */
function balls(lift: number[]): El[] {
  const els: El[] = [];
  for (let k = 0; k < 5; k++) {
    els.push(xpmEl(`t${k}`, ART.ball16["BINGO"[k] as "B"], 14 * k - 2, -lift[k]));
    els.push(text(`l${k}`, "BINGO"[k], "bold", 14 * k + 6, 2 - lift[k], BLACK, { align: "top_mid", z_index: 2 }));
  }
  return els;
}

function titleLift(t: number): number[] {
  const lift: number[] = [];
  for (let k = 0; k < 5; k++) {
    const land = TITLE_FIRST + k * TITLE_STEP;
    if (t < land - 0.14) lift.push(40);
    else if (t < land) lift.push(Math.round(16 * ((land - t) / 0.14) ** 2)); // falls
    else if (t - land < 0.18) lift.push(Math.round(3 * Math.sin(((t - land) / 0.18) * Math.PI))); // one bounce
    else lift.push(0);
  }
  return lift;
}

/** The celebration: the title balls hop in a wave. */
const hopLift = (t: number) =>
  [0, 1, 2, 3, 4].map((k) => Math.round(3 * Math.max(0, Math.sin(2 * Math.PI * (t * 1.6 - k * 0.12)))));

/** Letters riding a wave: letter i's lift at t seconds. */
const wave = (t: number, i: number) => Math.round(2 * Math.max(0, Math.sin(2 * Math.PI * (t * 1.6 - i * 0.1))));

const widthOf = (s: string) => {
  let w = 0;
  for (const c of s) w += BOLD[c] ?? 7;
  return w;
};

/**
 * Words in `bold`, one element per letter so each can take its colour and ride a wave (t in seconds, or null). Wider
 * than the screen ("DOUBLE QUINE !"), they break at the last space onto two lines (caps on rows 0-6 and 8-14).
 */
function word(s: string, colours: string[], t: number | null): El[] {
  const cut = s.lastIndexOf(" ", s.length - 3); // never before a lone "!" or "?"
  const lines = widthOf(s) > 70 && cut > 0 ? [s.slice(0, cut), s.slice(cut + 1)] : [s];
  const els: El[] = [];
  let i = 0;
  lines.forEach((line, row) => {
    let x = 36 - Math.floor(widthOf(line) / 2);
    const y = lines.length === 1 ? 2 : row === 0 ? -2 : 6;
    for (const c of line) {
      // Two lines fill the screen: only a single line has room to ride the wave.
      const dy = t === null || lines.length > 1 ? 0 : -wave(t, i);
      if (c !== " ") els.push(text(`w${i}`, c, "bold", x, y + dy, colours[i % colours.length]));
      x += BOLD[c] ?? 7;
      i++;
    }
  });
  return els;
}

/**
 * The drum t seconds after the press: the cage spins until the stop, slows to a halt over LAND_S, and the ball rolls
 * out to the left, growing into the 16×16 ball as it lands.
 */
function drum(g: Game, t: number): El[] {
  const u = Math.max(0, Math.min(t - stopAt, LAND_S));
  const turns = CAGE_LOOPS_PER_S * (Math.min(t, stopAt) + u - (u * u) / (2 * LAND_S));
  const els: El[] = [];
  if (u < 0.3) els.push(xpmEl("cage", ART.cage[g][Math.floor(turns * CAGE_FRAMES) % CAGE_FRAMES], 28, 0));
  if (t >= stopAt) {
    const e = 1 - (1 - u / LAND_S) ** 3;
    const x = 36 + (8 - 36) * e;
    const y = 8 + (1 - e) * 5 * Math.abs(Math.sin(e * Math.PI * 1.5)); // a little bounce as it rolls
    const sprite = ART.grow[keyOf(g, ball) as keyof typeof ART.grow][Math.round(e * (GROW_STEPS - 1))];
    els.push(xpmEl("grow", sprite, Math.round(x - 8), Math.round(y - 8), { z_index: 1 }));
  }
  return els;
}

function front(now: number): El[] {
  const t = (now - since) / 1000;
  const g = game?.game ?? pick;
  switch (screen) {
    case "title":
      return balls(titleLift(t));
    case "new": {
      const m75 = xpmEl("m75", ART.ball8.B, 6, 4, { opacity: pick === 75 ? 100 : 35 });
      const m90 = xpmEl("m90", ART.ball8.A, 40, 4, { opacity: pick === 90 ? 100 : 35 });
      return [m75, m90, text("t75", "75", "bold", 16, 2, pick === 75 ? WHITE : "#FFFFFF4D"),
        text("t90", "90", "bold", 50, 2, pick === 90 ? WHITE : "#FFFFFF4D")];
    }
    case "confirm":
      return word("NEW GAME?", [WHITE], null);
    case "spin":
      return drum(g, t);
    case "history": {
      const n = game!.called[histIndex];
      return frontBall(g, n, GREY).concat(text("pos", `#${histIndex + 1}`, "small", 71, -1, DIM, { align: "top_right" }));
    }
    case "check":
      return word(CHECK[lang][prizeAtStake(game!) ?? "bingo"], [AMBER], null);
    case "win":
      return g === 75 ? balls(hopLift(t)) : word(WIN[lang][won], RAINBOW, t);
    case "over": {
      if (prizeAtStake(game!) !== null) return word("ALL OUT!", [WHITE], null); // every ball out, the last prize not won
      return g === 75 ? balls([0, 0, 0, 0, 0]) : word(WIN[lang][PRIZES[g][PRIZES[g].length - 1]], RAINBOW, null);
    }
    default: {
      // wait
      const called = game!.called;
      const n = called[called.length - 1];
      let els: El[];
      if (nick && now >= nickFrom && now < nickUntil) {
        // The nickname (specs/02): the number on a `bold` top line, the nickname scrolling in `small` underneath and
        // sliding out of sight behind the ball (a black square under the ball, over the text).
        els = [
          xpmEl("ball", ball16(g, n), 0, 0, { z_index: 2 }),
          rect("mask", 0, 0, 16, 16, "#000000FF", 1),
          text("num", String(n), "bold", 19, -2, WHITE),
          text("nick", nick[0], "small", 72 - (NICK_SPEED * (now - nickFrom)) / 1000, 6, INK[keyOf(g, n)]),
        ];
        if (g === 75) els.push(text("letter", letter(n), "bold", 8, 2, BLACK, { align: "top_mid", z_index: 3 }));
      } else {
        els = called.length ? frontBall(g, n, WHITE) : balls([0, 0, 0, 0, 0]);
      }
      if (auto && running) {
        const k = Math.max(0, Math.min(1, 1 - (nextAt - now) / paceMs));
        els.push(rect("prog", 18, 15, Math.round(54 * k), 1, "#FFB00080"));
      } else if (auto) {
        els.push(text("pause", "II", "small", 71, -1, DIM, { align: "top_right" }));
      }
      return els;
    }
  }
}

// ---------- Back (160×80, greys) ----------

const rowKeys: string[] = [];
const rowEls: El[] = [];
let headKey = "";
let headEls: El[] = [];

/**
 * The board with its header. Each row is its own bitmap, rebuilt only when what it shows changes: a ball landing
 * touches one or two rows.
 */
function backBoard(mark: number | null, h1: string, h2: string): El[] {
  const g = game!.game;
  const shown = screen === "spin" ? game!.called.length - 1 : game!.called.length; // the back learns the ball on landing
  const on: boolean[] = [];
  for (let i = 0; i < shown; i++) on[game!.called[i]] = true;
  const rows = BOARD[g].rows;
  for (let r = 0; r < rows; r++) {
    const key = `${g}${rowKey(g, r, on, mark)}`;
    if (rowKeys[r] !== key) {
      rowKeys[r] = key;
      rowEls[r] = xpmEl(`r${r}`, boardRow(g, r, on, mark), 0, rowY(g, r), { display: "back" });
    }
  }
  const hk = `${g}|${h1}|${h2}`;
  if (hk !== headKey) {
    headKey = hk;
    headEls = [
      text("h1", h1, "small", 0, -1, WHITE, { display: "back" }),
      text("h2", h2 || " ", "small", 146, -1, DIM, { display: "back", align: "top_right" }),
    ];
    if (g === 75) {
      for (let r = 0; r < 5; r++) headEls.push(text(`L${r}`, "BINGO"[r], "bold", 0, 9 + 14 * r, WHITE, { display: "back" }));
    }
  }
  return headEls.concat(rowEls.slice(0, rows));
}

function backFrame(): El[] {
  if (screen === "new" || (screen === "title" && !game)) {
    return [
      text("b1", "NEW GAME", "small", 0, -1, DIM, { display: "back" }),
      text("b2", `${pick} BALLS`, "bold", 0, 12, WHITE, { display: "back" }),
      text("b3", pick === 75 ? "US bingo: card 5x5, B-I-N-G-O" : "UK / loto: card 3x9, 15 numbers", "small", 0, 28, DIM, {
        display: "back",
      }),
      text("b4", "WHEEL  change     START  play", "small", 0, 66, WHITE, { display: "back" }),
    ];
  }
  const g = game!;
  const shown = screen === "spin" ? g.called.length - 1 : g.called.length;
  const last = shown ? g.called[shown - 1] : null;
  const count = `${shown} / ${g.game}` + (auto ? (running ? "  PLAY" : "  PAUSED") : "");
  switch (screen) {
    case "history":
      return backBoard(g.called[histIndex], `#${histIndex + 1}  ${label(g.game, g.called[histIndex])}`, count);
    case "check":
      return backBoard(last, "CHECK THE CARD", "OK yes  BACK no");
    case "win":
      return backBoard(last, WIN[lang][won], "");
    case "over":
      return backBoard(null, prizeAtStake(g) === null ? "GAME OVER" : "ALL BALLS OUT", "START new game");
    case "confirm":
      return backBoard(last, "NEW GAME?", "START yes  BACK no");
    default:
      return backBoard(last, last ? `LAST  ${label(g.game, last)}` : "START to draw", count);
  }
}

// ---------- Flow ----------

function afterTitle(): void {
  go(!game ? "new" : isOver(game) ? "over" : "wait");
}

function startSpin(): void {
  if (!game || !remaining(game).length || prizeAtStake(game) === null) return;
  nick = null;
  ball = draw(game)!;
  stopAt = Infinity;
  spinFor = 2 + 2 * Math.random();
  sound("spin");
  go("spin");
}

function stopSpin(t: number): void {
  if (stopAt !== Infinity) return;
  stopAt = t;
  sound("out"); // cuts the spin: the bar plays one sound at a time
}

function land(): void {
  store();
  const said = voice(game!.game === 75 ? [letter(ball), `n${ball}`] : [`n${ball}`]);
  chain(said, VOICE_GAP_MS); // after the clack
  nick = nicknamesOn ? NICKNAMES[lang][String(ball)] ?? null : null;
  if (nick) {
    nickFrom = Date.now() + VOICE_GAP_MS + voiceMs(said) + 300;
    nickUntil = nickFrom + ((72 - 16 + nick[1]) / NICK_SPEED) * 1000;
  }
  nextAt = Date.now() + paceMs;
  go(remaining(game!).length ? "wait" : "over");
}

function startCheck(): void {
  nick = null; // the check takes the front
  wasRunning = running;
  running = false;
  sound("check");
  go("check");
}

/** Back to the game after a check or a celebration; with the drum empty, that is the game over screen. */
function resume(): void {
  running = wasRunning;
  nextAt = Date.now() + paceMs;
  go(remaining(game!).length ? "wait" : "over");
}

function tick(): void {
  const now = Date.now();
  const t = (now - since) / 1000;
  if (screen === "title" && t >= TITLE_S) return afterTitle();
  if (screen === "spin") {
    if (stopAt === Infinity && (t >= SPIN_MAX_S || (auto && t >= spinFor))) stopSpin(t);
    if (t >= stopAt + LAND_S) return land();
  }
  if (screen === "win" && t >= winS) {
    if (isOver(game!)) return go("over");
    return resume();
  }
  if ((screen === "wait" || screen === "history") && auto && running && now >= nextAt) return startSpin();
  if (screen === "history" && now - histAt >= HISTORY_IDLE_MS) return go("wait");

  const nicking = screen === "wait" && nick !== null && now < nickUntil;
  const moving =
    screen === "title" || screen === "spin" || screen === "win" || (screen === "wait" && ((auto && running) || nicking));
  if (moving) {
    show(() => front(Date.now()).concat(backFrame()));
  } else {
    if (!still) still = front(now).concat(backFrame());
    show(still);
  }
}

function step(delta: number): void {
  nick = null; // the history takes the front
  const n = game!.called.length;
  if (!n) return;
  // From the last ball there is nothing ahead, so a turn either way goes back one.
  const i = screen === "history" ? Math.max(0, Math.min(n - 1, histIndex + delta)) : n - 2;
  if (i < 0) return;
  histAt = Date.now();
  if (i === n - 1) return go("wait");
  histIndex = i;
  if (screen === "history") {
    still = null;
    tick();
  } else go("history");
}

function input(key: string, action: string, delta: number): void {
  if (key === "encoder") {
    if (screen === "new") {
      pick = pick === 75 ? 90 : 75;
      still = null;
      tick();
    } else if (screen === "wait" || screen === "history" || screen === "over") step(delta);
    return;
  }
  if (key === "ok" && action === "long" && (screen === "wait" || screen === "history" || screen === "over")) {
    return go("confirm");
  }
  if (action !== "short") return;
  if (screen === "title") return afterTitle();
  if (screen === "new" && key === "start") {
    game = newGame(pick);
    running = false;
    store();
    try {
      localStorage.setItem("last", String(pick));
    } catch (err) {
      report(err);
    }
    return go("wait");
  }
  if (screen === "confirm") {
    if (key === "start") return go("new");
    if (key === "back") return go(isOver(game!) ? "over" : "wait");
    return;
  }
  if (screen === "check") {
    if (key === "ok") {
      won = prizeAtStake(game!) ?? "bingo";
      confirmWin(game!);
      store();
      const said = voice([won]);
      winS = WIN_S + voiceMs(said) / 1000;
      chain(said.concat(fx("win"))); // the prize called, then the fanfare
      return go("win");
    }
    if (key === "back") return resume();
    return;
  }
  if (screen === "spin" && key === "start") {
    if (auto) running = !running; // play / pause: this ball still comes out
    else stopSpin((Date.now() - since) / 1000);
    return;
  }
  if (screen === "over" && key === "start") return go("new");
  if ((screen === "wait" || screen === "history") && key === "start") {
    if (screen === "history") return go("wait");
    if (!auto) return startSpin();
    running = !running;
    if (running) return startSpin();
    still = null;
    return tick();
  }
  // A player may still call on the last ball, after the drum is empty.
  if (key === "ok" && (screen === "wait" || screen === "history" || (screen === "over" && prizeAtStake(game!) !== null))) {
    return startCheck();
  }
}

/**
 * Entry point, called at the end of the file: the device runs this script from top to bottom and starts nothing by itself.
 */
async function main(): Promise<void> {
  try {
    game = restore(localStorage.getItem("game"));
    pick = localStorage.getItem("last") === "90" ? 90 : 75;
  } catch (err) {
    report(err);
  }
  await loadSettings();
  sound("title");
  go("title");
  const timer = setInterval(tick, TICK_MS);

  let quitting = false;
  const unbind = listen("input", (event) => {
    if (quitting) return;
    if (event.key === "back" && event.action === "short" && screen !== "check" && screen !== "confirm") {
      quitting = true;
      clearInterval(timer);
      if (chainTimer !== undefined) clearTimeout(chainTimer);
      if (sounds || voiceOn) device.AudioStop().catch(() => undefined); // 410 when nothing is playing
      // Once the handler is detached, nothing keeps the app alive and the device takes the screen back.
      device.DisplayClear({ application_name: APP }).catch(report).finally(() => setTimeout(unbind, 0));
      return;
    }
    input(event.key, event.action, event.key === "encoder" ? event.delta : 0);
  });
}

void main().catch(report);
