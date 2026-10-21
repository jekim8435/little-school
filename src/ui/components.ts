/**
 * 공통 화면 부품: 큰 버튼, 토스트, 확인창, 세로 방향 안내 (명세 3장 components.ts, 2-4, 10장).
 * 별 애니메이션은 보상(1단계 6번)에서 더한다.
 * 애니메이션은 transform·opacity만 쓴다(에어1 성능, 명세 10장).
 */
import { h } from './dom';

export type ButtonKind = 'primary' | 'plain' | 'soft';

export interface ButtonOptions {
  kind?: ButtonKind;
  /** 큰 버튼 (아이 화면 주요 버튼, 88px 이상) */
  big?: boolean;
  /** 글자 앞 그림(이모지·SVG 문자열 등) */
  icon?: string | Node;
  label?: string;
  className?: string;
  disabled?: boolean;
}

/** 버튼. 아이 화면 주요 버튼은 big: true */
export function button(text: string, onClick: () => void, opts: ButtonOptions = {}): HTMLButtonElement {
  const cls = ['btn', `btn-${opts.kind ?? 'plain'}`];
  if (opts.big) cls.push('btn-big');
  if (opts.className) cls.push(opts.className);
  const b = h(
    'button',
    { class: cls.join(' '), type: 'button', 'aria-label': opts.label, disabled: opts.disabled, onClick: () => onClick() },
    opts.icon ? h('span', { class: 'btn-icon' }, opts.icon) : null,
    text ? h('span', { class: 'btn-text' }, text) : null,
  );
  return b;
}

// ── 토스트 ──────────────────────────────────────────────

let toastEl: HTMLElement | null = null;
let toastTimer = 0;

/** 화면 위쪽에 잠깐 떴다 사라지는 안내 (부모 모드 ‘저장했어요’ 등) */
export function toast(message: string, ms = 2000): void {
  if (!toastEl) {
    toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastEl);
  }
  const el = toastEl;
  window.clearTimeout(toastTimer);
  el.textContent = message;
  el.classList.remove('is-visible');
  void el.offsetWidth; // 애니메이션 다시 시작
  el.classList.add('is-visible');
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), ms);
}

// ── 확인창 ──────────────────────────────────────────────

export interface ConfirmOptions {
  title?: string;
  message: string;
  ok?: string;
  cancel?: string;
  /** 위험한 동작(초기화·삭제)이면 확인 버튼을 빨간색으로 */
  danger?: boolean;
}

let openDialog: (() => void) | null = null;

/** 확인창. 확인이면 true, 취소·바깥 누르기면 false. 이미 떠 있으면 앞의 것은 취소로 닫는다 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  openDialog?.();
  return new Promise((resolve) => {
    const close = (result: boolean) => {
      if (openDialog !== cancel) return;
      openDialog = null;
      overlay.remove();
      resolve(result);
    };
    const cancel = () => close(false);
    const box = h(
      'div',
      { class: 'dialog', role: 'dialog', 'aria-modal': 'true' },
      opts.title ? h('h2', { class: 'dialog-title' }, opts.title) : null,
      h('p', { class: 'dialog-message' }, opts.message),
      h(
        'div',
        { class: 'dialog-buttons' },
        button(opts.cancel ?? '취소', cancel, { kind: 'plain' }),
        button(opts.ok ?? '확인', () => close(true), { kind: opts.danger ? 'primary' : 'soft', className: opts.danger ? 'btn-danger' : '' }),
      ),
    );
    const overlay = h('div', { class: 'dialog-overlay' }, box);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cancel();
    });
    openDialog = cancel;
    document.body.append(overlay);
  });
}

/** 떠 있는 확인창을 취소로 닫는다 (화면을 떠날 때) */
export function closeDialogs(): void {
  openDialog?.();
}

// ── 세로 방향 안내 (명세 2-4) ──────────────────────────────

const ROTATE_SVG =
  '<svg viewBox="0 0 120 120" aria-hidden="true">' +
  '<g class="rotate-device"><rect x="38" y="20" width="44" height="80" rx="8" fill="#fff" stroke="#2a2522" stroke-width="5"/>' +
  '<circle cx="60" cy="90" r="3.5" fill="#2a2522"/></g>' +
  '<path d="M108 62A50 50 0 0 0 95 24" fill="none" stroke="#e8574f" stroke-width="5" stroke-linecap="round"/>' +
  '<path d="M86 27l9-3 5 9" fill="none" stroke="#e8574f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

/**
 * 세로로 돌리면 화면 전체를 덮는 ‘옆으로 돌려 주세요’ 안내를 띄운다.
 * show/hide만 한다. 과목 pause()·학습 시간 멈춤·음성은 부르는 쪽(main)이 onChange로 처리한다.
 */
export function orientationOverlay(): { el: HTMLElement; set(landscape: boolean): void } {
  const art = h('div', { class: 'rotate-art' });
  art.innerHTML = ROTATE_SVG;
  const el = h('div', { class: 'rotate-overlay', 'aria-hidden': 'true' }, art, h('p', { class: 'rotate-text' }, '옆으로 돌려 주세요'));
  return {
    el,
    set(landscape) {
      el.classList.toggle('is-visible', !landscape);
      el.setAttribute('aria-hidden', String(landscape));
    },
  };
}
