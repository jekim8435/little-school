/**
 * 개발 기간 표시 (src/config.ts의 DEV_PERIOD).
 * - 아이 화면에도 새 버전 배너 (부모 모드 홈에는 원래대로 알림이 따로 있음)
 * - 오른쪽 아래 옅은 앱 버전
 */
import { DEV_PERIOD } from '../config';
import { pwa } from '../platform/pwa';
import { h } from './dom';

export function installDevInfo(): void {
  if (!DEV_PERIOD) return;

  document.body.append(h('div', { class: 'dev-version', 'aria-hidden': 'true' }, `v${__APP_VERSION__} · ${__BUILD_TIME__}`));

  let closed = false;
  const banner = h(
    'div',
    { class: 'update-banner', role: 'status' },
    h('span', {}, '새 버전이 있어요'),
    h('button', { class: 'btn btn-primary', type: 'button', onClick: () => pwa.update() }, '새로고침'),
    h('button', { class: 'btn update-close', type: 'button', 'aria-label': '닫기', onClick: () => {
      closed = true;
      banner.remove();
    } }, '✕'),
  );
  const render = () => {
    if (pwa.needRefresh && !closed && !banner.parentNode) document.body.append(banner);
  };
  pwa.onChange(render);
  render();
}
