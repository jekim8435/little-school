/**
 * 과목 이용 권한 (09 문서 1장 ‘과목 이용 권한’, R-07).
 * 과목에 들어갈 수 있는지는 여기서만 판단한다. 과목 코드에서 잠금 로직을 직접 만들지 않는다.
 * 지금은 모든 과목이 열려 있다. 수익화(유료 앱·과목 팩 등)가 정해지면 이 파일만 고친다.
 *
 * 부모 모드 과목 관리의 켜기/끄기(settings.subjects)는 그대로 두고, 그 위에 한 겹 더 거른다:
 * 허브에 보이는 과목 = 켜져 있고(visibleSubjects) + 이용 권한이 있는(canUseSubject) 과목
 */

/** 이 과목을 쓸 수 있는지 (현재 항상 true) */
export function canUseSubject(_appId: string): boolean {
  return true;
}

/** 이용 권한이 있는 과목만 남긴다 (순서 유지) */
export function usableSubjects(ids: string[]): string[] {
  return ids.filter((id) => canUseSubject(id));
}
