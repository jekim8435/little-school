/** 쓰기 방법 고르기: 따라 쓰기 / 혼자 쓰기. 고른 방법으로만 계속하고 회차도 따로다 (별은 혼자 쓰기만) */
import type { AppContext } from '../../types';
import type { Category } from '../categories';
import type { ModeId } from '../data/types';
import { h } from '../../../ui/dom';

const MODES: { id: ModeId; name: string; desc: string; icon: string }[] = [
  { id: 'guided', name: '따라 쓰기', desc: '번호와 화살표를 보며 한 획씩', icon: '✏️' },
  { id: 'free', name: '혼자 쓰기', desc: '다 쓰고 [확인]을 눌러요', icon: '🌟' },
];

export function modeView(ctx: AppContext, c: Category, onPick: (m: ModeId) => void, onBack: () => void): HTMLElement {
  ctx.audio.say('writing.mode.ask');
  return h(
    'div',
    { class: 'w-view w-modes' },
    h(
      'div',
      { class: 'w-head' },
      h('button', { class: 'btn btn-plain w-back', type: 'button', onClick: onBack }, '◀ 글자 고르기'),
      h('h2', { class: 'w-title' }, c.name),
      h('span', { class: 'w-head-space' }),
    ),
    h(
      'div',
      { class: 'w-mode-row' },
      ...MODES.map((m) =>
        h(
          'button',
          {
            class: 'w-mode',
            type: 'button',
            'data-mode': m.id,
            onClick: () => {
              ctx.audio.sfx('tap');
              ctx.audio.say(`writing.mode.${m.id}`);
              onPick(m.id);
            },
          },
          h('span', { class: 'w-mode-icon' }, m.icon),
          h('span', { class: 'w-mode-name' }, m.name),
          h('span', { class: 'w-mode-desc' }, m.desc),
        ),
      ),
    ),
  );
}
