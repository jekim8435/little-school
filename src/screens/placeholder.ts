/** 아직 만들지 않은 화면 자리 (1단계 진행 중에만 쓴다) */
import type { Route, Router, Screen } from '../router';
import { formatRoute } from '../router';
import { button } from '../ui/components';
import { h } from '../ui/dom';

export function placeholderScreen(route: Route, router: Router): Screen {
  const el = h(
    'div',
    { class: 'screen blank' },
    h('h1', { class: 'text-title' }, '준비 중'),
    h('p', { class: 'blank-sub' }, formatRoute(route)),
    button('처음으로', () => router.go({ name: 'start' }), { kind: 'primary', big: true }),
  );
  return { el };
}
