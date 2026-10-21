/** 전체 글자 미리보기 (개발 전용): 102자를 한 번에 보며 육안으로 검수한다 */
import '../../src/ui/styles.css';
import '../../src/apps/writing/style.css';
import './dev.css';
import { drawGuide, initialGuideState } from '../../src/shared/canvas/guide';
import { drawPracticeGrid } from '../../src/shared/canvas/stage';
import { getSources, loadGlyph } from '../../src/apps/writing/data/glyphs';
import { GROUPS } from '../../src/apps/writing/data/groups';
import type { Glyph, GlyphSource, GroupId } from '../../src/apps/writing/data/types';
import { h } from '../../src/ui/dom';

const THUMB = 150;

/** 편집기 초안이 있으면 초안을 보여준다 */
function sourcesOf(g: GroupId): { list: GlyphSource[]; draft: boolean } {
  try {
    const raw = localStorage.getItem(`wp.editor.draft.${g}`);
    if (raw) return { list: JSON.parse(raw), draft: true };
  } catch {
    /* 무시 */
  }
  return { list: getSources(g), draft: false };
}

function thumb(glyph: Glyph): HTMLCanvasElement {
  const dpr = window.devicePixelRatio || 1;
  const c = h('canvas', { class: 'pv-canvas', width: THUMB * dpr, height: THUMB * dpr });
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);
  drawPracticeGrid(ctx, THUMB);
  const state = initialGuideState(glyph);
  state.current = -1;
  drawGuide(ctx, THUMB, glyph, state);
  return c;
}

const sections = GROUPS.map((g) => {
  const { list, draft } = sourcesOf(g.id);
  const byId = new Map(list.map((s) => [s.id, s]));
  const cards = g.chars.map((ch) => {
    const src = byId.get(ch);
    if (!src) return h('div', { class: 'pv-card is-missing' }, h('div', { class: 'pv-missing' }, ch), '데이터 없음');
    let body: HTMLElement;
    try {
      body = thumb(loadGlyph(src));
    } catch (err) {
      body = h('div', { class: 'pv-missing' }, `오류: ${(err as Error).message}`);
    }
    return h(
      'a',
      { class: 'pv-card', href: `./editor.html#${g.id}/${encodeURIComponent(ch)}`, 'data-char': ch },
      body,
      h('div', { class: 'pv-label' }, h('b', {}, ch), ` ${src.name} · ${src.strokes.length}획`),
    );
  });
  const ready = g.chars.filter((c) => byId.has(c)).length;
  return h(
    'section',
    { class: 'pv-group' },
    h('h2', {}, `${g.name} `, h('small', {}, `${ready} / ${g.chars.length}자`), draft && h('span', { class: 'ed-badge' }, ' ● 편집기 초안')),
    h('div', { class: 'pv-grid' }, ...cards),
  );
});

const total = GROUPS.reduce((n, g) => n + g.chars.length, 0);
document.getElementById('app')!.append(
  h(
    'main',
    { class: 'preview' },
    h(
      'header',
      { class: 'ed-header' },
      h('h1', {}, `전체 글자 미리보기 (${total}자)`),
      h('span', { class: 'topbar-spacer' }),
      h('a', { class: 'btn ed-link', href: './editor.html' }, '편집기'),
      h('a', { class: 'btn ed-link', href: './' }, '앱으로'),
    ),
    h('p', { class: 'ed-help' }, '글자를 누르면 편집기에서 열립니다. 번호 원은 획 시작점, 흰 화살표는 획의 끝과 방향입니다.'),
    ...sections,
  ),
);
