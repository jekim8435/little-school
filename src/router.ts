/**
 * 화면 하나만 보여주는 단순한 라우터.
 * 1단계 3번에서 해시 라우팅(#/hub, #/app/<id>, #/parent/...)으로 확장한다 (명세 2-1, 5장).
 */

export interface Screen {
  el: HTMLElement;
  destroy?: () => void;
}

export type ScreenFactory<R extends { name: string }> = (route: R, go: (r: R) => void) => Screen;

export class Router<R extends { name: string }> {
  private current: Screen | null = null;

  constructor(
    private root: HTMLElement,
    private factory: ScreenFactory<R>,
  ) {}

  go = (route: R): void => {
    this.current?.destroy?.();
    const screen = this.factory(route, this.go);
    this.root.replaceChildren(screen.el);
    this.root.dataset.screen = route.name;
    this.current = screen;
  };
}
