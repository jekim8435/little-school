/**
 * 스티커판 한 장 그리기 (명세 5-4). 아이 스티커판 화면, 보상 기록, 부모 모드 보상 지급에서 함께 쓴다.
 * 가로 화면 배치: 5칸 = 1×5, 10칸 = 2×5, 20칸 = 4×5
 */
import { findApp } from '../apps/registry';
import { stickerSvg } from '../core/stickers';
import type { Board } from '../core/storage';
import { h } from './dom';

export function boardGrid(board: Board, opts: { mini?: boolean } = {}): HTMLElement {
  const rows = Math.ceil(board.size / 5);
  const grid = h('div', { class: `board-grid rows-${rows}${opts.mini ? ' is-mini' : ''}` });
  for (let i = 0; i < board.size; i++) {
    const s = board.stickers[i];
    const cell = h('div', { class: `board-cell${s ? ' is-filled' : ''}` });
    if (s) {
      const art = h('div', { class: 'board-art' });
      art.innerHTML = stickerSvg(s.art);
      cell.append(art);
      const app = findApp(s.subject);
      if (app && !opts.mini) cell.append(h('img', { class: 'board-subject', src: app.icon, alt: '' }));
    }
    grid.append(cell);
  }
  return grid;
}
