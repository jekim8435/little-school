/**
 * 부모 모드 ‘앱 종료하기’ (2026-10-22 부모 요청).
 * 기록을 바로 저장하고 과목·소리를 멈춘 뒤 앱을 닫아 본다(src/platform). 닫히지 않으면(웹앱 대부분)
 * 아이가 아무것도 할 수 없는 ‘종료됨’ 화면을 덮고 기기별로 마저 닫는 방법을 보여 준다.
 * 다시 열기는 3초 길게 누르기(아이가 우연히 열지 않게).
 */
import { STRINGS } from '../core/strings';
import { platform } from '../platform';
import { h } from './dom';
import { longPress } from './longPress';

export function exitApp(opts: { beforeExit(): void; onReopen(): void }): void {
  opts.beforeExit();
  void platform.tryExitApp().then((closed) => {
    if (closed) return;
    const t = STRINGS.exit;
    const steps = platform.guideDevice() === 'galaxy' ? t.howGalaxy : t.howIpad;
    const reopen = h('div', { class: 'exit-reopen', role: 'button' }, t.reopen);
    const el = h(
      'div',
      { class: 'exit-screen' },
      h('div', { class: 'exit-title' }, t.closedTitle),
      h('div', { class: 'exit-how' }, t.howTo),
      h('ul', { class: 'exit-steps' }, ...steps.map((s) => h('li', {}, s))),
      reopen,
    );
    const detach = longPress(reopen, 3000, () => {
      detach();
      el.remove();
      opts.onReopen();
    });
    document.body.append(el);
  });
}
