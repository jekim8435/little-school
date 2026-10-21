/**
 * 카테고리 고르기 (과목 첫 화면, 명세 14-1 ‘홈’ → 14-3).
 * 카드: 대표 글자, 이름, 진행 중 회차(예: 9 / 14) 또는 글자 수, 클리어 횟수.
 */
import type { AppContext } from '../../types';
import { CATEGORIES, glyphsOf, type Category } from '../categories';
import type { WritingData } from '../round';
import { categoryVoiceId } from '../voice';
import { h } from '../../../ui/dom';

export function categoriesView(ctx: AppContext, data: WritingData, onPick: (c: Category) => void): HTMLElement {
  const card = (c: Category) => {
    const total = glyphsOf(c).length;
    const round = data.rounds[c.id];
    const done = round ? round.cleared.length : 0;
    const clears = data.clears[c.id] || 0;
    return h(
      'button',
      {
        class: `w-cat${data.lastCategory === c.id ? ' is-last' : ''}`,
        type: 'button',
        onClick: () => {
          ctx.audio.sfx('tap');
          ctx.audio.say(categoryVoiceId(c.id));
          onPick(c);
        },
      },
      clears ? h('span', { class: 'w-cat-clears' }, `🏆 ${clears}`) : null,
      h('span', { class: 'w-cat-sample' }, c.sample),
      h('span', { class: 'w-cat-name' }, c.name),
      h('span', { class: 'w-cat-sub' }, done ? `${done} / ${total}` : `${total}자`),
      done ? h('span', { class: 'w-cat-bar' }, h('span', { style: `width:${Math.round((done / total) * 100)}%` })) : null,
    );
  };
  ctx.audio.say('writing.category.ask');
  return h(
    'div',
    { class: 'w-view w-categories' },
    h('h2', { class: 'w-title' }, '어떤 글자를 써 볼까?'),
    h('div', { class: 'w-cat-row' }, ...CATEGORIES.slice(0, 4).map(card)),
    h('div', { class: 'w-cat-row' }, ...CATEGORIES.slice(4).map(card)),
  );
}
