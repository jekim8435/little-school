/**
 * 해시 라우터 (명세 2-1, 5장). `#/hub`, `#/app/writing`, `#/parent/subjects/sample` 형태.
 * - 페이지 이동 없이 해시만 바꾼다: iOS 12 홈 화면 앱이 Safari로 튀지 않고(11-1), GitHub Pages 하위 경로에서도 새로고침 안전
 * - 화면은 한 번에 하나. 바꿀 때 이전 화면의 destroy()를 먼저 부른다(과목 unmount, 이벤트 정리)
 */

export type ParentPage =
  | 'gate'
  | 'home'
  | 'records'
  | 'subjects'
  | 'subject-settings'
  | 'settings'
  | 'rewards'
  | 'reward-history'
  | 'backup'
  | 'lock-guide'
  | 'device';

export type Route =
  | { name: 'start' }
  | { name: 'hub' }
  | { name: 'app'; id: string }
  | { name: 'stickers' }
  | { name: 'sticker-history' }
  | { name: 'done' }
  | { name: 'parent'; page: ParentPage; id?: string };

/** 주소에 쓰는 부모 모드 페이지 이름 (#/parent/<이름>). subject-settings는 #/parent/subjects/<id> */
const PARENT_PAGES: ParentPage[] = ['gate', 'records', 'subjects', 'settings', 'rewards', 'reward-history', 'backup', 'lock-guide', 'device'];

/** 과목 id 규칙: 영문 소문자·숫자·하이픈 (명세 4-1) */
const ID = /^[a-z0-9-]+$/;

/** '#/app/sample' → { name: 'app', id: 'sample' }. 모르는 주소는 null */
export function parseHash(hash: string): Route | null {
  const parts = hash.replace(/^#?\/?/, '').split('/').filter((p) => p !== '');
  const [a, b, c] = parts;
  switch (a) {
    case 'start':
    case 'hub':
    case 'done':
      return parts.length === 1 ? { name: a } : null;
    case 'app':
      return parts.length === 2 && ID.test(b) ? { name: 'app', id: b } : null;
    case 'stickers':
      if (parts.length === 1) return { name: 'stickers' };
      return parts.length === 2 && b === 'history' ? { name: 'sticker-history' } : null;
    case 'parent':
      if (parts.length === 1) return { name: 'parent', page: 'home' };
      if (b === 'subjects' && parts.length === 3) return ID.test(c) ? { name: 'parent', page: 'subject-settings', id: c } : null;
      return parts.length === 2 && PARENT_PAGES.indexOf(b as ParentPage) >= 0 ? { name: 'parent', page: b as ParentPage } : null;
    default:
      return null;
  }
}

/** Route → '#/...' */
export function formatRoute(r: Route): string {
  switch (r.name) {
    case 'app':
      return `#/app/${r.id}`;
    case 'sticker-history':
      return '#/stickers/history';
    case 'parent':
      if (r.page === 'home') return '#/parent';
      if (r.page === 'subject-settings') return `#/parent/subjects/${r.id ?? ''}`;
      return `#/parent/${r.page}`;
    default:
      return `#/${r.name}`;
  }
}

export interface Screen {
  el: HTMLElement;
  destroy?: () => void;
}

export type ScreenFactory = (route: Route, router: Router) => Screen;

/**
 * 화면에 들어가기 전에 다른 곳으로 돌릴 수 있다(부모 잠금, 오늘 공부 끝 등).
 * 돌려준 Route가 to와 다르면 그쪽으로 간다(주소도 바뀜).
 */
export type Guard = (to: Route, from: Route | null) => Route;

export class Router {
  private screen: Screen | null = null;
  private route: Route | null = null;
  private guard: Guard = (to) => to;

  constructor(
    private readonly root: HTMLElement,
    private readonly factory: ScreenFactory,
    /** 주소가 이상할 때 갈 곳 */
    private readonly fallback: Route = { name: 'start' },
  ) {}

  get current(): Route | null {
    return this.route;
  }

  setGuard(guard: Guard): void {
    this.guard = guard;
  }

  /** 해시 변경을 듣기 시작하고, 처음 화면을 띄운다 */
  start(first?: Route): void {
    window.addEventListener('hashchange', this.onHashChange);
    if (first) this.go(first, { replace: true });
    else this.onHashChange();
  }

  /** 다른 화면으로. replace면 방문 기록을 남기지 않는다 */
  go = (to: Route, opts: { replace?: boolean } = {}): void => {
    const hash = formatRoute(to);
    if (location.hash === hash) {
      this.render(to);
    } else if (opts.replace) {
      location.replace(`${location.href.split('#')[0]}${hash}`);
      this.render(to); // replace는 hashchange가 없을 수 있으므로 직접 그린다(중복은 render가 거른다)
    } else {
      location.hash = hash; // → hashchange → render
    }
  };

  private onHashChange = (): void => {
    const r = parseHash(location.hash);
    if (r) this.render(r);
    else this.go(this.fallback, { replace: true }); // 주소도 바로잡는다
  };

  private render(want: Route): void {
    const to = this.guard(want, this.route);
    if (formatRoute(to) !== formatRoute(want)) {
      this.go(to, { replace: true });
      return;
    }
    // 같은 화면을 두 번 그리지 않는다 (replace + hashchange 중복)
    if (this.route && this.screen && formatRoute(this.route) === formatRoute(to)) return;
    const prev = this.screen;
    this.screen = null;
    prev?.destroy?.();
    this.route = to;
    let screen: Screen;
    try {
      screen = this.factory(to, this);
    } catch (e) {
      // 화면을 만들다 오류가 나면 이전 화면이 멈춘 채 남지 않게 오류 화면을 띄운다
      // (아이패드에는 개발자 도구가 없으므로 내용을 화면에 보여 준다)
      console.error(e);
      screen = errorScreen(e, to);
    }
    this.root.replaceChildren(screen.el);
    this.root.setAttribute('data-screen', to.name);
    this.screen = screen;
  }
}

function errorScreen(e: unknown, route: Route): Screen {
  const el = document.createElement('div');
  el.className = 'screen center router-error';
  const title = document.createElement('p');
  title.className = 'text-big';
  title.textContent = '화면을 열지 못했어요';
  const detail = document.createElement('p');
  detail.className = 'text-muted';
  detail.textContent = `${formatRoute(route)} — ${e instanceof Error ? e.message : String(e)}`;
  const back = document.createElement('button');
  back.className = 'btn btn-primary btn-big';
  back.type = 'button';
  back.textContent = '처음으로';
  back.addEventListener('click', () => {
    location.hash = '#/start';
  });
  el.append(title, detail, back);
  return { el };
}
