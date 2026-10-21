/**
 * PWA 전용 코드: 서비스 워커 등록, 오프라인 준비, 새 버전 확인 (명세 11-2).
 * - 아이 화면에서는 ‘새 버전이 있어요’를 띄우지 않는다. 부모 모드 홈에 표시하고 부모가 ‘업데이트’를 누른다
 *   (단, 개발 기간(src/config.ts DEV_PERIOD)에는 ui/devInfo.ts가 아이 화면에도 배너를 띄운다)
 * - 새 버전은 앱이 다시 보일 때와 1시간마다 확인한다
 * 네이티브(Capacitor) 빌드에서는 VITE_NATIVE=1로 꺼지므로, 서비스 워커에 의존하는 코드는 이 파일에만 둔다.
 */

const CHECK_EVERY_MS = 60 * 60000;

type Listener = () => void;

export const pwa = {
  /** 이 기기에 앱 파일이 모두 저장되어 비행기 모드에서도 열 수 있는지 */
  offlineReady: false,
  /** 새 버전을 받아 두었고, 업데이트를 누르면 바뀌는지 */
  needRefresh: false,
  /** 서비스 워커를 쓰는지 (개발 서버·네이티브·지원 안 하는 브라우저면 false) */
  enabled: false,
  listeners: [] as Listener[],
  applyUpdate: null as null | (() => void),
  registration: null as ServiceWorkerRegistration | null,

  /** 새 버전으로 바꾸고 다시 연다 (부모 모드 ‘업데이트’) */
  update(): void {
    if (this.applyUpdate) this.applyUpdate();
    else location.reload();
  },

  /** 지금 새 버전이 있는지 서버에 물어본다 */
  check(): void {
    const r = this.registration;
    if (r) void r.update().catch(() => {});
  },

  /** 상태가 바뀌면 cb. 그만 들을 때 쓰는 함수를 돌려준다 */
  onChange(cb: Listener): () => void {
    this.listeners.push(cb);
    return () => {
      const i = this.listeners.indexOf(cb);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  },

  emit(): void {
    for (const cb of this.listeners.slice()) cb();
  },
};

export function setupPwa(): void {
  if (import.meta.env.VITE_NATIVE === '1' || import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;
  pwa.enabled = true;
  // 이미 서비스 워커가 이 화면을 맡고 있으면 오프라인 준비가 끝난 것
  if (navigator.serviceWorker.controller) pwa.offlineReady = true;

  void import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        pwa.needRefresh = true;
        pwa.emit();
      },
      onOfflineReady() {
        pwa.offlineReady = true;
        pwa.emit();
      },
      onRegisteredSW(_url, reg) {
        if (!reg) return;
        pwa.registration = reg;
        window.setInterval(() => pwa.check(), CHECK_EVERY_MS);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') pwa.check();
        });
      },
    });
    pwa.applyUpdate = () => void updateSW(true);
  });
}
