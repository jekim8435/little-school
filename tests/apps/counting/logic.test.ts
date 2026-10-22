import { describe, expect, it } from 'vitest';
import { drawFromBag, emptyBag, type BagState } from '../../../src/shared/bag';
import { pickNumberChoices } from '../../../src/apps/counting/logic/choices';
import { isAllCounted, startCount, tapObject } from '../../../src/apps/counting/logic/count';
import { canSubmit, capacityFor, cellEnabled, framesFor, placeBead, removeBead } from '../../../src/apps/counting/logic/frame';
import { MIN_TOUCH, scatter } from '../../../src/apps/counting/logic/layout';
import {
  addResult,
  clampLevel,
  initialLevel,
  judgeLevel,
  levelPool,
  playLevel,
  readLevel,
  type Level,
  type LevelState,
} from '../../../src/apps/counting/logic/level';
import { makeSheets, pickDistinct, pictureColumns } from '../../../src/apps/counting/logic/match';
import {
  answerOf,
  answerProblem,
  countRound,
  createRound,
  frameDraws,
  frameRound,
  isRoundDone,
  pickObjects,
  progressOf,
} from '../../../src/apps/counting/logic/round';
import { counterWord, numberWord, totalSentence } from '../../../src/apps/counting/logic/words';
import { allVoiceIds, V } from '../../../src/apps/counting/voiceIds';
import voicesJson from '../../../src/apps/counting/voices.json';

/** 고정 씨앗 난수 (mulberry32) */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noRepeat = <T>(list: T[]) => list.every((c, i) => i === 0 || list[i - 1] !== c);
const results = (s: LevelState, list: boolean[]) => list.reduce((acc, c) => addResult(acc, c), s);

describe('단계 조절', () => {
  it('최근 8문제 중 7개 정답이면 오른다 (8문제가 차기 전에는 안 오름)', () => {
    const s = results(initialLevel(), [true, true, true, true, true, true, true]);
    expect(judgeLevel(s, 20).level).toBe(1);
    const up = judgeLevel(addResult(s, false), 20);
    expect(up.level).toBe(2);
    expect(up.recent).toEqual([]);
  });

  it('8문제 중 6개 정답이면 그대로', () => {
    const s = results(initialLevel(), [true, false, true, true, false, true, true, true]);
    expect(judgeLevel(s, 20).level).toBe(1);
  });

  it('최근 6문제 중 3개 틀리면 내린다, 1단계 아래로는 안 감', () => {
    const s2: LevelState = { level: 2, recent: [] };
    const down = judgeLevel(results(s2, [true, false, true, false, true, false]), 20);
    expect(down.level).toBe(1);
    expect(down.recent).toEqual([]);
    expect(judgeLevel(results(initialLevel(), [false, false, false, false]), 20).level).toBe(1);
    // 오래된 틀림은 최근 6문제 밖
    expect(judgeLevel(results(s2, [false, false, true, true, true, true, true, false]), 20).level).toBe(2);
  });

  it('최대 수 설정을 넘어 오르지 않고, 최대 수를 낮추면 단계도 내린다', () => {
    const all = results(initialLevel(), [true, true, true, true, true, true, true, true]);
    expect(judgeLevel(all, 5).level).toBe(1);
    expect(judgeLevel({ level: 2, recent: all.recent }, 10).level).toBe(2);
    expect(clampLevel({ level: 3, recent: [true] }, 10)).toEqual({ level: 2, recent: [] });
    expect(clampLevel({ level: 2, recent: [true] }, 20)).toEqual({ level: 2, recent: [true] });
  });

  it('자동 단계 조절을 끄면 최대 수의 단계로 낸다', () => {
    expect(playLevel({ level: 1, recent: [] }, 20, false)).toBe(3);
    expect(playLevel({ level: 1, recent: [] }, 10, false)).toBe(2);
    expect(playLevel({ level: 3, recent: [] }, 10, true)).toBe(2);
    expect(playLevel({ level: 2, recent: [] }, 20, true)).toBe(2);
  });

  it('재도전 문제는 계산에서 빠진다 (판 진행은 재도전을 첫 시도 기록 없이 따로 둔다)', () => {
    // 첫 시도 7개 정답 + 1개 틀림 → 그 틀린 문제의 재도전 결과는 addResult에 넣지 않으므로 8개 기준으로 오른다
    let r = createRound([1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ kind: 'make' as const, n, retry: false })));
    let s = initialLevel();
    const answers = [true, true, false, true, true, true, true, true, false];
    for (const ok of answers) {
      const p = r.problems[r.index];
      if (!p.retry) s = addResult(s, ok);
      r = answerProblem(r, ok);
    }
    expect(isRoundDone(r)).toBe(true);
    expect(s.recent.length).toBe(8);
    expect(judgeLevel(s, 20).level).toBe(2);
  });

  it('저장값 읽기: 깨진 값은 1단계', () => {
    expect(readLevel('x')).toEqual(initialLevel());
    expect(readLevel({ level: 3, recent: [true, 1, false] })).toEqual({ level: 3, recent: [true, false] });
  });
});

describe('출제', () => {
  const draw = (level: Level, rounds: number, size: number, seed: number) => {
    const rng = seeded(seed);
    let bag: BagState = emptyBag();
    const all: string[] = [];
    for (let i = 0; i < rounds; i++) {
      const r = drawFromBag(bag, levelPool(level), size, rng);
      bag = JSON.parse(JSON.stringify(r.state));
      all.push(...r.items);
    }
    return all;
  };

  it('1단계는 1~5 고르게', () => {
    const all = draw(1, 100, 6, 1);
    for (let n = 1; n <= 5; n++) expect(all.filter((x) => x === String(n)).length).toBe(120);
    expect(all.every((x) => Number(x) >= 1 && Number(x) <= 5)).toBe(true);
  });

  it('2단계는 6~10이 2/3, 3단계는 11~20이 2/3 (충분히 많이 돌렸을 때)', () => {
    const two = draw(2, 500, 6, 2);
    expect(two.filter((x) => Number(x) >= 6).length / two.length).toBeCloseTo(2 / 3, 1);
    expect(two.every((x) => Number(x) >= 1 && Number(x) <= 10)).toBe(true);
    const three = draw(3, 500, 6, 3);
    expect(three.filter((x) => Number(x) >= 11).length / three.length).toBeCloseTo(2 / 3, 1);
  });

  it('연달아 같은 수 없음 — 판 안과 판 경계 모두 (같은 수가 두 개씩 든 2·3단계도)', () => {
    for (const level of [1, 2, 3] as Level[]) for (let seed = 1; seed <= 20; seed++) expect(noRepeat(draw(level, 30, 6, seed))).toBe(true);
  });

  it('‘10이 되려면’은 1단계에 나오지 않고, 2단계부터 한 판에 2문제(미리 놓는 수 1~9, 서로 다름)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = seeded(seed);
      const one = frameRound([1, 2, 3, 4, 5, 3], 1, rng);
      expect(one.problems.some((p) => p.kind === 'more')).toBe(false);
      expect(frameDraws(1, 6)).toBe(6);
      expect(frameDraws(2, 6)).toBe(4);
      const two = frameRound([6, 7, 8, 9], 2, rng);
      expect(two.problems.length).toBe(6);
      const more = two.problems.filter((p) => p.kind === 'more').map((p) => (p.kind === 'more' ? p.placed : 0));
      expect(more.length).toBe(2);
      expect(more[0]).not.toBe(more[1]);
      for (const m of more) expect(m >= 1 && m <= 9).toBe(true);
    }
    expect(answerOf({ kind: 'more', placed: 7, retry: false })).toBe(3);
  });

  it('세어 보기 사물은 문제마다 바뀌고 판 사이에도 연달아 같지 않음', () => {
    const rng = seeded(4);
    const r = countRound([1, 2, 3, 4, 5, 6], 'apple', rng);
    const objs = r.problems.map((p) => (p.kind === 'count' ? p.object : ''));
    expect(objs[0]).not.toBe('apple');
    expect(noRepeat(objs)).toBe(true);
    expect(noRepeat(pickObjects(40, null, rng))).toBe(true);
  });

  it('틀린 문제는 판 끝에 한 번만 다시, 진행 막대는 본 문제 수에서 멈춤', () => {
    let r = countRound([3, 4], null, seeded(5));
    r = answerProblem(r, false);
    r = answerProblem(r, true);
    expect(r.problems.length).toBe(3);
    expect(r.problems[2].retry).toBe(true);
    expect(progressOf(r)).toBe(2);
    r = answerProblem(r, false);
    expect(isRoundDone(r)).toBe(true);
    expect(progressOf(r)).toBe(2);
  });
});

describe('보기', () => {
  it('정답 포함, 중복 없음, 모두 범위 안, 보기 개수 설정을 따름', () => {
    const rng = seeded(6);
    for (const [max, count] of [
      [5, 3],
      [5, 4],
      [10, 3],
      [10, 4],
      [20, 4],
    ]) {
      for (let a = 1; a <= max; a++) {
        const c = pickNumberChoices(a, 1, max, count, [], rng);
        expect(c.length).toBe(count);
        expect(c).toContain(a);
        expect(new Set(c).size).toBe(count);
        for (const n of c) expect(n >= 1 && n <= max).toBe(true);
      }
    }
  });

  it('정답 주변(±2)에서 먼저 고르고, 모자라면 넓힌다', () => {
    const rng = seeded(7);
    for (let i = 0; i < 20; i++) {
      const c = pickNumberChoices(10, 1, 20, 3, [], rng);
      for (const n of c) expect(Math.abs(n - 10)).toBeLessThanOrEqual(2);
    }
    expect(pickNumberChoices(1, 1, 5, 4, [], rng).sort()).toEqual([1, 2, 3, 4]);
    expect(pickNumberChoices(10, 1, 10, 4, [], rng).sort((a, b) => a - b)).toEqual([7, 8, 9, 10]);
  });

  it('범위 전체로도 모자라면 있는 만큼만', () => {
    expect(pickNumberChoices(1, 1, 2, 4).sort()).toEqual([1, 2]);
  });
});

describe('사물 배치', () => {
  // 사물 영역(pt): 아이패드 1024×684 과목 영역의 왼쪽 62% · 갤럭시 1334×800(높이 기준 단위로 약 1247×688pt)의 왼쪽 62%
  const areas: [string, number, number][] = [
    ['아이패드', 600, 590],
    ['갤럭시', 750, 600],
  ];
  for (const [name, w, h] of areas) {
    it(`${name}: 1~20개 모두 영역 안, 겹치지 않음, 터치 60pt 이상`, () => {
      for (let n = 1; n <= 20; n++) {
        for (let seed = 1; seed <= 10; seed++) {
          const items = scatter(n, w, h, seeded(seed * 100 + n));
          expect(items.length).toBe(n);
          for (const it of items) {
            expect(it.size).toBeGreaterThanOrEqual(MIN_TOUCH);
            expect(it.x).toBeGreaterThanOrEqual(0);
            expect(it.y).toBeGreaterThanOrEqual(0);
            expect(it.x + it.size).toBeLessThanOrEqual(w);
            expect(it.y + it.size).toBeLessThanOrEqual(h);
          }
          for (let i = 0; i < items.length; i++)
            for (let j = i + 1; j < items.length; j++) {
              const a = items[i];
              const b = items[j];
              const apart = a.x + a.size <= b.x || b.x + b.size <= a.x || a.y + a.size <= b.y || b.y + b.size <= a.y;
              expect(apart).toBe(true);
            }
        }
      }
    });
  }
});

describe('10칸 판', () => {
  it('어느 빈 칸을 눌러도 순서대로 채워지고, 구슬을 누르면 마지막 하나가 빠진다', () => {
    let count = 0;
    for (let i = 0; i < 7; i++) count = placeBead(count, 2);
    expect(count).toBe(7);
    expect(removeBead(count)).toBe(6);
    expect(removeBead(0)).toBe(0);
    expect(placeBead(10, 2)).toBe(10);
  });

  it('1단계는 아랫줄 비활성(5칸), 3단계는 판 2개 20칸을 첫 판부터', () => {
    expect(capacityFor(1)).toBe(5);
    expect(cellEnabled(4, 1)).toBe(true);
    expect(cellEnabled(5, 1)).toBe(false);
    expect(placeBead(5, 1)).toBe(5);
    expect(framesFor(3)).toBe(2);
    expect(capacityFor(3)).toBe(20);
    let c = 0;
    for (let i = 0; i < 12; i++) c = placeBead(c, 3);
    expect(c).toBe(12); // 0~9 첫 판, 10~11 둘째 판
  });

  it('‘다 했어요’는 구슬 1개 이상일 때만', () => {
    expect(canSubmit(0)).toBe(false);
    expect(canSubmit(1)).toBe(true);
  });
});

describe('짝짓기', () => {
  it('한 장의 4개 수가 모두 다르고 범위 안, 그림 사물도 모두 다름', () => {
    for (const level of [1, 2, 3] as Level[]) {
      const max = level === 1 ? 5 : level === 2 ? 10 : 20;
      for (const sheet of makeSheets(level, 50, 4, seeded(level))) {
        expect(new Set(sheet.numbers).size).toBe(4);
        for (const n of sheet.numbers) expect(n >= 1 && n <= max).toBe(true);
        expect(sheet.pictures.map((p) => p.n).sort()).toEqual(sheet.numbers.slice().sort());
        expect(new Set(sheet.pictures.map((p) => p.object)).size).toBe(4);
      }
    }
    expect(pickDistinct(1, 5, seeded(9)).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('그림 카드: 세로 5개씩 줄, 11 이상은 10 묶음(두 줄) + 낱개', () => {
    expect(pictureColumns(7)).toEqual([
      { count: 5, bundle: false },
      { count: 2, bundle: false },
    ]);
    expect(pictureColumns(10).map((c) => c.count)).toEqual([5, 5]);
    expect(pictureColumns(17)).toEqual([
      { count: 5, bundle: true },
      { count: 5, bundle: true },
      { count: 5, bundle: false },
      { count: 2, bundle: false },
    ]);
    expect(pictureColumns(20).length).toBe(4);
  });
});

describe('세어 보기', () => {
  it('이미 센 사물을 다시 눌러도 수가 늘지 않음, 누른 횟수는 셈', () => {
    let s = startCount(3);
    s = tapObject(s, 1).state;
    const again = tapObject(s, 1);
    expect(again.fresh).toBe(false);
    expect(again.state.counted).toBe(1);
    s = again.state;
    s = tapObject(s, 0).state;
    s = tapObject(s, 2).state;
    expect(s.marks).toEqual([2, 1, 3]);
    expect(isAllCounted(s)).toBe(true);
    expect(s.taps).toBe(4);
  });
});

describe('대사', () => {
  const voices = voicesJson as Record<string, { text: string; draft?: boolean }>;

  it('코드가 부르는 대사 ID가 모두 voices.json에 있고, 개발 중이라 모두 draft', () => {
    for (const id of allVoiceIds()) expect(voices[id], id).toBeDefined();
    expect(voices['counting.hub.name']).toBeDefined();
    for (const id of Object.keys(voices)) expect(voices[id].draft, id).toBe(true);
  });

  it('고유어 수 읽기와 개수 말(한/두/세/네/스무)', () => {
    expect([1, 2, 3, 4, 5, 10, 11, 14, 20].map(numberWord)).toEqual(['하나', '둘', '셋', '넷', '다섯', '열', '열하나', '열넷', '스물']);
    expect([1, 2, 3, 4, 11, 12, 13, 14, 20].map(counterWord)).toEqual(['한', '두', '세', '네', '열한', '열두', '열세', '열네', '스무']);
    for (let n = 1; n <= 20; n++) {
      expect(voices[V.num(n)].text).toBe(numberWord(n));
      expect(voices[V.total(n)].text).toBe(totalSentence(n));
    }
    expect(voices[V.total(1)].text).toBe('모두 한 개!');
    expect(voices[V.total(20)].text).toBe('모두 스무 개!');
    expect(voices[V.praise.round].text).toBe('모두 끝! 정말 잘했어요');
  });
});
