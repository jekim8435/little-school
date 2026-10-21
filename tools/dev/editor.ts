/**
 * 획 데이터 편집기 (개발 전용, 배포 빌드에는 들어가지 않는다)
 * - 글자 미리보기(§5.1 스타일)와 획순 애니메이션
 * - 점 드래그·추가·삭제, 획 순서 바꾸기·방향 뒤집기·삭제
 * - 마우스로 그려서 새 획 만들기
 * - 그룹 JSON 내보내기 (클립보드 / 파일)
 */
import '../../src/ui/styles.css';
import '../../src/apps/writing/style.css';
import './dev.css';
import { GuideView } from '../../src/shared/canvas/guideView';
import { WritingStage } from '../../src/shared/canvas/stage';
import { getSources, loadGlyph } from '../../src/apps/writing/data/glyphs';
import { GROUPS } from '../../src/apps/writing/data/groups';
import { samplePath } from '../../src/apps/writing/data/svgPath';
import type { GlyphSource, GroupId, Point, StrokeSource } from '../../src/apps/writing/data/types';
import { pathLength } from '../../src/shared/judge/resample';
import { h } from '../../src/ui/dom';
import { formatGroupJson, roundPoint, segDist, simplifyDrawn, simplifySampled } from './format';

const DRAFT_KEY = (g: GroupId) => `wp.editor.draft.${g}`;
const HIT_POINT = 3;
const HIT_STROKE = 6.5;

// ── 상태 ──────────────────────────────────────────────

let group: GroupId = 'consonant';
let sources: GlyphSource[] = [];
let idx = 0;
let selStroke: number | null = null;
let selPoint: number | null = null;
let mode: 'edit' | 'draw' = 'edit';
let history: string[] = [];
let dragging = false;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const glyphSrc = () => sources[idx];

function loadGroup(g: GroupId, glyphId?: string): void {
  group = g;
  const draft = readDraft(g);
  sources = draft ?? clone(getSources(g));
  idx = Math.max(0, glyphId ? sources.findIndex((s) => s.id === glyphId) : 0);
  history = [];
  select(null, null);
  renderAll();
}

function readDraft(g: GroupId): GlyphSource[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(g));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 변경 직전에 부른다 (되돌리기용) */
function snapshot(): void {
  history.push(JSON.stringify(sources));
  if (history.length > 100) history.shift();
}

/** 변경 후에 부른다: 초안 저장 + 다시 그리기 */
function commit(): void {
  try {
    localStorage.setItem(DRAFT_KEY(group), JSON.stringify(sources));
  } catch {
    /* 저장 공간 부족 등 */
  }
  renderAll();
}

function undo(): void {
  const prev = history.pop();
  if (!prev) return;
  sources = JSON.parse(prev);
  select(null, null);
  commit();
}

function isDirty(): boolean {
  return JSON.stringify(sources) !== JSON.stringify(getSources(group));
}

function select(stroke: number | null, point: number | null): void {
  selStroke = stroke;
  selPoint = point;
}

/** 경로 획이면 편집할 수 있게 점열로 바꾼다 */
function ensurePoints(s: StrokeSource): Point[] {
  if (!s.points) {
    s.points = simplifySampled(samplePath(s.path!));
    delete s.path;
  }
  return s.points;
}

function strokePoints(s: StrokeSource): Point[] {
  return s.points ?? samplePath(s.path!);
}

// ── 화면 ──────────────────────────────────────────────

const stage = new WritingStage();
stage.enabled = false;
const overlay = h('canvas', { class: 'stage-layer editor-overlay' });
stage.el.append(overlay);
let guide: GuideView;

const groupSelect = h(
  'select',
  {
    class: 'ed-select',
    onChange: () => loadGroup(groupSelect.value as GroupId),
  },
  ...GROUPS.map((g) => h('option', { value: g.id }, `${g.name} (${g.chars.length})`)),
);
const glyphList = h('div', { class: 'ed-glyphs' });
const nameInput = h('input', { class: 'ed-input', onInput: () => updateField('name', nameInput.value) });
const speakInput = h('input', { class: 'ed-input', onInput: () => updateField('speak', speakInput.value) });
const strokeList = h('ol', { class: 'ed-strokes' });
const status = h('div', { class: 'ed-status' });
const modeButton = h('button', { class: 'btn', onClick: () => setMode(mode === 'edit' ? 'draw' : 'edit') });
const dirtyBadge = h('span', { class: 'ed-badge' });

function updateField(key: 'name' | 'speak', value: string): void {
  glyphSrc()[key] = value;
  commit();
}

function setMode(m: 'edit' | 'draw'): void {
  mode = m;
  stage.enabled = m === 'draw';
  stage.el.classList.toggle('is-drawing', m === 'draw');
  renderAll();
}

function flash(msg: string): void {
  status.textContent = msg;
  status.classList.add('is-visible');
  window.setTimeout(() => status.classList.remove('is-visible'), 2500);
}

function renderAll(): void {
  groupSelect.value = group;
  dirtyBadge.textContent = isDirty() ? '● 수정됨 (초안 저장됨, 아직 내보내지 않음)' : '';

  glyphList.replaceChildren(
    ...sources.map((s, i) =>
      h(
        'button',
        {
          class: `tile ed-tile${i === idx ? ' is-selected' : ''}`,
          'data-char': s.id,
          onClick: () => {
            idx = i;
            select(null, null);
            renderAll();
          },
        },
        s.id,
      ),
    ),
  );

  const src = glyphSrc();
  if (!src) return;
  location.hash = `${group}/${encodeURIComponent(src.id)}`;
  if (document.activeElement !== nameInput) nameInput.value = src.name;
  if (document.activeElement !== speakInput) speakInput.value = src.speak;

  strokeList.replaceChildren(
    ...src.strokes.map((s, i) => {
      const n = src.strokes.length;
      const act = (label: string, title: string, fn: () => void, disabled = false) =>
        h(
          'button',
          {
            class: 'btn ed-mini',
            title,
            disabled,
            onClick: (e: Event) => {
              e.stopPropagation();
              snapshot();
              fn();
              commit();
            },
          },
          label,
        );
      return h(
        'li',
        {
          class: `ed-stroke${i === selStroke ? ' is-selected' : ''}`,
          onClick: () => {
            select(i, null);
            renderAll();
          },
        },
        h('span', { class: 'ed-num' }, String(i + 1)),
        h(
          'span',
          { class: 'ed-info' },
          s.type === 'dot' ? '점 획' : s.path ? '곡선 경로' : `점 ${s.points!.length}개`,
          ` · 길이 ${Math.round(pathLength(strokePoints(s)))}`,
        ),
        act('▲', '앞으로', () => swap(i, i - 1), i === 0),
        act('▼', '뒤로', () => swap(i, i + 1), i === n - 1),
        act('⇄', '방향 뒤집기', () => ensurePoints(s).reverse()),
        act('•', '점 획(dot) 켜기/끄기', () => toggleDot(s)),
        act('✕', '획 삭제', () => {
          src.strokes.splice(i, 1);
          select(null, null);
        }),
      );
    }),
  );

  modeButton.textContent = mode === 'draw' ? '✋ 편집 모드로' : '✏️ 그려서 획 추가';
  guide.setGlyph(loadGlyph(src));
  guide.showAnswer();
  renderOverlay();
}

function swap(a: number, b: number): void {
  const strokes = glyphSrc().strokes;
  [strokes[a], strokes[b]] = [strokes[b], strokes[a]];
  select(b, null);
}

function toggleDot(s: StrokeSource): void {
  if (s.type === 'dot') {
    delete s.type;
  } else {
    const p = strokePoints(s)[0];
    s.type = 'dot';
    s.points = [roundPoint(p)];
    delete s.path;
  }
}

function renderOverlay(): void {
  const size = stage.el.clientWidth;
  const dpr = window.devicePixelRatio || 1;
  overlay.width = Math.round(size * dpr);
  overlay.height = Math.round(size * dpr);
  const ctx = overlay.getContext('2d')!;
  ctx.setTransform((dpr * size) / 100, 0, 0, (dpr * size) / 100, 0, 0);
  ctx.clearRect(0, 0, 100, 100);
  if (mode === 'draw') return;

  glyphSrc().strokes.forEach((s, i) => {
    const selected = i === selStroke;
    const pts = strokePoints(s);
    if (selected) {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    // 경로 획은 샘플 점이 많아 옅게만 표시한다 (드래그하면 점열로 바뀐다)
    const r = selected ? 1.5 : s.path ? 0.5 : 1;
    pts.forEach(([x, y], k) => {
      ctx.beginPath();
      ctx.arc(x, y, selected && k === selPoint ? 2.2 : r, 0, Math.PI * 2);
      ctx.fillStyle = selected && k === selPoint ? '#f97316' : selected ? '#2563eb' : 'rgba(37,99,235,0.45)';
      ctx.fill();
    });
  });
}

// ── 포인터 (편집 모드) ────────────────────────────────

function toPoint(e: PointerEvent): Point {
  const r = stage.el.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100];
}

function hitPoint(p: Point): [number, number] | null {
  const strokes = glyphSrc().strokes;
  const order = strokes.map((_, i) => i);
  if (selStroke !== null) order.unshift(selStroke); // 선택한 획을 먼저 본다
  for (const i of order) {
    const pts = strokePoints(strokes[i]);
    let best = -1;
    let bestD = HIT_POINT;
    pts.forEach((q, k) => {
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    if (best >= 0) return [i, best];
  }
  return null;
}

function hitStroke(p: Point): number | null {
  const strokes = glyphSrc().strokes;
  let best: number | null = null;
  let bestD = HIT_STROKE;
  strokes.forEach((s, i) => {
    const pts = strokePoints(s);
    for (let k = 0; k < pts.length; k++) {
      const d = segDist(p, pts[k], pts[Math.min(k + 1, pts.length - 1)]);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  });
  return best;
}

stage.el.addEventListener(
  'pointerdown',
  (e) => {
    if (mode !== 'edit') return;
    e.preventDefault();
    const p = toPoint(e);
    const hit = hitPoint(p);
    if (hit) {
      const [si, pi] = hit;
      const s = glyphSrc().strokes[si];
      snapshot();
      if (s.path) {
        // 경로를 점열로 바꾼 뒤 가장 가까운 점을 다시 찾는다
        const pts = ensurePoints(s);
        let best = 0;
        pts.forEach((q, k) => {
          if (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(pts[best][0] - p[0], pts[best][1] - p[1])) best = k;
        });
        select(si, best);
      } else {
        select(si, pi);
      }
      dragging = true;
      try {
        stage.el.setPointerCapture(e.pointerId);
      } catch {
        /* 무시 */
      }
    } else {
      select(hitStroke(p), null);
    }
    renderAll();
  },
  { capture: true },
);

stage.el.addEventListener('pointermove', (e) => {
  if (!dragging || selStroke === null || selPoint === null) return;
  const [x, y] = toPoint(e);
  glyphSrc().strokes[selStroke].points![selPoint] = roundPoint([
    Math.max(0, Math.min(100, x)),
    Math.max(0, Math.min(100, y)),
  ]);
  guide.setGlyph(loadGlyph(glyphSrc()));
  guide.showAnswer();
  renderOverlay();
});

const endDrag = () => {
  if (!dragging) return;
  dragging = false;
  commit();
};
stage.el.addEventListener('pointerup', endDrag);
stage.el.addEventListener('pointercancel', endDrag);

// ── 그리기 모드: 그은 선을 새 획으로 ──────────────────

stage.onStrokeEnd = (points) => {
  if (mode !== 'draw') return;
  snapshot();
  const s: StrokeSource =
    pathLength(points) < 3 ? { points: [roundPoint(points[0])], type: 'dot' } : { points: simplifyDrawn(points) };
  glyphSrc().strokes.push(s);
  select(glyphSrc().strokes.length - 1, null);
  stage.clear();
  commit();
  flash(`${glyphSrc().strokes.length}번 획을 추가했어요 (점 ${s.points!.length}개)`);
};

// ── 점 추가·삭제 ──────────────────────────────────────

function addPoint(): void {
  if (selStroke === null) return flash('먼저 획을 고르세요');
  const s = glyphSrc().strokes[selStroke];
  if (s.type === 'dot') return flash('점 획에는 점을 더할 수 없어요');
  snapshot();
  const pts = ensurePoints(s);
  const i = selPoint ?? pts.length - 1;
  let p: Point;
  if (i < pts.length - 1) {
    p = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
  } else {
    // 끝점이면 진행 방향으로 조금 늘린다
    const prev = pts[i - 1] ?? [pts[i][0] - 5, pts[i][1]];
    p = [pts[i][0] + (pts[i][0] - prev[0]) * 0.3, pts[i][1] + (pts[i][1] - prev[1]) * 0.3];
  }
  pts.splice(i + 1, 0, roundPoint([Math.max(0, Math.min(100, p[0])), Math.max(0, Math.min(100, p[1]))]));
  select(selStroke, i + 1);
  commit();
}

function deletePoint(): void {
  if (selStroke === null || selPoint === null) return flash('먼저 점을 고르세요');
  const s = glyphSrc().strokes[selStroke];
  const pts = ensurePoints(s);
  if (pts.length <= (s.type === 'dot' ? 1 : 2)) return flash('점이 너무 적어요. 획을 지우려면 ✕를 누르세요');
  snapshot();
  pts.splice(selPoint, 1);
  select(selStroke, Math.min(selPoint, pts.length - 1));
  commit();
}

// ── 내보내기 ──────────────────────────────────────────

async function copyJson(): Promise<void> {
  try {
    await navigator.clipboard.writeText(formatGroupJson(sources));
    flash(`${group}.json 내용을 클립보드에 복사했어요`);
  } catch {
    flash('클립보드 복사에 실패했어요. 파일로 저장해 주세요');
  }
}

function downloadJson(): void {
  const blob = new Blob([formatGroupJson(sources)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `${group}.json` });
  a.click();
  URL.revokeObjectURL(a.href);
  flash(`${group}.json 파일을 저장했어요. src/data/glyphs/에 덮어쓰세요`);
}

function resetGlyph(): void {
  const original = getSources(group).find((s) => s.id === glyphSrc().id);
  if (!original) return;
  snapshot();
  sources[idx] = clone(original);
  select(null, null);
  commit();
}

function discardDraft(): void {
  if (!confirm(`${group} 그룹의 수정 내용을 모두 버릴까요?`)) return;
  localStorage.removeItem(DRAFT_KEY(group));
  loadGroup(group, glyphSrc()?.id);
}

// ── 조립 ──────────────────────────────────────────────

const app = document.getElementById('app')!;
app.append(
  h(
    'main',
    { class: 'editor' },
    h(
      'header',
      { class: 'ed-header' },
      h('h1', {}, '획 데이터 편집기'),
      dirtyBadge,
      h('span', { class: 'topbar-spacer' }),
      h('a', { class: 'btn ed-link', href: './preview.html' }, '전체 미리보기'),
      h('a', { class: 'btn ed-link', href: './' }, '앱으로'),
    ),
    h('aside', { class: 'ed-left' }, groupSelect, glyphList),
    h('section', { class: 'ed-center' }, h('div', { class: 'ed-stage-wrap' }, stage.el), status),
    h(
      'aside',
      { class: 'ed-right' },
      h('label', { class: 'ed-field' }, '표시 이름', nameInput),
      h('label', { class: 'ed-field' }, '읽기(speak)', speakInput),
      h(
        'div',
        { class: 'ed-actions' },
        h('button', { class: 'btn', onClick: () => void guide.playDemo() }, '▶ 애니메이션'),
        modeButton,
        h('button', { class: 'btn', onClick: addPoint }, '＋ 점 추가'),
        h('button', { class: 'btn', onClick: deletePoint }, '－ 점 삭제'),
        h('button', { class: 'btn', onClick: undo }, '↶ 되돌리기'),
        h('button', { class: 'btn', onClick: resetGlyph }, '이 글자 원래대로'),
      ),
      h('h2', {}, '획 순서'),
      strokeList,
      h('h2', {}, '내보내기'),
      h(
        'div',
        { class: 'ed-actions' },
        h('button', { class: 'btn btn-primary', 'data-action': 'copy', onClick: () => void copyJson() }, 'JSON 복사'),
        h('button', { class: 'btn', 'data-action': 'download', onClick: downloadJson }, 'JSON 파일 저장'),
        h('button', { class: 'btn', onClick: discardDraft }, '초안 버리기'),
      ),
      h(
        'p',
        { class: 'ed-help' },
        '점을 끌어 옮기고, 획을 눌러 고른 뒤 점을 추가·삭제하세요. ',
        'Delete: 점 삭제, Ctrl+Z: 되돌리기. ',
        '수정 내용은 이 브라우저에 초안으로 남고, [JSON 파일 저장]으로 받은 파일을 src/data/glyphs/에 덮어쓰면 앱에 반영됩니다.',
      ),
    ),
  ),
);

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === 'Delete' || e.key === 'Backspace') deletePoint();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  }
});

new ResizeObserver(() => renderOverlay()).observe(stage.el);

// 시작: #group/글자 로 바로 열 수 있다
const [hashGroup, hashId] = location.hash.slice(1).split('/');
const start = GROUPS.find((g) => g.id === hashGroup)?.id ?? 'consonant';
guide = new GuideView(stage, loadGlyph(getSources(start)[0]), 'guide');
loadGroup(start, hashId ? decodeURIComponent(hashId) : undefined);
