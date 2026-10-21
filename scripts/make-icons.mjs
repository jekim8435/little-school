// 앱 아이콘 PNG를 만든다 (외부 도구 없이 Node만으로). 실행: npm run icons
// 디자인: 하늘색 바탕에 빨간 지붕의 작은 학교, 문, 지붕 위 노란 별.
// 모든 모양은 가운데 반지름 40 안(마스커블 아이콘 안전 영역)에 둔다.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BG = [0xbf, 0xe6, 0xff];
const WALL = [0xff, 0xf8, 0xef];
const ROOF = [0xe8, 0x57, 0x4f];
const DOOR = [0x8a, 0x5a, 0x3c];
const STAR = [0xff, 0xc8, 0x2e];

// 0~100 좌표의 도형들 (아래에서 위로 그린다)
const LAYERS = [
  { color: WALL, rect: [32, 48, 68, 76] },
  { color: ROOF, poly: [[24, 51], [50, 30], [76, 51]] },
  { color: DOOR, rect: [45, 61, 55, 76] },
  { color: STAR, poly: starPoints(50, 21, 7.5, 3.2) },
];

function starPoints(cx, cy, r1, r2) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? r2 : r1;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function coverage(layer, x, y, unitsPerPx) {
  let d;
  if (layer.rect) {
    const [x0, y0, x1, y1] = layer.rect;
    const dx = Math.max(x0 - x, x - x1), dy = Math.max(y0 - y, y - y1);
    d = dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy);
  } else if (layer.poly) {
    // 변까지의 거리, 안쪽이면 음수 (짝홀 규칙)
    const pts = layer.poly;
    let inside = false;
    d = Infinity;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      d = Math.min(d, segDist(x, y, pts[j], pts[i]));
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) d = -d;
  } else if (layer.circle) {
    const [cx, cy, r] = layer.circle;
    d = Math.hypot(x - cx, y - cy) - r;
  } else {
    d = Infinity;
    for (const line of layer.lines) {
      for (let i = 0; i < line.length - 1; i++) d = Math.min(d, segDist(x, y, line[i], line[i + 1]));
    }
    d -= layer.width / 2;
  }
  // 경계를 1픽셀 폭으로 부드럽게 (안티에일리어싱)
  return Math.max(0, Math.min(1, 0.5 - d / unitsPerPx));
}

function render(size) {
  const unitsPerPx = 100 / size;
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3); // 필터 바이트 0 + RGB
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) * unitsPerPx, y = (py + 0.5) * unitsPerPx;
      let c = BG.slice();
      for (const layer of LAYERS) {
        const a = coverage(layer, x, y, unitsPerPx);
        if (a > 0) c = c.map((v, i) => v * (1 - a) + layer.color[i] * a);
      }
      row.set(c.map(Math.round), 1 + px * 3);
    }
    rows.push(row);
  }
  return png(size, Buffer.concat(rows));
}

// ── 최소한의 PNG 인코더 ──
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 비트 깊이
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512], // 안드로이드: 안전 영역 안에 그렸으므로 같은 그림
  ['apple-touch-icon-180.png', 180], // 아이패드 홈 화면 (명세 3장)
  ['apple-touch-icon-167.png', 167],
  ['apple-touch-icon-152.png', 152],
]) {
  writeFileSync(join(OUT, name), render(size));
  console.log(`public/icons/${name} (${size}x${size})`);
}
