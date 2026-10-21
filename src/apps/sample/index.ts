/**
 * 샘플 과목 (명세 4-4): 과목 모듈 규약이 동작하는지 검증하는 용도.
 * 큰 동그라미를 모두 누르면 별 1개 → 정답 연출 → 2초 뒤 허브로. 2단계 이후 부모 모드에서 숨긴다.
 */
import type { AppContext, AppModule } from '../types';
import './style.css';

const COLORS = ['#e8574f', '#f5a623', '#3fae6a', '#4a90e2', '#9b59b6', '#ff7eb6', '#00b3a6', '#8a5a3c'];

let root: HTMLElement | null = null;
let offInput: (() => void) | null = null;
let timer = 0;

const app: AppModule = {
  id: 'sample',
  version: 1,
  settingsSchema: [
    {
      key: 'count',
      label: '동그라미 개수',
      type: 'select',
      options: [
        { value: 3, label: '3개' },
        { value: 5, label: '5개' },
        { value: 8, label: '8개' },
      ],
      default: 5,
      help: '한 판에 누를 동그라미 수예요',
    },
  ],

  mount(el: HTMLElement, ctx: AppContext) {
    root = el;
    const count = Number(ctx.settings.count);
    const started = Date.now();
    let left = count;

    const board = document.createElement('div');
    board.className = 'sample-board';
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.className = 'sample-dot';
      dot.style.background = COLORS[i % COLORS.length];
      dot.setAttribute('data-i', String(i));
      board.appendChild(dot);
    }
    el.appendChild(board);
    ctx.audio.say('sample.play.intro');

    offInput = ctx.input.attach(board, {
      down(_id, p) {
        const hit = document.elementFromPoint(p.x, p.y);
        if (!hit || !hit.classList.contains('sample-dot') || hit.classList.contains('is-done')) return false;
        hit.classList.add('is-done');
        ctx.audio.sfx('tap');
        ctx.log.record({ item: `dot-${hit.getAttribute('data-i')}`, correct: true, durationMs: Date.now() - started });
        left -= 1;
        if (left === 0) {
          ctx.reward.star(1, 'sample-complete');
          ctx.ui.feedback('correct');
          timer = window.setTimeout(() => ctx.exit(), 2000);
        }
        return false; // 누르는 순간만 쓴다
      },
      move() {},
      up() {},
      cancel() {},
    });
  },

  unmount() {
    window.clearTimeout(timer);
    if (offInput) offInput();
    offInput = null;
    if (root) root.innerHTML = '';
    root = null;
  },
};

export default app;
