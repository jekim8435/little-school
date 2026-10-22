/**
 * 부모 모드 > 앱 정보 (09 문서 8장 P-02, 11장 R-02).
 * 버전, AI 합성 음성(Typecast) 출처 표기, 글꼴·그림·오픈소스 라이선스 고지.
 * 개인정보처리방침 링크는 B 단계에서 추가한다(외부 링크는 부모 모드 안에만).
 */
import { OPEN_SOURCE, STRINGS } from '../../core/strings';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { h } from '../../ui/dom';
import { parentPage, section } from './common';

export function aboutScreen(shell: Shell): Screen {
  const t = STRINGS.about;
  const el = parentPage(shell, t.title, [
    section(
      null,
      h('div', { class: 'p-about-name' }, t.appName),
      h('div', { class: 'p-help' }, `${t.version} ${__APP_VERSION__} · ${t.build} ${__BUILD_TIME__}`),
    ),
    section(t.voiceTitle, h('p', { class: 'p-about-text' }, t.voiceNotice)),
    section(t.privacyTitle, h('p', { class: 'p-about-text' }, t.privacyNotice)),
    section(t.fontTitle, h('p', { class: 'p-about-text' }, t.fontNotice)),
    section(t.artTitle, h('p', { class: 'p-about-text' }, t.artNotice)),
    section(
      t.ossTitle,
      h('p', { class: 'p-help' }, t.ossNotice),
      h('ul', { class: 'p-about-list' }, ...OPEN_SOURCE.map((o) => h('li', {}, h('strong', {}, o.name), ` — ${o.license} · ${o.use}`))),
    ),
  ]);
  return { el };
}
