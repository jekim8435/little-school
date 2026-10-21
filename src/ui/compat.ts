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
