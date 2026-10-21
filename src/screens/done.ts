/**
 * 오늘 공부 끝 (명세 5-5): 하루 학습 시간에 닿으면 진행 중인 한 판이 끝난 뒤 여기로 온다.
 * 다음 날(자정 기준) 저절로 풀리고, 부모 모드 ‘오늘 10분 더’로도 풀린다.
 * 부모가 들어갈 수 있게 허브와 같은 오른쪽 위 3초 길게 누르기 자리를 둔다.
 */
import { todayStickerCount } from '../core/rewards';
import type { Screen } from '../router';
import type { Shell } from '../shell';
import { button } from '../ui/components';
import { h } from '../ui/dom';
import { longPress } from '../ui/longPress';

/** 잠자는 달 그림 */
const MOON_SVG =
  '<svg viewBox="0 0 120 120" aria-hidden="true">' +
  '<path d="M78 18a44 44 0 1 0 24 70A38 38 0 0 1 78 18z" fill="#ffd23f" stroke="#2a2522" stroke-width="3"/>' +
  '<path d="M48 58q5 5 10 0M66 66q5 5 10 0" fill="none" stroke="#2a2522" stroke-width="3" stroke-linecap="round"/>' +
  '<path d="M58 80q6 4 12 0" fill="none" stroke="#2a2522" stroke-width="3" stroke-linecap="round"/>' +
  '<text x="92" y="30" font-size="16" font-weight="700" fill="#4a90e2">z</text><text x="102" y="18" font-size="12" font-weight="700" fill="#4a90e2">z</text>' +
  '</svg>';

export function doneScreen(shell: Shell): Screen {
  const { store, audio, router, session } = shell;
  const timeUp = session.isTimeUp();
  if (timeUp) audio.say('shell.done.bye');

  const art = h('div', { class: 'done-art' });
  art.innerHTML = MOON_SVG;
  const corner = h('div', { class: 'hub-corner', 'aria-hidden': 'true' });
  const detach = longPress(corner, 3000, () => router.go({ name: 'parent', page: 'gate' }));

  const el = h(
    'div',
    { class: 'screen done center' },
    art,
    h('h1', { class: 'done-title' }, '오늘 공부 끝!'),
    h('p', { class: 'done-sub' }, '내일 또 만나요'),
    h('p', { class: 'done-count' }, `⭐ 오늘 받은 스티커 ${todayStickerCount(store)}장`),
    h(
      'div',
      { class: 'row' },
      button('스티커판 보기', () => router.go({ name: 'stickers' }), { kind: 'soft', big: true }),
      // 시간이 풀렸으면(다음 날, 10분 더) 다시 공부하러 갈 수 있다
      timeUp ? null : button('공부하러 가기', () => router.go({ name: 'hub' }), { kind: 'primary', big: true }),
    ),
    corner,
  );
  return { el, destroy: detach };
}
