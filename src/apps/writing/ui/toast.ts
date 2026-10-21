import { h } from '../../../ui/dom';

/** 쓰기 영역 위에 잠깐 떴다 사라지는 안내 */
export class Toast {
  readonly el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
  private timer = 0;

  show(main: string, sub?: string, ms = 2000): void {
    clearTimeout(this.timer);
    this.el.replaceChildren(h('strong', {}, main), sub ? h('span', {}, sub) : '');
    this.el.classList.remove('is-visible');
    void this.el.offsetWidth; // 애니메이션 다시 시작
    this.el.classList.add('is-visible');
    this.timer = window.setTimeout(() => this.hide(), ms);
  }

  hide(): void {
    clearTimeout(this.timer);
    this.el.classList.remove('is-visible');
  }
}
