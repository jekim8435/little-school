/**
 * 부모 모드 > 기록 (명세 8-3)
 * - 최근 7일 날짜별 학습 시간·받은 스티커 수 (SVG 막대). 날짜를 누르면 그날 과목별 상세
 * - 과목별 ‘자주 틀린 문제’ 상위 5개 (log.record의 item 기준 오답 수)
 */
import { findApp } from '../../apps/registry';
import { addDays, formatDay } from '../../core/date';
import type { DayRecord, LogEntry } from '../../core/storage';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { h } from '../../ui/dom';
import { formatMinutes, parentPage, section } from './common';

const SVG_NS = 'http://www.w3.org/2000/svg';

function dayTotal(day: DayRecord | undefined): { ms: number; stickers: number } {
  let ms = 0;
  let stickers = 0;
  if (day) {
    for (const k of Object.keys(day.subjects)) {
      ms += day.subjects[k].ms;
      if (day.subjects[k].sticker) stickers += 1;
    }
  }
  return { ms, stickers };
}

/** 오답 수가 많은 문제 상위 n개 (같으면 최근에 틀린 것 먼저) */
export function topWrong(logs: LogEntry[], n = 5): { item: string; wrong: number; total: number }[] {
  const map: Record<string, { item: string; wrong: number; total: number; last: number }> = {};
  for (const e of logs) {
    const m = map[e.item] || (map[e.item] = { item: e.item, wrong: 0, total: 0, last: 0 });
    m.total += 1;
    if (!e.correct) {
      m.wrong += 1;
      m.last = Math.max(m.last, e.t);
    }
  }
  return Object.keys(map)
    .map((k) => map[k])
    .filter((m) => m.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.last - a.last)
    .slice(0, n)
    .map(({ item, wrong, total }) => ({ item, wrong, total }));
}

export function recordsScreen(shell: Shell): Screen {
  const { store } = shell;
  const today = store.today();
  const keys = [6, 5, 4, 3, 2, 1, 0].map((i) => addDays(today, -i));
  const totals = keys.map((k) => dayTotal(store.data.days[k]));
  const max = Math.max(10 * 60000, ...totals.map((t) => t.ms));
  let selected = today;
  const detail = h('div', { class: 'p-day-detail' });

  // ── 7일 막대 (SVG 직접 그림) ──
  const W = 700;
  const H = 220;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'p-chart');
  const bars: SVGRectElement[] = [];
  keys.forEach((k, i) => {
    const x = 20 + i * 96;
    const t = totals[i];
    const bh = Math.round((t.ms / max) * 130);
    const g = document.createElementNS(SVG_NS, 'g');
    const hit = document.createElementNS(SVG_NS, 'rect'); // 누르기 쉬운 넓은 영역
    hit.setAttribute('x', String(x - 8));
    hit.setAttribute('y', '0');
    hit.setAttribute('width', '88');
    hit.setAttribute('height', String(H));
    hit.setAttribute('fill', 'transparent');
    const bar = document.createElementNS(SVG_NS, 'rect');
    bar.setAttribute('x', String(x + 12));
    bar.setAttribute('y', String(170 - bh));
    bar.setAttribute('width', '48');
    bar.setAttribute('height', String(Math.max(2, bh)));
    bar.setAttribute('rx', '6');
    bars.push(bar);
    const label = (y: number, text: string, cls: string) => {
      const tx = document.createElementNS(SVG_NS, 'text');
      tx.setAttribute('x', String(x + 36));
      tx.setAttribute('y', String(y));
      tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('class', cls);
      tx.textContent = text;
      return tx;
    };
    g.append(
      hit,
      bar,
      label(162 - bh, formatMinutes(t.ms), 'p-chart-value'),
      label(192, k === today ? '오늘' : formatDay(k).replace('월 ', '/').replace('일', ''), 'p-chart-day'),
      label(214, t.stickers ? `⭐${t.stickers}` : '', 'p-chart-sticker'),
    );
    g.addEventListener('click', () => {
      selected = k;
      renderDetail();
    });
    svg.append(g);
  });

  function renderDetail(): void {
    keys.forEach((k, i) => bars[i].setAttribute('class', k === selected ? 'p-chart-bar is-on' : 'p-chart-bar'));
    const day = store.data.days[selected];
    const ids = day ? Object.keys(day.subjects) : [];
    detail.replaceChildren(
      h('h3', { class: 'p-day-title' }, `${formatDay(selected)} 과목별`),
      ids.length
        ? h(
            'div',
            {},
            ...ids.map((id) => {
              const s = day!.subjects[id];
              const a = findApp(id);
              return h(
                'div',
                { class: 'p-subject-row' },
                a ? h('img', { src: a.icon, alt: '' }) : null,
                h('span', { class: 'p-subject-name' }, a ? a.name : id),
                h('span', { class: 'p-subject-ms' }, formatMinutes(s.ms)),
                h('span', { class: 'p-subject-star' }, `별 ${s.stars}개${s.sticker ? ' · 스티커 ✓' : ''}`),
              );
            }),
          )
        : h('p', { class: 'p-help' }, '이날은 공부한 기록이 없어요'),
    );
  }
  renderDetail();

  // ── 자주 틀린 문제 ──
  const wrongBlocks = Object.keys(store.data.logs)
    .filter((id) => findApp(id))
    .map((id) => {
      const top = topWrong(store.data.logs[id]);
      const a = findApp(id)!;
      return h(
        'div',
        { class: 'p-wrong' },
        h('div', { class: 'p-wrong-title' }, h('img', { src: a.icon, alt: '' }), a.name),
        top.length
          ? h('ol', { class: 'p-wrong-list' }, ...top.map((w) => h('li', {}, h('strong', {}, w.item), ` 틀림 ${w.wrong}번 / ${w.total}번`)))
          : h('p', { class: 'p-help' }, '틀린 문제가 없어요'),
      );
    });

  const el = parentPage(shell, '기록', [
    section('최근 7일 (막대를 누르면 그날 상세)', svg, detail),
    section('자주 틀린 문제', ...(wrongBlocks.length ? wrongBlocks : [h('p', { class: 'p-help' }, '아직 기록이 없어요')])),
  ]);
  return { el };
}
