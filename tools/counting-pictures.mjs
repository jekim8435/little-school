// 구슬 세기 그림 (src/apps/counting/pictures/<id>.svg)과 과목 아이콘(src/apps/counting/icon.svg)을 코드로 그린다. 직접 제작.
// 사물 8종은 한 가지 사물 · 고유 색 하나 · 작게 그려도 알아볼 수 있는 굵은 윤곽. 그림 안에 글자 없음 (subjects/counting.md 7장)
// 구슬 2종: 기본 구슬(bead), ‘더 채우기’ 구슬(bead-more — 색만이 아니라 굵은 테두리 + 가운데 점으로도 구분, 색약 고려)
// 그림을 고치면: node tools/counting-pictures.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '../src/apps/counting');
const out = process.argv[2] || join(app, 'pictures');
mkdirSync(out, { recursive: true });

const INK = '#3E3330';
const W = 'stroke="#3E3330" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"';
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${body}</svg>\n`;
/** 빛 반사 (흰 반투명 곡선) */
const shine = (d) => `<path d="${d}" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" opacity=".6"/>`;

const P = {
  // 사과: 빨강, 꼭지와 잎
  apple: svg(
    `<path d="M100 58 C80 40 34 44 30 92 C26 140 62 184 86 182 C94 181 98 176 100 176 C102 176 106 181 114 182 C138 184 174 140 170 92 C166 44 120 40 100 58 Z" fill="#E8453C" ${W}/>` +
      `<path d="M100 58 C100 44 104 30 112 20" fill="none" ${W}/>` +
      `<path d="M110 40 C122 22 148 22 156 30 C146 44 124 48 110 40 Z" fill="#5DBB4C" ${W}/>` +
      shine('M56 92 C54 110 60 128 70 140'),
  ),
  // 딸기: 빨강, 씨와 초록 꼭지
  strawberry: svg(
    `<path d="M100 186 C70 170 32 128 34 88 C36 62 62 52 100 56 C138 52 164 62 166 88 C168 128 130 170 100 186 Z" fill="#E8394F" ${W}/>` +
      [
        [70, 92],
        [100, 88],
        [130, 92],
        [84, 118],
        [116, 118],
        [100, 146],
        [70, 132],
        [130, 132],
      ]
        .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="6" fill="#FFE27A"/>`)
        .join('') +
      `<path d="M100 60 L72 40 L88 58 L60 58 L86 70 L100 64 L114 70 L140 58 L112 58 L128 40 Z" fill="#4CAF50" ${W}/>` +
      `<path d="M100 60 V28" fill="none" ${W}/>`,
  ),
  // 자동차: 파랑, 창문과 바퀴
  car: svg(
    `<path d="M22 132 V112 C22 104 28 100 36 98 L58 94 L78 64 C82 58 88 56 96 56 H132 C140 56 146 60 150 66 L166 94 C174 96 180 102 180 112 V132 Z" fill="#3D7EDB" ${W}/>` +
      `<path d="M84 92 L96 70 H112 V92 Z M124 92 V70 H134 C138 70 140 72 142 76 L150 92 Z" fill="#CFE9FF" stroke="#3E3330" stroke-width="6" stroke-linejoin="round"/>` +
      `<circle cx="60" cy="140" r="22" fill="#4A4A4A" ${W}/><circle cx="60" cy="140" r="8" fill="#DADADA"/>` +
      `<circle cx="144" cy="140" r="22" fill="#4A4A4A" ${W}/><circle cx="144" cy="140" r="8" fill="#DADADA"/>`,
  ),
  // 물고기: 주황, 꼬리와 눈
  fish: svg(
    `<path d="M150 100 L188 66 V134 Z" fill="#F7931E" ${W}/>` +
      `<path d="M20 100 C40 54 104 46 150 100 C104 154 40 146 20 100 Z" fill="#F7931E" ${W}/>` +
      `<path d="M96 64 C104 80 104 120 96 136" fill="none" stroke="#3E3330" stroke-width="6" stroke-linecap="round"/>` +
      `<circle cx="56" cy="92" r="9" fill="${INK}"/><circle cx="53" cy="89" r="3" fill="#fff"/>`,
  ),
  // 오리: 노랑, 주황 부리
  duck: svg(
    `<path d="M30 120 C30 160 70 180 112 178 C158 176 184 150 180 112 C164 124 140 124 128 116 C142 104 146 86 142 72 C136 40 96 30 74 48 C56 62 56 88 70 104 C54 104 30 104 30 120 Z" fill="#FFD23F" ${W}/>` +
      `<path d="M58 66 C42 64 26 70 20 80 C34 86 50 86 62 80 Z" fill="#F7931E" ${W}/>` +
      `<circle cx="94" cy="62" r="8" fill="${INK}"/>` +
      `<path d="M96 132 C112 148 138 148 152 132" fill="none" stroke="#3E3330" stroke-width="6" stroke-linecap="round"/>`,
  ),
  // 공: 초록 바탕에 흰 줄무늬
  ball: svg(
    `<circle cx="100" cy="100" r="78" fill="#3FB27F" ${W}/>` +
      `<path d="M28 82 C70 100 130 100 172 82 M28 118 C70 136 130 136 172 118" fill="none" stroke="#fff" stroke-width="12"/>` +
      `<circle cx="100" cy="100" r="78" fill="none" ${W}/>` +
      shine('M58 56 C66 48 76 42 88 40'),
  ),
  // 별: 노랑 주황 별
  star: svg(
    `<path d="M100 18 L124 72 L182 78 L138 118 L151 176 L100 146 L49 176 L62 118 L18 78 L76 72 Z" fill="#FFB400" ${W}/>` + shine('M86 70 L100 40'),
  ),
  // 꽃: 분홍 꽃잎 다섯 장과 노란 가운데, 줄기 없음(작게 그려도 둥글게 보이게)
  flower: svg(
    Array.from({ length: 5 }, (_, i) => {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = 100 + Math.cos(a) * 46;
      const y = 100 + Math.sin(a) * 46;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="38" fill="#F27BB5" ${W}/>`;
    }).join('') + `<circle cx="100" cy="100" r="30" fill="#FFD23F" ${W}/>`,
  ),
  // 기본 구슬: 산호빛 주황 (과목 색), 보통 테두리
  bead: svg(`<circle cx="100" cy="100" r="88" fill="#FF7A50" ${W}/>` + shine('M50 70 C56 54 70 42 86 38')),
  // 더 채우기 구슬: 하늘색, 굵은 테두리 + 가운데 흰 점 (색을 못 구분해도 모양으로 구분)
  'bead-more': svg(
    `<circle cx="100" cy="100" r="84" fill="#4FA8E8" stroke="#1F4E79" stroke-width="16"/>` + `<circle cx="100" cy="100" r="22" fill="#fff"/>`,
  ),
};

for (const [id, body] of Object.entries(P)) writeFileSync(join(out, `${id}.svg`), body);

// 과목 아이콘: 흰 판 위에 구슬 세 개 (허브 타일, 과목 색 배경 위)
const bead = (x, y, fill) => `<circle cx="${x}" cy="${y}" r="17" fill="${fill}" stroke="#3E3330" stroke-width="5"/>`;
writeFileSync(
  join(app, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="14" y="30" width="100" height="68" rx="14" fill="#fff"/>
  ${bead(38, 64, '#FF7A50')}
  ${bead(64, 64, '#FF7A50')}
  ${bead(90, 64, '#4FA8E8')}
</svg>
`,
);
console.log(`그림 ${Object.keys(P).length}장 → ${out}`);
