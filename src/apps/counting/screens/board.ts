/**
 * 숫자판 `board` (5-4) — 1~20을 10열 × 2줄로. 단계·최대 수와 상관없이 20까지 모두.
 * 숫자를 누르면 가운데 큰 카드(숫자 + 10칸 판에 구슬 N개, 11 이상은 판 2개 위아래) + 수 읽기. 바깥을 누르면 닫힘.
 * 별·기록 없음, ‘뒤로’는 한 번에 나간다.
 */
import { h } from '../../../ui/dom';
import type { Engine, View } from '../index';
import { FRAME_CELLS } from '../logic/frame';
import { beadsOf, frameEl, headerEl } from '../ui';
import { V } from '../voiceIds';

export function boardView(e: Engine): View {
  const { ctx, timers } = e;
  const head = headerEl(ctx, timers, () => e.menu(), { confirm: false, progress: false });
  const overlay = h('div', { class: 'cn-overlay', onClick: () => overlay.classList.remove('is-on') });
  const rows: HTMLElement[] = [];
  for (let r = 0; r < 2; r++) {
    const row = h('div', { class: 'cn-board-row' });
    for (let n = r * 10 + 1; n <= r * 10 + 10; n++) {
      row.appendChild(h('button', { class: 'cn-board-num', type: 'button', onClick: () => open(n) }, String(n)));
    }
    rows.push(row);
  }

  function open(n: number): void {
    const frames = n > FRAME_CELLS ? 2 : 1;
    const board = frameEl(frames, frames * FRAME_CELLS);
    board.set(beadsOf(n));
    overlay.replaceChildren(h('div', { class: `cn-big is-${frames}` }, h('span', { class: 'cn-big-num' }, String(n)), board.el));
    overlay.classList.add('is-on');
    ctx.audio.say(V.num(n));
  }

  return {
    el: h('div', { class: 'cn-view cn-boardview' }, head.el, h('div', { class: 'cn-board' }, ...rows), overlay),
    start: () => ctx.audio.say(V.ask.board),
    destroy() {},
  };
}
