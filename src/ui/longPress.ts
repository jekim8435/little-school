import { attachInput } from './input';

/**
 * ms 동안 계속 누르고 있어야 onDone을 부른다. 짧게 떼면 onShort (부모 잠금 진입 등, 명세 5-2).
 * 그만 들을 때 쓰는 함수를 돌려준다.
 */
export function longPress(el: HTMLElement, ms: number, onDone: () => void, onShort?: () => void): () => void {
  let timer = 0;
  let pressing: number | null = null;
  el.style.setProperty('--press-ms', `${ms}ms`);

  const stop = () => {
    clearTimeout(timer);
    pressing = null;
    el.classList.remove('is-pressing');
  };

  const detach = attachInput(el, {
    down: (id) => {
      if (pressing !== null) return false;
      pressing = id;
      el.classList.add('is-pressing');
      timer = window.setTimeout(() => {
        stop();
        onDone();
      }, ms);
      return true;
    },
    move: () => {},
    up: (id) => {
      if (id !== pressing) return;
      stop();
      onShort?.();
    },
    cancel: (id) => {
      if (id === pressing) stop();
    },
  });
  return () => {
    stop();
    detach();
  };
}
