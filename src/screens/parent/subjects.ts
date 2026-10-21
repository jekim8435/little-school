/**
 * 부모 모드 > 과목 관리 (명세 8-4): 켜기/끄기, 위·아래 순서(드래그 대신 화살표 — iOS 12 호환),
 * 교환 비율·쌓인 별, ‘설정’ → 과목별 설정 페이지.
 */
import { findApp } from '../../apps/registry';
import { rewardStatus } from '../../core/rewards';
import type { SubjectSetting } from '../../core/storage';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { button } from '../../ui/components';
import { h } from '../../ui/dom';
import { parentPage, section, toggleSwitch } from './common';

export function subjectsScreen(shell: Shell): Screen {
  const { store, router } = shell;
  const list = h('div', { class: 'p-subjects' });

  const sorted = (): SubjectSetting[] =>
    store.data.settings.subjects.filter((s) => findApp(s.id)).sort((a, b) => a.order - b.order);

  const move = (id: string, dir: -1 | 1) => {
    const s = sorted();
    const i = s.findIndex((x) => x.id === id);
    const j = i + dir;
    if (j < 0 || j >= s.length) return;
    const tmp = s[i].order;
    s[i].order = s[j].order;
    s[j].order = tmp;
    // 순서 값이 겹쳐 있던 옛 데이터도 바로잡는다
    sorted().forEach((x, k) => (x.order = k));
    store.changed();
    render();
  };

  function render(): void {
    const s = sorted();
    list.replaceChildren(
      ...s.map((sub, i) => {
        const a = findApp(sub.id)!;
        const st = rewardStatus(store, sub.id);
        return h(
          'div',
          { class: `p-subject-card${sub.enabled ? '' : ' is-off'}` },
          h('img', { class: 'p-subject-icon', src: a.icon, alt: '' }),
          h(
            'div',
            { class: 'p-subject-info' },
            h('div', { class: 'p-subject-title' }, a.name),
            h('div', { class: 'p-help' }, `별 ${sub.starsPerSticker}개 = 스티커 1장 · 지금 ${st.doneToday ? '오늘 스티커 ✓' : `★ ${Math.min(st.stars, st.ratio)}/${st.ratio}`}`),
          ),
          toggleSwitch(sub.enabled, (on) => {
            sub.enabled = on;
            store.changed();
            render();
          }),
          h(
            'div',
            { class: 'p-order' },
            button('▲', () => move(sub.id, -1), { label: '위로', disabled: i === 0 }),
            button('▼', () => move(sub.id, 1), { label: '아래로', disabled: i === s.length - 1 }),
          ),
          button('설정', () => router.go({ name: 'parent', page: 'subject-settings', id: sub.id }), { kind: 'soft' }),
        );
      }),
    );
  }
  render();

  const el = parentPage(shell, '과목 관리', [
    section(null, h('p', { class: 'p-help' }, '꺼 둔 과목은 아이 허브에 보이지 않아요. 순서는 허브 타일 순서예요.'), list),
  ]);
  return { el };
}
