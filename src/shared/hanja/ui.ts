/**
 * 한자 화면 공용 조각: 그림, 한자 글자, 타이머 묶음, 화면 위 머리줄(뒤로·진행 막대).
 */
import { h } from '../../ui/dom';
import type { AppContext } from '../../apps/types';
import type { HanjaConfig } from './config';
import type { HanjaItem } from './types';

/** 그림 주소 (pictures/<id>.svg). 아직 그리지 않은 그림은 없을 수 있다 */
const PICTURES = import.meta.glob('./pictures/*.svg', { eager: true, import: 'default' }) as Record<string, string>;

export function pictureUrl(id: string): string | undefined {
  return PICTURES[`./pictures/${id}.svg`];
}

/** 한자의 그림. 그림이 아직 없으면 뜻 글자를 동그라미에 넣어 대신 보여 준다 */
export function pictureEl(item: HanjaItem, cls = ''): HTMLElement {
  const url = pictureUrl(item.picture);
  if (url) return h('span', { class: `hj-pic ${cls}` }, h('img', { src: url, alt: '', draggable: 'false' }));
  return h('span', { class: `hj-pic hj-pic-missing ${cls}` }, h('span', {}, item.meaning));
}

/** 한자 글자 (한국식 자형으로 그려지도록 lang="ko") */
export function charEl(char: string, cls = ''): HTMLElement {
  return h('span', { class: `hj-char ${cls}`, lang: 'ko' }, char);
}

export function readingOf(item: HanjaItem): string {
  return `${item.meaning} ${item.sound}`;
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

/**
 * 머리줄: 왼쪽 ‘뒤로’(판 진행 중에는 두 번 눌러야 나감), 가운데 진행 막대(있으면).
 * setProgress(n, total)로 막대를 고친다
 */
export function headerEl(
  ctx: AppContext,
  cfg: HanjaConfig,
  timers: Timers,
  onBack: () => void,
  opts: { confirm: boolean; progress: boolean },
): { el: HTMLElement; setProgress(n: number, total: number): void } {
  let armed = false;
  const tip = h('span', { class: 'hj-back-tip' }, cfg.strings.leaveConfirm);
  const back = h(
    'button',
    {
      class: 'hj-back',
      type: 'button',
      onClick: () => {
        ctx.audio.sfx('tap');
        if (!opts.confirm || armed) return onBack();
        armed = true;
        back.classList.add('is-armed');
        ctx.audio.say(cfg.voices.ask.leave);
        timers.set(() => {
          armed = false;
          back.classList.remove('is-armed');
        }, 3000);
      },
    },
    `◀ ${cfg.strings.back}`,
    tip,
  );
  const barFill = h('span', { class: 'hj-bar-fill' });
  const label = h('span', { class: 'hj-bar-label' });
  const bar = opts.progress ? h('div', { class: 'hj-bar' }, h('span', { class: 'hj-bar-track' }, barFill), label) : h('div', { class: 'hj-bar' });
  return {
    el: h('div', { class: 'hj-head' }, back, bar, h('span', { class: 'hj-head-space' })),
    setProgress(n, total) {
      barFill.style.width = `${Math.round((n / Math.max(1, total)) * 100)}%`;
      label.textContent = `${n} / ${total}`;
    },
  };
}

/** replaceChildren과 같되 null은 건너뛴다 */
export function fill(el: HTMLElement, ...nodes: (Node | null)[]): void {
  el.replaceChildren(...nodes.filter((n): n is Node => n !== null));
}
