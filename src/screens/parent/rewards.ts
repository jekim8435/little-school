/**
 * 부모 모드 > 보상 지급, 보상 기록 (명세 6-5).
 * 보상 내용은 미리 정하지 않고 지급할 때마다 부모가 입력한다(최대 40자). 지급일은 오늘 날짜.
 */
import { formatDay } from '../../core/date';
import { cancelPayment, cleanRewardText, editReward, paidBoards, payBoard, REWARD_TEXT_MAX, waitingBoards } from '../../core/rewards';
import type { Board } from '../../core/storage';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { boardGrid } from '../../ui/board';
import { button, confirmDialog, toast } from '../../ui/components';
import { h } from '../../ui/dom';
import { parentPage, section } from './common';

function rewardInput(value = ''): HTMLInputElement {
  const input = h('input', { class: 'p-input is-wide', type: 'text', maxlength: REWARD_TEXT_MAX, placeholder: '예: 놀이터 가기' }) as HTMLInputElement;
  input.value = value;
  return input;
}

function boardCard(b: Board, ...extra: (Node | null)[]): HTMLElement {
  return h(
    'div',
    { class: 'p-board-card' },
    h('div', { class: 'p-board-mini' }, boardGrid(b, { mini: true })),
    h('div', { class: 'p-board-info' }, h('div', { class: 'p-board-title' }, `${b.no}번째 판`), ...extra),
  );
}

export function rewardsScreen(shell: Shell): Screen {
  const { store, router } = shell;
  const boards = waitingBoards(store);

  const cards = boards.map((b) => {
    const form = h('div', { class: 'p-pay-form' });
    const open = () => {
      const input = rewardInput();
      form.replaceChildren(
        h('div', { class: 'row' }, input, button('확인', () => {
          const text = cleanRewardText(input.value);
          if (!text) {
            toast(input.value.trim() ? `${REWARD_TEXT_MAX}자까지 쓸 수 있어요` : '보상 내용을 적어 주세요');
            return;
          }
          void confirmDialog({
            title: '보상을 지급할까요?',
            message: `${b.no}번째 판 · 다 모은 날 ${formatDay(b.completedAt!)} · 지급일 ${formatDay(store.today())}\n내용: ${text}`,
            ok: '지급',
          }).then((ok) => {
            if (!ok) return;
            if (payBoard(store, b.no, text)) {
              toast('보상 기록으로 옮겼어요');
              router.refresh();
            }
          });
        }, { kind: 'primary' })),
      );
      input.focus();
    };
    form.append(button('보상 지급', open, { kind: 'primary' }));
    return boardCard(b, h('div', { class: 'p-help' }, `시작한 날 ${formatDay(b.startedAt)} · 다 모은 날 ${formatDay(b.completedAt!)}`), form);
  });

  const el = parentPage(shell, '보상 지급', [
    section(
      boards.length ? `보상을 기다리는 판 ${boards.length}개 (오래된 순)` : null,
      ...(cards.length ? cards : [h('p', { class: 'p-help' }, '보상을 기다리는 판이 없어요. 판이 다 차면 여기에 나와요.')]),
    ),
  ]);
  return { el };
}

export function rewardHistoryScreen(shell: Shell): Screen {
  const { store, router } = shell;
  const boards = paidBoards(store);

  const cards = boards.map((b) => {
    const textLine = h('div', { class: 'p-board-reward' }, `🎁 ${b.rewardText || ''}`);
    const tools = h('div', { class: 'row wrap' });
    const showTools = () =>
      tools.replaceChildren(
        button('내용 수정', () => {
          const input = rewardInput(b.rewardText || '');
          tools.replaceChildren(
            input,
            button('저장', () => {
              if (editReward(store, b.no, input.value)) {
                toast('고쳤어요');
                router.refresh();
              } else toast(`보상 내용을 1~${REWARD_TEXT_MAX}자로 적어 주세요`);
            }, { kind: 'primary' }),
            button('취소', showTools),
          );
          input.focus();
        }),
        button('지급 취소', () => {
          void confirmDialog({ message: `${b.no}번째 판의 지급을 취소하고 보상 대기로 되돌릴까요?\n(지급일·내용이 지워져요)`, ok: '지급 취소', danger: true }).then((ok) => {
            if (ok && cancelPayment(store, b.no)) {
              toast('보상 대기로 되돌렸어요');
              router.refresh();
            }
          });
        }),
      );
    showTools();
    return boardCard(b, textLine, h('div', { class: 'p-help' }, `다 모은 날 ${formatDay(b.completedAt!)} · 지급일 ${formatDay(b.paidAt!)}`), tools);
  });

  const el = parentPage(shell, '보상 기록', [
    section(null, ...(cards.length ? cards : [h('p', { class: 'p-help' }, '아직 지급한 보상이 없어요')])),
  ]);
  return { el };
}
