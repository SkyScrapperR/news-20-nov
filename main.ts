// Draws a one-day world news infographic for Friday 20 November 2026 and writes it as a PNG.
// Node 22, standard library only, no network, deterministic: same bytes on every run.
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

type RGB = [number, number, number];
type Story = { region: string; icon: string; color: string; title: string; text: string };

const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;

function set(x: number, y: number, c: RGB): void {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) set(i, j, c);
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++)
    for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++)
      if ((i - cx) ** 2 + (j - cy) ** 2 <= r * r) set(i, j, c);
}

function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++)
    for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
      const d = Math.sqrt((i - cx) ** 2 + (j - cy) ** 2);
      if (d <= r && d >= r - t) set(i, j, c);
    }
}

function line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let k = 0; k <= n; k++) disc(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, t / 2, c);
}

function poly(pts: number[][], c: RGB): void {
  const ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs: number[] = [];
    for (let k = 0; k < pts.length; k++) {
      const [ax, ay] = pts[k];
      const [bx, by] = pts[(k + 1) % pts.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) set(x, y, c);
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
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
};

const adv = (s: number) => 6 * s;
const textW = (t: string, s: number) => t.length * adv(s) - s;

function text(t: string, x: number, y: number, s: number, c: RGB, bold = false): void {
  let cx = x;
  for (const ch of t.toUpperCase()) {
    const g = FONT[ch] ?? FONT['?'];
    for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if (g[r] & (16 >> b)) rect(cx + b * s, y + r * s, s + (bold ? 1 : 0), s, c);
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
  } else if (kind === 'chart') {
    rect(cx - 40, cy + 30, 82, 4, INK); rect(cx - 40, cy - 38, 4, 72, INK);
    for (let k = 0; k < 4; k++) rect(cx - 30 + k * 18, cy + 30 - (14 + k * 12), 12, 14 + k * 12, mix(c, WHITE, 0.35));
    line(cx - 30, cy + 14, cx - 8, cy - 2, 5, [30, 132, 73]); line(cx - 8, cy - 2, cx + 8, cy + 4, 5, [30, 132, 73]);
    line(cx + 8, cy + 4, cx + 32, cy - 26, 5, [30, 132, 73]);
    poly([[cx + 38, cy - 34], [cx + 22, cy - 30], [cx + 36, cy - 18]], [30, 132, 73]);
  }
}

// ---- layout ----
const data = JSON.parse(readFileSync(new URL('./news.json', import.meta.url), 'utf8')) as { date: string; stories: Story[]; footer: string };
const BG: RGB = [244, 241, 234];
const NAVY: RGB = [20, 33, 61];
rect(0, 0, W, H, BG);

rect(0, 0, W, 150, NAVY);
text('WORLD NEWS IN ONE PICTURE', (W - textW('WORLD NEWS IN ONE PICTURE', 3)) / 2, 22, 3, [252, 196, 54]);
text(data.date, (W - textW(data.date, 6)) / 2, 62, 6, WHITE);
rect(0, 150, W, 6, [252, 196, 54]);

const CW = 320, CH = 266, GX = 16, GY = 170, GAP = 16;
data.stories.forEach((s, n) => {
  const x = GX + (n % 3) * (CW + GAP);
  const y = GY + Math.floor(n / 3) * (CH + 10);
  const c = hex(s.color);
  rect(x + 3, y + 3, CW, CH, [214, 208, 196]);
  rect(x, y, CW, CH, WHITE);
  rect(x, y, CW, 28, c);
  text(s.region, x + 10, y + 7, 2, WHITE);
  icon(s.icon, x + 62, y + 90, c);
  // Headline beside the icon, at most 3 lines; the body starts below whichever is taller.
  const head = wrap(s.title, 10).slice(0, 3);
  const headTop = y + 90 - (head.length * 30 - 9) / 2;
  head.forEach((l, k) => text(l, x + 124, headTop + k * 30, 3, INK));
  rect(x + 12, y + 150, CW - 24, 2, mix(c, WHITE, 0.6));
  const body = wrap(s.text, 25);
  body.slice(0, 5).forEach((l, k) => text(l, x + 12, y + 162 + k * 20, 2, [30, 34, 40], true));
});

text(data.footer, (W - textW(data.footer, 2)) / 2, 1000, 2, [70, 70, 70], true);

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
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0)),
]);
writeFileSync(join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png'), png);
