import { h } from '../../../ui/dom';

/** 칭찬 화면을 보여 주는 시간 (ms). 3~5초 */
export const PRAISE_MS = 3500;

export interface PraiseOptions {
  message: string;
  /** 칭찬이 끝나면(시간이 지나거나 화면을 누르면) 한 번 부른다 */
  onDone: () => void;
  /** 보여 줄 시간 (ms) */
  duration?: number;
  /** 엔딩처럼 크게 보여 줄 때 */
  big?: boolean;
  /** 메시지 아래 작은 안내 */
  sub?: string;
}

/**
 * 칭찬 화면 (한글쓰기 앱 §8에서 가져옴): 칭찬 문구 + 별·꽃가루 애니메이션.
 * 과목 영역(parent) 안에만 덮는다(상단 바의 집 버튼은 그대로 쓸 수 있게).
 * 버튼 없이 잠깐 보여 준 뒤 스스로 닫히고 onDone을 부른다. 화면을 누르면 바로 넘어간다.
 */
export function showPraise(parent: HTMLElement, opts: PraiseOptions): () => void {
  const duration = opts.duration ?? PRAISE_MS;
  let finished = false;
  const timers: number[] = [];

  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach((t) => clearTimeout(t));
    overlay.remove();
    opts.onDone();
  };

  const overlay = h(
    'div',
    { class: `praise${opts.big ? ' is-big' : ''}`, 'data-praise': 'true', onClick: finish },
    h(
      'div',
      { class: 'praise-card', role: 'dialog', 'aria-label': opts.message },
      h('div', { class: 'praise-star' }, opts.big ? '🏆' : '⭐'),
      h('div', { class: 'praise-msg' }, opts.message),
      opts.sub && h('div', { class: 'praise-sub' }, opts.sub),
      h('div', { class: 'praise-timer', style: `animation-duration:${duration}ms` }),
    ),
  );
  overlay.append(confetti());
  // 보여 주는 동안 꽃가루를 한두 번 더 터뜨린다
  for (let t = 1400; t < duration - 600; t += 1400) {
    timers.push(window.setTimeout(() => overlay.append(confetti(opts.big ? 48 : 28)), t));
  }
  timers.push(window.setTimeout(finish, duration));
  parent.append(overlay);

  // 중간에 화면을 떠날 때: onDone 없이 닫기만 한다
  return () => {
    finished = true;
    timers.forEach((t) => clearTimeout(t));
    overlay.remove();
  };
}

const COLORS = ['#E5484D', '#F5A524', '#3DB46D', '#3E8EF7', '#B05CE6', '#FF7AB6'];
const STARS = ['⭐', '🌟', '✨'];

/** 가운데에서 터져 나가는 별·꽃가루 */
function confetti(count = 40): HTMLElement {
  const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 28 + Math.random() * 26; // vmin
    const star = i % 4 === 0;
    const piece = h('span', { class: star ? 'confetti-star' : 'confetti-piece' }, star ? STARS[i % STARS.length] : '');
    piece.style.setProperty('--x', `${Math.cos(angle) * dist}vmin`);
    piece.style.setProperty('--y', `${Math.sin(angle) * dist}vmin`);
    piece.style.setProperty('--r', `${Math.round(Math.random() * 720 - 360)}deg`);
    piece.style.setProperty('--delay', `${Math.round(Math.random() * 120)}ms`);
    if (!star) piece.style.background = COLORS[i % COLORS.length];
    layer.append(piece);
  }
  window.setTimeout(() => layer.remove(), 2200);
  return layer;
}
