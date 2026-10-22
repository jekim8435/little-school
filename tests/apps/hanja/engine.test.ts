import { describe, expect, it } from 'vitest';
import set1 from '../../../src/apps/hanja/data/set-1.json';
import { drawFromBag, emptyBag, readBag, type BagState } from '../../../src/shared/hanja/bag';
import { comboKey, partnersOf, pickChoices } from '../../../src/shared/hanja/choices';
import { applyResult, readMastery } from '../../../src/shared/hanja/mastery';
import {
  answerProblem,
  boardCards,
  createQuizRound,
  currentProblem,
  isPair,
  isRoundDone,
  progressOf,
  splitBoards,
} from '../../../src/shared/hanja/round';
import { charKey, nextUnlearned, type HanjaSet } from '../../../src/shared/hanja/types';

const set = set1 as HanjaSet;
const chars = set.items.map((it) => it.char);

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

const noRepeat = (list: string[]) => list.every((c, i) => i === 0 || list[i - 1] !== c);

describe('세트 1 데이터', () => {
  it('32자, 포스터 순서·학습지 표기 그대로', () => {
    expect(chars.join('')).toBe('日月火水木金土川天地山林石田江海口目手足人心力身父母兄弟子孝男女');
    expect(set.items.map((it) => it.no)).toEqual(chars.map((_, i) => i + 1));
    const read = (c: string) => {
      const it = set.items.filter((x) => x.char === c)[0];
      return `${it.meaning} ${it.sound}`;
    };
    expect(read('金')).toBe('금 금');
    expect(read('弟')).toBe('동생 제');
    expect(read('男')).toBe('남자 남');
    expect(read('山')).toBe('산 산');
    expect(read('日')).toBe('해 일');
    expect(read('海')).toBe('바다 해');
  });

  it('그림 id가 서로 다르고, 헷갈리는 짝은 모두 세트 안의 한자', () => {
    const pics = set.items.map((it) => it.picture);
    expect(new Set(pics).size).toBe(32);
    for (const g of set.confusables) for (const c of g) expect(chars).toContain(c);
  });

  it('대사 ID 표기: 海 → u6d77', () => {
    expect(charKey('海')).toBe('u6d77');
  });

  it('다음 2자: 순서대로 아직 고르지 않은 앞의 두 자 (건너뛴 자리도 채움)', () => {
    expect(nextUnlearned(set.items, chars.slice(0, 16), 2)).toEqual(['口', '目']);
    expect(nextUnlearned(set.items, ['日', '火'], 2)).toEqual(['月', '水']);
    expect(nextUnlearned(set.items, chars, 2)).toEqual([]);
  });
});

describe('출제 주머니', () => {
  it('배운 한자 16자로 100판: 주머니를 다 비운 시점마다 한자별 출제 횟수가 모두 같다', () => {
    const learned = chars.slice(0, 16);
    const rng = seeded(1);
    let bag: BagState = emptyBag();
    const counts: Record<string, number> = {};
    const all: string[] = [];
    for (let round = 0; round < 100; round++) {
      const r = drawFromBag(bag, learned, 10, rng);
      bag = r.state;
      for (const c of r.items) {
        counts[c] = (counts[c] || 0) + 1;
        all.push(c);
        if (all.length % 16 === 0) {
          const v = learned.map((x) => counts[x] || 0);
          expect(Math.min(...v)).toBe(Math.max(...v));
        } else {
          const v = learned.map((x) => counts[x] || 0);
          expect(Math.max(...v) - Math.min(...v)).toBeLessThanOrEqual(1);
        }
      }
    }
    expect(all.length).toBe(1000);
    expect(noRepeat(all)).toBe(true);
  });

  it('배운 한자 6자로 한 판: 각 한자가 1~2번씩, 연달아 같은 한자 없이', () => {
    const learned = chars.slice(0, 6);
    for (let seed = 1; seed <= 50; seed++) {
      const { items } = drawFromBag(emptyBag(), learned, 10, seeded(seed));
      expect(items.length).toBe(10);
      for (const c of learned) {
        const n = items.filter((x) => x === c).length;
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(2);
      }
      expect(noRepeat(items)).toBe(true);
    }
  });

  it('판 사이 경계에서 같은 한자가 연달아 나오지 않는다 (저장했다 다시 읽어도)', () => {
    for (const size of [2, 4, 5, 10, 16]) {
      const learned = chars.slice(0, size);
      const rng = seeded(size);
      let bag = emptyBag();
      let prev: string | null = null;
      for (let round = 0; round < 60; round++) {
        const r = drawFromBag(bag, learned, 10, rng);
        if (prev !== null) expect(r.items[0]).not.toBe(prev);
        expect(noRepeat(r.items)).toBe(true);
        prev = r.items[r.items.length - 1];
        bag = readBag(JSON.parse(JSON.stringify(r.state)));
      }
    }
  });

  it('배운 한자를 추가·해제한 뒤: 해제된 한자는 안 나오고 새 한자는 다음 판에 나온다', () => {
    const rng = seeded(7);
    let learned = chars.slice(0, 16);
    let bag = drawFromBag(emptyBag(), learned, 10, rng).state; // 주머니에 6자가 남은 상태
    learned = learned.filter((c) => c !== '日' && c !== '海' && c !== '山').concat(['口', '目']);
    for (let round = 0; round < 20; round++) {
      const r = drawFromBag(bag, learned, 10, rng);
      for (const c of r.items) expect(learned).toContain(c);
      if (round === 0) {
        expect(r.items).toContain('口');
        expect(r.items).toContain('目');
      }
      bag = r.state;
    }
  });

  it('배운 한자가 없으면 아무것도 꺼내지 않는다, 깨진 저장값은 빈 주머니', () => {
    expect(drawFromBag(emptyBag(), [], 10).items).toEqual([]);
    expect(readBag('x')).toEqual(emptyBag());
    expect(readBag({ queue: ['日', 3], known: null, last: 5 })).toEqual({ queue: ['日'], known: [], last: null });
  });
});

describe('보기 고르기', () => {
  const learned = chars.slice(0, 16);

  it('정답 포함 개수대로, 모두 배운 한자, 서로 다르다', () => {
    const rng = seeded(3);
    for (const count of [3, 4]) {
      for (const answer of learned) {
        const c = pickChoices(answer, learned, count, set.confusables, [], rng);
        expect(c.length).toBe(count);
        expect(c).toContain(answer);
        expect(new Set(c).size).toBe(count);
        for (const x of c) expect(learned).toContain(x);
      }
    }
  });

  it('헷갈리는 짝이 둘 다 배운 한자면 우선 넣는다', () => {
    expect(partnersOf('川', set.confusables).sort()).toEqual(['天', '江', '海'].sort());
    expect(partnersOf('目', set.confusables).sort()).toEqual(['木', '日', '田'].sort());
    for (let seed = 1; seed <= 20; seed++) {
      const rng = seeded(seed);
      expect(pickChoices('天', learned, 3, set.confusables, [], rng)).toContain('川');
      expect(pickChoices('水', learned, 3, set.confusables, [], rng)).not.toContain('手'); // 手는 아직 안 배움
      const c = pickChoices('日', learned, 3, set.confusables, [], rng);
      expect(c).toContain('田'); // 目은 안 배움, 田만 배움
      const sea = pickChoices('海', learned, 3, set.confusables, [], rng);
      expect(sea).toContain('川');
      expect(sea).toContain('江');
    }
  });

  it('정답 위치가 고르게 섞인다', () => {
    const rng = seeded(11);
    const pos = [0, 0, 0];
    for (let i = 0; i < 300; i++) pos[pickChoices('月', learned, 3, set.confusables, [], rng).indexOf('月')]++;
    for (const n of pos) expect(n).toBeGreaterThan(60);
  });

  it('같은 판에서 같은 보기 조합을 되풀이하지 않는다 (조합이 남아 있으면)', () => {
    const rng = seeded(5);
    const used: string[] = [];
    const keys: string[] = [];
    for (let i = 0; i < 10; i++) keys.push(comboKey(pickChoices('月', learned, 3, set.confusables, used, rng)));
    expect(new Set(keys).size).toBe(10);
  });

  it('배운 한자가 보기 수보다 적으면 있는 만큼만', () => {
    expect(pickChoices('日', ['日', '月'], 4, set.confusables).sort()).toEqual(['日', '月'].sort());
  });
});

describe('익힘 단계', () => {
  it('맞히면 +1(최대 3), 틀리면 −1(최소 0)', () => {
    let m = readMastery(undefined);
    m = applyResult(m, '海', true);
    m = applyResult(m, '海', true);
    m = applyResult(m, '海', true);
    m = applyResult(m, '海', true);
    expect(m['海']).toBe(3);
    m = applyResult(m, '海', false);
    expect(m['海']).toBe(2);
    m = applyResult(m, '山', false);
    expect(m['山']).toBe(0);
  });

  it('깨진 저장값은 버린다', () => {
    expect(readMastery({ 海: 2, 山: 'x', 日: 9, 月: -1 })).toEqual({ 海: 2, 日: 3 });
  });
});

describe('한 판 진행', () => {
  it('틀린 한자는 판 끝에 한 번만 다시, 진행 막대는 10에서 멈춘다', () => {
    let r = createQuizRound(chars.slice(0, 10));
    r = answerProblem(r, false); // 日 틀림
    for (let i = 1; i < 10; i++) r = answerProblem(r, i !== 3); // 水 틀림
    expect(progressOf(r)).toBe(10);
    expect(isRoundDone(r)).toBe(false);
    expect(currentProblem(r)).toEqual({ char: '日', retry: true });
    r = answerProblem(r, false); // 다시 틀려도 더 내지 않음
    expect(currentProblem(r)).toEqual({ char: '水', retry: true });
    r = answerProblem(r, true);
    expect(isRoundDone(r)).toBe(true);
    expect(r.problems.length).toBe(12);
    expect(progressOf(r)).toBe(10);
  });

  it('짝 맞추기: 5쌍씩 두 판, 한 판에 카드 10장', () => {
    const boards = splitBoards(chars.slice(0, 10));
    expect(boards.map((b) => b.length)).toEqual([5, 5]);
    const cards = boardCards(boards[0], seeded(2));
    expect(cards.length).toBe(10);
    expect(cards.filter((c) => c.kind === 'hanja').length).toBe(5);
    expect(new Set(cards.map((c) => c.key)).size).toBe(10);
  });

  it('같은 한자가 두 번이면 어느 같은 그림과 맞춰도 짝', () => {
    const cards = boardCards(['日', '月', '日', '火', '水'], seeded(4));
    const hanjaSun = cards.filter((c) => c.kind === 'hanja' && c.char === '日');
    const picSun = cards.filter((c) => c.kind === 'picture' && c.char === '日');
    for (const a of hanjaSun) for (const b of picSun) expect(isPair(a, b)).toBe(true);
    expect(isPair(hanjaSun[0], hanjaSun[1])).toBe(false);
  });
});

describe('한자똑똑 대사·설정', async () => {
  const voices = (await import('../../../src/apps/hanja/voices.json')).default as Record<string, { text: string }>;
  const { HANJA_VOICES } = await import('../../../src/apps/hanja/index');
  const { hanjaSettings } = await import('../../../src/apps/hanja/settings');

  it('엔진이 부르는 대사 ID가 모두 voices.json에 있다 (훈음·뜻만 32자씩)', () => {
    const ids = [...Object.values(HANJA_VOICES.ask), ...Object.values(HANJA_VOICES.praise), 'hanja-1.hub.name'];
    for (const c of chars) ids.push(HANJA_VOICES.char(c), HANJA_VOICES.meaning(c));
    for (const id of ids) expect(voices[id], id).toBeDefined();
    expect(voices[HANJA_VOICES.char('海')].text).toBe('바다 해');
    expect(voices[HANJA_VOICES.meaning('海')].text).toBe('바다');
  });

  it('배운 한자 설정: 8열, 기본 日~海 16자, 다음 2자 추가·모두 해제', () => {
    const f = hanjaSettings(set).filter((x) => x.key === 'learned')[0];
    if (f.type !== 'multi') throw new Error('multi가 아님');
    expect(f.columns).toBe(8);
    expect(f.options.length).toBe(32);
    expect(f.default.join('')).toBe('日月火水木金土川天地山林石田江海');
    const [addNext, clearAll] = f.actions!;
    expect(addNext.run(f.default.slice())).toEqual(f.default.concat(['口', '目']));
    expect(addNext.run(['日', '火'])).toEqual(['日', '火', '月', '水']);
    expect(clearAll.run(f.default.slice())).toEqual([]);
  });
});
