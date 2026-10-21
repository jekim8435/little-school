import { describe, expect, it } from 'vitest';
import {
  cancelPayment,
  cleanRewardText,
  currentBoard,
  editReward,
  grantStar,
  paidBoards,
  payBoard,
  rewardStatus,
  todayStickerCount,
  waitingBoards,
} from '../../src/core/rewards';
import { STICKER_ARTS, stickerSvg } from '../../src/core/stickers';
import { Store } from '../../src/core/storage';
import { syncSubjects, subjectSetting } from '../../src/core/subjects';

/** 날짜를 바꿀 수 있는 가짜 시계 */
function setup(start = new Date(2026, 9, 21, 10, 0)) {
  let now = start;
  const store = new Store(null, { now: () => now });
  store.load();
  syncSubjects(store.data.settings.subjects, ['writing', 'sample']);
  const nextDay = () => (now = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0));
  const setRatio = (id: string, r: 3 | 5 | 10) => (subjectSetting(store.data.settings.subjects, id)!.starsPerSticker = r);
  return { store, nextDay, setRatio };
}
const first = () => 0; // 언제나 첫 번째 스티커 그림

describe('스티커 그림', () => {
  it('동물·탈것 20종, id가 겹치지 않는다', () => {
    expect(STICKER_ARTS).toHaveLength(20);
    expect(new Set(STICKER_ARTS.map((a) => a.id)).size).toBe(20);
  });
  it('모르는 id도 그림(별)이 나온다', () => {
    expect(stickerSvg('nope')).toContain('<svg');
  });
});

describe('별과 스티커 교환 (명세 6-3)', () => {
  it('비율 3: 별 3개째에 스티커 1장, 그 과목 오늘 스티커 ✓', () => {
    const { store } = setup();
    expect(grantStar(store, 'writing', 1, first)).toMatchObject({ accepted: true, stars: 1, stickerGranted: false });
    expect(grantStar(store, 'writing', 1, first)).toMatchObject({ stars: 2, stickerGranted: false });
    const r = grantStar(store, 'writing', 1, first);
    expect(r).toMatchObject({ accepted: true, stars: 0, stickerGranted: true, doneToday: true });
    expect(r.sticker).toEqual({ art: STICKER_ARTS[0].id, boardNo: 1 });
    expect(currentBoard(store).stickers).toEqual([{ art: STICKER_ARTS[0].id, subject: 'writing', date: '2026-10-21' }]);
    expect(rewardStatus(store, 'writing')).toEqual({ stars: 0, ratio: 3, doneToday: true });
    expect(todayStickerCount(store)).toBe(1);
  });

  it('과목당 하루 1장: 교환한 날은 그 과목에서 별도 더 받지 않는다', () => {
    const { store } = setup();
    for (let i = 0; i < 3; i++) grantStar(store, 'writing', 1, first);
    const r = grantStar(store, 'writing', 1, first);
    expect(r).toMatchObject({ accepted: false, stars: 0, stickerGranted: false, doneToday: true });
    expect(currentBoard(store).stickers).toHaveLength(1);
  });

  it('다른 과목은 따로 계산한다', () => {
    const { store } = setup();
    for (let i = 0; i < 3; i++) grantStar(store, 'writing', 1, first);
    expect(grantStar(store, 'sample', 1, first)).toMatchObject({ accepted: true, stars: 1 });
    for (let i = 0; i < 2; i++) grantStar(store, 'sample', 1, first);
    expect(todayStickerCount(store)).toBe(2);
  });

  it('과목마다 교환 비율이 다르다 (5)', () => {
    const { store, setRatio } = setup();
    setRatio('sample', 5);
    for (let i = 0; i < 4; i++) expect(grantStar(store, 'sample', 1, first).stickerGranted).toBe(false);
    expect(grantStar(store, 'sample', 1, first).stickerGranted).toBe(true);
  });

  it('모자란 별은 다음 날로 이어진다 (2/3 → 다음 날 1개면 교환)', () => {
    const { store, nextDay } = setup();
    grantStar(store, 'writing', 1, first);
    grantStar(store, 'writing', 1, first);
    nextDay();
    expect(rewardStatus(store, 'writing')).toEqual({ stars: 2, ratio: 3, doneToday: false });
    expect(grantStar(store, 'writing', 1, first).stickerGranted).toBe(true);
  });

  it('스티커 받은 다음 날에는 다시 받을 수 있다', () => {
    const { store, nextDay } = setup();
    for (let i = 0; i < 3; i++) grantStar(store, 'writing', 1, first);
    nextDay();
    expect(grantStar(store, 'writing', 1, first)).toMatchObject({ accepted: true, stars: 1, doneToday: false });
  });

  it('교환 순간 비율을 넘는 별은 버린다', () => {
    const { store } = setup();
    grantStar(store, 'writing', 2, first);
    const r = grantStar(store, 'writing', 2, first); // 4개 → 교환, 1개는 버림
    expect(r).toMatchObject({ stickerGranted: true, stars: 0 });
    expect(store.data.rewards.stars.writing).toBeUndefined();
  });

  it('비율을 낮추면 이미 쌓인 별은 유지되고 다음 별 지급 때 교환', () => {
    const { store, setRatio } = setup();
    setRatio('writing', 10);
    for (let i = 0; i < 4; i++) grantStar(store, 'writing', 1, first);
    setRatio('writing', 3);
    expect(rewardStatus(store, 'writing').stars).toBe(4);
    expect(grantStar(store, 'writing', 1, first).stickerGranted).toBe(true);
  });

  it('0개 이하는 무시', () => {
    const { store } = setup();
    expect(grantStar(store, 'writing', 0, first).accepted).toBe(false);
  });
});

describe('스티커판 (명세 6-4)', () => {
  it('판이 다 차면 다 모은 날을 적고 다음 판을 바로 시작한다. 지급 전에도 새 판에 쌓인다', () => {
    const { store, nextDay } = setup();
    store.data.settings.boardSize = 5;
    store.data.rewards.boards[0].size = 5;
    for (let d = 0; d < 5; d++) {
      for (let i = 0; i < 3; i++) grantStar(store, 'writing', 1, first);
      if (d < 4) nextDay();
    }
    const boards = store.data.rewards.boards;
    expect(boards).toHaveLength(2);
    expect(boards[0]).toMatchObject({ no: 1, completedAt: '2026-10-25', paidAt: null });
    expect(boards[1]).toMatchObject({ no: 2, size: 5, startedAt: '2026-10-25', completedAt: null, stickers: [] });
    expect(waitingBoards(store).map((b) => b.no)).toEqual([1]);
    // 지급 전에도 새 판에 계속 쌓인다
    for (let i = 0; i < 3; i++) grantStar(store, 'sample', 1, first);
    expect(currentBoard(store).stickers).toHaveLength(1);
  });

  it('칸 수 설정은 새로 시작하는 판부터', () => {
    const { store } = setup();
    store.data.settings.boardSize = 20;
    expect(currentBoard(store).size).toBe(10);
  });

  it('판이 다 찼다는 것을 알려 준다', () => {
    const { store } = setup();
    store.data.rewards.boards[0].size = 5;
    store.data.rewards.boards[0].stickers = [1, 2, 3, 4].map(() => ({ art: 'lion', subject: 'sample', date: '2026-10-20' }));
    for (let i = 0; i < 2; i++) grantStar(store, 'writing', 1, first);
    expect(grantStar(store, 'writing', 1, first).boardCompleted).toBe(1);
  });
});

describe('보상 지급·기록 (명세 6-5)', () => {
  function completed() {
    const s = setup();
    const b = s.store.data.rewards.boards[0];
    b.completedAt = '2026-10-20';
    s.store.data.rewards.boards.push({ no: 2, size: 10, startedAt: '2026-10-20', completedAt: null, paidAt: null, rewardText: null, stickers: [] });
    return s;
  }

  it('내용을 넣으면 지급일·내용이 적히고 보상 기록으로 옮겨 간다', () => {
    const { store } = completed();
    expect(payBoard(store, 1, '  놀이터   가기 ')).toBe(true);
    expect(store.data.rewards.boards[0]).toMatchObject({ paidAt: '2026-10-21', rewardText: '놀이터 가기' });
    expect(waitingBoards(store)).toEqual([]);
    expect(paidBoards(store).map((b) => b.no)).toEqual([1]);
  });

  it('내용이 비었거나 40자를 넘으면, 또는 아직 모으는 판이면 지급하지 않는다', () => {
    const { store } = completed();
    expect(payBoard(store, 1, '   ')).toBe(false);
    expect(payBoard(store, 1, '가'.repeat(41))).toBe(false);
    expect(payBoard(store, 2, '놀이터')).toBe(false);
    expect(payBoard(store, 9, '놀이터')).toBe(false);
    expect(cleanRewardText('가'.repeat(40))).toHaveLength(40);
  });

  it('내용 수정, 지급 취소(보상 대기로 되돌림)', () => {
    const { store } = completed();
    payBoard(store, 1, '놀이터 가기');
    expect(editReward(store, 1, '키즈카페 가기')).toBe(true);
    expect(store.data.rewards.boards[0].rewardText).toBe('키즈카페 가기');
    expect(cancelPayment(store, 1)).toBe(true);
    expect(store.data.rewards.boards[0]).toMatchObject({ paidAt: null, rewardText: null });
    expect(waitingBoards(store).map((b) => b.no)).toEqual([1]);
    expect(cancelPayment(store, 1)).toBe(false);
  });

  it('보상 기록은 최신순', () => {
    const { store } = setup();
    const boards = store.data.rewards.boards;
    boards.length = 0;
    boards.push(
      { no: 1, size: 5, startedAt: '2026-10-01', completedAt: '2026-10-05', paidAt: '2026-10-06', rewardText: 'a', stickers: [] },
      { no: 2, size: 5, startedAt: '2026-10-05', completedAt: '2026-10-10', paidAt: '2026-10-12', rewardText: 'b', stickers: [] },
      { no: 3, size: 5, startedAt: '2026-10-10', completedAt: null, paidAt: null, rewardText: null, stickers: [] },
    );
    expect(paidBoards(store).map((b) => b.no)).toEqual([2, 1]);
  });
});
