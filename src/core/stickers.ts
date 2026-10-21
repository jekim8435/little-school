/**
 * 스티커 그림 20종 (동물 10 + 탈것 10, 명세 5-4). 저장 데이터에는 id만 남는다(`stickers[].art`).
 * 그림은 0~100 좌표의 SVG. 한 번 정한 id는 바꾸지 않는다(이미 붙은 스티커가 사라지므로).
 */

export interface StickerArt {
  id: string;
  name: string;
  svg: string;
}

const O = 'stroke="#2a2522" stroke-width="3" stroke-linejoin="round"';
const eyes = (y = 52, dx = 11, r = 4) => `<circle cx="${50 - dx}" cy="${y}" r="${r}" fill="#2a2522"/><circle cx="${50 + dx}" cy="${y}" r="${r}" fill="#2a2522"/>`;
const cheeks = '<circle cx="31" cy="64" r="5" fill="#ff9aa2" opacity=".7"/><circle cx="69" cy="64" r="5" fill="#ff9aa2" opacity=".7"/>';
const smile = (y = 66) => `<path d="M43 ${y}q7 6 14 0" fill="none" stroke="#2a2522" stroke-width="3" stroke-linecap="round"/>`;
const wheel = (x: number, y: number, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2a2522"/><circle cx="${x}" cy="${y}" r="${r / 2.5}" fill="#ddd"/>`;

const ART: StickerArt[] = [
  // ── 동물 ──
  {
    id: 'lion',
    name: '사자',
    svg: `<circle cx="50" cy="54" r="40" fill="#e8892a" ${O}/><circle cx="50" cy="56" r="27" fill="#f8c471" ${O}/>${eyes(52, 10)}<ellipse cx="50" cy="62" rx="5" ry="3.5" fill="#6b3e26"/>${smile(66)}`,
  },
  {
    id: 'cat',
    name: '고양이',
    svg: `<path d="M22 38L28 12L44 30Z M78 38L72 12L56 30Z" fill="#f5a65b" ${O}/><circle cx="50" cy="56" r="32" fill="#f5a65b" ${O}/>${eyes()}<path d="M47 60h6l-3 4z" fill="#e8574f"/><path d="M20 58h16M20 66l16-3M80 58H64M80 66l-16-3" stroke="#2a2522" stroke-width="2"/>${smile(66)}`,
  },
  {
    id: 'dog',
    name: '강아지',
    svg: `<circle cx="50" cy="54" r="31" fill="#e2b07a" ${O}/><ellipse cx="22" cy="50" rx="10" ry="20" fill="#8a5a3c" ${O}/><ellipse cx="78" cy="50" rx="10" ry="20" fill="#8a5a3c" ${O}/>${eyes(48)}<ellipse cx="50" cy="64" rx="13" ry="10" fill="#fff3e0"/><ellipse cx="50" cy="59" rx="6" ry="4" fill="#2a2522"/>${smile(66)}`,
  },
  {
    id: 'bear',
    name: '곰',
    svg: `<circle cx="25" cy="28" r="12" fill="#8a5a3c" ${O}/><circle cx="75" cy="28" r="12" fill="#8a5a3c" ${O}/><circle cx="50" cy="55" r="33" fill="#8a5a3c" ${O}/>${eyes(48)}<ellipse cx="50" cy="65" rx="14" ry="11" fill="#e2b07a"/><ellipse cx="50" cy="60" rx="5" ry="3.5" fill="#2a2522"/>${smile(66)}`,
  },
  {
    id: 'rabbit',
    name: '토끼',
    svg: `<ellipse cx="37" cy="24" rx="8" ry="20" fill="#fff" ${O}/><ellipse cx="63" cy="24" rx="8" ry="20" fill="#fff" ${O}/><ellipse cx="37" cy="25" rx="3.5" ry="13" fill="#ffc2cc"/><ellipse cx="63" cy="25" rx="3.5" ry="13" fill="#ffc2cc"/><circle cx="50" cy="62" r="29" fill="#fff" ${O}/>${eyes(58)}${cheeks}<path d="M47 66h6l-3 3z" fill="#ff8fa3"/>`,
  },
  {
    id: 'pig',
    name: '돼지',
    svg: `<path d="M24 34L26 16L40 28Z M76 34L74 16L60 28Z" fill="#ffb3c6" ${O}/><circle cx="50" cy="56" r="32" fill="#ffc2d1" ${O}/>${eyes(46)}<ellipse cx="50" cy="63" rx="13" ry="9" fill="#ff8fab" ${O}/><circle cx="45" cy="63" r="2.5" fill="#2a2522"/><circle cx="55" cy="63" r="2.5" fill="#2a2522"/>`,
  },
  {
    id: 'frog',
    name: '개구리',
    svg: `<ellipse cx="50" cy="62" rx="36" ry="27" fill="#6cc04a" ${O}/><circle cx="32" cy="34" r="13" fill="#6cc04a" ${O}/><circle cx="68" cy="34" r="13" fill="#6cc04a" ${O}/><circle cx="32" cy="34" r="7" fill="#fff"/><circle cx="68" cy="34" r="7" fill="#fff"/><circle cx="33" cy="35" r="3.5" fill="#2a2522"/><circle cx="67" cy="35" r="3.5" fill="#2a2522"/><path d="M33 64q17 12 34 0" fill="none" stroke="#2a2522" stroke-width="3" stroke-linecap="round"/>${cheeks}`,
  },
  {
    id: 'panda',
    name: '판다',
    svg: `<circle cx="26" cy="28" r="12" fill="#2a2522"/><circle cx="74" cy="28" r="12" fill="#2a2522"/><circle cx="50" cy="55" r="33" fill="#fff" ${O}/><ellipse cx="38" cy="52" rx="8" ry="10" fill="#2a2522" transform="rotate(-20 38 52)"/><ellipse cx="62" cy="52" rx="8" ry="10" fill="#2a2522" transform="rotate(20 62 52)"/><circle cx="39" cy="51" r="3" fill="#fff"/><circle cx="61" cy="51" r="3" fill="#fff"/><ellipse cx="50" cy="64" rx="5" ry="3.5" fill="#2a2522"/>${smile(68)}`,
  },
  {
    id: 'chick',
    name: '병아리',
    svg: `<path d="M50 14q4 8 0 10q-4-2 0-10z" fill="#ffd23f" ${O}/><circle cx="50" cy="56" r="34" fill="#ffd23f" ${O}/>${eyes(50, 12)}<path d="M42 58h16l-8 9z" fill="#f5a623" ${O}/>${cheeks}`,
  },
  {
    id: 'mouse',
    name: '생쥐',
    svg: `<circle cx="24" cy="32" r="16" fill="#b8b8c0" ${O}/><circle cx="76" cy="32" r="16" fill="#b8b8c0" ${O}/><circle cx="24" cy="32" r="9" fill="#ffc2cc"/><circle cx="76" cy="32" r="9" fill="#ffc2cc"/><ellipse cx="50" cy="60" rx="28" ry="26" fill="#cfcfd6" ${O}/>${eyes(56, 10)}<circle cx="50" cy="66" r="4" fill="#ff8fa3"/><path d="M26 64h14M26 71l14-3M74 64H60M74 71l-14-3" stroke="#2a2522" stroke-width="2"/>`,
  },
  // ── 탈것 ──
  {
    id: 'car',
    name: '자동차',
    svg: `<path d="M30 46l8-14h24l10 14z" fill="#9fd8ff" ${O}/><rect x="12" y="46" width="76" height="22" rx="8" fill="#e8574f" ${O}/><circle cx="84" cy="54" r="3" fill="#ffd23f"/>${wheel(30, 70)}${wheel(70, 70)}`,
  },
  {
    id: 'bus',
    name: '버스',
    svg: `<rect x="8" y="26" width="84" height="44" rx="8" fill="#ffc82e" ${O}/><rect x="15" y="33" width="14" height="14" rx="2" fill="#9fd8ff"/><rect x="33" y="33" width="14" height="14" rx="2" fill="#9fd8ff"/><rect x="51" y="33" width="14" height="14" rx="2" fill="#9fd8ff"/><rect x="72" y="33" width="14" height="26" rx="2" fill="#9fd8ff"/><path d="M8 54h62" stroke="#e8892a" stroke-width="4"/>${wheel(26, 72)}${wheel(74, 72)}`,
  },
  {
    id: 'train',
    name: '기차',
    svg: `<rect x="56" y="24" width="30" height="40" rx="4" fill="#4a90e2" ${O}/><rect x="62" y="31" width="18" height="13" rx="2" fill="#9fd8ff"/><rect x="14" y="40" width="44" height="24" rx="6" fill="#4a90e2" ${O}/><rect x="22" y="24" width="10" height="16" fill="#2a2522"/><circle cx="20" cy="16" r="6" fill="#ddd"/><circle cx="12" cy="10" r="4" fill="#eee"/><rect x="8" y="62" width="82" height="6" rx="3" fill="#e8574f"/>${wheel(26, 74, 8)}${wheel(48, 74, 8)}${wheel(74, 74, 8)}`,
  },
  {
    id: 'airplane',
    name: '비행기',
    svg: `<path d="M44 50L30 80h10l24-30z M44 50L30 20h10l24 30z" fill="#4a90e2" ${O}/><path d="M10 50q0-9 12-9h56q14 0 14 9t-14 9H22q-12 0-12-9z" fill="#fff" ${O}/><path d="M14 41l-4-14h8l10 14z" fill="#e8574f" ${O}/><circle cx="58" cy="50" r="3" fill="#9fd8ff"/><circle cx="68" cy="50" r="3" fill="#9fd8ff"/><circle cx="78" cy="50" r="3" fill="#9fd8ff"/>`,
  },
  {
    id: 'boat',
    name: '배',
    svg: `<path d="M50 12v48" stroke="#2a2522" stroke-width="3"/><path d="M52 16l26 38H52z" fill="#fff" ${O}/><path d="M48 24L28 54h20z" fill="#ffc82e" ${O}/><path d="M14 62h72l-10 16H24z" fill="#e8574f" ${O}/><path d="M6 86q8-6 16 0t16 0t16 0t16 0t16 0" fill="none" stroke="#4a90e2" stroke-width="4" stroke-linecap="round"/>`,
  },
  {
    id: 'rocket',
    name: '로켓',
    svg: `<path d="M42 76q8 22 16 0z" fill="#f5a623"/><path d="M50 8q20 18 18 58H32Q30 26 50 8z" fill="#f2f2f2" ${O}/><path d="M32 52L18 72l16-4z M68 52l14 20-16-4z" fill="#e8574f" ${O}/><circle cx="50" cy="38" r="9" fill="#9fd8ff" ${O}/><path d="M38 20q12-6 24 0" fill="none" stroke="#e8574f" stroke-width="4"/>`,
  },
  {
    id: 'truck',
    name: '트럭',
    svg: `<rect x="8" y="28" width="52" height="38" rx="4" fill="#3fae6a" ${O}/><path d="M60 40h18l12 14v12H60z" fill="#ffc82e" ${O}/><path d="M66 44h10l8 10H66z" fill="#9fd8ff"/>${wheel(24, 70)}${wheel(76, 70)}`,
  },
  {
    id: 'helicopter',
    name: '헬리콥터',
    svg: `<path d="M14 22h66" stroke="#2a2522" stroke-width="5" stroke-linecap="round"/><path d="M47 22v12" stroke="#2a2522" stroke-width="4"/><path d="M60 52h28l6-10" fill="none" stroke="#2a2522" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="44" cy="52" rx="28" ry="20" fill="#e8574f" ${O}/><path d="M24 50q0-14 16-14v14z" fill="#9fd8ff"/><path d="M26 80h40M34 72v8M58 72v8" stroke="#2a2522" stroke-width="4" stroke-linecap="round"/>`,
  },
  {
    id: 'firetruck',
    name: '소방차',
    svg: `<path d="M14 30l50-12M14 36l50-12" stroke="#bbb" stroke-width="4"/><path d="M20 33l4-1M32 30l4-1M44 27l4-1" stroke="#999" stroke-width="3"/><rect x="8" y="38" width="56" height="28" rx="4" fill="#e03b3b" ${O}/><path d="M64 38h14l12 14v14H64z" fill="#e03b3b" ${O}/><path d="M68 42h8l8 10H68z" fill="#9fd8ff"/><rect x="72" y="30" width="8" height="8" rx="2" fill="#4a90e2"/>${wheel(24, 70)}${wheel(76, 70)}`,
  },
  {
    id: 'balloon',
    name: '열기구',
    svg: `<path d="M50 8C26 8 16 28 22 44q6 14 20 26h16q14-12 20-26C84 28 74 8 50 8z" fill="#ff7eb6" ${O}/><path d="M50 8q-14 22-8 62M50 8q14 22 8 62" fill="none" stroke="#ffd23f" stroke-width="6"/><path d="M42 70l2 10M58 70l-2 10" stroke="#2a2522" stroke-width="2"/><rect x="40" y="80" width="20" height="13" rx="2" fill="#a0673a" ${O}/>`,
  },
];

export const STICKER_ARTS: readonly StickerArt[] = ART;

const BY_ID: Record<string, StickerArt> = {};
for (const a of ART) BY_ID[a.id] = a;

/** 스티커 그림 SVG 전체 문자열. 모르는 id면 별 모양 */
export function stickerSvg(id: string): string {
  const a = BY_ID[id];
  const body = a ? a.svg : '<path d="M50 8l12 28 30 3-23 20 7 30-26-16-26 16 7-30-23-20 30-3z" fill="#ffc82e" stroke="#2a2522" stroke-width="3"/>';
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;
}

export function stickerName(id: string): string {
  return BY_ID[id] ? BY_ID[id].name : '별';
}
