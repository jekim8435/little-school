/**
 * 1단계 2번 확인용 빈 화면: 홈 화면 앱으로 떴는지, 화면 크기·입력 종류가 맞는지 실기기에서 본다.
 * 3번 이후 시작 화면으로 바뀌면 지운다.
 */
import { sfx } from '../core/audio';
import { h } from '../ui/dom';
import { PRESS_START_EVENTS } from '../ui/input';
import type { Screen } from '../router';

export function blankScreen(): Screen {
  const info = h('dl', { class: 'blank-info' });
  let lastInput = '-';

  const render = () => {
    const rows: [string, string][] = [
      ['화면 크기', `${window.innerWidth} × ${window.innerHeight}`],
      ['기기 배율', String(window.devicePixelRatio)],
      ['방향', window.innerWidth > window.innerHeight ? '가로' : '세로'],
      ['실행 방식', displayMode()],
      ['입력 방식', 'PointerEvent' in window ? 'Pointer Events' : 'Touch Events'],
      ['마지막 입력', lastInput],
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
    h('h1', { class: 'blank-title' }, '꼬마학교'),
    h('p', { class: 'blank-sub' }, '빈 화면 (1단계 배포 확인용)'),
    info,
    h('button', { class: 'btn btn-primary', onClick: () => sfx.fanfare() }, '소리 확인'),
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
