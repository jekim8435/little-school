/**
 * 옛 아이패드 Safari(13.x)에 없는 기능을 채운다. main.ts에서 가장 먼저 불러온다.
 * - Element.replaceChildren: Safari 14부터
 * - ResizeObserver: Safari 13.4부터 → observeResize()로 감싸서 없으면 창 크기 변경으로 대신한다
 */

if (typeof Element !== 'undefined' && !('replaceChildren' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'replaceChildren', {
    configurable: true,
    writable: true,
    value: function replaceChildren(this: Element, ...nodes: (Node | string)[]) {
      while (this.lastChild) this.removeChild(this.lastChild);
      this.append(...nodes);
    },
  });
}

/**
 * 화면 전체가 손가락에 밀리거나 확대되지 않게 한다.
 * iOS 12는 overscroll-behavior와 user-scalable=no를 따르지 않으므로 이벤트로 막는다.
 * 목록처럼 실제로 스크롤할 내용이 있는 곳에서는 스크롤을 허용한다.
 */
export function lockPageGestures(): void {
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1 || !canScroll(e.target)) e.preventDefault();
    },
    { passive: false },
  );
  // 두 손가락 확대 (Safari 전용 gesture 이벤트)
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }
  // 안드로이드 길게 누르기 메뉴 (명세 2-3)
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

/** target부터 위로 올라가며 세로로 스크롤할 수 있는 요소가 있는지 */
function canScroll(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const style = getComputedStyle(el);
    if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) return true;
    el = el.parentElement;
  }
  return false;
}

/** 요소 크기가 바뀔 때 cb를 부른다. 그만 볼 때 쓰는 함수를 돌려준다 */
export function observeResize(el: Element, cb: () => void): () => void {
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => cb());
    ro.observe(el);
    return () => ro.disconnect();
  }
  // ResizeObserver가 없으면 창 크기 변경 때와 0.25초마다 크기를 비교해서 바뀌었을 때만 부른다
  // (요소가 화면에 붙어 크기가 정해지는 순간과 회전을 모두 잡는다)
  let w = -1;
  let h = -1;
  const check = () => {
    const rect = el.getBoundingClientRect();
    if (rect.width !== w || rect.height !== h) {
      w = rect.width;
      h = rect.height;
      cb();
    }
  };
  const timer = window.setInterval(check, 250);
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  window.setTimeout(check, 0);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('resize', check);
    window.removeEventListener('orientationchange', check);
  };
}

// ── 화면 크기·방향 (명세 2-4, 10장) ─────────────────────────

/** 디자인 기준 높이. 모든 크기는 화면 높이 ÷ 768 배율(--u)로 계산한다 */
export const DESIGN_HEIGHT = 768;

/** 가로 화면인지. 판단은 innerWidth > innerHeight 하나로 (명세 2-4) */
export function isLandscape(): boolean {
  return window.innerWidth > window.innerHeight;
}

/**
 * CSS 변수를 화면 크기에 맞춘다. dvh 같은 새 단위가 없는 Safari 12 대신 JS로 계산한다.
 * - --vh: 화면 높이의 1% (px)
 * - --u: 높이 기준 단위 = 화면 높이 ÷ 768 (px). 크기는 calc(var(--u) * 24)처럼 쓴다
 * 세로일 때는 짧은 변을 높이로 본다(세로 안내 화면이 덮으므로 아이 화면 배치가 흐트러지지 않게).
 */
export function applyViewportVars(): void {
  const h = Math.min(window.innerWidth, window.innerHeight);
  const s = document.documentElement.style;
  s.setProperty('--vh', `${window.innerHeight / 100}px`);
  s.setProperty('--u', `${h / DESIGN_HEIGHT}px`);
}

/** 화면 크기·방향이 바뀌면 cb(가로인지)를 부른다. iOS는 회전 직후 크기가 늦게 바뀌므로 조금 뒤에 한 번 더 본다 */
export function onViewportChange(cb: (landscape: boolean) => void): () => void {
  let timer = 0;
  const run = () => {
    applyViewportVars();
    cb(isLandscape());
  };
  const later = () => {
    run();
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 300);
  };
  window.addEventListener('resize', later);
  window.addEventListener('orientationchange', later);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener('resize', later);
    window.removeEventListener('orientationchange', later);
  };
}

/**
 * <html>에 기능 표시 클래스를 붙인다 (CSS가 쓴다).
 * - ios-standalone: iOS 홈 화면 앱. 상태 표시줄(black-translucent)이 화면 위에 겹치므로 위쪽 20pt를 비운다
 */
export function markFeatures(): void {
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
    document.documentElement.classList.add('ios-standalone');
  }
}
