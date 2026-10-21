type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

/** 간단한 DOM 생성 도우미. on으로 시작하는 속성은 이벤트로 붙인다 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'class') {
      el.className = String(v);
    } else {
      el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c);
  }
  return el;
}

export function backButton(onClick: () => void): HTMLButtonElement {
  return h('button', { class: 'btn btn-back', 'aria-label': '뒤로', onClick }, '◀ 뒤로');
}
