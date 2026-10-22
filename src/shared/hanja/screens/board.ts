/**
 * 내 한자판: 세트 전체를 8열 × 4줄로 (세트 순서대로 이어서). 32자를 넘으면 옆으로 넘기는 페이지.
 * 칸: 한자 + 훈음 + 익힘 별 0~3(배운 한자) 또는 ‘곧 배워요’(안 배운 한자, 연한 칸).
 * 누르면 가운데 큰 카드(한자 + 그림 + 훈음)와 음성. 바깥을 누르면 닫힘. 별 없음.
 */
import { h } from '../../../ui/dom';
import { levelOf, MASTERY_MAX } from '../mastery';
import type { Engine, View } from '../module';
import type { HanjaItem } from '../types';
import { charEl, headerEl, pictureEl, readingOf } from '../ui';

const COLS = 8;
const ROWS = 4;
const PAGE = COLS * ROWS;

export function boardView(e: Engine): View {
  const { ctx, cfg, timers } = e;
  const items = cfg.set.items;
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  let page = 0;

  const head = headerEl(ctx, cfg, timers, () => e.menu(), { confirm: false, progress: false });
  const grid = h('div', { class: 'hj-board' });
  const pager = h('div', { class: 'hj-pager' });
  const overlay = h('div', { class: 'hj-overlay', onClick: () => close() });
  const view = h('div', { class: 'hj-view hj-board-view' }, head.el, grid, pager, overlay);

  function cell(it: HanjaItem): HTMLElement {
    const learned = e.learned.indexOf(it.char) >= 0;
    const level = levelOf(e.mastery(), it.char);
    let stars = '';
    for (let i = 0; i < MASTERY_MAX; i++) stars += i < level ? '★' : '☆';
    return h(
      'button',
      { class: `hj-cell${learned ? ' is-learned' : ''}`, type: 'button', onClick: () => openCard(it) },
      charEl(it.char, 'hj-cell-char'),
      h('span', { class: 'hj-cell-reading' }, readingOf(it)),
      learned ? h('span', { class: 'hj-cell-stars' }, stars) : h('span', { class: 'hj-cell-soon' }, cfg.strings.soon),
    );
  }

  function render(): void {
    grid.replaceChildren(...items.slice(page * PAGE, (page + 1) * PAGE).map(cell));
    if (pages < 2) return;
    const dots: HTMLElement[] = [];
    for (let i = 0; i < pages; i++) {
      dots.push(
        h('button', {
          class: `hj-dot${i === page ? ' is-on' : ''}`,
          type: 'button',
          onClick: () => {
            page = i;
            render();
          },
        }),
      );
    }
    pager.replaceChildren(...dots);
  }

  function openCard(it: HanjaItem): void {
    ctx.audio.sfx('tap');
    overlay.replaceChildren(
      h(
        'div',
        { class: 'hj-big' },
        charEl(it.char, 'hj-big-char'),
        pictureEl(it, 'hj-big-pic'),
        h('span', { class: 'hj-big-reading' }, readingOf(it)),
      ),
    );
    overlay.classList.add('is-on');
    ctx.audio.say(cfg.voices.char(it.char));
  }

  function close(): void {
    overlay.classList.remove('is-on');
    overlay.replaceChildren();
  }

  render();
  return { el: view, start: () => ctx.audio.say(cfg.voices.ask.board), destroy() {} };
}
