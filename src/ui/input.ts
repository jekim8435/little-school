/**
 * 손가락·마우스 입력을 한 가지 모양으로 받는다.
 * - Pointer Events가 있으면 그것을 쓴다 (iPadOS 13+, PC 브라우저)
 * - 없으면 Touch Events + 마우스 이벤트로 받는다 (아이패드 에어 1 = iOS 12 / Safari 12)
 * 터치로 받을 때는 touchmove를 막아야(preventDefault) 화면이 밀리거나 확대되지 않는다.
 */

export interface InputPoint {
  x: number; // clientX
  y: number; // clientY
}

export interface InputHandlers {
  /** 누르기 시작. false를 돌려주면 이 입력은 무시한다 */
  down(id: number, p: InputPoint): boolean;
  /** 이동. 한 이벤트 안에 여러 점이 올 수 있다 (getCoalescedEvents) */
  move(id: number, points: InputPoint[]): void;
  up(id: number, p: InputPoint): void;
  cancel(id: number): void;
}

export const hasPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;

/** 마우스는 손가락과 겹치지 않는 번호를 쓴다 */
const MOUSE_ID = -1;

export function attachInput(el: HTMLElement, h: InputHandlers): () => void {
  return hasPointerEvents ? attachPointer(el, h) : attachTouchAndMouse(el, h);
}

function attachPointer(el: HTMLElement, h: InputHandlers): () => void {
  const active = new Set<number>();
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (!h.down(e.pointerId, pt(e))) return;
    active.add(e.pointerId);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* 이미 사라진 포인터면 캡처 없이 진행 */
    }
  };
  const move = (e: PointerEvent) => {
    if (!active.has(e.pointerId)) return;
    const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    h.move(e.pointerId, (coalesced.length ? coalesced : [e]).map(pt));
  };
  const up = (e: PointerEvent) => {
    if (!active.delete(e.pointerId)) return;
    h.up(e.pointerId, pt(e));
  };
  const cancel = (e: PointerEvent) => {
    if (!active.delete(e.pointerId)) return;
    h.cancel(e.pointerId);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
  };
}

function attachTouchAndMouse(el: HTMLElement, h: InputHandlers): () => void {
  const active = new Set<number>();
  const opts: AddEventListenerOptions = { passive: false };

  const tStart = (e: TouchEvent) => {
    e.preventDefault(); // 화면 밀림·확대·길게 누르기 메뉴 막기
    for (const t of Array.from(e.changedTouches)) {
      if (h.down(t.identifier, pt(t))) active.add(t.identifier);
    }
  };
  const tMove = (e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (active.has(t.identifier)) h.move(t.identifier, [pt(t)]);
    }
  };
  const tEnd = (e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (active.delete(t.identifier)) h.up(t.identifier, pt(t));
    }
  };
  const tCancel = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (active.delete(t.identifier)) h.cancel(t.identifier);
    }
  };

  // 마우스: 누른 뒤에는 요소 밖으로 나가도 따라가도록 window에서 받는다
  const mMove = (e: MouseEvent) => {
    if (active.has(MOUSE_ID)) h.move(MOUSE_ID, [pt(e)]);
  };
  const mUp = (e: MouseEvent) => {
    window.removeEventListener('mousemove', mMove);
    window.removeEventListener('mouseup', mUp);
    if (active.delete(MOUSE_ID)) h.up(MOUSE_ID, pt(e));
  };
  const mDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (!h.down(MOUSE_ID, pt(e))) return;
    active.add(MOUSE_ID);
    window.addEventListener('mousemove', mMove);
    window.addEventListener('mouseup', mUp);
  };

  el.addEventListener('touchstart', tStart, opts);
  el.addEventListener('touchmove', tMove, opts);
  el.addEventListener('touchend', tEnd, opts);
  el.addEventListener('touchcancel', tCancel, opts);
  el.addEventListener('mousedown', mDown);
  return () => {
    el.removeEventListener('touchstart', tStart, opts);
    el.removeEventListener('touchmove', tMove, opts);
    el.removeEventListener('touchend', tEnd, opts);
    el.removeEventListener('touchcancel', tCancel, opts);
    el.removeEventListener('mousedown', mDown);
    window.removeEventListener('mousemove', mMove);
    window.removeEventListener('mouseup', mUp);
  };
}

function pt(e: { clientX: number; clientY: number }): InputPoint {
  return { x: e.clientX, y: e.clientY };
}

/** 누르는 순간을 알리는 이벤트 이름들 (애니메이션 멈추기 등에 쓴다) */
export const PRESS_START_EVENTS = hasPointerEvents ? ['pointerdown'] : ['touchstart', 'mousedown'];
