/** 날짜 키: 기기 로컬 날짜 'YYYY-MM-DD' (명세 7장). 자정이 하루의 경계 */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 두 날짜 키 사이의 날 수 (b - a). 서머타임과 무관하게 달력 날짜로 센다 */
export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86400000);
}

/** 날짜 키에 n일을 더한 날짜 키 */
export function addDays(key: string, n: number): string {
  const d = new Date(utc(key) + n * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function isDateKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function utc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** '2026-10-28' → '10월 28일' (아이·부모 화면 표시용) */
export function formatDay(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일`;
}
