// Draws a one-day world news infographic for Friday 20 November 2026 and writes it as a PNG.
// Node 22, standard library only, no network, deterministic: same bytes on every run.
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

type RGB = [number, number, number];
type Story = { region: string; icon: string; color: string; title: string; text: string };

// Everything draws into the current target: the page, or an offscreen buffer that is later shrunk (smooth icons).
// The page is drawn 4x supersampled (S = 4) and averaged down at the end, so shapes and text come out anti-aliased.
const PAGE_W = 1024;
const PAGE_H = 1024;
const SS = 4;
const page = new Uint8Array(PAGE_W * SS * PAGE_H * SS * 3);
let px = page;
let W = PAGE_W * SS;
let H = PAGE_H * SS;
let S = SS;
function offscreen(w: number, h: number, bg: RGB, draw: () => void): Uint8Array {
  const keep = [px, W, H, S] as const;
  px = new Uint8Array(w * h * 3); W = w; H = h; S = 1;
  for (let i = 0; i < w * h; i++) { px[i * 3] = bg[0]; px[i * 3 + 1] = bg[1]; px[i * 3 + 2] = bg[2]; }
  draw();
  const out = px;
  [px, W, H, S] = keep;
  return out;
}
// Area-average a square offscreen buffer of side `sw` down to side `dw` at (dx, dy) on the current target.
function shrink(src: Uint8Array, sw: number, dx: number, dy: number, dw: number): void {
  const f = sw / dw;
  for (let y = 0; y < dw; y++) for (let x = 0; x < dw; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let j = Math.floor(y * f); j < Math.floor((y + 1) * f); j++) for (let i = Math.floor(x * f); i < Math.floor((x + 1) * f); i++) {
      const k = (j * sw + i) * 3; r += src[k]; g += src[k + 1]; b += src[k + 2]; n++;
    }
    set(dx + x, dy + y, [Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
  }
}

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;

// put() writes one target pixel; every other primitive takes page coordinates and works at the target's S.
function put(X: number, Y: number, c: RGB): void {
  if (X < 0 || Y < 0 || X >= W || Y >= H) return;
  const i = (Y * W + X) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function set(x: number, y: number, c: RGB): void {
  const X = Math.round(x) * S, Y = Math.round(y) * S;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) put(X + i, Y + j, c);
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.round(x * S)), x1 = Math.min(W, Math.round((x + w) * S));
  const y0 = Math.max(0, Math.round(y * S)), y1 = Math.min(H, Math.round((y + h) * S));
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) put(i, j, c);
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  const X = cx * S, Y = cy * S, R = r * S;
  for (let j = Math.floor(Y - R); j <= Math.ceil(Y + R); j++)
    for (let i = Math.floor(X - R); i <= Math.ceil(X + R); i++)
      if ((i + 0.5 - X) ** 2 + (j + 0.5 - Y) ** 2 <= R * R) put(i, j, c);
}

function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  const X = cx * S, Y = cy * S, R = r * S, T = t * S;
  for (let j = Math.floor(Y - R); j <= Math.ceil(Y + R); j++)
    for (let i = Math.floor(X - R); i <= Math.ceil(X + R); i++) {
      const d = Math.sqrt((i + 0.5 - X) ** 2 + (j + 0.5 - Y) ** 2);
      if (d <= R && d >= R - T) put(i, j, c);
    }
}

function line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * S / 2));
  for (let k = 0; k <= n; k++) disc(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, t / 2, c);
}

function poly(pts: number[][], c: RGB): void {
  const P = pts.map(([x, y]) => [x * S, y * S]);
  const ys = P.map((p) => p[1]);
  for (let Y = Math.floor(Math.min(...ys)); Y <= Math.ceil(Math.max(...ys)); Y++) {
    const yc = Y + 0.5, xs: number[] = [];
    for (let k = 0; k < P.length; k++) {
      const [ax, ay] = P[k];
      const [bx, by] = P[(k + 1) % P.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let X = Math.ceil(xs[k] - 0.5); X <= Math.floor(xs[k + 1] - 0.5); X++) put(X, Y, c);
  }
}

// 5x7 bitmap font, one number per row, high bit on the left.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11], B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e], D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f], F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f], H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e], J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11], N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d], R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e], T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a], X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04], Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e], '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f], '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02], '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e], '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e], '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 0x0c, 0x0c], ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  '-': [0, 0, 0, 0x1f, 0, 0, 0], "'": [0x0c, 0x04, 0x08, 0, 0, 0, 0], '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0], '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03], '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08], '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04], '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0], '[': [0x0e, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0e],
  ']': [0x0e, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0e], '*': [0, 0x15, 0x0e, 0x1f, 0x0e, 0x15, 0], '=': [0, 0, 0x1f, 0, 0x1f, 0, 0], ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
};

const adv = (s: number) => 6 * s;
const textW = (t: string, s: number) => t.length * adv(s) - s;

function text(t: string, x: number, y: number, s: number, c: RGB, bold = false): void {
  let cx = x;
  for (const ch of t.toUpperCase()) {
    const g = FONT[ch] ?? FONT['?'];
    for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if (g[r] & (16 >> b)) rect(cx + b * s, y + r * s, s + (bold ? Math.max(0.6, s * 0.3) : 0), s, c);
    cx += adv(s);
  }
}

function wrap(t: string, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of t.split(' ')) {
    if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

// Icons, each drawn inside a box centred on (cx, cy) about 100 px across.
const INK: RGB = [33, 37, 41];
const WHITE: RGB = [255, 255, 255];

function icon(kind: string, cx: number, cy: number, c: RGB): void {
  const soft = mix(c, WHITE, 0.75);
  disc(cx, cy, 50, soft);
  if (kind === 'bridge') {
    rect(cx - 42, cy + 2, 84, 7, INK);
    for (let a = 0; a <= 180; a += 2) {
      const r = (a * Math.PI) / 180;
      disc(cx - Math.cos(r) * 34, cy + 2 - Math.sin(r) * 24, 2.5, INK);
    }
    for (let k = -2; k <= 2; k++) line(cx + k * 13, cy + 2 - 24 * Math.sqrt(Math.max(0, 1 - ((k * 13) / 34) ** 2)), cx + k * 13, cy + 2, 3, INK);
    rect(cx - 36, cy + 9, 6, 26, INK); rect(cx + 30, cy + 9, 6, 26, INK);
    const star: number[][] = [];
    for (let k = 0; k < 16; k++) { const r = k % 2 ? 9 : 22; const a = (k * Math.PI) / 8; star.push([cx + 18 + Math.cos(a) * r, cy - 22 + Math.sin(a) * r]); }
    poly(star, [231, 76, 60]);
    disc(cx + 18, cy - 22, 7, [245, 176, 65]);
  } else if (kind === 'thermo') {
    disc(cx, cy + 22, 15, [231, 76, 60]);
    rect(cx - 8, cy - 38, 16, 58, WHITE); ring(cx, cy - 38, 8, 3, INK);
    rect(cx - 8, cy - 38, 3, 52, INK); rect(cx + 5, cy - 38, 3, 52, INK);
    rect(cx - 4, cy - 14, 8, 30, [231, 76, 60]);
    for (let k = 0; k < 4; k++) rect(cx + 10, cy - 30 + k * 11, 8, 3, INK);
    poly([[cx - 40, cy + 6], [cx - 20, cy - 22], [cx - 16, cy + 2]], [39, 174, 96]);
    line(cx - 38, cy + 4, cx - 19, cy - 14, 2, INK);
  } else if (kind === 'rings') {
    disc(cx - 18, cy, 30, [0, 51, 153]);
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; disc(cx - 18 + Math.cos(a) * 19, cy + Math.sin(a) * 19, 3, [255, 204, 0]); }
    disc(cx + 22, cy, 30, [1, 33, 105]);
    rect(cx + 22 - 30, cy - 6, 60, 12, WHITE); rect(cx + 22 - 6, cy - 30, 12, 60, WHITE);
    rect(cx + 22 - 30, cy - 3, 60, 6, [200, 16, 46]); rect(cx + 22 - 3, cy - 30, 6, 60, [200, 16, 46]);
    ring(cx + 22, cy, 31, 3, WHITE);
  } else if (kind === 'cyclone') {
    for (let arm = 0; arm < 2; arm++)
      for (let t = 0; t < 260; t += 2) {
        const a = (t * Math.PI) / 180 + arm * Math.PI;
        const r = 10 + t * 0.14;
        disc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 6 - t / 70, c);
      }
    disc(cx, cy, 9, WHITE); ring(cx, cy, 10, 3, c);
  } else if (kind === 'quake') {
    const ys = [0, 0, -4, 6, -18, 26, -36, 30, -14, 10, -4, 3, 0, 0];
    for (let k = 0; k + 1 < ys.length; k++) line(cx - 44 + k * 7, cy + ys[k], cx - 44 + (k + 1) * 7, cy + ys[k + 1], 4, INK);
    rect(cx - 44, cy + 38, 88, 4, c);
  } else if (kind === 'scales') {
    rect(cx - 3, cy - 36, 6, 66, INK); rect(cx - 22, cy + 30, 44, 7, INK);
    line(cx - 36, cy - 28, cx + 36, cy - 28, 5, INK); disc(cx, cy - 36, 6, INK);
    for (const s of [-1, 1]) {
      line(cx + s * 34, cy - 28, cx + s * 22, cy + 2, 2, INK); line(cx + s * 34, cy - 28, cx + s * 46, cy + 2, 2, INK);
      poly([[cx + s * 34 - 16, cy + 2], [cx + s * 34 + 16, cy + 2], [cx + s * 34 + 8, cy + 12], [cx + s * 34 - 8, cy + 12]], c);
    }
  } else if (kind === 'vote') {
    rect(cx - 40, cy - 8, 80, 40, INK);
    poly([[cx - 46, cy - 8], [cx, cy - 40], [cx + 46, cy - 8]], INK);
    disc(cx, cy - 24, 8, mix(c, WHITE, 0.75));
    for (let k = 0; k < 5; k++) rect(cx - 32 + k * 15, cy - 2, 6, 28, mix(c, WHITE, 0.75));
    rect(cx - 30, cy + 34, 60, 4, INK);
  } else if (kind === 'chip') {
    rect(cx - 28, cy - 28, 56, 56, INK);
    for (let k = 0; k < 5; k++) {
      const o = -22 + k * 11;
      rect(cx + o - 2, cy - 40, 4, 12, INK); rect(cx + o - 2, cy + 28, 4, 12, INK);
      rect(cx - 40, cy + o - 2, 12, 4, INK); rect(cx + 28, cy + o - 2, 12, 4, INK);
    }
    text('AI', cx - textW('AI', 4) / 2, cy - 14, 4, WHITE);
  } else if (kind === 'shield') {
    poly([[cx - 32, cy - 36], [cx + 32, cy - 36], [cx + 32, cy + 2], [cx, cy + 40], [cx - 32, cy + 2]], INK);
    poly([[cx - 24, cy - 28], [cx + 24, cy - 28], [cx + 24, cy], [cx, cy + 30], [cx - 24, cy]], c);
    rect(cx - 4, cy - 22, 8, 40, WHITE); rect(cx - 18, cy - 8, 36, 8, WHITE);
  } else if (kind === 'ship') {
    poly([[cx - 44, cy + 6], [cx + 44, cy + 6], [cx + 32, cy + 26], [cx - 34, cy + 26]], INK);
    rect(cx - 20, cy - 12, 34, 18, INK); rect(cx - 10, cy - 28, 10, 16, INK);
    for (let k = 0; k < 3; k++) rect(cx - 16 + k * 10, cy - 6, 6, 6, mix(c, WHITE, 0.75));
    for (let k = -40; k < 40; k += 4) disc(cx + k, cy + 32 + Math.sin(k / 5) * 3, 2.5, c);
    const star: number[][] = [];
    for (let k = 0; k < 14; k++) { const r = k % 2 ? 7 : 17; const a = (k * Math.PI) / 7; star.push([cx + 26 + Math.cos(a) * r, cy - 26 + Math.sin(a) * r]); }
    poly(star, [231, 76, 60]);
  } else if (kind === 'cross') {
    rect(cx - 12, cy - 36, 24, 72, c); rect(cx - 36, cy - 12, 72, 24, c);
    ring(cx, cy, 46, 4, c);
  } else if (kind === 'chart') {
    rect(cx - 40, cy + 30, 82, 4, INK); rect(cx - 40, cy - 38, 4, 72, INK);
    for (let k = 0; k < 4; k++) rect(cx - 30 + k * 18, cy + 30 - (14 + k * 12), 12, 14 + k * 12, mix(c, WHITE, 0.35));
    line(cx - 30, cy + 14, cx - 8, cy - 2, 5, [30, 132, 73]); line(cx - 8, cy - 2, cx + 8, cy + 4, 5, [30, 132, 73]);
    line(cx + 8, cy + 4, cx + 32, cy - 26, 5, [30, 132, 73]);
    poly([[cx + 38, cy - 34], [cx + 22, cy - 30], [cx + 36, cy - 18]], [30, 132, 73]);
  }
}

// ---- layout v3: masthead, key numbers, hero + date check, map, 12 tiles, 24 briefs, regions, footer ----
// Text sizes are multiples of 0.25 so every font pixel lands on whole supersampled pixels.
type Item = { region: string; cat: string; icon: string; lon: number; lat: number; title: string; text: string; src: string };
const data = JSON.parse(readFileSync(new URL('./news.json', import.meta.url), 'utf8')) as {
  title: string; subtitle: string; edition: string; cats: Record<string, string>;
  numbers: { n: string; cap: string; src: string }[]; hero: Item; tiles: Item[];
  also: { t: string; src: string; region: string }[]; datecheck: string[]; sources: string[]; policy: string[];
};
const PAPER: RGB = [247, 241, 228];
const CARD: RGB = [255, 252, 245];
const RULE: RGB = [60, 52, 44];
const GREY: RGB = [78, 70, 62];
const RED: RGB = [168, 40, 20];
const catColor = (c: string): RGB => hex(data.cats[c] ?? '#666666');
// Sources get a * when a story rests on one outlet only.
const cite = (s: string) => '[' + s + ']' + (s.split(',').length < 2 ? '*' : '');
const center = (t: string, y: number, s: number, c: RGB, bold = false) => text(t, (PAGE_W - textW(t, s)) / 2, y, s, c, bold);
const smallIcon = (kind: string, x: number, y: number, size: number, c: RGB, bg: RGB) =>
  shrink(offscreen(104, 104, bg, () => icon(kind, 52, 52, c)), 104, x, y, size);

rect(0, 0, PAGE_W, PAGE_H, PAPER);

// Masthead
center(data.title, 8, 4, INK, true);
rect(8, 44, PAGE_W - 16, 3, RULE); rect(8, 49, PAGE_W - 16, 1, RULE);
center(data.subtitle, 55, 2, RED, true);
center(data.edition, 74, 1.25, GREY, true);
rect(8, 87, PAGE_W - 16, 1, RULE);

// Key numbers
data.numbers.forEach((k, i) => {
  const x = 8 + i * 168;
  if (i) rect(x - 1, 92, 1, 52, [200, 190, 175]);
  text(k.n, x + (168 - textW(k.n, 4)) / 2, 92, 4, RED, true);
  text(k.cap, x + (168 - textW(k.cap, 1.5)) / 2, 123, 1.5, INK, true);
  const s = '[' + k.src + ']';
  text(s, x + (168 - textW(s, 1)) / 2, 137, 1, GREY, true);
});
rect(8, 148, PAGE_W - 16, 3, RULE);

// Lead story (1) with the date check below it
const hero = data.hero;
const hc = catColor(hero.cat);
rect(8, 156, 496, 216, CARD);
rect(8, 156, 496, 18, hc);
text('1  LEAD - ' + hero.region + ' - ' + hero.cat, 14, 161, 1.25, WHITE, true);
icon(hero.icon, 70, 236, hc);
const heroHead = wrap(hero.title, 20);
heroHead.forEach((l, k) => text(l, 132, 182 + k * 26, 3, INK, true));
const heroBody = wrap(hero.text, 40);
heroBody.forEach((l, k) => text(l, 132, 186 + heroHead.length * 26 + k * 13, 1.5, INK, true));
text(cite(hero.src), 132, 190 + heroHead.length * 26 + heroBody.length * 13, 1.25, GREY, true);
rect(16, 306, 480, 60, [244, 232, 212]);
rect(16, 306, 3, 60, RED);
text('DATE CHECK - LEFT OUT, NOT 20 NOV:', 26, 311, 1.25, RED, true);
data.datecheck.forEach((d, k) => text(d, 26 + (k % 2) * 236, 326 + Math.floor(k / 2) * 12, 1, INK, true));

// World map with numbered pins (stories 1-13)
const MX = 512, MY = 156, MW = 504, MH = 186;
const mapX = (lon: number) => MX + ((lon + 180) / 360) * MW;
const mapY = (lat: number) => MY + ((80 - lat) / 138) * MH;
rect(MX, MY, MW, MH, [214, 230, 236]);
const LAND: number[][][] = [
  [[-165, 66], [-130, 71], [-85, 70], [-60, 55], [-67, 45], [-80, 32], [-81, 25], [-97, 26], [-88, 15], [-78, 8], [-92, 15], [-106, 23], [-118, 33], [-125, 48], [-140, 60]],
  [[-50, 60], [-20, 70], [-30, 80], [-60, 80], [-70, 77]],
  [[-80, 10], [-60, 10], [-35, -6], [-40, -22], [-58, -38], [-68, -55], [-75, -45], [-71, -18], [-81, -5]],
  [[-10, 36], [-9, 44], [-2, 48], [5, 54], [8, 58], [5, 62], [15, 70], [30, 71], [40, 66], [40, 45], [28, 41], [20, 40], [12, 44], [3, 42]],
  [[-6, 50], [2, 51], [-2, 58], [-6, 56]],
  [[-17, 15], [-10, 30], [-5, 36], [10, 37], [32, 31], [43, 12], [51, 11], [40, -5], [40, -15], [32, -28], [20, -35], [12, -17], [9, 4], [-8, 5]],
  [[40, 45], [40, 66], [70, 73], [110, 77], [140, 72], [180, 68], [160, 58], [140, 52], [130, 40], [122, 30], [110, 20], [105, 10], [100, 2], [98, 15], [90, 22], [80, 8], [73, 20], [67, 25], [57, 25], [50, 30], [56, 26], [45, 13], [35, 28], [35, 36]],
  [[114, -22], [130, -12], [142, -11], [153, -27], [146, -39], [135, -35], [115, -34]],
  [[95, 5], [106, -6], [120, -9], [140, -8], [125, 0], [110, 2]],
  [[130, 31], [141, 36], [142, 45], [139, 38]],
  [[166, -46], [174, -41], [178, -38], [172, -34]],
];
for (let lo = -150; lo <= 150; lo += 30) rect(mapX(lo), MY, 1, MH, [200, 216, 224]);
for (const p of LAND) poly(p.map(([lo, la]) => [mapX(lo), mapY(la)]), [196, 186, 160]);
[hero, ...data.tiles].forEach((p, i) => {
  const x = mapX(p.lon), y = mapY(p.lat), lab = String(i + 1);
  disc(x, y, 8.5, WHITE); disc(x, y, 7.5, catColor(p.cat));
  text(lab, x - textW(lab, 1) / 2, y - 3.5, 1, WHITE, true);
});
Object.keys(data.cats).forEach((c, i) => {
  const x = MX + 4 + (i % 4) * 126, y = MY + MH + 6 + Math.floor(i / 4) * 13;
  disc(x + 4, y + 4, 4.5, catColor(c));
  text(c, x + 13, y, 1.25, INK, true);
});

// 8 large illustrated tiles (stories 2-9)
const NT = data.tiles.length;
data.tiles.forEach((t, i) => {
  const x = 8 + (i % 4) * 254, y = 378 + Math.floor(i / 4) * 170;
  const c = catColor(t.cat);
  rect(x, y, 246, 164, CARD);
  rect(x, y, 246, 20, c);
  text(String(i + 2) + '  ' + t.region + ' - ' + t.cat, x + 6, y + 5, 1.5, WHITE, true);
  smallIcon(t.icon, x + 6, y + 28, 62, c, CARD);
  const head = wrap(t.title, 10);
  head.forEach((l, k) => text(l, x + 76, y + 27 + k * 22, 2.5, INK, true));
  text(cite(t.src), x + 76, y + 31 + head.length * 22, 1.25, GREY, true);
  wrap(t.text, 26).forEach((l, k) => text(l, x + 6, y + 112 + k * 15, 1.5, INK, true));
});

// Also on 20 November (stories after the tiles), two columns read top to bottom
const LY = 722, PER = Math.ceil(data.also.length / 2);
rect(8, LY, PAGE_W - 16, 2, RULE);
text('ALSO ON 20 NOVEMBER', 8, LY + 6, 2, INK, true);
data.also.forEach((a, i) => {
  const x = 8 + Math.floor(i / PER) * 508, y = LY + 26 + (i % PER) * 13;
  const n = String(i + NT + 2), src = cite(a.src);
  const s = (n.length + a.t.length + src.length + 2) * 9 <= 500 ? 1.5 : 1.25;
  text(n, x, y, s, RED, true);
  text(a.t, x + (n.length + 1) * 6 * s, y, s, INK, true);
  text(src, x + (n.length + a.t.length + 2) * 6 * s, y, s, GREY, true);
});

// Stories per region, one line
const counts: Record<string, number> = {};
for (const r of [hero.region, ...data.tiles.map((t) => t.region), ...data.also.map((a) => a.region)]) counts[r] = (counts[r] ?? 0) + 1;
const regionLine = 'STORIES BY REGION: ' + Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([r, n]) => r + ' ' + n).join(', ');
text(regionLine, 8, 940, 1.25, INK, true);

// Footer: sources and policy
rect(8, 956, PAGE_W - 16, 2, RULE);
data.sources.forEach((l, k) => center(l, 963 + k * 11, 1.25, INK, true));
data.policy.forEach((l, k) => center(l, 988 + k * 11, 1.25, GREY, true));

// ---- PNG encoding ----
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(b: Uint8Array): number { let c = -1; for (const v of b) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type: string, body: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + body.length);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'latin1');
  Buffer.from(body).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}
// Average each SSxSS block of the supersampled page into one output pixel.
const OUT = new Uint8Array(PAGE_W * PAGE_H * 3);
for (let y = 0; y < PAGE_H; y++) for (let x = 0; x < PAGE_W; x++) for (let ch = 0; ch < 3; ch++) {
  let sum = 0;
  for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) sum += page[((y * SS + j) * PAGE_W * SS + x * SS + i) * 3 + ch];
  OUT[(y * PAGE_W + x) * 3 + ch] = Math.floor((sum + (SS * SS) / 2) / (SS * SS));
}
px = OUT; W = PAGE_W; H = PAGE_H;
// Indexed colour for a small file: the 256 most frequent colours form the palette (ties broken by value, so the
// result is deterministic); any other colour maps to its nearest palette entry.
const key = (i: number) => (px[i * 3] << 16) | (px[i * 3 + 1] << 8) | px[i * 3 + 2];
const freq = new Map<number, number>();
for (let i = 0; i < W * H; i++) freq.set(key(i), (freq.get(key(i)) ?? 0) + 1);
const pal = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 256).map((e) => e[0]);
const slot = new Map<number, number>(pal.map((k, i) => [k, i]));
function nearest(k: number): number {
  let best = slot.get(k);
  if (best !== undefined) return best;
  let bd = Infinity;
  pal.forEach((q, i) => {
    const d = ((k >> 16) - (q >> 16)) ** 2 + (((k >> 8) & 255) - ((q >> 8) & 255)) ** 2 + ((k & 255) - (q & 255)) ** 2;
    if (d < bd) { bd = d; best = i; }
  });
  slot.set(k, best!);
  return best!;
}
const raw = Buffer.alloc((W + 1) * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) raw[y * (W + 1) + 1 + x] = nearest(key(y * W + x));
const plte = Buffer.alloc(pal.length * 3);
pal.forEach((k, i) => { plte[i * 3] = k >> 16; plte[i * 3 + 1] = (k >> 8) & 255; plte[i * 3 + 2] = k & 255; });
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 3;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('IDAT', deflateSync(raw, { level: 9, memLevel: 9 })), chunk('IEND', new Uint8Array(0)),
]);
writeFileSync(join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png'), png);
