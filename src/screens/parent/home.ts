/**
 * 부모 모드 홈 (명세 8-2): 오늘 요약, 보상 대기 알림, 마지막 백업, 메뉴.
 */
import { apps, findApp } from '../../apps/registry';
import { daysBetween } from '../../core/date';
import { rewardStatus, waitingBoards } from '../../core/rewards';
import type { Screen } from '../../router';
import type { Route } from '../../router';
import type { Shell } from '../../shell';
import { STRINGS } from '../../core/strings';
import { button, confirmDialog, toast } from '../../ui/components';
import { h } from '../../ui/dom';
import { pwa } from '../../platform/pwa';
import { formatMinutes, parentPage, section } from './common';

export function parentHomeScreen(shell: Shell): Screen {
  const { store, router, session } = shell;
  const data = store.data;
  const today = data.days[store.today()];
  const waiting = waitingBoards(store).length;

  // ── 알림 ──
  const alerts: HTMLElement[] = [];
  // 새 버전 (명세 11-2): 아이 화면에는 띄우지 않고 여기서만. 부모가 ‘업데이트’를 누르면 새로 연다
  const updateBox = h('div', {});
  const renderUpdate = () =>
    updateBox.replaceChildren(
      ...(pwa.needRefresh
        ? [h('div', { class: 'p-alert is-new' }, h('span', {}, '🆕 새 버전이 있어요'), button('업데이트', () => pwa.update(), { kind: 'primary' }))]
        : []),
    );
  renderUpdate();
  const offUpdate = pwa.onChange(renderUpdate);
  pwa.check(); // 부모 모드를 열 때마다 새 버전이 있는지 물어본다
  alerts.push(updateBox);
  if (waiting) {
    alerts.push(
      h(
        'div',
        { class: 'p-alert' },
        h('span', {}, `🎁 다 모은 스티커판 ${waiting}개가 보상을 기다려요`),
        button('보상 지급', () => router.go({ name: 'parent', page: 'rewards' }), { kind: 'primary' }),
      ),
    );
  }
  const last = data.lastBackupAt;
  const ago = last ? daysBetween(last, store.today()) : null;
  alerts.push(
    h(
      'div',
      { class: `p-alert is-soft${ago === null || ago >= 7 ? ' is-warn' : ''}` },
      h('span', {}, ago === null ? '💾 아직 백업한 적이 없어요' : `💾 마지막 백업: ${ago === 0 ? '오늘' : `${ago}일 전`}`),
      button('백업하기', () => router.go({ name: 'parent', page: 'backup' })),
    ),
  );

  // ── 오늘 요약 ──
  const used = session.usedMs();
  const limit = session.limitMs();
  const timeLine = h(
    'div',
    { class: 'p-today-time' },
    h('strong', {}, `오늘 ${formatMinutes(used)}`),
    h('span', { class: 'p-help' }, limit === Infinity ? ' / 제한 없음' : ` / ${formatMinutes(limit)}${session.isTimeUp() ? ' (오늘 끝)' : ''}`),
    limit === Infinity
      ? null
      : button('오늘 10분 더', () => {
          session.addToday(10);
          toast('오늘 10분을 더했어요');
          router.refresh();
        }),
  );
  const maxMs = Math.max(1, ...apps.map((a) => (today && today.subjects[a.id] ? today.subjects[a.id].ms : 0)));
  const rows = data.settings.subjects
    .filter((s) => findApp(s.id))
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const a = findApp(s.id)!;
      const ms = today && today.subjects[s.id] ? today.subjects[s.id].ms : 0;
      const st = rewardStatus(store, s.id);
      return h(
        'div',
        { class: `p-subject-row${s.enabled ? '' : ' is-off'}` },
        h('img', { src: a.icon, alt: '' }),
        h('span', { class: 'p-subject-name' }, a.name),
        h('span', { class: 'p-bar' }, h('span', { class: 'p-bar-fill', style: `width:${Math.round((ms / maxMs) * 100)}%;background:${a.color}` })),
        h('span', { class: 'p-subject-ms' }, formatMinutes(ms)),
        h('span', { class: 'p-subject-star' }, st.doneToday ? '오늘 스티커 ✓' : `★ ${Math.min(st.stars, st.ratio)}/${st.ratio}`),
      );
    });

  // ── 메뉴 ──
  const go = (r: Route) => () => router.go(r);
  const menu = h(
    'div',
    { class: 'p-menu' },
    button('📊 기록', go({ name: 'parent', page: 'records' })),
    button('📚 과목 관리', go({ name: 'parent', page: 'subjects' })),
    button('⚙️ 공통 설정', go({ name: 'parent', page: 'settings' })),
    button(`🎁 보상 지급${waiting ? ` (대기 ${waiting})` : ''}`, go({ name: 'parent', page: 'rewards' })),
    button('🏆 보상 기록', go({ name: 'parent', page: 'reward-history' })),
    button('💾 백업·복원', go({ name: 'parent', page: 'backup' })),
    button('🔒 아이 전용 잠금 안내', go({ name: 'parent', page: 'lock-guide' })),
    button('📱 기기 정보', go({ name: 'parent', page: 'device' })),
    button('ℹ️ 앱 정보', go({ name: 'parent', page: 'about' })),
    button(STRINGS.exit.menu, () => {
      void confirmDialog({ title: STRINGS.exit.confirmTitle, message: STRINGS.exit.confirmMessage, ok: STRINGS.exit.confirmOk }).then((ok) => {
        if (ok) shell.exitApp();
      });
    }),
  );

  const el = parentPage(shell, '부모 모드', [...alerts, section('오늘', timeLine, ...rows), section('메뉴', menu)], { isHome: true });
  return { el, destroy: offUpdate };
}
