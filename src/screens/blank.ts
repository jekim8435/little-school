/**
 * 1단계 확인용 빈 화면: 홈 화면 앱으로 떴는지, 화면 크기·입력 종류·저장이 맞는지 실기기에서 본다.
 * 4번에서 시작 화면이 생기면 지운다(이때 저장 데이터의 apps._check도 지운다).
 */
import { sfx } from '../core/audio';
import type { Store } from '../core/storage';
import type { Router, Screen } from '../router';
import { button, confirmDialog, toast } from '../ui/components';
import { h } from '../ui/dom';
import { PRESS_START_EVENTS } from '../ui/input';

export function blankScreen(store: Store, router: Router): Screen {
  const info = h('dl', { class: 'blank-info' });
  let lastInput = '-';

  // 앱을 연 횟수: 닫았다 열어도 늘어나면 저장이 되는 것
  const check = store.app('_check').data;
  check.opens = (typeof check.opens === 'number' ? check.opens : 0) + 1;
  store.changed();

  const render = () => {
    const u = getComputedStyle(document.documentElement).getPropertyValue('--u').trim();
    const rows: [string, string][] = [
      ['화면 크기', `${window.innerWidth} × ${window.innerHeight} (배율 ${window.devicePixelRatio}, --u ${u})`],
      ['실행 방식', displayMode()],
      ['입력', `${'PointerEvent' in window ? 'Pointer Events' : 'Touch Events'} / 마지막: ${lastInput}`],
      ['저장', `${store.saveFailed ? '실패' : '정상'} · 연 횟수 ${String(check.opens)}회`],
      ['빌드', __BUILD_TIME__],
    ];
    info.replaceChildren(...rows.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))));
  };

  const onPress = (e: Event) => {
    const type = (e as PointerEvent).pointerType;
    lastInput = type || (e.type === 'touchstart' ? 'touch' : 'mouse');
    render();
  };
  for (const type of PRESS_START_EVENTS) document.addEventListener(type, onPress, true);
  window.addEventListener('resize', render);
  window.addEventListener('orientationchange', render);
  render();

  const el = h(
    'div',
    { class: 'screen blank' },
    h('h1', { class: 'text-title' }, '꼬마학교'),
    h('p', { class: 'blank-sub' }, '1단계 확인용 화면'),
    info,
    h(
      'div',
      { class: 'row' },
      button('소리', () => sfx.fanfare(), { kind: 'primary', big: true }),
      button('확인창', () => {
        void confirmDialog({ title: '확인창 시험', message: '확인을 누르면 토스트가 떠요.', ok: '확인' }).then((ok) =>
          toast(ok ? '확인을 눌렀어요' : '취소했어요'),
        );
      }, { kind: 'soft', big: true }),
      button('다른 화면', () => router.go({ name: 'hub' }), { big: true }),
    ),
  );

  return {
    el,
    destroy() {
      for (const type of PRESS_START_EVENTS) document.removeEventListener(type, onPress, true);
      window.removeEventListener('resize', render);
      window.removeEventListener('orientationchange', render);
    },
  };
}

function displayMode(): string {
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return '홈 화면 앱 (iOS)';
  for (const mode of ['fullscreen', 'standalone']) {
    if (window.matchMedia(`(display-mode: ${mode})`).matches) return `홈 화면 앱 (${mode})`;
  }
  return '브라우저 탭';
}
