/**
 * 시작 화면 (명세 5-1). 앱을 열 때마다(새로고침 포함) 여기서 시작한다.
 * ‘시작!’ 버튼의 터치 안에서 오디오를 깨워야 iOS에서 이후 소리가 난다.
 */
import type { Screen } from '../router';
import type { Shell } from '../shell';
import { button } from '../ui/components';
import { h } from '../ui/dom';

/** 앱 아이콘과 같은 그림 (scripts/make-icons.mjs) */
const LOGO_SVG =
  '<svg viewBox="20 14 60 66" aria-hidden="true">' +
  '<rect x="32" y="48" width="36" height="28" fill="#fff8ef" stroke="#eadfd0" stroke-width="1.2"/>' +
  '<path d="M24 51L50 30L76 51Z" fill="#e8574f"/>' +
  '<rect x="45" y="61" width="10" height="15" fill="#8a5a3c"/>' +
  '<path d="M50 13.5l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="#ffc82e"/>' +
  '</svg>';

export function startScreen(shell: Shell): Screen {
  let started = false;
  const start = () => {
    if (started) return; // 여러 번 눌러도 한 번만
    started = true;
    shell.audio.unlock();
    shell.audio.sfx('tap');
    shell.audio.say('shell.start.hello');
    shell.router.go({ name: 'hub' });
  };

  const logo = h('div', { class: 'start-logo' });
  logo.innerHTML = LOGO_SVG;

  const el = h(
    'div',
    { class: 'screen start' },
    logo,
    h('h1', { class: 'start-title' }, '꼬마학교'),
    button('시작!', start, { kind: 'primary', big: true, className: 'start-button' }),
  );
  return { el };
}
