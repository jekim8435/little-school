/**
 * 부모 모드 > 백업·복원 (명세 8-7)
 * - 백업: 전체 데이터를 JSON으로 화면에 보여 주고 ‘복사’ (iOS 12 Safari는 파일 내려받기가 제한적이라 복사가 기본)
 * - 복원: 붙여 넣기 → 검사 → 확인 후 덮어쓰기
 * - 전체 초기화: 확인창 2번 + 곱셈 문제 다시 풀기
 */
import { apps } from '../../apps/registry';
import { formatDay } from '../../core/date';
import { makeProblem } from '../../core/parentLock';
import { platform } from '../../platform';
import { syncSubjects } from '../../core/subjects';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { button, confirmDialog, toast } from '../../ui/components';
import { h } from '../../ui/dom';
import { parentPage, section } from './common';

/** textarea 내용을 클립보드로. iOS 12에는 클립보드 API가 없어 선택 + execCommand('copy')를 쓴다 */
function copyText(area: HTMLTextAreaElement): boolean {
  const ro = area.readOnly;
  area.readOnly = false; // iOS는 readonly면 선택이 안 된다
  area.focus();
  area.setSelectionRange(0, area.value.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.readOnly = ro;
  area.blur();
  return ok;
}

export function backupScreen(shell: Shell): Screen {
  const { store, router } = shell;
  const d = store.data;

  // ── 백업 ──
  const json = store.exportJson();
  const out = h('textarea', { class: 'p-textarea', readonly: true, rows: 5 }) as HTMLTextAreaElement;
  out.value = json;
  const summary = `스티커판 ${d.rewards.boards.length}개 · 기록한 날 ${Object.keys(d.days).length}일 · ${(json.length / 1024).toFixed(1)}KB`;
  const backupButtons = h(
    'div',
    { class: 'row wrap' },
    button('복사하기', () => {
      if (copyText(out)) {
        store.markBackedUp();
        toast('복사했어요. 메모 앱 등에 붙여 넣어 보관하세요');
      } else {
        toast('복사하지 못했어요. 글자 칸을 길게 눌러 전체 선택 → 복사해 주세요', 4000);
      }
    }, { kind: 'primary' }),
  );
  // 파일 내려받기: 홈 화면 앱(iOS)에서는 앱 밖으로 나갈 수 있어 보이지 않는다
  if (platform.canDownloadFile()) {
    backupButtons.append(
      button('파일로 내려받기', () => {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a = h('a', { href: url, download: `little-school-backup-${store.today()}.json` });
        document.body.append(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        store.markBackedUp();
      }),
    );
  }

  // ── 복원 ──
  const input = h('textarea', { class: 'p-textarea', rows: 5, placeholder: '백업한 글자를 여기에 붙여 넣으세요' }) as HTMLTextAreaElement;
  const restoreMsg = h('p', { class: 'p-help' });
  const restore = () => {
    const r = store.parseBackup(input.value);
    if (!r.ok) {
      restoreMsg.textContent = r.error;
      restoreMsg.classList.add('is-error');
      return;
    }
    restoreMsg.textContent = '';
    const nd = r.data;
    void confirmDialog({
      title: '백업으로 덮어쓸까요?',
      message: `만든 날 ${formatDay(nd.createdAt)} · 스티커판 ${nd.rewards.boards.length}개 · 기록한 날 ${Object.keys(nd.days).length}일\n지금 이 기기의 기록은 모두 바뀌어요.`,
      ok: '덮어쓰기',
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      store.restore(nd);
      if (syncSubjects(store.data.settings.subjects, apps.map((a) => a.id))) store.flush();
      toast('복원했어요');
      router.go({ name: 'parent', page: 'home' });
    });
  };

  // ── 전체 초기화 ──
  const resetBox = h('div', {});
  const askProblem = () => {
    const p = makeProblem();
    const ans = h('input', { class: 'p-input', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 3, placeholder: '답' }) as HTMLInputElement;
    resetBox.replaceChildren(
      h('p', {}, `마지막 확인: ${p.a} × ${p.b} = ?`),
      h('div', { class: 'row' }, ans, button('초기화', () => {
        if (ans.value.trim() !== String(p.answer)) {
          toast('답이 달라요. 초기화하지 않았어요');
          resetBox.replaceChildren(resetButton);
          return;
        }
        store.reset();
        syncSubjects(store.data.settings.subjects, apps.map((a) => a.id));
        store.flush();
        toast('모든 기록을 지웠어요');
        router.go({ name: 'start' });
      }, { className: 'btn-danger' }), button('그만두기', () => resetBox.replaceChildren(resetButton))),
    );
    ans.focus();
  };
  const resetButton = button('전체 초기화', () => {
    void confirmDialog({ message: '별·스티커판·기록·설정을 모두 지울까요?', ok: '지우기', danger: true })
      .then((ok) => (ok ? confirmDialog({ title: '한 번 더 확인', message: '정말 모두 지울까요? 백업이 없으면 되돌릴 수 없어요.', ok: '모두 지우기', danger: true }) : false))
      .then((ok) => {
        if (ok) askProblem();
      });
  }, { className: 'btn-danger' });
  resetBox.append(resetButton);

  const el = parentPage(shell, '백업·복원', [
    section('백업', h('p', { class: 'p-help' }, `${summary} · 이 기기에만 저장되므로 가끔 백업해 두세요. 다른 기기로 옮길 때도 써요.`), out, backupButtons),
    section('복원', input, h('div', { class: 'row' }, button('복원하기', restore, { kind: 'primary' })), restoreMsg),
    section('전체 초기화', h('p', { class: 'p-help' }, '모든 데이터를 지우고 처음 상태로 돌아가요.'), resetBox),
  ]);
  return { el };
}
