/** 아직 만들지 않은 화면 자리 (1단계 진행 중에만 쓴다) */
import type { Route, Screen } from '../router';
import { formatRoute } from '../router';
import type { Shell } from '../shell';
import { button } from '../ui/components';
import { h } from '../ui/dom';

export function placeholderScreen(route: Route, shell: Shell): Screen {
  const el = h(
    'div',
    { class: 'screen center' },
    h('h1', { class: 'text-title' }, '준비 중'),
    h('p', { class: 'text-body text-muted' }, formatRoute(route)),
    h(
      'div',
      { class: 'row' },
      button('허브로', () => shell.router.go({ name: 'hub' }), { kind: 'primary', big: true }),
      // 부모 모드(8번)가 생기기 전까지 잠금 자리에서 기기 정보로 가는 임시 길
      route.name === 'parent' && route.page === 'gate' ? button('기기 정보', () => shell.router.go({ name: 'parent', page: 'device' }), { big: true }) : null,
    ),
  );
  return { el };
}
