/**
 * 과목 목록(registry)과 부모 모드 과목 설정(settings.subjects)을 맞춘다 (명세 4-1, 8-4).
 */
import type { SubjectSetting } from './storage';

/**
 * registry에 있는데 설정에 없는 과목을 뒤에 추가한다(켜진 상태, 비율 3).
 * registry에서 빠진 과목의 설정은 지우지 않고 둔다(다시 추가되면 그대로 쓰도록). 바뀌었으면 true
 */
export function syncSubjects(subjects: SubjectSetting[], ids: string[]): boolean {
  let changed = false;
  let next = subjects.reduce((max, s) => Math.max(max, s.order + 1), 0);
  for (const id of ids) {
    if (subjects.some((s) => s.id === id)) continue;
    subjects.push({ id, enabled: true, order: next++, starsPerSticker: 3 });
    changed = true;
  }
  return changed;
}

/** 허브에 보일 과목 id: registry에 있고 켜진 것, 순서대로 */
export function visibleSubjects(subjects: SubjectSetting[], ids: string[]): string[] {
  return subjects
    .filter((s) => s.enabled && ids.indexOf(s.id) >= 0)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.id);
}

export function subjectSetting(subjects: SubjectSetting[], id: string): SubjectSetting | undefined {
  for (const s of subjects) if (s.id === id) return s;
  return undefined;
}
