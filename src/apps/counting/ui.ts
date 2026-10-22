/**
 * 구슬 세기 화면 공용 조각: 그림, 타이머 묶음, 머리줄(뒤로·진행 막대), 10칸 판, 숫자 카드 보기.
 * (한자 엔진 ui.ts와 같은 모양. 세 번째 과목 때 src/shared/로 정리 — planning-log 2026-10-22)
 */
import { h } from '../../ui/dom';
import type { AppContext } from '../types';
import { FRAME_CELLS } from './logic/frame';
import { COUNTING_STRINGS as S } from './strings';
import { V } from './voiceIds';

const PICTURES = import.meta.glob('./pictures/*.svg', { eager: true, import: 'default' }) as Record<string, string>;

export function pictureUrl(id: string): string {
  return PICTURES[`./pictures/${id}.svg`] || '';
}

export function picEl(id: string, cls = ''): HTMLImageElement {
  return h('img', { class: `cn-pic ${cls}`, src: pictureUrl(id), alt: '', draggable: 'false' });
}

/** 높이 기준 단위 --u (px). 배치를 pt로 계산해 px로 바꿀 때 쓴다 */
export function unitPx(): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u'));
  return v > 0 ? v : 1;
}

/** 화면이 바뀌거나 과목을 닫을 때 한꺼번에 지우는 타이머 */
export class Timers {
  private ids: number[] = [];
  set(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      this.ids = this.ids.filter((x) => x !== id);
      fn();
    }, ms);
    this.ids.push(id);
  }
  clear(): void {
    for (const id of this.ids) window.clearTimeout(id);
    this.ids = [];
  }
}

/** 머리줄: 왼쪽 ‘뒤로’(판 진행 중에는 두 번 눌러야 나감), 가운데 진행 막대(있으면) */
export function headerEl(
  ctx: AppContext,
  timers: Timers,
  onBack: () => void,
  opts: { confirm: boolean; progress: boolean },
): { el: HTMLElement; setProgress(n: number, total: number, label?: string): void } {
  let armed = false;
  const back = h(
    'button',
    {
      class: 'cn-back',
      type: 'button',
      onClick: () => {
        ctx.audio.sfx('tap');
        if (!opts.confirm || armed) return onBack();
        armed = true;
        back.classList.add('is-armed');
        ctx.audio.say(V.ask.leave);
        timers.set(() => {
          armed = false;
          back.classList.remove('is-armed');
        }, 3000);
      },
    },
    `◀ ${S.back}`,
    h('span', { class: 'cn-back-tip' }, S.leaveConfirm),
  );
  const barFill = h('span', { class: 'cn-bar-fill' });
  const label = h('span', { class: 'cn-bar-label' });
  const bar = opts.progress ? h('div', { class: 'cn-bar' }, h('span', { class: 'cn-bar-track' }, barFill), label) : h('div', { class: 'cn-bar' });
  return {
    el: h('div', { class: 'cn-head' }, back, bar, h('span', { class: 'cn-head-space' })),
    setProgress(n, total, text) {
      barFill.style.width = `${Math.round((n / Math.max(1, total)) * 100)}%`;
      label.textContent = text || `${n} / ${total}`;
    },
  };
}

export type Bead = 'bead' | 'bead-more' | null;

/**
 * 10칸 판(5칸 × 2줄) frames개를 위아래로. 칸 번호는 채우는 순서(첫 판 윗줄 0~4, 아랫줄 5~9, 둘째 판 10~19).
 * enabled칸 수 밖은 흐리게(1단계 아랫줄). onTap이 있으면 칸을 누를 수 있다
 */
export function frameEl(
  frames: number,
  enabled: number,
  onTap?: (index: number) => void,
): { el: HTMLElement; set(beads: Bead[]): void; flash(frame: number): void } {
  const cells: HTMLElement[] = [];
  const boxes: HTMLElement[] = [];
  for (let f = 0; f < frames; f++) {
    const rows: HTMLElement[] = [];
    for (let r = 0; r < 2; r++) {
      const row = h('div', { class: 'cn-frame-row' });
      for (let c = 0; c < 5; c++) {
        const i = f * FRAME_CELLS + r * 5 + c;
        const off = i >= enabled;
        const cell = onTap
          ? h('button', { class: `cn-cell${off ? ' is-off' : ''}`, type: 'button', onClick: () => !off && onTap(i) })
          : h('span', { class: `cn-cell${off ? ' is-off' : ''}` });
        cells.push(cell);
        row.appendChild(cell);
      }
      rows.push(row);
    }
    const box = h('div', { class: 'cn-frame' }, ...rows);
    boxes.push(box);
  }
  return {
    el: h('div', { class: `cn-frames is-${frames}` }, ...boxes),
    set(beads) {
      cells.forEach((cell, i) => {
        const b = beads[i] || null;
        const cur = cell.getAttribute('data-bead');
        if ((cur || null) === b) return;
        cell.replaceChildren();
        if (b) {
          cell.setAttribute('data-bead', b);
          cell.appendChild(picEl(b, 'cn-bead'));
        } else cell.removeAttribute('data-bead');
      });
    },
    flash(frame) {
      const box = boxes[frame];
      if (!box) return;
      box.classList.remove('is-flash');
      void box.offsetWidth;
      box.classList.add('is-flash');
    },
  };
}

/** 구슬 수 → 칸마다 구슬 (앞에서부터 count개, 그 뒤 more개는 ‘더 채우기’ 구슬) */
export function beadsOf(count: number, more = 0): Bead[] {
  const out: Bead[] = [];
  for (let i = 0; i < count + more; i++) out.push(i < count ? 'bead' : 'bead-more');
  return out;
}

/** 숫자 카드 보기 (3개면 세로 한 줄, 4개면 2 × 2) */
export function choicesEl(nums: number[], onChoose: (n: number) => void): HTMLElement {
  return h(
    'div',
    { class: `cn-choices is-${nums.length}` },
    ...nums.map((n) => h('button', { class: 'cn-choice', type: 'button', 'data-n': String(n), onClick: () => onChoose(n) }, String(n))),
  );
}

/** 고른 뒤 보기 표시: 정답 강조, 틀린 카드, 나머지 흐리게 */
export function markChoices(box: HTMLElement, answer: number, chosen: number): void {
  const buttons = box.querySelectorAll<HTMLElement>('.cn-choice');
  for (let i = 0; i < buttons.length; i++) {
    const n = Number(buttons[i].getAttribute('data-n'));
    buttons[i].classList.add(n === answer ? 'is-answer' : n === chosen ? 'is-wrong' : 'is-dim');
  }
}

/** replaceChildren과 같되 null은 건너뛴다 */
export function fill(el: HTMLElement, ...nodes: (Node | null)[]): void {
  el.replaceChildren(...nodes.filter((n): n is Node => n !== null));
}
