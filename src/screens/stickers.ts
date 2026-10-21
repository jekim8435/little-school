/**
 * 스티커판 (명세 5-4): 보상을 기다리는 완성 판(오래된 순) + 지금 모으는 판을 가로 슬라이드로.
 * 처음 열면 맨 오른쪽 ‘지금 판’. 오른쪽으로 밀면 이전 판. 화면 밖 판은 앞뒤 1장까지만 그린다(에어1 메모리).
 * 보상 기록(#/stickers/history)은 보상을 받은 판을 최신순 카드로 (읽기 전용).
 */
import { apps, findApp } from '../apps/registry';
import { formatDay } from '../core/date';
import { currentBoard, paidBoards, rewardStatus, waitingBoards } from '../core/rewards';
import type { Board } from '../core/storage';
import { visibleSubjects } from '../core/subjects';
import type { Screen } from '../router';
import type { Shell } from '../shell';
import { boardGrid } from '../ui/board';
import { button } from '../ui/components';
import { h } from '../ui/dom';
import { attachInput } from '../ui/input';

const SWIPE = 60;

export function stickersScreen(shell: Shell): Screen {
  const { store, router, audio } = shell;
  const slides: Board[] = waitingBoards(store).concat([currentBoard(store)]);
  let index = slides.length - 1;

  const viewport = h('div', { class: 'stk-viewport' });
  const track = h('div', { class: 'stk-track' });
  const slots = slides.map(() => h('div', { class: 'stk-slot' }));
  track.append(...slots);
  viewport.append(track);
  const dots = h('div', { class: 'hub-dots' });

  const prevBtn = button('', () => go(index - 1), { kind: 'soft', big: true, icon: '◀', label: '이전 판', className: 'stk-arrow' });
  const nextBtn = button('', () => go(index + 1), { kind: 'soft', big: true, icon: '▶', label: '다음 판', className: 'stk-arrow' });

  function slide(b: Board, isCurrent: boolean): HTMLElement {
    const head = h(
      'div',
      { class: 'stk-head' },
      h('span', { class: 'stk-title' }, `${b.no}번째 스티커판`),
      h('span', { class: 'stk-date' }, b.completedAt ? `다 모은 날 ${formatDay(b.completedAt)}` : `시작한 날 ${formatDay(b.startedAt)}`),
    );
    const card = h('div', { class: `stk-card${b.completedAt ? ' is-complete' : ''}` }, head, boardGrid(b));
    if (b.completedAt) card.append(h('div', { class: 'stk-ribbon' }, '🎁 보상을 기다리고 있어요'));
    if (isCurrent) card.append(todayRow());
    return card;
  }

  /** 지금 판 아래: 과목별 오늘 상태 (과목 아이콘 + ★ 2/3 또는 ✓) */
  function todayRow(): HTMLElement {
    const ids = visibleSubjects(store.data.settings.subjects, apps.map((a) => a.id));
    return h(
      'div',
      { class: 'stk-today' },
      ...ids.map((id) => {
        const a = findApp(id)!;
        const st = rewardStatus(store, id);
        return h(
          'span',
          { class: `stk-today-item${st.doneToday ? ' is-done' : ''}` },
          h('img', { src: a.icon, alt: '' }),
          st.doneToday ? '✓' : `★ ${Math.min(st.stars, st.ratio)}/${st.ratio}`,
        );
      }),
    );
  }

  function render(animate: boolean): void {
    slots.forEach((slot, i) => {
      const near = Math.abs(i - index) <= 1;
      if (near && !slot.firstChild) slot.append(slide(slides[i], i === slides.length - 1));
      if (!near && slot.firstChild) slot.replaceChildren();
    });
    track.style.transition = animate ? 'transform 0.3s' : 'none';
    track.style.transform = `translateX(${-index * 100}%)`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;
    dots.replaceChildren(...(slides.length > 1 ? slides.map((_, i) => h('span', { class: `hub-dot${i === index ? ' is-on' : ''}` })) : []));
  }

  function go(i: number): void {
    const to = Math.max(0, Math.min(slides.length - 1, i));
    if (to !== index) audio.sfx('tap');
    index = to;
    render(true);
  }

  // 손가락으로 밀기
  let startX = 0;
  let dx = 0;
  let downId: number | null = null;
  const detach = attachInput(viewport, {
    down(id, p) {
      if (downId !== null || slides.length < 2) return false;
      downId = id;
      startX = p.x;
      dx = 0;
      track.style.transition = 'none';
      return true;
    },
    move(id, pts) {
      if (id !== downId) return;
      dx = pts[pts.length - 1].x - startX;
      track.style.transform = `translateX(${-index * viewport.clientWidth + dx}px)`;
    },
    up(id) {
      if (id !== downId) return;
      downId = null;
      // 오른쪽으로 밀면(dx > 0) 이전 판
      go(dx > SWIPE ? index - 1 : dx < -SWIPE ? index + 1 : index);
    },
    cancel(id) {
      if (id !== downId) return;
      downId = null;
      render(true);
    },
  });

  render(false);
  const el = h(
    'div',
    { class: 'screen stickers' },
    h(
      'div',
      { class: 'stk-bar' },
      button('', () => router.go({ name: 'hub' }), { icon: '🏠', label: '집으로', className: 'home-button' }),
      h('h1', { class: 'stk-bar-title' }, '스티커판'),
      button('보상 기록', () => router.go({ name: 'sticker-history' }), { kind: 'soft' }),
    ),
    h('div', { class: 'stk-body' }, prevBtn, viewport, nextBtn),
    dots,
  );
  return { el, destroy: detach };
}

export function stickerHistoryScreen(shell: Shell): Screen {
  const { store, router } = shell;
  const boards = paidBoards(store);
  const list = h(
    'div',
    { class: 'hist-list' },
    ...boards.map((b) =>
      h(
        'div',
        { class: 'hist-card' },
        h('div', { class: 'hist-title' }, `${b.no}번째 판`),
        boardGrid(b, { mini: true }),
        h('div', { class: 'hist-reward' }, `🎁 ${b.rewardText || ''}`),
        h('div', { class: 'hist-dates' }, `다 모은 날 ${formatDay(b.completedAt!)}`, h('br'), `보상 받은 날 ${formatDay(b.paidAt!)}`),
      ),
    ),
  );
  const el = h(
    'div',
    { class: 'screen stickers' },
    h(
      'div',
      { class: 'stk-bar' },
      button('', () => router.go({ name: 'stickers' }), { icon: '◀', label: '스티커판으로', className: 'home-button' }),
      h('h1', { class: 'stk-bar-title' }, '보상 기록'),
      h('span', { class: 'stk-bar-space' }),
    ),
    boards.length ? list : h('p', { class: 'hub-empty' }, '아직 받은 보상이 없어요'),
  );
  return { el };
}
