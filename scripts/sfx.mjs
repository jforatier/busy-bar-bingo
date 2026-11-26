// Sound effects, synthesized: no sample, no recording (specs/02-design.md#sound, specs/13-legal.md).
// Each sound is raw PCM s16le mono 44.1 kHz (.snd), timed to the animation it plays with.
// buildSounds() writes them to src/sounds/ (git-ignored); vite.config.mjs calls it inside `busy-cli build`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const RATE = 44100;

/** The spin lasts at most SPIN seconds (the app then releases the ball); the ball lands OUT_LAND seconds after the stop. */
export const SPIN = 10;
export const OUT_LAND = 0.6;
/** The title: ball k lands at TITLE.first + k * TITLE.step seconds. */
export const TITLE = { first: 0.15, step: 0.16 };

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const square = (p) => (p % 1 < 0.25 ? 1 : -1); // 25 % duty: bright on the bar's small speaker
const triangle = (p) => 4 * Math.abs((p % 1) - 0.5) - 1;
const sine = (p) => Math.sin(2 * Math.PI * p);

/** Deterministic random numbers, so every build makes the same bytes. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function track(sec) {
  return new Float32Array(Math.ceil(sec * RATE));
}

/** Adds a note: wave at freq (Hz, or a function of time), attack then exponential decay (tau, s) or a flat hold. */
function add(buf, t0, dur, freq, wave, amp, { attack = 0.005, tau = 0, vibrato = 0 } = {}) {
  const i0 = Math.round(t0 * RATE);
  const n = Math.round(dur * RATE);
  let phase = 0;
  for (let i = 0; i < n && i0 + i < buf.length; i++) {
    const t = i / RATE;
    const f = (typeof freq === 'function' ? freq(t) : freq) * (1 + vibrato * Math.sin(2 * Math.PI * 6 * t));
    phase += f / RATE;
    const env = Math.min(1, t / attack) * (tau ? Math.exp(-t / tau) : 1) * Math.min(1, (n - i) / (0.01 * RATE));
    buf[i0 + i] += amp * env * wave(phase);
  }
}

/** A ball knocking another: a short bright ping with a noise transient. */
function click(buf, t, freq, amp, rand) {
  add(buf, t, 0.03, freq, sine, amp, { attack: 0.0005, tau: 0.006 });
  const i0 = Math.round(t * RATE);
  for (let i = 0; i < 90 && i0 + i < buf.length; i++) buf[i0 + i] += amp * 0.5 * (rand() * 2 - 1) * Math.exp(-i / 25);
}

function toSnd(buf) {
  const peak = buf.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9);
  const pcm = Buffer.alloc(buf.length * 2);
  buf.forEach((v, i) => pcm.writeInt16LE(Math.round((v / peak) * 0.85 * 32767), i * 2));
  return pcm;
}

/** The drum spins: balls rattle in the cage, a little sparse at the start while it gets going. Cut off by `out`. */
export function spinSound() {
  const rand = rng(75);
  const buf = track(SPIN);
  for (let t = 0.02; t < SPIN; ) {
    click(buf, t, 1800 + 1800 * rand(), 0.3 + 0.4 * rand(), rand);
    const rate = Math.min(32, 12 + 40 * t);
    t += (0.4 + 1.2 * rand()) / rate;
  }
  return toSnd(buf);
}

/** The drum stops: the last balls settle, one rolls out with ticks spaced wider and wider, and lands with a wooden clack. */
export function outSound() {
  const rand = rng(90);
  const buf = track(OUT_LAND + 0.25);
  for (let t = 0.01; t < 0.15; t += 0.03 + 0.04 * rand()) click(buf, t, 1800 + 1800 * rand(), 0.25, rand);
  for (let t = 0.1, gap = 0.04; t < OUT_LAND - 0.05; t += gap, gap *= 1.25) click(buf, t, 1250, 0.35, rand);
  add(buf, OUT_LAND, 0.2, 920, sine, 0.9, { attack: 0.0008, tau: 0.045 });
  add(buf, OUT_LAND, 0.12, 2150, sine, 0.45, { attack: 0.0008, tau: 0.02 });
  click(buf, OUT_LAND, 3000, 0.5, rand);
  return toSnd(buf);
}

/** The title: one bonk per ball as B, I, N, G, O drop in, up a major chord. */
export function titleSound() {
  const buf = track(TITLE.first + 4 * TITLE.step + 0.5);
  [72, 76, 79, 84, 88].forEach((m, k) => {
    const t = TITLE.first + k * TITLE.step;
    add(buf, t, 0.25, (x) => hz(m) * (1 + 0.5 * Math.exp(-x / 0.015)), square, 0.35, { tau: 0.08 });
    add(buf, t, 0.3, hz(m), sine, 0.5, { tau: 0.12 });
  });
  return toSnd(buf);
}

/** A player calls: a rising two-note question while the host checks the card. */
export function checkSound() {
  const buf = track(0.5);
  add(buf, 0, 0.14, hz(81), square, 0.5, { tau: 0.2 });
  add(buf, 0.15, 0.3, hz(88), square, 0.5, { tau: 0.25 });
  return toSnd(buf);
}

/** The host confirms a win: a fanfare up to a held, shimmering top note over a chord. */
export function winSound() {
  const buf = track(1.9);
  [67, 72, 76, 79].forEach((m, k) => add(buf, k * 0.1, 0.11, hz(m + 12), square, 0.45));
  add(buf, 0.4, 1.4, hz(96), square, 0.4, { vibrato: 0.012 });
  for (const m of [72, 76, 79]) add(buf, 0.4, 1.4, hz(m), triangle, 0.22);
  return toSnd(buf);
}

export const SOUNDS = { spin: spinSound, out: outSound, title: titleSound, check: checkSound, win: winSound };

/** Writes src/sounds/<name>.snd, rewriting a file only when its bytes changed. */
export function buildSounds() {
  mkdirSync('src/sounds', { recursive: true });
  for (const [name, make] of Object.entries(SOUNDS)) {
    const path = `src/sounds/${name}.snd`;
    const pcm = make();
    let old = null;
    try { old = readFileSync(path); } catch { /* first build */ }
    if (!old || !old.equals(pcm)) writeFileSync(path, pcm);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) buildSounds();
