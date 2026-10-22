/**
 * ‘펜으로만 사용하기’ (공통 설정 penOnly, 2026-10-22 부모 요청으로 범위를 넓힘).
 * 켜져 있으면 아이 화면의 모든 누르기(타일·버튼·쓰기 칸)를 펜으로만 받고 손가락 입력은 버린다.
 * - 부모 모드 화면과 부모 잠금 자리(허브·오늘 끝의 오른쪽 위 3초)는 손가락도 받는다
 *   (펜을 잃어버려도 부모가 설정을 끌 수 있게)
 * - Pointer Events가 있는 기기(갤럭시 탭)에서만 동작한다. 아이패드(Touch Events)는 펜 구분이 없어 해당 없음
 * - 다른 어떤 핸들러보다 먼저 받도록 window의 캡처 단계에 단다
 */

/** 손가락 입력을 버릴지 */
export function shouldBlock(pointerType: string, penOnly: boolean, parentArea: boolean): boolean {
  return penOnly && pointerType === 'touch' && !parentArea;
}

/** 이만큼 지나도 click이 오지 않으면 막던 기록을 잊는다 */
const CLICK_WINDOW_MS = 1500;

export function installPenOnlyFilter(opts: {
  /** 지금 ‘펜으로만’이 켜져 있는지 */
  enabled(): boolean;
  /** 이 요소가 부모 모드 영역(손가락 허용)인지 */
  isParentArea(target: EventTarget | null): boolean;
}): () => void {
  if (typeof window === 'undefined' || !('PointerEvent' in window)) return () => {};
  const blocked = new Set<number>();
  let blockClickUntil = 0;

  const stop = (e: Event) => {
    e.stopImmediatePropagation();
    if (e.cancelable) e.preventDefault();
  };
  const onDown = (e: PointerEvent) => {
    if (!shouldBlock(e.pointerType, opts.enabled(), opts.isParentArea(e.target))) {
      if (e.pointerType !== 'touch') blockClickUntil = 0; // 펜으로 누른 click은 막지 않는다
      return;
    }
    blocked.add(e.pointerId);
    blockClickUntil = Date.now() + CLICK_WINDOW_MS;
    stop(e);
  };
  const onFollow = (e: PointerEvent) => {
    if (!blocked.has(e.pointerId)) return;
    if (e.type === 'pointerup' || e.type === 'pointercancel') blocked.delete(e.pointerId);
    stop(e);
  };
  // 손가락으로 누른 뒤 따라오는 click도 버린다 (버튼은 click으로 동작하므로)
  const onClick = (e: MouseEvent) => {
    if (Date.now() > blockClickUntil) return;
    blockClickUntil = 0;
    stop(e);
  };

  const opt = { capture: true, passive: false } as AddEventListenerOptions;
  window.addEventListener('pointerdown', onDown, opt);
  for (const t of ['pointermove', 'pointerup', 'pointercancel']) window.addEventListener(t, onFollow as EventListener, opt);
  window.addEventListener('click', onClick, opt);
  return () => {
    window.removeEventListener('pointerdown', onDown, opt);
    for (const t of ['pointermove', 'pointerup', 'pointercancel']) window.removeEventListener(t, onFollow as EventListener, opt);
    window.removeEventListener('click', onClick, opt);
  };
}
