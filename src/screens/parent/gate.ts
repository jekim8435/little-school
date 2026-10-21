/**
 * 부모 잠금 (명세 8-1): 곱셈 문제(또는 4자리 암호) + 숫자 키패드. 3번 틀리면 1분 잠금.
 */
import { makeProblem } from '../../core/parentLock';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { button } from '../../ui/components';
import { h } from '../../ui/dom';

export function gateScreen(shell: Shell): Screen {
  const { store, router, parent } = shell;
  const usePin = store.data.settings.parentLock.type === 'pin' && !!store.data.settings.parentLock.pin;
  let problem = makeProblem();
  let entered = '';

  const question = h('div', { class: 'gate-question' });
  const answer = h('div', { class: 'gate-answer' });
  const message = h('div', { class: 'gate-message' });
  const box = h('div', { class: 'gate-box' }, question, answer, message);

  const renderQuestion = () => {
    question.textContent = usePin ? '암호 4자리를 넣어 주세요' : `${problem.a} × ${problem.b} = ?`;
  };
  const renderAnswer = () => {
    answer.textContent = usePin ? '●'.repeat(entered.length) + '○'.repeat(4 - entered.length) : entered || ' ';
  };

  let lockTimer = 0;
  const showLock = () => {
    const left = parent.lockedFor();
    if (left <= 0) {
      message.textContent = '';
      box.classList.remove('is-locked');
      return;
    }
    box.classList.add('is-locked');
    message.textContent = `여러 번 틀렸어요. ${Math.ceil(left / 1000)}초 뒤에 다시 해 주세요`;
    window.clearTimeout(lockTimer);
    lockTimer = window.setTimeout(showLock, 1000);
  };

  const submit = () => {
    const expected = usePin ? store.data.settings.parentLock.pin! : String(problem.answer);
    const r = parent.check(entered, expected);
    entered = '';
    if (r === 'ok') {
      router.go({ name: 'parent', page: 'home' });
      return;
    }
    box.classList.remove('is-shaking');
    void box.offsetWidth;
    box.classList.add('is-shaking');
    if (!usePin) problem = makeProblem();
    renderQuestion();
    renderAnswer();
    if (r === 'locked') showLock();
    else message.textContent = '다시 해 보세요';
  };

  const press = (d: string) => {
    if (parent.lockedFor() > 0) return;
    if (entered.length >= (usePin ? 4 : 3)) return;
    entered += d;
    renderAnswer();
    if (usePin && entered.length === 4) submit();
  };
  const keys = h(
    'div',
    { class: 'gate-keys' },
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => button(d, () => press(d), { className: 'gate-key' })),
    button('지우기', () => {
      entered = entered.slice(0, -1);
      renderAnswer();
    }, { className: 'gate-key is-small' }),
    button('0', () => press('0'), { className: 'gate-key' }),
    usePin ? h('span', { class: 'gate-key is-empty' }) : button('확인', submit, { kind: 'primary', className: 'gate-key is-small' }),
  );

  renderQuestion();
  renderAnswer();
  showLock();
  const el = h(
    'div',
    { class: 'screen parent gate' },
    h('div', { class: 'parent-head' }, button('◀ 아이 화면으로', () => router.go({ name: 'hub' })), h('h1', { class: 'parent-title' }, '부모 확인'), h('span', { class: 'parent-head-space' })),
    h('div', { class: 'gate-body' }, box, keys),
  );
  return { el, destroy: () => window.clearTimeout(lockTimer) };
}
