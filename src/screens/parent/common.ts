/**
 * 부모 모드 공통 틀과 설정 부품 (명세 8장).
 * 부모 모드는 가로 기준이지만 내용이 길면 세로 스크롤을 허용한다(2-4). 음성은 쓰지 않는다(15-5).
 */
import type { Route } from '../../router';
import type { Shell } from '../../shell';
import { button } from '../../ui/components';
import { h } from '../../ui/dom';

export interface PageOptions {
  /** 왼쪽 위 ◀ 버튼이 갈 곳 (기본: 부모 홈) */
  back?: Route;
  /** 부모 홈이면 ◀ 대신 ‘아이 화면으로’만 */
  isHome?: boolean;
}

/** 부모 모드 한 화면: 제목 줄 + 스크롤 영역 */
export function parentPage(shell: Shell, title: string, body: Node[], opts: PageOptions = {}): HTMLElement {
  const { router } = shell;
  const left = opts.isHome
    ? h('span', { class: 'parent-head-space' })
    : button('◀ 뒤로', () => router.go(opts.back || { name: 'parent', page: 'home' }));
  return h(
    'div',
    { class: 'screen parent scroll' },
    h(
      'div',
      { class: 'parent-head' },
      left,
      h('h1', { class: 'parent-title' }, title),
      button('아이 화면으로', () => router.go({ name: 'hub' }), { kind: 'soft' }),
    ),
    ...body,
  );
}

/** 묶음 상자: 제목 + 줄들 */
export function section(title: string | null, ...rows: (Node | null)[]): HTMLElement {
  return h('section', { class: 'p-section' }, title ? h('h2', { class: 'p-section-title' }, title) : null, ...rows);
}

/** 설정 한 줄: 이름(+설명) | 조작 */
export function settingRow(label: string, control: Node, help?: string): HTMLElement {
  return h(
    'div',
    { class: 'p-row' },
    h('div', { class: 'p-row-label' }, h('div', {}, label), help ? h('div', { class: 'p-help' }, help) : null),
    h('div', { class: 'p-row-control' }, control),
  );
}

/** 하나만 고르는 큰 버튼 묶음 */
export function segmented<T extends string | number>(
  options: { value: T; label: string }[],
  value: T,
  onChange: (v: T) => void,
): HTMLElement {
  const box = h('div', { class: 'p-seg', role: 'radiogroup' });
  const render = (cur: T) => {
    box.replaceChildren(
      ...options.map((o) =>
        h(
          'button',
          {
            class: `p-seg-btn${o.value === cur ? ' is-on' : ''}`,
            type: 'button',
            role: 'radio',
            'aria-checked': String(o.value === cur),
            onClick: () => {
              if (o.value === cur) return;
              render(o.value);
              onChange(o.value);
            },
          },
          o.label,
        ),
      ),
    );
  };
  render(value);
  return box;
}

/** 켜기/끄기 스위치 */
export function toggleSwitch(value: boolean, onChange: (v: boolean) => void): HTMLElement {
  let on = value;
  const b = h('button', { class: `p-switch${on ? ' is-on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(on) }, h('span', { class: 'p-switch-knob' }));
  const label = h('span', { class: 'p-switch-label' }, on ? '켜짐' : '꺼짐');
  b.addEventListener('click', () => {
    on = !on;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-checked', String(on));
    label.textContent = on ? '켜짐' : '꺼짐';
    onChange(on);
  });
  return h('div', { class: 'p-switch-wrap' }, b, label);
}

/** 분·초 표시: 12분, 1시간 5분 */
export function formatMinutes(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}분`;
  return `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}`;
}
