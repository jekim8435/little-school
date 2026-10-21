/**
 * 별·스티커·스티커판·보상 지급 (명세 6장).
 * - 별은 과목별로 쌓이고, 과목별 교환 비율(3/5/10)에 닿으면 스티커 1장으로 자동 교환
 * - 과목당 하루 스티커 1장. 교환한 날은 그 과목에서 별도 더 받지 않는다
 * - 모자란 별은 다음 날로 이어지고, 교환 순간 비율을 넘는 별은 버린다
 * - 판이 다 차면 다 모은 날을 적고 다음 판을 바로 시작한다(보상 지급 전이어도 계속 쌓임)
 */
import type { RewardStatus, StarResult } from '../apps/types';
import { STICKER_ARTS } from './stickers';
import { newBoard, type Board, type Store } from './storage';
import { subjectSetting } from './subjects';

/** 보상 내용 최대 글자 수 (명세 6-5) */
export const REWARD_TEXT_MAX = 40;

export interface StarOutcome extends StarResult {
  /** 이번에 붙은 스티커 (교환했을 때) */
  sticker?: { art: string; boardNo: number };
  /** 이번 스티커로 판이 다 찼을 때 그 판 번호 */
  boardCompleted?: number;
}

/** 이 과목의 교환 비율 (부모 모드 > 과목 관리, 기본 3) */
export function ratioOf(store: Store, appId: string): number {
  const s = subjectSetting(store.data.settings.subjects, appId);
  return s ? s.starsPerSticker : 3;
}

/** 이 과목의 지금 상태: 쌓인 별, 교환 비율, 오늘 스티커를 받았는지 */
export function rewardStatus(store: Store, appId: string): RewardStatus {
  const day = store.data.days[store.today()];
  const sub = day ? day.subjects[appId] : undefined;
  return {
    stars: store.data.rewards.stars[appId] || 0,
    ratio: ratioOf(store, appId),
    doneToday: !!(sub && sub.sticker),
  };
}

/** 지금 모으는 판 (항상 마지막 1개) */
export function currentBoard(store: Store): Board {
  const boards = store.data.rewards.boards;
  return boards[boards.length - 1];
}

/** 보상을 기다리는 판 (다 모았고 아직 지급 전), 오래된 순 */
export function waitingBoards(store: Store): Board[] {
  return store.data.rewards.boards.filter((b) => b.completedAt !== null && b.paidAt === null);
}

/** 보상을 받은 판, 최신순 (지급일 → 판 번호) */
export function paidBoards(store: Store): Board[] {
  return store.data.rewards.boards
    .filter((b) => b.paidAt !== null)
    .sort((a, b) => (a.paidAt === b.paidAt ? b.no - a.no : (b.paidAt as string) < (a.paidAt as string) ? -1 : 1));
}

/** 오늘 스티커를 받은 과목 수 */
export function todayStickerCount(store: Store): number {
  const day = store.data.days[store.today()];
  if (!day) return 0;
  return Object.keys(day.subjects).filter((k) => day.subjects[k].sticker).length;
}

/**
 * 별 지급 (ctx.reward.star). 비율에 닿으면 스티커로 교환해 지금 판에 붙인다.
 * random: 스티커 그림 고르기 (테스트에서 고정)
 */
export function grantStar(store: Store, appId: string, n = 1, random: () => number = Math.random): StarOutcome {
  const before = rewardStatus(store, appId);
  const add = Math.floor(n);
  if (before.doneToday || add <= 0) return { accepted: false, ...before, stickerGranted: false };

  const today = store.today();
  const day = store.daySubject(appId, today);
  day.stars += add;
  let stars = before.stars + add;
  const out: StarOutcome = { accepted: true, stars, ratio: before.ratio, stickerGranted: false, doneToday: false };

  if (stars >= before.ratio) {
    // 교환: 남는 별은 버린다(그날은 더 받을 수 없으므로)
    stars = 0;
    day.sticker = true;
    const board = currentBoard(store);
    const art = STICKER_ARTS[Math.floor(random() * STICKER_ARTS.length) % STICKER_ARTS.length].id;
    board.stickers.push({ art, subject: appId, date: today });
    out.stickerGranted = true;
    out.doneToday = true;
    out.sticker = { art, boardNo: board.no };
    if (board.stickers.length >= board.size) {
      board.completedAt = today;
      out.boardCompleted = board.no;
      store.data.rewards.boards.push(newBoard(board.no + 1, store.data.settings.boardSize, today));
    }
  }
  out.stars = stars;
  if (stars > 0) store.data.rewards.stars[appId] = stars;
  else delete store.data.rewards.stars[appId];
  store.changed();
  return out;
}

function findBoard(store: Store, no: number): Board | undefined {
  for (const b of store.data.rewards.boards) if (b.no === no) return b;
  return undefined;
}

/** 보상 내용 다듬기. 비었거나 너무 길면 null */
export function cleanRewardText(text: string): string | null {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || t.length > REWARD_TEXT_MAX) return null;
  return t;
}

/** 보상 지급 (명세 6-5): 그 판에 지급일·내용을 적는다. 성공하면 true */
export function payBoard(store: Store, no: number, text: string): boolean {
  const b = findBoard(store, no);
  const t = cleanRewardText(text);
  if (!b || !t || b.completedAt === null || b.paidAt !== null) return false;
  b.paidAt = store.today();
  b.rewardText = t;
  store.changed();
  return true;
}

/** 보상 내용 고치기 (오타 등) */
export function editReward(store: Store, no: number, text: string): boolean {
  const b = findBoard(store, no);
  const t = cleanRewardText(text);
  if (!b || !t || b.paidAt === null) return false;
  b.rewardText = t;
  store.changed();
  return true;
}

/** 지급 취소: 보상 대기 상태로 되돌린다(지급일·내용 삭제) */
export function cancelPayment(store: Store, no: number): boolean {
  const b = findBoard(store, no);
  if (!b || b.paidAt === null) return false;
  b.paidAt = null;
  b.rewardText = null;
  store.changed();
  return true;
}
