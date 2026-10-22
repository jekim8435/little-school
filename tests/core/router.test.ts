import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatRoute, parseHash, Router, type Route, type Screen } from '../../src/router';

describe('parseHash / formatRoute', () => {
  const cases: [string, Route][] = [
    ['#/start', { name: 'start' }],
    ['#/hub', { name: 'hub' }],
    ['#/done', { name: 'done' }],
    ['#/app/sample', { name: 'app', id: 'sample' }],
    ['#/app/double-consonant', { name: 'app', id: 'double-consonant' }],
    ['#/stickers', { name: 'stickers' }],
    ['#/stickers/history', { name: 'sticker-history' }],
    ['#/parent', { name: 'parent', page: 'home' }],
    ['#/parent/gate', { name: 'parent', page: 'gate' }],
    ['#/parent/records', { name: 'parent', page: 'records' }],
    ['#/parent/subjects', { name: 'parent', page: 'subjects' }],
    ['#/parent/subjects/writing', { name: 'parent', page: 'subject-settings', id: 'writing' }],
    ['#/parent/settings', { name: 'parent', page: 'settings' }],
    ['#/parent/rewards', { name: 'parent', page: 'rewards' }],
    ['#/parent/reward-history', { name: 'parent', page: 'reward-history' }],
    ['#/parent/backup', { name: 'parent', page: 'backup' }],
    ['#/parent/lock-guide', { name: 'parent', page: 'lock-guide' }],
    ['#/parent/device', { name: 'parent', page: 'device' }],
    ['#/parent/about', { name: 'parent', page: 'about' }],
  ];

  for (const [hash, route] of cases) {
    it(`${hash} ⇄ ${JSON.stringify(route)}`, () => {
      expect(parseHash(hash)).toEqual(route);
      expect(formatRoute(route)).toBe(hash);
    });
  }

  it('#, 슬래시 유무와 끝 슬래시를 너그럽게 읽는다', () => {
    expect(parseHash('/hub')).toEqual({ name: 'hub' });
    expect(parseHash('hub')).toEqual({ name: 'hub' });
    expect(parseHash('#/hub/')).toEqual({ name: 'hub' });
  });

  it('모르는 주소는 null', () => {
    for (const bad of ['', '#', '#/', '#/nope', '#/app', '#/app/Sample', '#/app/a/b', '#/hub/x', '#/parent/home', '#/parent/subject-settings', '#/parent/subjects/A_B', '#/stickers/x']) {
      expect(parseHash(bad), bad).toBeNull();
    }
  });
});

describe('Router', () => {
  let hash = '';
  let listener: (() => void) | null = null;
  let root: { children: unknown[]; replaceChildren: (...c: unknown[]) => void; setAttribute: () => void };

  beforeEach(() => {
    hash = '';
    listener = null;
    const loc = {
      get hash() {
        return hash;
      },
      set hash(v: string) {
        hash = v;
        queueMicrotask(() => listener?.()); // 브라우저처럼 나중에 hashchange
      },
      get href() {
        return `https://x.test/little-school/${hash}`;
      },
      replace(url: string) {
        hash = url.slice(url.indexOf('#'));
        queueMicrotask(() => listener?.());
      },
    };
    vi.stubGlobal('location', loc);
    vi.stubGlobal('window', { addEventListener: (_: string, fn: () => void) => (listener = fn) });
    root = { children: [], replaceChildren: (...c) => (root.children = c), setAttribute: () => {} };
  });
  afterEach(() => vi.unstubAllGlobals());

  function setup() {
    const log: string[] = [];
    const factory = (r: Route): Screen => {
      const name = formatRoute(r);
      log.push(`make ${name}`);
      return { el: name as unknown as HTMLElement, destroy: () => log.push(`destroy ${name}`) };
    };
    const router = new Router(root as unknown as HTMLElement, factory);
    return { router, log };
  }

  const tick = () => new Promise((r) => setTimeout(r, 0));

  it('시작 화면을 replace로 띄우고 한 번만 그린다', async () => {
    hash = '#/hub'; // 새로고침해도 시작 화면부터 (명세 5-1)
    const { router, log } = setup();
    router.start({ name: 'start' });
    await tick();
    expect(hash).toBe('#/start');
    expect(log).toEqual(['make #/start']);
    expect(router.current).toEqual({ name: 'start' });
  });

  it('화면을 바꿀 때 이전 화면의 destroy를 먼저 부른다', async () => {
    const { router, log } = setup();
    router.start({ name: 'start' });
    router.go({ name: 'app', id: 'sample' });
    await tick();
    router.go({ name: 'hub' });
    await tick();
    expect(log).toEqual(['make #/start', 'destroy #/start', 'make #/app/sample', 'destroy #/app/sample', 'make #/hub']);
  });

  it('주소를 직접 바꿔도(뒤로 가기 등) 따라간다. 모르는 주소는 시작 화면으로', async () => {
    const { router, log } = setup();
    router.start({ name: 'start' });
    await tick();
    hash = '#/stickers';
    listener?.();
    hash = '#/엉뚱';
    listener?.();
    await tick();
    expect(log.filter((l) => l.startsWith('make'))).toEqual(['make #/start', 'make #/stickers', 'make #/start']);
    expect(hash).toBe('#/start');
  });

  it('가드가 다른 곳으로 돌리면 그쪽으로 간다', async () => {
    const { router, log } = setup();
    router.setGuard((to) => (to.name === 'parent' && to.page !== 'gate' ? { name: 'parent', page: 'gate' } : to));
    router.start({ name: 'hub' });
    router.go({ name: 'parent', page: 'settings' });
    await tick();
    expect(hash).toBe('#/parent/gate');
    expect(log.filter((l) => l.startsWith('make'))).toEqual(['make #/hub', 'make #/parent/gate']);
  });
});
