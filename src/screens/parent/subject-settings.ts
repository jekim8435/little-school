/**
 * 부모 모드 > 과목별 설정 페이지 (명세 8-5). 화면 코드는 하나이고 과목의 settingsSchema를 읽어 자동으로 그린다.
 * 1. 제목  2. 보상(교환 비율, 껍데기 공통)  3. 과목 설정(group별)  4. 기본값으로 되돌리기·과목 진도 초기화
 * 바꾸는 즉시 apps.<id>.settings에 저장. 아이가 과목을 열 때 ctx.settings로 전달된다.
 */
import { findApp } from '../../apps/registry';
import type { SettingField, SettingValue } from '../../apps/types';
import { resolveSettings } from '../../core/ctx';
import { rewardStatus } from '../../core/rewards';
import { subjectSetting } from '../../core/subjects';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { button, confirmDialog, toast } from '../../ui/components';
import { h } from '../../ui/dom';
import { parentPage, section, segmented, settingRow, toggleSwitch } from './common';

export function subjectSettingsScreen(shell: Shell, appId: string): Screen {
  const { store, router } = shell;
  const entry = findApp(appId);
  const sub = subjectSetting(store.data.settings.subjects, appId);
  const back = { name: 'parent' as const, page: 'subjects' as const };
  if (!entry || !sub) {
    return { el: parentPage(shell, '과목 설정', [h('p', { class: 'p-help' }, '없는 과목이에요')], { back }) };
  }

  const holder = h('div', {}, h('p', { class: 'p-help' }, '불러오는 중…'));
  let destroyed = false;

  const save = (key: string, value: SettingValue) => {
    store.app(appId).settings[key] = Array.isArray(value) ? value.slice() : value;
    store.changed();
    toast('저장했어요', 1000);
  };

  // ── 보상 (모든 과목 공통) ──
  const st = rewardStatus(store, appId);
  const reward = section(
    '보상',
    settingRow(
      '별 교환 비율',
      segmented<number>(
        [3, 5, 10].map((v) => ({ value: v, label: `${v}개` })),
        sub.starsPerSticker,
        (v) => {
          sub.starsPerSticker = v as 3 | 5 | 10;
          store.changed();
          toast('저장했어요', 1000);
        },
      ),
      `별이 이만큼 모이면 스티커 1장으로 바꿔요. 지금 쌓인 별 ★ ${st.stars}개${st.doneToday ? ' (오늘 스티커 받음)' : ''}`,
    ),
  );

  function fieldControl(f: SettingField, value: SettingValue): Node {
    if (f.type === 'toggle') return toggleSwitch(value as boolean, (v) => save(f.key, v));
    if (f.type === 'select') {
      if (f.options.length <= 4) return segmented(f.options, value as string | number, (v) => save(f.key, v));
      // 선택지가 5개 이상이면 목록 선택
      const sel = h('select', { class: 'p-select' }, ...f.options.map((o) => h('option', { value: String(o.value) }, o.label)));
      sel.value = String(value);
      sel.addEventListener('change', () => {
        const o = f.options.filter((x) => String(x.value) === sel.value)[0];
        if (o) save(f.key, o.value);
      });
      return sel;
    }
    // multi: 판 모양으로, 누를 때마다 선택/해제. actions가 있으면 판 위에 편의 버튼
    let cur = (value as string[]).slice();
    const grid = h('div', { class: 'p-multi', style: `--cols:${f.columns || 6}` });
    const renderGrid = () => {
      grid.replaceChildren(
        ...f.options.map((o) =>
          h(
            'button',
            {
              class: `p-multi-cell${cur.indexOf(o.value) >= 0 ? ' is-on' : ''}`,
              type: 'button',
              onClick: () => {
                cur = cur.indexOf(o.value) >= 0 ? cur.filter((x) => x !== o.value) : cur.concat([o.value]);
                save(f.key, cur);
                renderGrid();
              },
            },
            o.label,
          ),
        ),
      );
    };
    renderGrid();
    const actions = (f.actions || []).map((a) =>
      button(a.label, () => {
        const allowed = f.options.map((o) => o.value);
        cur = a.run(cur.slice()).filter((x) => allowed.indexOf(x) >= 0);
        save(f.key, cur);
        renderGrid();
      }),
    );
    return h('div', { class: 'p-multi-wrap' }, actions.length ? h('div', { class: 'row wrap p-multi-actions' }, ...actions) : null, grid);
  }

  entry.load().then(
    (m) => {
      if (destroyed) return;
      const schema = m.default.settingsSchema || [];
      const values = resolveSettings(schema, store.app(appId).settings);
      // group별로 묶어 차례로 (처음 나온 순서)
      const groups: { name: string; fields: SettingField[] }[] = [];
      for (const f of schema) {
        const name = f.group || '과목 설정';
        let g = groups.filter((x) => x.name === name)[0];
        if (!g) groups.push((g = { name, fields: [] }));
        g.fields.push(f);
      }
      holder.replaceChildren(
        ...(groups.length
          ? groups.map((g) =>
              section(
                g.name,
                ...g.fields.map((f) =>
                  f.type === 'multi'
                    ? h('div', { class: 'p-row is-block' }, h('div', { class: 'p-row-label' }, h('div', {}, f.label), f.help ? h('div', { class: 'p-help' }, f.help) : null), fieldControl(f, values[f.key]))
                    : settingRow(f.label, fieldControl(f, values[f.key]), f.help),
                ),
              ),
            )
          : [section('과목 설정', h('p', { class: 'p-help' }, '이 과목은 따로 설정할 것이 없어요'))]),
      );
    },
    (e) => {
      if (!destroyed) holder.replaceChildren(h('p', { class: 'p-help' }, `과목 설정을 불러오지 못했어요: ${e instanceof Error ? e.message : e}`));
    },
  );

  const resets = section(
    null,
    h(
      'div',
      { class: 'row wrap' },
      button('기본값으로 되돌리기', () => {
        void confirmDialog({ message: `${entry.name}의 과목 설정을 모두 기본값으로 되돌릴까요?`, ok: '되돌리기' }).then((ok) => {
          if (!ok) return;
          store.app(appId).settings = {};
          store.changed();
          toast('기본값으로 되돌렸어요');
          router.refresh();
        });
      }),
      button('과목 진도 초기화', () => {
        void confirmDialog({ message: `${entry.name}의 진도를 처음부터 다시 시작할까요?\n(별·스티커·기록은 그대로예요)`, ok: '초기화', danger: true })
          .then((ok) => (ok ? confirmDialog({ title: '한 번 더 확인', message: '정말 진도를 지울까요? 되돌릴 수 없어요.', ok: '지우기', danger: true }) : false))
          .then((ok) => {
            if (!ok) return;
            store.app(appId).data = {};
            store.changed();
            toast('진도를 초기화했어요');
          });
      }, { className: 'btn-danger-text' }),
    ),
  );

  const title = h('span', { class: 'p-title-with-icon' }, h('img', { src: entry.icon, alt: '' }), `${entry.name} 설정`);
  const el = parentPage(shell, '', [reward, holder, resets], { back });
  const t = el.querySelector('.parent-title');
  if (t) t.replaceChildren(title);
  return {
    el,
    destroy: () => {
      destroyed = true;
    },
  };
}
