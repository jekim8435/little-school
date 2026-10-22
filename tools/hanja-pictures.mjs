// 한자 그림 32장 (src/shared/hanja/pictures/<그림 id>.svg)을 코드로 그린다. 직접 만든 단순한 그림(학습지 그림을 따라 그리지 않음).
// 한 가지 사물, 고유 색 하나. 사람 한자는 같은 사람 모양에 구분점 하나씩 (subjects/hanja-ttokttok.md).
// 그림을 고치면: node tools/hanja-pictures.mjs  (세트를 더하면 아래 P에 그림 id를 추가)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '../src/shared/hanja/pictures');
mkdirSync(out, { recursive: true });

const SKIN = '#F6C9A0';
const INK = '#4A3B33';
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${body}</svg>\n`;

/** 단순한 사람: 머리 + 몸통(옷 색). x·바닥 y·크기 */
function figure({ x = 100, base = 186, s = 1, shirt = '#5B8DEF', hair = '', extra = '' }) {
  const headR = 26 * s;
  const bodyW = 70 * s;
  const bodyH = 78 * s;
  const bodyTop = base - bodyH;
  const headCy = bodyTop - headR + 6 * s;
  let h = '';
  h += `<rect x="${x - bodyW / 2}" y="${bodyTop}" width="${bodyW}" height="${bodyH}" rx="${30 * s}" fill="${shirt}"/>`;
  if (hair === 'long') h += `<path d="M${x - headR - 6 * s} ${headCy} q0 ${-headR - 10 * s} ${headR + 6 * s} ${-headR - 10 * s} q${headR + 6 * s} 0 ${headR + 6 * s} ${headR + 10 * s} v${48 * s} h${-2 * headR - 12 * s} z" fill="${INK}"/>`;
  h += `<circle cx="${x}" cy="${headCy}" r="${headR}" fill="${SKIN}"/>`;
  if (hair === 'short' || hair === 'long')
    h += `<path d="M${x - headR} ${headCy - 2 * s} a${headR} ${headR} 0 0 1 ${2 * headR} 0 q${-headR} ${-12 * s} ${-2 * headR} 0 z" fill="${INK}"/>`;
  // 눈·입
  h += `<circle cx="${x - 9 * s}" cy="${headCy + 2 * s}" r="${3 * s}" fill="${INK}"/><circle cx="${x + 9 * s}" cy="${headCy + 2 * s}" r="${3 * s}" fill="${INK}"/>`;
  h += `<path d="M${x - 7 * s} ${headCy + 12 * s} q${7 * s} ${6 * s} ${14 * s} 0" stroke="${INK}" stroke-width="${2.5 * s}" fill="none" stroke-linecap="round"/>`;
  return h + extra;
}

const P = {
  // 日 해: 해와 햇살
  sun: svg(
    Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      const x1 = 100 + Math.cos(a) * 62, y1 = 100 + Math.sin(a) * 62, x2 = 100 + Math.cos(a) * 88, y2 = 100 + Math.sin(a) * 88;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#F6A623" stroke-width="12" stroke-linecap="round"/>`;
    }).join('') + '<circle cx="100" cy="100" r="48" fill="#F6A623"/>',
  ),
  // 月 달: 초승달
  moon: svg('<path d="M128 22 A80 80 0 1 0 128 178 A64 64 0 1 1 128 22 Z" fill="#F2C94C"/><circle cx="160" cy="48" r="5" fill="#F2C94C"/><circle cx="172" cy="96" r="4" fill="#F2C94C"/>'),
  // 火 불: 불꽃
  fire: svg('<path d="M100 14 C118 52 160 72 156 122 C152 162 128 186 100 186 C72 186 46 164 44 128 C42 96 62 82 70 60 C80 78 82 92 92 100 C96 72 90 46 100 14 Z" fill="#E8574F"/><path d="M100 102 C110 122 128 132 126 152 C124 170 112 178 100 178 C88 178 76 170 76 154 C76 138 90 128 100 102 Z" fill="#F6A623"/>'),
  // 水 물: 물방울
  water: svg('<path d="M100 16 C126 60 158 96 158 128 C158 162 132 186 100 186 C68 186 42 162 42 128 C42 96 74 60 100 16 Z" fill="#4A90E2"/><path d="M72 128 C72 146 82 158 96 162" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" opacity=".7"/>'),
  // 木 나무: 나무 한 그루
  tree: svg('<rect x="88" y="112" width="24" height="74" rx="6" fill="#9C6B3F"/><circle cx="100" cy="78" r="58" fill="#4CAF50"/><circle cx="76" cy="66" r="10" fill="#7CCB7F"/>'),
  // 金 금: 금덩이
  gold: svg('<path d="M30 168 L46 120 H106 L122 168 Z" fill="#E5B300"/><path d="M90 168 L106 120 H156 L172 168 Z" fill="#E5B300"/><path d="M60 118 L76 70 H126 L142 118 Z" fill="#F2C94C"/><path d="M82 82 H118" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7"/><path d="M150 40 l6 14 l14 6 l-14 6 l-6 14 l-6 -14 l-14 -6 l14 -6 z" fill="#F2C94C"/>'),
  // 土 흙: 흙더미
  soil: svg('<path d="M14 172 C30 110 70 76 100 76 C130 76 170 110 186 172 Z" fill="#A9733F"/><circle cx="72" cy="128" r="7" fill="#7C522B"/><circle cx="118" cy="110" r="6" fill="#7C522B"/><circle cx="134" cy="148" r="8" fill="#7C522B"/><circle cx="90" cy="156" r="5" fill="#7C522B"/>'),
  // 川 내: 가는 시냇물 (구불구불한 물줄기)
  stream: svg('<path d="M70 10 C40 50 120 70 90 110 C64 146 130 160 110 192" stroke="#62B5F0" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M76 40 C70 52 84 60 90 66" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/><circle cx="40" cy="150" r="10" fill="#B9C4CF"/><circle cx="160" cy="70" r="12" fill="#B9C4CF"/>'),
  // 天 하늘: 구름 낀 하늘
  sky: svg('<rect x="12" y="20" width="176" height="160" rx="26" fill="#8FC9F5"/><path d="M50 120 a22 22 0 0 1 8 -42 a30 30 0 0 1 56 -8 a24 24 0 0 1 36 30 a20 20 0 0 1 -6 40 H58 a20 20 0 0 1 -8 -20 Z" fill="#fff"/>'),
  // 地 땅: 땅 단면 (풀 + 흙 층)
  ground: svg('<rect x="12" y="70" width="176" height="110" rx="14" fill="#B07A45"/><rect x="12" y="128" width="176" height="52" rx="14" fill="#8A5A2E"/><rect x="12" y="60" width="176" height="24" rx="10" fill="#5CB85C"/><circle cx="60" cy="110" r="6" fill="#8A5A2E"/><circle cx="130" cy="104" r="5" fill="#8A5A2E"/><circle cx="96" cy="154" r="7" fill="#6B4320"/>'),
  // 山 산: 산 두 봉우리
  mountain: svg('<path d="M8 180 L70 70 L132 180 Z" fill="#6DBF67"/><path d="M60 180 L128 40 L196 180 Z" fill="#3E9A45"/><path d="M128 40 L148 82 L136 76 L126 88 L114 74 L108 82 Z" fill="#fff"/>'),
  // 林 수풀: 나무 두 그루 (나무 한 그루와 구분)
  forest: svg('<rect x="44" y="118" width="18" height="64" rx="5" fill="#9C6B3F"/><circle cx="53" cy="88" r="42" fill="#4CAF50"/><rect x="138" y="118" width="18" height="64" rx="5" fill="#9C6B3F"/><circle cx="147" cy="88" r="42" fill="#3E9A45"/>'),
  // 石 돌: 돌
  stone: svg('<path d="M30 150 C22 112 50 70 92 62 C138 54 178 86 176 128 C174 164 140 180 100 180 C62 180 36 172 30 150 Z" fill="#9AA3AD"/><path d="M70 92 C84 82 100 80 112 84" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity=".6"/><circle cx="128" cy="140" r="6" fill="#7B848E"/>'),
  // 田 밭: 위에서 본 밭 (네 칸에 새싹 줄)
  field: svg('<rect x="20" y="20" width="160" height="160" rx="14" fill="#A9733F"/>' +
    [[30, 30], [104, 30], [30, 104], [104, 104]].map(([x, y]) => `<rect x="${x}" y="${y}" width="66" height="66" rx="8" fill="#C58E55"/>` +
      [0, 1, 2].map((r) => `<path d="M${x + 10} ${y + 16 + r * 18} h46" stroke="#5CB85C" stroke-width="7" stroke-linecap="round" stroke-dasharray="6 6"/>`).join('')).join('')),
  // 江 강: 넓은 강과 양쪽 둑
  river: svg('<rect x="10" y="30" width="180" height="140" rx="20" fill="#7BC67A"/><path d="M10 74 C60 60 140 90 190 72 V128 C140 146 60 116 10 130 Z" fill="#3A86D9"/><path d="M40 98 h30 M110 108 h36" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/>'),
  // 海 바다: 물결과 수평선
  sea: svg('<rect x="10" y="20" width="180" height="160" rx="20" fill="#CFE8FA"/><circle cx="150" cy="56" r="18" fill="#F6A623"/><path d="M10 88 H190 V160 a20 20 0 0 1 -20 20 H30 a20 20 0 0 1 -20 -20 Z" fill="#1F6FC5"/>' +
    [112, 140].map((y) => `<path d="M24 ${y} q14 -12 28 0 t28 0 t28 0 t28 0 t28 0" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>`).join('')),
  // 口 입: 벌린 입
  mouth: svg('<path d="M24 90 C52 62 148 62 176 90 C160 150 40 150 24 90 Z" fill="#E8574F"/><path d="M40 92 C70 112 130 112 160 92 C140 132 60 132 40 92 Z" fill="#8E2B2B"/><path d="M80 120 q20 14 40 0" fill="#F08A8A"/>'),
  // 目 눈: 눈
  eye: svg('<path d="M14 100 C50 46 150 46 186 100 C150 154 50 154 14 100 Z" fill="#fff" stroke="#3A4A5C" stroke-width="8"/><circle cx="100" cy="100" r="34" fill="#4A7BC4"/><circle cx="100" cy="100" r="16" fill="#1E2A38"/><circle cx="110" cy="90" r="7" fill="#fff"/>'),
  // 手 손: 편 손바닥
  hand: svg('<g fill="#F2B48A"><rect x="52" y="92" width="96" height="92" rx="34"/>' +
    [[56, 34, 54], [80, 22, 66], [104, 24, 64], [128, 40, 52]].map(([x, y, h]) => `<rect x="${x}" y="${y}" width="22" height="${h + 30}" rx="11"/>`).join('') +
    '<rect x="16" y="98" width="22" height="66" rx="11" transform="rotate(-38 27 131)"/></g>'),
  // 足 발: 발
  foot: svg('<g fill="#F2B48A"><path d="M62 70 C60 40 120 36 132 70 C142 100 138 130 140 156 C142 178 120 190 96 188 C66 186 54 168 60 146 C66 124 64 100 62 70 Z"/>' +
    [[68, 40, 13], [92, 30, 11], [112, 32, 10], [128, 40, 9], [140, 52, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('') + '</g>'),
  // 人 사람: 기본 사람 모양
  person: svg(figure({ s: 1.2, base: 190, shirt: '#5BB5A2' })),
  // 心 마음: 하트
  heart: svg('<path d="M100 178 C40 136 14 106 14 70 C14 40 38 20 64 20 C82 20 94 30 100 44 C106 30 118 20 136 20 C162 20 186 40 186 70 C186 106 160 136 100 178 Z" fill="#E8574F"/><path d="M50 56 C56 46 66 42 76 44" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity=".6"/>'),
  // 力 힘: 알통 팔
  strength: svg('<g fill="#F2B48A"><path d="M30 176 C24 150 34 120 60 112 L112 98 C116 72 104 52 90 44 L104 24 C134 34 150 66 146 104 C168 112 178 136 170 158 C160 182 120 188 96 178 Z"/><circle cx="96" cy="34" r="20"/></g><path d="M118 128 C132 116 152 120 158 134" stroke="#D99068" stroke-width="6" fill="none" stroke-linecap="round"/>'),
  // 身 몸: 팔다리를 벌린 몸 실루엣
  body: svg('<g fill="#7E8CE0"><circle cx="100" cy="36" r="22"/><rect x="74" y="62" width="52" height="70" rx="20"/>' +
    '<rect x="22" y="66" width="60" height="18" rx="9" transform="rotate(-20 82 75)"/><rect x="118" y="66" width="60" height="18" rx="9" transform="rotate(20 118 75)"/>' +
    '<rect x="78" y="120" width="18" height="66" rx="9" transform="rotate(12 87 120)"/><rect x="104" y="120" width="18" height="66" rx="9" transform="rotate(-12 113 120)"/></g>'),
  // 父 아버지: 어른 + 수염
  father: svg(figure({ s: 1.3, base: 190, shirt: '#3F6FB5', hair: 'short', extra: '<path d="M74 74 q26 22 52 0 q-4 28 -26 30 q-22 -2 -26 -30 Z" fill="#4A3B33"/>' })),
  // 母 어머니: 어른 + 긴 머리
  mother: svg(figure({ s: 1.3, base: 190, shirt: '#D96A9B', hair: 'long' })),
  // 兄 형: 큰 아이
  'big-brother': svg(figure({ s: 1.05, base: 190, shirt: '#F09A3E', hair: 'short' })),
  // 弟 동생: 작은 아이
  'little-brother': svg(figure({ s: 0.75, base: 190, shirt: '#8BC34A', hair: 'short' })),
  // 子 아들: 아기 (포대기)
  baby: svg('<ellipse cx="100" cy="128" rx="58" ry="54" fill="#9FC5F8"/><circle cx="100" cy="82" r="36" fill="' + SKIN + '"/><path d="M64 80 a36 36 0 0 1 72 0 q-36 -26 -72 0 z" fill="#9FC5F8"/>' +
    '<circle cx="88" cy="86" r="3.5" fill="' + INK + '"/><circle cx="112" cy="86" r="3.5" fill="' + INK + '"/><path d="M92 100 q8 6 16 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="100" cy="40" r="5" fill="#9FC5F8"/>'),
  // 孝 효도: 아이가 어른을 업은 모습
  piggyback: svg(
    // 업힌 어른(뒤, 기울임)
    '<g transform="rotate(-14 110 110)">' + figure({ x: 118, base: 146, s: 0.78, shirt: '#B0A4D8', hair: 'short' }).replace(/#4A3B33/g, '#C9C9C9') + '</g>' +
    // 업은 아이(앞)
    figure({ x: 80, base: 190, s: 0.78, shirt: '#F09A3E', hair: 'short' }) +
    '<path d="M60 130 C80 120 110 116 140 120" stroke="' + SKIN + '" stroke-width="12" fill="none" stroke-linecap="round"/>',
  ),
  // 男 남자: 짧은 머리 어른
  man: svg(figure({ s: 1.2, base: 190, shirt: '#2F80ED', hair: 'short', extra: '<path d="M100 98 l-9 9 l9 44 l9 -44 z" fill="#E8574F"/>' })),
  // 女 여자: 리본
  woman: svg(figure({ s: 1.2, base: 190, shirt: '#F28DB2', hair: 'long', extra: '<path d="M124 46 l20 -13 v26 z M124 46 l-20 -13 v26 z" fill="#E8574F"/><circle cx="124" cy="46" r="7" fill="#E8574F"/>' })),
};

for (const [id, body] of Object.entries(P)) writeFileSync(join(out, `${id}.svg`), body);
console.log(Object.keys(P).length, 'pictures');
