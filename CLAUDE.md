# 꼬마학교 (Little School) — Claude Code 작업 안내

자녀(2022년 5월생) 학습용 태블릿 웹앱(PWA). 허브 앱(껍데기)에 과목 모듈을 하나씩 끼워 넣는 구조다.

## 문서 위치 (기획의 기준)

| 문서 | 내용 |
| --- | --- |
| `docs/little-school-step1-shell.md` | 1단계 껍데기 앱 구현 명세 + 2단계(한글쓰기 앱 이식) 가이드 + 음원 관리(15장) |
| `docs/little-school-apps.md` | 과목 목록, 과목별 활동·별 기준·설정 |
| `docs/planning-log.md` | 기획 변경 기록 (날짜순) |
| `docs/ipad-checklist.md` | 1단계 10번 아이패드 실기기 점검표(명세 13장, PC 확인 항목 표시) |
| `docs/galaxy-tab-checklist.md` | 갤럭시 탭 실기기 확인 보류 목록. 단계마다 확인할 항목을 덧붙이고, 기기가 준비되면 한 번에 확인·일괄 수정 |
| `docs/voice/_template/` | 한글쓰기 앱의 Typecast 음원 도구 사본(`voice-make.mjs`, `typecast.json`, `대사목록.csv`) — 음원 도구의 바탕 |
| `legacy/writing-practice/` | 2단계 이식용 한글쓰기 앱 소스 사본(읽기 전용, git 제외, 2단계 후 삭제). 원본: `D:\@기타\@개인\쓰기App` |

- 기획 논의는 Claude 프로젝트 ‘유아학습App개발’ 대화에서 하고, 결과를 이 폴더의 `docs/`에 반영한다. **`docs/`가 기준 문서다.**
- 구현 중 명세와 다르게 해야 할 이유가 생기면 코드만 바꾸지 말고 해당 문서와 `docs/planning-log.md`도 함께 고친다.
- 명세가 모호하면 추측해서 구현하지 말고 질문하거나, 선택한 해석을 `planning-log.md`에 남긴다.

## 꼭 지킬 규칙 (요약 — 자세한 내용은 명세)

1. **대상 기기 2종**: iPad Air 1(iOS 12.5, Safari 12, 손가락·정전식 펜) + Galaxy Tab S6 Lite(Chrome, S펜). Safari 12 기준으로 만들고 두 기기에서 확인한다. **지금은 갤럭시 탭 확인을 보류 중** — 코드는 명세대로 넣고, 갤럭시 탭에서 확인할 항목은 `docs/galaxy-tab-checklist.md`에 추가해 둔다. 기능은 기능 감지로 나누고 User-Agent는 안내 문구에만 쓴다. (명세 2-2, 2-5)
2. **가로 모드 전용**: 세로 레이아웃은 만들지 않는다. 아이 화면에는 세로 스크롤이 없다. 높이 기준 배치, 가로 폭 1024~1280 대응. (2-4, 10장)
3. **스택**: TypeScript + Vite + 바닐라 JS + vite-plugin-pwa + Vitest. 한글쓰기 앱의 호환성·입력·PWA 코드를 재사용한다. (2-1)
4. **호환성 검사**: `tests/compat.test.ts`와 `scripts/check-compat.mjs`를 통과해야 배포된다. Pointer Events 단독 사용, flex `gap`, `ResizeObserver`, `Array.prototype.at` 등 금지 목록은 명세 2-2.
5. **과목 모듈 규약**: `mount(el, ctx)` / `unmount()`. 과목은 `localStorage`·별 계산·소리 설정을 직접 다루지 않고 `ctx.store`, `ctx.reward.star()`, `ctx.audio`를 쓴다. 설정은 `settingsSchema`로만 노출한다. (4장)
6. **보상**: 별은 과목별로 쌓이고 과목별 교환 비율(3/5/10)로 스티커 교환, 과목당 하루 스티커 1장. (6장)
7. **음성**: 아이에게 들려주는 문장은 `voices.json`에 대사 ID로 등록하고 `ctx.audio.say(id)`로 재생. 단계·과목 마무리 때 음원 목록을 정리해 Typecast로 제작한다. (15장)
8. **아이 안전**: 외부 링크 금지, 확대·길게 누르기·당겨서 새로고침 차단. (2-3)

## 작업 순서

- 1단계: 명세 12장 ‘구현 순서’ → 13장 체크리스트
- 2단계: 명세 14장 (한글쓰기 앱 이식)
- 이후 과목: `docs/little-school-apps.md`의 과목 항목 + 명세 부록 ‘새 과목 추가 체크리스트’

## 커밋

- 작은 단위로 커밋하고, 메시지는 한국어로 무엇을 바꿨는지 적는다.
- 문서만 바꾼 커밋은 `docs:`로 시작한다.
