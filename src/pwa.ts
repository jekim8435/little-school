/**
 * PWA 전용 코드 (서비스 워커 등록 + 새 버전 배너).
 * 네이티브(Capacitor) 빌드에서는 VITE_NATIVE=1로 꺼지므로, 서비스 워커에 의존하는 코드는 이 파일에만 둔다.
 */
import { h } from './ui/dom';

export function setupPwa(): void {
  if (import.meta.env.VITE_NATIVE === '1' || import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;

  void import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh: () => showUpdateBanner(() => void updateSW(true)),
    });
  });
}

function showUpdateBanner(onReload: () => void): void {
  if (document.querySelector('.update-banner')) return;
  const banner = h(
    'div',
    { class: 'update-banner', role: 'status' },
    h('span', {}, '새 버전이 있어요'),
    h('button', { class: 'btn btn-primary', onClick: onReload }, '새로고침'),
    h('button', { class: 'btn', 'aria-label': '닫기', onClick: () => banner.remove() }, '✕'),
  );
  document.body.append(banner);
}
