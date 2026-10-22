/**
 * 플랫폼 어댑터 (09 문서 4장 2, R-06). 플랫폼별 분기는 이 폴더에서만 한다.
 * - 과목·허브·부모 모드 코드는 navigator.standalone / serviceWorker / storage / userAgent,
 *   window.Capacitor를 직접 보지 않고 여기 함수를 쓴다
 * - 서비스 워커 등록·업데이트 확인은 ./pwa.ts (Capacitor 앱에서는 꺼짐)
 * - 기능 구분은 기능 감지로, UserAgent는 안내 문구(기기별 설명)를 고를 때만 쓴다 (명세 2-5)
 */

type NavigatorExtra = Navigator & {
  standalone?: boolean;
  storage?: { persist?: () => Promise<boolean> };
};

const nav = (): NavigatorExtra | null => (typeof navigator === 'undefined' ? null : (navigator as NavigatorExtra));

/** Capacitor로 감싼 네이티브 앱인지 (빌드 표시 VITE_NATIVE=1 또는 실행 중인 Capacitor) */
function isNativeApp(): boolean {
  if (import.meta.env.VITE_NATIVE === '1') return true;
  const cap = typeof window === 'undefined' ? undefined : (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

/** iOS 홈 화면 앱(Safari ‘홈 화면에 추가’)으로 실행 중인지 */
function isIosStandalone(): boolean {
  const n = nav();
  return !!n && n.standalone === true;
}

/** 설치된 PWA(홈 화면 앱)로 실행 중인지 — 네이티브 앱이 아니고 브라우저 탭도 아닐 때 */
function isPWA(): boolean {
  if (isNativeApp()) return false;
  if (isIosStandalone()) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return ['fullscreen', 'standalone'].some((m) => window.matchMedia(`(display-mode: ${m})`).matches);
}

/** 실행 방식 (기기 정보 화면용) */
function displayMode(): string {
  if (isNativeApp()) return '앱 (Capacitor)';
  if (isIosStandalone()) return '홈 화면 앱 (iOS)';
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    for (const mode of ['fullscreen', 'standalone']) {
      if (window.matchMedia(`(display-mode: ${mode})`).matches) return `홈 화면 앱 (${mode})`;
    }
  }
  return '브라우저 탭';
}

/**
 * 파일 내려받기(a[download])를 써도 되는지. iOS 홈 화면 앱에서는 앱 밖으로 나갈 수 있어 쓰지 않는다 (명세 8-7)
 */
function canDownloadFile(): boolean {
  if (isIosStandalone()) return false;
  return typeof document !== 'undefined' && 'download' in document.createElement('a');
}

/**
 * 저장소가 지워지지 않게 요청한다 (갤럭시 탭 Chrome, 명세 11-4). iOS 12에는 없는 기능이라 그냥 넘어간다.
 * 결과: true(유지됨) / false(거절) / null(지원 안 함)
 */
function requestPersist(): Promise<boolean | null> {
  const n = nav();
  const s = n ? n.storage : undefined;
  if (!s || typeof s.persist !== 'function') return Promise.resolve(null);
  return s.persist().catch(() => false);
}

/** 안내 문구를 고를 기기 종류 (잠금·설치 안내). 기능 구분에는 쓰지 않는다 */
function guideDevice(): 'ipad' | 'galaxy' {
  const n = nav();
  return n && /Android/i.test(n.userAgent) ? 'galaxy' : 'ipad';
}

export const platform = {
  isNativeApp,
  isPWA,
  isIosStandalone,
  displayMode,
  canDownloadFile,
  requestPersist,
  guideDevice,
};
