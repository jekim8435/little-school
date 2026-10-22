/**
 * 허브 (명세 5-2): 과목 타일 4열 × 2행 = 한 페이지 8과목. 8개를 넘으면 옆으로 넘기는 페이지.
 * 위쪽: 오늘 받은 스티커 수, 스티커판 버튼(지금 판 진행도, 보상 대기 판 수).
 * 오른쪽 위 모서리(80×80) 3초 길게 누르기 → 부모 잠금. 진행 표시는 하지 않는다(아이가 눈치채기 어렵게).
 */
import { apps, findApp } from '../apps/registry';
import type { AppEntry } from '../apps/types';
import { rewardStatus } from '../core/rewards';
import { usableSubjects } from '../core/entitlements';
import { visibleSubjects } from '../core/subjects';
import type { Screen } from '../router';
import type { Shell } from '../shell';
import { h } from '../ui/dom';
import { attachInput } from '../ui/input';
import { longPress } from '../ui/longPress';

const PER_PAGE = 8;
/** 이만큼 넘게 밀면 페이지를 넘긴다(px) */
const SWIPE = 60;
/** 이만큼 안 움직이고 떼면 누른 것으로 본다(px) */
const TAP = 12;

export function hubScreen(shell: Shell): Screen {
  const { store, audio, router, session } = shell;
  // 오늘 시간이 다 됐으면 타일이 잠긴 모양, 누르면 ‘오늘 공부 끝’ (명세 5-2)
  const locked = session.isTimeUp();
  const data = store.data;
  // 켜져 있고(부모 모드 과목 관리) 이용 권한이 있는(entitlements) 과목만
  const ids = usableSubjects(visibleSubjects(data.settings.subjects, apps.map((a) => a.id)));
  const entries = ids.map((id) => findApp(id)).filter((a): a is AppEntry => !!a);

  // ── 위쪽 줄 ──
  const today = data.days[store.today()];
  const todayStickers = today ? Object.keys(today.subjects).filter((k) => today.subjects[k].sticker).length : 0;
  const boards = data.rewards.boards;
  const current = boards[boards.length - 1];
  const waiting = boards.filter((b) => b.completedAt && !b.paidAt).length;

  const stickerButton = h(
    'button',
    { class: 'hub-board', type: 'button', 'aria-label': '스티커판', onClick: () => router.go({ name: 'stickers' }) },
    h('span', { class: 'hub-board-icon' }, '📒'),
    h('span', { class: 'hub-board-count' }, `${current.stickers.length}/${current.size}`),
    waiting ? h('span', { class: 'hub-gift' }, `🎁 ${waiting}`) : null,
  );
  const top = h(
    'div',
    { class: 'hub-top' },
    h('div', { class: 'hub-today' }, h('span', { class: 'hub-today-icon' }, '⭐'), `오늘 스티커 ${todayStickers}`),
    stickerButton,
  );

  // ── 과목 타일 ──
  const pages: HTMLElement[] = [];
  for (let i = 0; i < entries.length; i += PER_PAGE) {
    pages.push(h('div', { class: 'hub-page' }, ...entries.slice(i, i + PER_PAGE).map((e) => tile(e))));
  }
  const track = h('div', { class: 'hub-track' }, ...pages);
  const pager = h('div', { class: 'hub-pager' }, entries.length ? track : h('p', { class: 'hub-empty' }, '열린 과목이 없어요'));
  const dots = h('div', { class: 'hub-dots' });

  function tile(e: AppEntry): HTMLElement {
    const st = rewardStatus(store, e.id);
    const badge = st.doneToday ? '오늘 스티커 ✓' : `★ ${Math.min(st.stars, st.ratio)}/${st.ratio}`;
    return h(
      'div',
      { class: `hub-tile${st.doneToday ? ' is-done' : ''}${locked ? ' is-locked' : ''}`, 'data-app': e.id, role: 'button', 'aria-label': e.name, style: `background:${e.color}` },
      h('span', { class: 'hub-badge' }, badge),
      h('img', { class: 'hub-icon', src: e.icon, alt: '' }),
      h('span', { class: 'hub-name' }, e.name),
      locked ? h('span', { class: 'hub-lock' }, '🔒') : null,
    );
  }

  let page = 0;
  let opening = false;
  const setPage = (p: number, animate = true) => {
    page = Math.max(0, Math.min(pages.length - 1, p));
    track.style.transition = animate ? 'transform 0.3s' : 'none';
    track.style.transform = `translateX(${-page * 100}%)`;
    dots.replaceChildren(...(pages.length > 1 ? pages.map((_, i) => h('span', { class: `hub-dot${i === page ? ' is-on' : ''}` })) : []));
  };

  const open = (id: string) => {
    if (opening) return;
    opening = true;
    const el = track.querySelector(`[data-app="${id}"]`);
    if (el) el.classList.add('is-pressed');
    audio.sfx('tap');
    if (locked) {
      router.go({ name: 'done' });
      return;
    }
    if (audio.hasLine(`${id}.hub.name`)) audio.say(`${id}.hub.name`);
    // 누른 타일이 눌린 모양을 잠깐 보인 뒤 들어간다
    window.setTimeout(() => router.go({ name: 'app', id }), 180);
  };

  // 밀어서 페이지 넘기기 + 타일 누르기를 한 곳에서 받는다.
  // (터치에서 화면 밀림을 막으면 click이 생기지 않으므로 누르기도 직접 판정한다)
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let downId: number | null = null;
  const detachPager = attachInput(pager, {
    down(pid, p) {
      if (downId !== null) return false;
      downId = pid;
      startX = p.x;
      startY = p.y;
      dx = 0;
      track.style.transition = 'none';
      return true;
    },
    move(pid, pts) {
      if (pid !== downId || pages.length < 2) return;
      dx = pts[pts.length - 1].x - startX;
      // calc()를 transform 안에 쓰지 않는다(옛 Safari) — 페이지 폭을 px로 계산
      track.style.transform = `translateX(${-page * pager.clientWidth + dx}px)`;
    },
    up(pid, p) {
      if (pid !== downId) return;
      downId = null;
      const moved = Math.abs(p.x - startX) + Math.abs(p.y - startY);
      if (moved < TAP) {
        setPage(page);
        const hit = document.elementFromPoint(p.x, p.y);
        const t = hit && closest(hit, 'hub-tile');
        if (t) open(t.getAttribute('data-app')!);
        return;
      }
      setPage(dx < -SWIPE ? page + 1 : dx > SWIPE ? page - 1 : page);
    },
    cancel(pid) {
      if (pid !== downId) return;
      downId = null;
      setPage(page);
    },
  });

  // 부모 잠금 진입 (명세 5-2, 8-1)
  const corner = h('div', { class: 'hub-corner', 'aria-hidden': 'true' });
  const detachCorner = longPress(corner, 3000, () => router.go({ name: 'parent', page: 'gate' }));

  setPage(0, false);
  const el = h('div', { class: 'screen hub' }, top, pager, dots, corner);
  return {
    el,
    destroy() {
      detachPager();
      detachCorner();
    },
  };
}

function closest(el: Element, cls: string): Element | null {
  let cur: Element | null = el;
  while (cur && !cur.classList.contains(cls)) cur = cur.parentElement;
  return cur;
}
