# 꼬마학교 (Little School) — 1단계 껍데기 앱 구현 명세

> 저장소: `little-school` · 대상 기기: **iPad Air 1** (iOS 12.5.x, Safari 12, 정전식 펜·손가락) + **Galaxy Tab S6 Lite** (Android, Chrome, S펜) · 배포: GitHub Pages + 홈 화면에 추가(PWA)
> 두 기기는 같은 주소의 같은 앱을 쓴다. 기기별 분기는 최소로 하고, **기능 감지**로 처리한다(2-5).
> 이 문서는 Claude Code 등에서 그대로 구현 지시서로 쓰는 것을 전제로 작성했다.
> **기술 기준: 이미 만든 한글쓰기 앱과 같은 스택(TypeScript + Vite + 바닐라 JS + vite-plugin-pwa + Vitest)을 쓰고, 그 앱의 호환성·입력·PWA 코드를 가져와 시작한다.**

---

## 0. 한 줄 요약

과목 앱을 하나씩 끼워 넣을 수 있는 **허브 앱**을 만든다. 1단계에서는 과목 없이 공통 기능(허브 화면, 별 보상과 스티커판, 부모 모드, 학습 시간 관리, 기록 저장)과 **과목 모듈 규약**만 완성하고, 샘플 과목 1개로 규약이 동작하는지 검증한다.

| 단계 | 내용 | 결과물 |
| --- | --- | --- |
| 1단계 (이 문서) | 껍데기 앱 + 공통 기능 + 모듈 규약 + 샘플 과목 | `little-school` 저장소, GitHub Pages 배포 |
| 2단계 | 기존 한글쓰기 앱을 과목 모듈 `writing`으로 이식 | 같은 저장소의 `src/apps/writing/` |
| 3단계~ | 새 과목을 하나씩 추가 (`little-school-apps.md` 참고) | `src/apps/<id>/` 폴더 추가 |

---

## 1. 범위

### 1-1. 1단계에 포함

- 시작 화면(“눌러서 시작”, 오디오 잠금 해제)
- 허브(과목 타일 목록)
- 별 보상 + 과목별 스티커 교환(하루 1장) + 스티커판(가로 슬라이드) + 보상 지급 기록
- 오늘 공부 끝 화면(하루 학습 시간 도달 시)
- 부모 모드(진입 잠금, 기록 보기, 과목 관리, 시간·보상 설정, 백업/복원, 잠금 안내)
- 과목 모듈 규약(registry + mount/unmount + ctx API)
- 샘플 과목 `sample`(규약 검증용, 부모 모드에서 숨김 가능)
- PWA 설정(홈 화면 아이콘, 전체 화면, 오프라인 캐시)
- GitHub Actions로 GitHub Pages 자동 배포

### 1-2. 1단계에 포함하지 않음

- 실제 학습 과목(2단계부터)
- 서버, 로그인, 여러 아이 프로필(필요해지면 데이터 모델만 확장 가능하게 둔다)
- 네이티브 앱 전환

---

## 2. 기술 스택과 기기 제약

### 2-1. 스택 결정

| 항목 | 결정 | 이유 |
| --- | --- | --- |
| 언어 | TypeScript | 한글쓰기 앱과 동일. 과목 모듈 규약을 타입(`AppModule`, `AppContext`)으로 강제할 수 있다 |
| 화면 | 바닐라 JS (프레임워크 없음) | 한글쓰기 앱 결과물이 약 50KB. 에어1의 1GB RAM에서 가볍다 |
| 빌드 | Vite | 개발 서버 + 번들. 최신 문법(`?.`, `??` 등)을 Safari 12용으로 변환(한글쓰기 앱의 `vite.config.ts` 설정을 그대로 가져옴) |
| 라우팅 | 직접 만든 작은 해시 라우터 (`src/router.ts`) | 한글쓰기 앱의 라우터를 확장. `#/hub`, `#/app/writing`, `#/parent` 형태로 GitHub Pages 하위 경로에서도 새로고침 안전 |
| 입력 | Touch Events / Pointer Events 추상화 (`src/ui/input.ts`) | 한글쓰기 앱 코드를 공통으로 승격. 에어1은 Touch(손가락·정전식 펜), 갤럭시 탭은 Pointer(S펜은 `pointerType: 'pen'`) |
| 호환 보정 | `src/ui/compat.ts` | 한글쓰기 앱 코드 재사용: 화면 크기 감지, 밀림·확대 막기, 오디오 깨우기 |
| 저장 | `localStorage` (JSON, 버전 필드 포함) | 1단계 데이터는 작다. 그림 저장 등 큰 데이터는 이후 IndexedDB 추가 |
| 효과음 | Web Audio API로 즉석 합성 (음원 파일 없음) | 한글쓰기 앱 방식(“띵”, “뿅”, 팡파레) 그대로. 용량 0 |
| 음성 | **제작 음원(mp3, Typecast) 우선 + 없으면 기기 내장 음성** | 기기 내장 음성은 국어책 읽듯 딱딱해서 한글쓰기 앱도 Typecast로 다시 만들었다. 대사는 ID로 관리하고, 개발 중에는 내장 음성으로 대신 읽다가 단계·과목 마무리 때 음원을 만들어 넣는다(15장) |
| 오프라인 | vite-plugin-pwa (Workbox) | 한글쓰기 앱과 동일. 전체 파일 프리캐시 + “새 버전이 있어요” 배너. SW 코드는 `src/pwa.ts`에 분리(나중에 Capacitor 전환 대비) → `src/platform/`으로 (09 문서 4장 2로 대체) |
| 테스트 | Vitest + 호환성 검사 2중(`tests/compat.test.ts`, `scripts/check-compat.mjs`) | 에어1에서 안 되는 코드가 들어가면 배포가 멈춘다 |
| 배포 | GitHub Actions + GitHub Pages | push → 테스트 → 빌드 → 호환성 검사 → 배포. ~~`base: '/little-school/'`~~ → `base: './'` (09 문서 4장 1로 대체) |

### 2-2. iOS 12 / Safari 12에서 쓰면 안 되는 것 (반드시 지킬 것)

| 쓰면 안 됨 | 대신 |
| --- | --- |
| Pointer Events (`pointerdown` 등) | Touch Events + Mouse Events (PC 테스트용) |
| flex/grid의 `gap` | 자식 요소 `margin` |
| `aspect-ratio`, `inset`, `:is()`, `:where()` | padding 트릭, `top/right/bottom/left` |
| `ResizeObserver`, `structuredClone`, `Array.prototype.at` | `resize` 이벤트, `JSON.parse(JSON.stringify())`, 인덱스 접근 |
| `100dvh` 등 새 뷰포트 단위 | `window.innerHeight`로 CSS 변수 `--vh` 설정 |
| 최상위 `await`, 정규식 lookbehind | 일반 async 함수, 다른 정규식 |

- `?.`, `??` 같은 문법은 빌드 단계에서 변환되므로 써도 된다. 단, **빌드 결과물은 반드시 실기기에서 확인**한다.
- 기능(API) 폴리필은 자동으로 들어가지 않는다. 위 표의 API는 직접 피한다.
- **Vite·라이브러리가 넣는 코드도 Safari 12에 없는 기능을 쓸 수 있다.** 예: Vite의 동적 import 도우미가 `Promise.allSettled`(Safari 13)를 써서 아이패드에서 과목 화면이 열리지 않았다(2026-10-21). 이런 기능은 `src/ui/compat.ts`에서 채우고, `check-compat.mjs`가 빌드 결과물 전체에서 Safari 12에 없는 기능 호출을 찾아 막는다(채운 기능은 허용 목록 `POLYFILLED`).
- 한글쓰기 앱의 호환성 검사(`tests/compat.test.ts`, `scripts/check-compat.mjs`)를 그대로 가져와 위 표의 항목이 검사 목록에 모두 들어 있는지 확인하고, 빠진 항목은 추가한다.

### 2-3. 아이 전용 사용 설정

웹앱은 홈 버튼을 막을 수 없다. 아이 전용 사용은 기기 기능으로 처리한다 — 아이패드는 **사용법 유도(Guided Access)**, 갤럭시 탭은 **앱 고정**(설정 > 보안 및 개인정보 보호 > 기타 보안 설정 > 앱 고정, 해제 시 잠금 화면 요구 켜기). 앱은 다음을 지킨다.

- 외부 링크 금지(누르면 Safari가 열려 앱 밖으로 나감)
- 확대·선택·길게 누르기 메뉴 차단
  - `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`
  - CSS: `-webkit-touch-callout: none; -webkit-user-select: none; user-select: none; touch-action: manipulation;`
  - `gesturestart` 이벤트 `preventDefault()`(iOS 핀치 확대 차단)
  - `contextmenu` 이벤트 `preventDefault()`(안드로이드 길게 누르기 메뉴 차단)
  - `overscroll-behavior: none`(안드로이드 Chrome의 당겨서 새로고침 차단. iOS 12는 무시하므로 아래 `position: fixed`와 함께 씀)
- 바운스 스크롤 차단: `body { position: fixed; overflow: hidden; }`, 스크롤이 필요한 부모 모드 영역만 `-webkit-overflow-scrolling: touch`
- 부모 모드 > ‘아이 전용 잠금 안내’ 화면에 사용법 유도 설정 방법을 보여준다(8-7 참고)

### 2-4. 가로 모드 고정

**앱 전체를 가로 모드 전용으로 만든다.** 모든 화면은 가로 화면 하나에 들어가도록 설계하고, 세로 레이아웃은 만들지 않는다.

- **갤럭시 탭**: 설치된 PWA는 manifest의 `"orientation": "landscape"`를 따르므로 가로로 고정된다
- **아이패드**: iOS 12 웹앱은 코드로 화면 방향을 고정할 수 없다(Screen Orientation API 미지원, manifest의 `orientation`도 무시). 그래서 두 가지를 함께 쓴다
  1. **기기 설정**: 아이패드를 가로로 둔 상태에서 제어 센터의 ‘화면 회전 잠금’을 켠다. 부모 모드 > 아이 전용 잠금 안내에 사용법 유도 설정과 함께 안내한다
  2. **앱의 안전장치**(두 기기 공통으로 둠): 세로로 돌아가면 화면 전체를 덮는 안내 화면(“옆으로 돌려 주세요” + 돌리는 그림 + 음성)을 띄운다. 이 동안 과목은 `pause()`, 학습 시간 측정도 멈춘다. 가로로 돌아오면 안내를 닫고 `resume()`
- 방향 판단은 `window.innerWidth > window.innerHeight`로 하고, `resize`·`orientationchange`에서 다시 확인한다(`compat.ts`에 둠)
- manifest에는 `"orientation": "landscape"`를 넣는다(갤럭시 탭은 바로 적용, iOS 12는 무시하지만 나중에 Capacitor 네이티브로 바꾸면 고정됨)
- 부모 모드도 가로 기준으로 만든다. 단, 부모 모드는 내용이 길면 세로 스크롤을 허용한다

### 2-5. 두 기기 지원 (아이패드 에어1 + 갤럭시 탭 S6 Lite)

| 항목 | iPad Air 1 | Galaxy Tab S6 Lite | 앱의 처리 |
| --- | --- | --- | --- |
| 브라우저 | Safari 12 (최소 기준) | 최신 Chrome | **에어1 기준으로 만들면 갤럭시에서도 동작.** 호환성 검사는 계속 Safari 12 기준 |
| 화면 비율 | 4:3 (1024×768pt) | 약 5:3 (CSS 픽셀은 기기 배율에 따라 다름, 실기기에서 확인) | 높이 기준 배치(10장). 늘어난 가로 폭은 칸 간격·여백으로 흡수 |
| 입력 | 손가락, 정전식 펜 → Touch Events | 손가락 + S펜(압력·호버 있음) → Pointer Events | `input.ts`가 차이를 감춤. 아래 ‘펜 입력’ |
| 설치 | Safari 공유 > 홈 화면에 추가 | Chrome 메뉴 > 앱 설치(홈 화면에 추가) | 부모 모드 안내 화면에 기기별 방법 표시 |
| 화면 고정 | 사용법 유도 | 앱 고정 | 잠금 안내 화면을 기기별로(8-7) |
| 가로 고정 | 회전 잠금 + 안내 화면 | manifest로 고정 + 안내 화면 | 2-4 |
| 상태 표시줄 | `default` 메타(흰 띠 + 검은 시계, 앱 화면은 그 아래 1024×748) | manifest `"display": "standalone"`(시계 보임, 2026-10-22 변경) | 11-1 |
| 글꼴 | Apple SD Gothic Neo | 삼성/Noto 한글 글꼴 | 글꼴 목록에 둘 다 지정. 글자 폭이 달라지므로 두 기기에서 넘침 확인 |
| 음성 | mp3 우선 + 내장 음성 | mp3 우선 + 내장 음성(목소리 목록이 늦게 채워짐) | `voiceschanged`를 기다린 뒤 한국어 음성 선택. 대부분 mp3라 영향 적음 |
| 저장소 | localStorage (지워질 수 있음) | localStorage (`navigator.storage.persist()` 요청 가능) | 갤럭시에서는 지속 저장 요청. 백업은 동일 |
| 디버깅 | Mac 없이 원격 디버깅 어려움 | PC Chrome에서 USB 원격 디버깅 가능 | 부모 모드에 ‘기기 정보’ 화면(아래) |

**펜 입력 (S펜, 정전식 펜)**

- 정전식 펜은 아이패드가 손가락으로 인식하므로 별도 처리 없음
- S펜은 Pointer Events의 `pointerType === 'pen'`. 버튼을 누르지 않고 화면 위에 띄운 상태(호버)에서도 `pointermove`가 오므로, **눌린 상태(`buttons > 0` 또는 `pointerdown` 이후)만 획으로 받는다**
- **손바닥 무시**: 펜으로 쓰는 동안(`pen`의 `pointerdown` ~ `pointerup`) 들어오는 `touch` 포인터는 무시한다. 또 최근 2초 안에 펜을 썼다면 손가락 터치로 획을 시작하지 않는다
- 압력(`pressure`)은 1단계에서 쓰지 않는다(판정은 좌표만). 그림 교실에서 필요하면 선택적으로 사용
- 쓰기 캔버스에는 `touch-action: none`을 준다(안드로이드에서 펜·손가락으로 그을 때 화면이 끌려가지 않게)
- 공통 설정에 **‘펜으로만 사용하기’**(켜기/끄기, 기본 끄기)를 둔다: 켜면 **아이 화면의 모든 누르기**(쓰기 캔버스·버튼·타일)에서 `pen` 입력만 받는다. 부모 모드 화면과 부모 잠금 자리(오른쪽 위 3초)는 펜을 잃어버려도 끌 수 있게 손가락도 받는다. S펜이 있는 기기에서만 항목 표시 — 한 번이라도 `pen` 입력이 들어온 기기 (2026-10-22 부모 요청으로 ‘쓰기 캔버스만’에서 넓힘, `src/ui/penOnly.ts`)

**기기 구분 원칙**

- 기능은 **기능 감지**로 나눈다(예: `'PointerEvent' in window`, 펜 입력 여부). User-Agent로 기능을 나누지 않는다
- User-Agent는 **안내 문구**(설치 방법, 화면 고정 방법)를 고를 때만 쓴다
- 데이터는 기기마다 따로 저장된다. 두 기기에서 같은 기록을 쓰려면 백업·복원(8-7)으로 옮긴다

**부모 모드 > 기기 정보 (개발·점검용)**

- 화면 크기(`innerWidth × innerHeight`), 기기 배율(`devicePixelRatio`), 마지막 입력 종류(touch / pen / mouse), 펜 압력 값, 사용 중인 음성, 저장 공간 사용량, 앱 버전
- 아이패드는 PC에서 원격 디버깅이 어렵기 때문에 문제를 확인하는 주된 수단이 된다

---

## 3. 폴더 구조

`★` = 한글쓰기 앱에서 가져와 그대로 또는 조금 고쳐 쓰는 파일.

```
little-school/
├─ index.html
├─ vite.config.ts        ★ Safari 12 변환 설정 + vite-plugin-pwa, base만 변경
├─ tsconfig.json         ★
├─ package.json
├─ public/
│  ├─ icons/             # make-icons.mjs가 생성 (apple-touch-icon 180/167/152)
│  ├─ voice/             # 껍데기 대사 음원 (<대사 ID>.mp3)
│  └─ apps/<id>/voice/   # 과목 대사 음원
├─ scripts/
│  ├─ make-icons.mjs     ★ 아이콘 그림만 꼬마학교용으로 변경
│  ├─ check-compat.mjs   ★ 빌드 결과물 호환성 검사
│  └─ voice-list.mjs     # 대사 목록 → 음원 제작 자료 생성 + 음원 누락 검사 (15장)
├─ docs/voice/           # 단계·과목별 음원 제작 자료 (15-3)
├─ tests/
│  ├─ compat.test.ts     ★ 소스 호환성 검사
│  └─ core/              # storage, rewards, session, router 단위 테스트
├─ src/
│  ├─ voices.json        # 껍데기 대사 목록 (15-2)
│  ├─ main.ts            # 부팅: compat 적용 → 저장소 로드 → 라우터 시작 → pwa 등록
│  ├─ router.ts          ★ 해시 라우팅·화면 교체 방식 확장
│  ├─ pwa.ts             ★ 서비스 워커 등록·새 버전 배너 (Capacitor 전환 시 이 파일만 교체)
│  ├─ core/
│  │  ├─ storage.ts      # 저장/불러오기/마이그레이션/백업
│  │  ├─ rewards.ts      # 별 지급, 스티커판 진행
│  │  ├─ session.ts      # 학습 시간 측정, 오늘 끝 판정
│  │  ├─ audio.ts        ★ Web Audio 효과음 합성 + 대사 재생(mp3 우선, 없으면 speechSynthesis), 오디오 깨우기
│  │  ├─ log.ts          # 학습 기록(과목별·날짜별)
│  │  └─ ctx.ts          # 과목 모듈에 넘기는 ctx 객체 생성
│  ├─ ui/
│  │  ├─ compat.ts       ★ 화면 크기 감지, 밀림·확대 막기 등
│  │  ├─ input.ts        ★ Touch/Pointer 입력 추상화
│  │  ├─ components.ts   # 큰 버튼, 별 애니메이션, 토스트, 확인창
│  │  └─ styles.css      # 공통 스타일, 색상 변수 (한글쓰기 앱의 옛 Safari 대체 CSS 규칙 포함)
│  ├─ shared/            # 2단계에서 채움: 여러 과목이 함께 쓰는 캔버스·획 판정
│  ├─ screens/
│  │  ├─ start.ts        # 시작 화면
│  │  ├─ hub.ts          # 허브
│  │  ├─ stickers.ts     # 스티커판
│  │  ├─ done.ts         # 오늘 공부 끝
│  │  ├─ app-host.ts     # 과목 모듈을 띄우는 화면(상단 바 + 모듈 영역)
│  │  └─ parent/         # 부모 모드 화면들
│  │     ├─ gate.ts
│  │     ├─ home.ts
│  │     ├─ records.ts
│  │     ├─ subjects.ts
│  │     ├─ subject-settings.ts   # 과목별 설정 페이지 (settingsSchema로 자동 생성)
│  │     ├─ settings.ts
│  │     ├─ backup.ts
│  │     └─ lock-guide.ts
│  └─ apps/
│     ├─ types.ts        # AppModule, AppContext, SettingField 타입
│     ├─ registry.ts     # 과목 목록 (여기에 한 줄 추가하면 과목이 생김)
│     └─ sample/         # 규약 검증용 샘플 과목
│        ├─ index.ts
│        └─ icon.svg
└─ .github/workflows/deploy.yml   ★ 테스트 → 빌드 → 호환성 검사 → 배포
```

---

## 4. 과목 모듈 규약 (가장 중요)

이후 모든 과목은 이 규약만 지키면 허브에 붙는다. 프레임워크를 쓰는 과목도 `mount` 안에서 자기 방식으로 그리면 된다.

### 4-1. 등록

```ts
// src/apps/registry.ts
import type { AppEntry } from './types';
import sampleIcon from './sample/icon.svg';
import sampleVoices from './sample/voices.json';

export const apps: AppEntry[] = [
  { id: 'sample', name: '샘플', icon: sampleIcon, color: '#FFD54F', voices: sampleVoices, load: () => import('./sample/index') },
  // 2단계: { id: 'writing', name: '또박또박 글씨', ..., load: () => import('./writing/index') },
];
```

- `id`: 영문 소문자·하이픈. 저장 데이터 키로도 쓰므로 **한 번 정하면 바꾸지 않는다**.
- `load`: 동적 import → 과목을 열 때만 코드를 내려받아 메모리를 아낀다.
> **[09 문서로 대체]** 동적 import는 허용, 단 파일은 설치 때 모두 프리캐시 (09 문서 4장 8)
- `voices`: 과목의 `voices.json`. 허브에서 과목을 열기 전에도 과목 이름(`<id>.hub.name`)을 읽어야 해서 등록 때 함께 넘긴다(대사 문장만이라 작다).
- 허브 노출 여부·순서는 부모 모드 설정(`settings.subjects`)이 결정한다.

### 4-2. 모듈 인터페이스

```ts
// src/apps/types.ts
export interface AppModule {
  id: string;
  version: number;                                  // 모듈 데이터 구조 버전 (마이그레이션 판단용)
  mount(el: HTMLElement, ctx: AppContext): void;    // 과목 화면을 그린다. el은 상단 바 아래 전체 영역
  unmount(): void;                                  // 허브로 나갈 때 반드시 호출. 이벤트·타이머·오디오 정리
  pause?(): void;                                   // 오늘 끝 화면, 백그라운드 전환, 세로 방향 안내 화면이 뜰 때
  resume?(): void;
  settingsSchema?: SettingField[];                  // 부모 모드 > 과목별 설정 페이지에 자동으로 그려짐(8-5)
  migrate?(oldVersion: number, data: unknown): unknown; // 모듈 데이터 버전이 오를 때
}

interface FieldBase { key: string; label: string; help?: string; group?: string }  // help: 항목 아래 설명 한 줄, group: 화면 묶음 제목
export type SettingField =
  | (FieldBase & { type: 'select'; options: { value: string | number; label: string }[]; default: string | number })
  | (FieldBase & { type: 'toggle'; default: boolean })
  | (FieldBase & { type: 'multi'; options: { value: string; label: string }[]; columns?: number;   // 여러 개 고르기, 판 모양으로 표시
                   default: string[]; actions?: { label: string; run(current: string[]): string[] }[] }); // 편의 버튼(예: ‘다음 2자 추가’)

// src/apps/<id>/index.ts
const app: AppModule = {
  id: 'sample',
  version: 1,
  mount(el, ctx) { /* DOM 생성, 이벤트 등록 */ },
  unmount() { /* 정리 */ },
  settingsSchema: [{ key: 'count', label: '동그라미 개수', type: 'select',
    options: [{ value: 3, label: '3개' }, { value: 5, label: '5개' }, { value: 8, label: '8개' }], default: 5 }],
};
export default app;
```

### 4-3. ctx API (껍데기가 과목에 제공)

| API | 설명 |
| --- | --- |
| `ctx.reward.star(n = 1, reason)` | 별 지급. 별 연출 + 효과음, 과목별 교환 비율 도달 시 스티커 자동 교환(6장). 그 과목이 오늘 이미 스티커를 받았으면 무시. 반환값 `{ accepted, stars, ratio, stickerGranted, doneToday }` |
| `ctx.reward.status()` | 이 과목의 현재 상태 `{ stars, ratio, doneToday }`. 과목 화면에서 “오늘 스티커 받았어요” 안내에 사용 |
| `ctx.log.record({ item, correct, durationMs, meta })` | 문제 하나 풀 때마다 기록. 부모 모드 ‘자주 틀린 문제’에 사용 |
| `ctx.store.get(key)` / `ctx.store.set(key, value)` | 과목 전용 저장 공간(`apps.<id>.data` 아래). 진도·단계 저장 |
| `ctx.settings` | 부모 모드 과목별 설정 페이지에서 정한 값(읽기 전용). 저장값이 없으면 `settingsSchema`의 `default`. 설정은 과목이 닫혀 있을 때만 바뀌므로 `mount` 때 한 번 읽으면 된다 |
| `ctx.audio.sfx(name)` | 공통 효과음(`star`, `correct`, `oops`, `cheer`, `tap`). Web Audio로 합성, 음원 파일 없음. **공통 설정의 효과음이 꺼져 있으면 아무 소리도 내지 않는다** |
| `ctx.audio.say(id)` | **대사 재생의 기본 방법.** 과목의 `voices.json`에 등록된 대사 ID를 넘기면, 음원이 있으면 mp3를, 없으면 그 문장을 기기 내장 음성으로 읽는다(15장). 음성 읽기가 꺼져 있으면 읽지 않는다 |
| `ctx.audio.speak(text)` | 등록하지 않은 문장을 기기 내장 음성으로 바로 읽기. 개발 중 임시용. 마무리 전에 `say(id)`로 바꾼다 |
| `ctx.audio.voiceOn` / `ctx.audio.sfxOn` | 공통 소리 설정 상태(읽기 전용). 음성이 꺼져 있을 때 글자로 대신 보여 주는 데 사용 |
| `ctx.audio.play(url)` | 대사 목록 밖의 mp3 재생(동화책 부모 녹음 등) |
| `ctx.audio.stop()` | 읽고 있던 대사를 멈춘다(과목을 나갈 때는 껍데기가 자동으로 멈춤) |
| `ctx.input.attach(el, handlers)` | Touch/Pointer 차이를 감춘 입력 등록. 반환된 함수로 해제 |
| `ctx.ui.feedback('correct' \| 'oops')` | 공통 정답·오답 연출(오답은 흔들림만, 벌점 없음) |
| `ctx.exit()` | 과목 스스로 허브로 돌아가기(한 판 완료 후 등) |
| `ctx.isTimeUp()` | 하루 학습 시간 도달 여부. 과목은 한 판이 끝날 때 확인 |
| `ctx.baseUrl` | `import.meta.env.BASE_URL` (과목 리소스 경로 계산용) |

규칙:

- 과목은 `localStorage`를 직접 쓰지 않는다. 반드시 `ctx.store`를 쓴다(백업·초기화가 한 곳에서 되도록).
- 과목은 별을 직접 세지 않는다. 반드시 `ctx.reward.star()`를 쓴다.
- 아이에게 들려주는 문장은 모두 `voices.json`에 ID로 등록하고 `ctx.audio.say(id)`로 재생한다(마무리 때 음원 목록을 자동으로 뽑기 위해).
- 과목은 효과음·음성 켜기/끄기, 소리 크기 설정을 따로 두지 않는다. `ctx.audio`가 공통 설정(8-6)을 적용한다.
- 과목은 자기 설정 화면을 아이 화면에 두지 않는다. 설정은 모두 `settingsSchema`로 부모 모드에 노출한다.
- 과목 CSS는 `.app-<id>` 클래스 아래로 범위를 한정한다(공통 스타일 오염 방지).
- `unmount()`에서 `document`/`window`에 단 이벤트를 모두 해제한다(에어1 메모리 누수 방지). `ctx.input.attach`로 단 입력은 과목이 풀지 않아도 껍데기가 과목을 닫을 때 한 번 더 푼다.
- 허브 타일을 누를 때 읽는 과목 이름 대사 ID는 `<id>.hub.name`으로 둔다.

### 4-4. 샘플 과목 `sample` (규약 검증용)

- 화면에 큰 동그라미 5개(`ctx.input.attach`로 터치 받기) → 누를 때마다 `ctx.audio.sfx('tap')` + `ctx.log.record()`
- 5개 다 누르면 `ctx.reward.star(1, 'sample-complete')` → `ctx.ui.feedback('correct')` → 2초 후 `ctx.exit()`
- `settingsSchema`에 동그라미 개수(3/5/8) 항목 하나
- 2단계 이후 부모 모드에서 숨김 처리

---

## 5. 화면 흐름

```
[시작 화면] --터치--> [허브] --과목 타일--> [과목 화면(app-host)] --완료/뒤로--> [허브]
                        |                                 |
                        +--스티커판 버튼--> [스티커판]      +--시간 도달(한 판 끝)--> [오늘 공부 끝]
                        |
                        +--우상단 3초 길게 누르기--> [부모 잠금] --정답--> [부모 모드]
```

**주소 목록** (`src/router.ts`): `#/start`, `#/hub`, `#/app/<id>`, `#/stickers`, `#/stickers/history`, `#/done`, `#/parent`(부모 홈), `#/parent/gate`, `#/parent/records`, `#/parent/subjects`, `#/parent/subjects/<id>`, `#/parent/settings`, `#/parent/rewards`(보상 지급), `#/parent/reward-history`, `#/parent/backup`, `#/parent/lock-guide`, `#/parent/device`(기기 정보). 모르는 주소는 시작 화면으로. 부모 잠금 등은 라우터 가드(`setGuard`)로 돌린다

### 5-1. 시작 화면 (`#/start`)

- 앱 이름 로고 “꼬마학교”, 큰 “시작!” 버튼
- 버튼 터치 시 `audio.unlock()`(무음 버퍼 재생으로 iOS 오디오 잠금 해제) → 허브로 이동
- 앱을 다시 열 때마다(새로고침 포함) 이 화면부터 시작

### 5-2. 허브 (`#/hub`)

- 상단: 오늘 받은 스티커 수, 스티커판 버튼(현재 판 진행도 예: `7/10`, 보상을 기다리는 완성 판이 있으면 선물 배지와 개수)
- 본문: 과목 타일 그리드 **4열 × 2행 = 한 페이지 8과목**. 타일 = 아이콘 + 이름 + 고유 색
- 과목이 8개를 넘으면 세로 스크롤 대신 **옆으로 넘기는 페이지**로 늘리고, 아래에 페이지 점 표시(스티커판과 같은 슬라이드 방식)
- 타일 오른쪽 위 배지: 오늘 진행 `★ 2/3`(별/교환 비율) 또는 `오늘 스티커 ✓`
- 타일 크기 최소 200×200px, 이름은 아이콘 아래 큰 글씨(28px 이상)
- 과목 타일 터치 시 과목 이름 음성/효과음 재생 후 진입
- 우상단 모서리 투명 영역(80×80px) 3초 길게 누르기 → 부모 잠금(진행 링 표시는 하지 않아 아이가 눈치채기 어렵게)
- 오늘 시간이 다 됐으면 타일이 잠긴 상태로 보이고, 누르면 ‘오늘 공부 끝’ 화면

### 5-3. 과목 화면 (`#/app/<id>`)

- 상단 바(높이 64px): 왼쪽 ‘집’ 버튼(허브로), 가운데 과목 이름, 오른쪽 이 과목 진행 `★ 2/3` 또는 `오늘 스티커 ✓`
- ‘집’ 버튼은 실수 방지를 위해 **한 번 누르면 확인 말풍선 → 한 번 더 누르면 나가기**
- 본문: 모듈 `mount(el, ctx)` 영역
- 라우트 이탈 시 반드시 `unmount()` 호출 후 DOM 비우기

### 5-4. 스티커판 (`#/stickers`)

아이가 보는 화면. 규칙은 6장, 데이터는 9장.

**가로 슬라이드 구성**

```
 ◀ 오래된 판                                        지금 판 ▶
[1번 판 · 완성]  [2번 판 · 완성]  [3번 판 · 모으는 중 7/10]
 보상을 기다려요    보상을 기다려요     ← 처음 열면 여기
                   ●  ●  ◉
```

- 슬라이드에는 **보상을 기다리는 완성 판(오래된 순) + 지금 모으는 판**만 있다. 보상을 받은 판은 ‘보상 기록’으로 빠진다
- 처음 열면 맨 오른쪽 ‘지금 판’이 보이고, 오른쪽으로 밀면(스와이프) 이전 판이 나온다
- 큰 좌우 화살표 버튼도 둔다(스와이프가 서툰 경우). 아래에 판 위치 점 표시
- 구현: Touch Events로 가로 이동량을 받아 `transform: translateX()`로 이동, 손을 떼면 가까운 판에 맞춤(0.3초). 화면 밖 판은 앞뒤 1장까지만 DOM에 그린다(에어1 메모리)

**판 하나의 모양**

- 칸 수: 판을 만들 때의 설정값. 가로 화면 배치: 5칸 = 1×5, **10칸 = 2×5(기본)**, 20칸 = 4×5. 판 하나가 한 화면에 들어가며 스크롤 없음
- 각 칸: 스티커 그림(동물·탈것 SVG 20종 중 무작위, `src/core/stickers.ts` — 저장 데이터에는 id만: `lion` `cat` `dog` `bear` `rabbit` `pig` `frog` `panda` `chick` `mouse` `car` `bus` `train` `airplane` `boat` `rocket` `truck` `helicopter` `firetruck` `balloon`) + 칸 모서리에 받은 과목의 작은 아이콘
- 판 위쪽: `3번째 스티커판`, 시작한 날
- 완성 판: `다 모은 날 10월 28일` + “보상을 기다리고 있어요” 리본
- 지금 판 아래: 과목별 오늘 상태 줄(과목 아이콘 + `★ 2/3` 또는 `✓`)

**보상 기록 (`#/stickers/history`)**

- 스티커판 화면의 ‘보상 기록’ 버튼으로 들어간다(읽기 전용)
- 보상을 받은 판을 최신순 카드로: 판 번호, 미니 스티커판, **다 모은 날, 보상 받은 날, 보상 내용**
- 예: `2번째 판 · 다 모은 날 11월 5일 · 보상 받은 날 11월 6일 · 아이스크림 먹으러 가기`

### 5-5. 오늘 공부 끝 (`#/done`)

- 하루 학습 시간(설정값, 기본 20분)에 도달하면, **진행 중인 한 판이 끝난 뒤** 이 화면으로 이동
  - 과목이 `ctx.isTimeUp()`을 확인해 `ctx.exit()`하면 허브 대신 이 화면으로 감
  - 과목이 확인하지 않더라도 도달 후 5분이 지나면 강제 이동(유예 시간 설정 가능)
- 캐릭터 + “오늘 공부 끝! 내일 또 만나요” 음성, 오늘 받은 스티커 수 표시
- 다음 날(자정 기준) 자동 해제. 부모 모드에서 ‘오늘 10분 더’ 가능

---

## 6. 보상 규칙

### 6-1. 전체 흐름

```
과목 활동 ─(과목 기준 달성)─> 별 (과목별로 따로 쌓임)
   ─(그 과목 교환 비율 도달, 하루 1장)─> 스티커 1장 → 지금 스티커판에 붙음
   ─(판이 다 참)─> ‘다 모은 날’ 기록 + 다음 판 자동 시작 (지급 전이어도 계속 모음)
   ─(부모가 보상 지급 + 내용 입력)─> 보상 기록으로 이동
```

### 6-2. 별 지급

- 과목이 자기 기준을 달성했을 때 `ctx.reward.star(1, '이유')`를 호출한다. 과목별 기준은 `little-school-apps.md`에 적는다
  - 또박또박 글씨: **카테고리 하나를 모두 클리어하면 별 1개** (14장)
- 별은 **과목별로 따로** 쌓인다. 다른 과목의 별과 합치지 않는다
- 별은 차감하지 않는다(틀려도 뺏지 않음)
- 연출: 화면 중앙에서 별이 튀어나와 상단 바의 `★ n/비율`로 날아감(0.8초, `transform`만 사용). 스티커로 바뀌면 스티커가 크게 나타났다 날아감(2초), 판이 차면 판 완성 축하(3초). 연출 중에 과목이 `ctx.exit()`하면 연출이 끝난 뒤 나간다

### 6-3. 스티커 교환 (과목별 비율, 과목당 하루 1장)

| 규칙 | 내용 |
| --- | --- |
| 교환 비율 | **과목마다** 별 3 / 5 / 10개 = 스티커 1장. 기본 3. 부모 모드 > 과목 관리에서 설정 |
| 교환 시점 | 그 과목의 별이 비율에 도달하는 순간 자동 교환(아이가 누를 것 없음) |
| 하루 상한 | **과목당 하루 스티커 1장.** 교환한 뒤에는 그날 그 과목에서 별도 스티커도 더 받을 수 없다 |
| 다른 과목 | 과목마다 따로 계산. 하루 최대 스티커 수 = 켜진 과목 수 |
| 모자란 별 | 비율에 못 미친 별은 **다음 날로 이어진다**(예: 오늘 2/3 → 내일 1개 더 받으면 교환) |
| 남는 별 | 교환 순간 비율을 넘는 별은 버린다(그날은 더 받을 수 없으므로) |
| 날짜 기준 | 기기 로컬 자정. 자정이 지나면 모든 과목의 ‘오늘 스티커’가 풀린다 |
| 비율 변경 | 이미 쌓인 별은 유지. 새 비율 이상이 이미 쌓여 있으면 그 과목의 다음 별 지급 때 교환 |

**예시** (또박또박 글씨, 비율 3)

1. 숫자 클리어 → ★ 1/3
2. 자음 클리어 → ★ 2/3
3. 모음 클리어 → ★ 3/3 → 스티커 1장 교환(스티커가 판으로 날아가는 연출 + `cheer`)
4. 이어서 쌍자음을 클리어해도 칭찬 연출만 나오고 별은 없음. 상단 바는 `오늘 스티커 ✓`

**‘오늘 스티커 받음’ 상태의 과목 화면**

- 과목은 계속 연습할 수 있다(막지 않음)
- 진입할 때 한 번 음성 안내: “오늘 스티커는 받았어요. 연습은 계속할 수 있어요”
- 클리어 칭찬 연출은 그대로, 별이 날아가는 연출만 생략
- 과목은 `ctx.reward.status().doneToday`로 이 상태를 알 수 있다

### 6-4. 스티커판이 다 찼을 때

- 마지막 칸이 채워지는 순간 그 판에 **다 모은 날(`completedAt`)**을 기록한다
- 축하 연출: 판 전체가 반짝이고 “스티커판 완성! 엄마 아빠에게 보여 주세요” 음성
- **바로 다음 판이 자동으로 시작된다.** 부모가 보상을 지급하지 않아도 스티커는 새 판에 계속 쌓인다
- 완성 판은 ‘보상 대기’ 상태로 슬라이드에 남는다(5-4)
- 칸 수 설정(5 / 10 / 20, 기본 10)은 **새로 시작하는 판부터** 적용

### 6-5. 보상 지급 (부모 모드)

보상 내용은 판마다 다를 수 있으므로 **미리 정하지 않고, 지급할 때마다 부모가 직접 입력**한다.

1. 부모 모드 > **보상 지급** (메뉴에 대기 판 개수 표시)
2. 보상 대기 판 목록(오래된 순): 판 번호, 미니 스티커판, 시작한 날, 다 모은 날
3. 판의 ‘보상 지급’ 버튼 → 입력 화면
   - 보상 내용 입력칸(필수, 최대 40자, 예시 문구 “놀이터 가기”)
   - 지급일: 오늘 날짜 자동
4. ‘확인’ → 확인창: `3번째 판 · 다 모은 날 11월 12일 · 지급일 11월 13일 · 내용: 키즈카페 가기`
5. 확인하면 그 판에 지급일(`paidAt`)과 내용(`rewardText`)이 저장되고, 슬라이드에서 빠져 **보상 기록**으로 이동

**보상 기록 관리 (부모 모드)**

- 지급된 판 목록(최신순): 다 모은 날, 지급일, 보상 내용
- 내용 수정(오타 고치기) 가능
- ‘지급 취소’: 확인창 후 보상 대기 상태로 되돌림(지급일·내용 삭제)

---

## 7. 학습 시간 측정

- 과목 화면이 보이는 동안만 측정(허브·스티커판 시간은 제외)
- 세로 방향 안내 화면이 떠 있는 동안은 측정하지 않음(2-4)
- `visibilitychange`로 백그라운드 전환 시 멈춤
- 30초 이상 터치가 없으면 ‘쉬는 중’으로 보고 측정 중지(터치 시 재개). 마지막 터치 후 30초까지는 공부한 시간으로 센다
- 1초마다 `days[오늘].subjects[id].ms`에 더한다(`src/core/session.ts`). 유예 시간은 과목 화면 안에서 시간에 닿은 순간부터 잰다
- 날짜 키는 기기 로컬 날짜 `YYYY-MM-DD`

---

## 8. 부모 모드 (`#/parent/...`)

### 8-1. 진입 잠금 (`gate`)

1. 허브 우상단 3초 길게 누르기
2. 두 자리 × 한 자리 곱셈 문제(예: 17 × 6) + 숫자 키패드
3. 정답이면 진입, 3번 틀리면 1분 잠금
4. 부모 모드에서 5분 동안 조작이 없으면 자동으로 허브로 복귀
5. 부모 모드를 떠나 아이 화면으로 가면 다시 잠긴다(다음에 또 문제를 푼다)
6. 4자리 암호를 켠 상태에서 암호를 잊었으면: 잠금 화면의 ‘암호를 잊었어요’ → 곱셈 문제를 맞히면 암호를 해제(곱셈 방식으로 되돌림)하고 들어간다. 같은 3번·1분 잠금을 따른다 (09 문서 5장, R-09)

### 8-2. 홈

- 오늘 요약: 학습 시간, 과목별 시간 막대, 과목별 별 진행·오늘 스티커 여부
- 보상 대기 판이 있으면 맨 위에 알림: “다 모은 스티커판 2개가 보상을 기다려요”
- 메뉴: 기록 / 과목 관리(과목별 설정) / 공통 설정 / 보상 지급(대기 N) / 보상 기록 / 백업·복원 / 아이 전용 잠금 안내 / 기기 정보 / 아이 화면으로 돌아가기
- ‘마지막 백업: N일 전’(11-4)과 ‘오늘 10분 더’ 버튼도 홈에 둔다
- **앱 종료하기**(2026-10-22 부모 요청): 확인창 → 기록 바로 저장·과목과 소리 정리·부모 모드 잠금 → 앱 닫기 시도(`src/platform` `tryExitApp`: Capacitor는 exitApp, PWA는 window.close). 웹앱이 스스로 닫히지 않으면(iOS·Chrome 홈 화면 앱 대부분) 아이가 누를 수 없는 ‘종료됨’ 화면을 덮고 기기별로 마저 닫는 방법을 보여 준다. 다시 열기는 3초 길게 누르기

### 8-3. 기록 (`records`)

- 최근 7일 날짜별 학습 시간·받은 스티커 수(간단한 막대, SVG 직접 그림)
- 과목별 ‘자주 틀린 문제’ 상위 5개(`log.record`의 `item` 기준 오답 수)
- 날짜를 누르면 그날 과목별 상세

### 8-4. 과목 관리 (`subjects`)

- 과목 목록: 켜기/끄기 토글, 위·아래로 순서 변경(드래그 대신 화살표 버튼 — iOS 12 호환)
- 각 과목 줄: 아이콘, 이름, 교환 비율, 지금 쌓인 별(`★ 2/3`), **‘설정’ 버튼 → 과목별 설정 페이지(8-5)**
- 과목별 진도 초기화(확인창 2번)는 과목별 설정 페이지 맨 아래에 둔다(8-5). 지우는 것은 `apps.<id>.data`(진도)뿐이고 별·스티커·기록은 남는다

### 8-5. 과목별 설정 페이지 (`#/parent/subjects/<id>`)

과목마다 하나씩 있는 설정 화면. **화면 코드는 하나**이고, 과목의 `settingsSchema`를 읽어 자동으로 그린다. 새 과목을 추가할 때 설정 화면을 따로 만들 필요가 없다.

**화면 구성 (위에서 아래로)**

1. 제목: 과목 아이콘 + `또박또박 글씨 설정`
2. **보상** 묶음(모든 과목 공통, 껍데기가 그림): 별 교환 비율 3 / 5 / 10, 지금 쌓인 별 표시
3. **과목 설정** 묶음: `settingsSchema` 항목을 `group`별로 묶어 차례로 그림
   - `select` → 큰 버튼 묶음(선택지 2~4개, 하나만 선택). 선택지가 5개 이상이면 목록 선택
   - `toggle` → 켜기/끄기 스위치
   - `multi` → 선택지를 `columns` 열의 판으로 그리고, 누를 때마다 선택/해제. `actions`가 있으면 판 위에 편의 버튼(예: 한자똑똑의 ‘다음 2자 추가’)
   - `help`가 있으면 항목 아래 회색 설명 한 줄
4. 맨 아래: ‘기본값으로 되돌리기’(확인창), ‘과목 진도 초기화’(확인창 2번)

**동작**

- 바꾸는 즉시 저장(저장 버튼 없음). 저장 위치: `apps.<id>.settings`
- 저장값이 없는 항목은 `default`를 쓴다. 과목 업데이트로 항목이 새로 생겨도 기본값으로 동작하고, 없어진 항목의 저장값은 무시한다
- 아이가 과목을 열 때 `ctx.settings`로 전달(과목이 열려 있는 동안 설정은 바뀌지 않음)

**예시: 또박또박 글씨** (2단계에서 기존 앱 설정을 옮긴 결과, 14-4)

```
[보상]
  별 교환 비율         ( 3 ) ( 5 ) ( 10 )         지금 ★ 2/3
[판정]
  판정 난이도          ( 쉬움 ) ( 보통 ) ( 어려움 )
[도움]
  혼자 쓰기 힌트       [켜짐]
  획순 애니메이션 자동 재생 [켜짐]
[읽기]
  숫자 읽기            ( 일, 이, 삼 ) ( 하나, 둘, 셋 )
```

### 8-6. 공통 설정 (`settings`)

모든 과목에 똑같이 적용되는 설정. 과목별 설정 페이지에는 나오지 않는다.

| 묶음 | 항목 | 값 | 기본 |
| --- | --- | --- | --- |
| 소리 | 효과음 | 켜기/끄기 + 크기(작게/보통/크게) | 켜기, 보통 |
| 소리 | 음성 읽기 | 켜기/끄기 + 크기(작게/보통/크게) | 켜기, 보통 |
| 소리 | 음성 속도 | 천천히 / 보통 | 천천히 |
| 학습 시간 | 하루 학습 시간 | 10 / 15 / 20 / 30분 / 제한 없음 | 20분 |
| 학습 시간 | 유예 시간 | 0 / 3 / 5분 | 5분 |
| 학습 시간 | 오늘 10분 더 하기 | 버튼 | — |
| 보상 | 스티커판 칸 수 | 5 / 10 / 20 (새 판부터 적용) | 10 |
| 부모 잠금 | 잠금 방식 | 곱셈 문제 / 4자리 숫자 암호 | 곱셈 |
| 입력 | 펜으로만 사용하기 | 켜기/끄기 (펜 입력이 감지된 기기에서만 표시, 아이 화면 전체에 적용, 2-5) | 끄기 |

- 효과음을 끄면 모든 과목과 껍데기(별·스티커 연출 포함)의 효과음이 꺼진다. 연출 애니메이션은 그대로
- 음성 읽기를 끄면 지시문·글자 읽기 음성이 모두 꺼진다. 대신 지시문은 화면에 글자로 크게 보여 준다(`ctx.audio.speak`가 꺼진 상태를 알려 줌: `ctx.audio.voiceOn`)
- 소리 설정은 `src/core/audio.ts` 한 곳에서 적용하므로 과목 코드는 신경 쓰지 않는다

### 8-7. 백업·복원 (`backup`), 아이 전용 잠금 안내 (`lock-guide`)

- 백업: 전체 데이터를 JSON으로 만들어 **화면에 표시 + 복사 버튼**, 그리고 `a[download]`로 파일 내려받기 시도(iOS 12 Safari는 다운로드가 제한적이므로 복사가 기본 경로). 파일 내려받기 버튼은 아이패드 홈 화면 앱에서는 숨긴다(앱 밖으로 나갈 수 있어서). 복사·내려받기를 하면 ‘마지막 백업’ 날짜가 바뀐다
- 복원: 텍스트 영역에 JSON 붙여넣기 → 검증 → 확인 후 덮어쓰기
- 전체 초기화(확인창 2번 + 곱셈 문제 재확인) 후 시작 화면으로
- 잠금 안내 화면 문구 — **기기에 맞는 안내를 먼저 보여 주고, 다른 기기 안내는 접어 둔다**
  - 아이패드:
    1. 설정 > 일반 > 손쉬운 사용 > 사용법 유도 켜기, 암호 설정
    2. 꼬마학교를 연 상태에서 홈 버튼 3번 → 시작
    3. 끝낼 때: 홈 버튼 3번 → 암호 → 종료
    4. (선택) 사용법 유도의 ‘시간 제한’과 함께 쓰기
    5. 아이패드를 가로로 둔 상태에서 제어 센터 > ‘화면 회전 잠금’ 켜기(2-4)
  - 갤럭시 탭:
    1. 설정 > 보안 및 개인정보 보호 > 기타 보안 설정 > 앱 고정 켜기, ‘고정 해제 전 PIN 요청’ 켜기
    2. 꼬마학교를 연 상태에서 최근 앱 버튼 → 꼬마학교 아이콘 → ‘이 앱 고정’
    3. 끝낼 때: 뒤로 + 최근 앱 버튼을 함께 길게 누름 → PIN 입력
    4. 메뉴 이름은 One UI 버전에 따라 조금 다를 수 있으므로 실기기에서 확인해 문구를 맞춘다
- 설치 안내도 같은 방식으로 기기별로(아이패드: Safari 공유 > 홈 화면에 추가 / 갤럭시: Chrome 메뉴 > 앱 설치)

---

## 9. 데이터 모델 (`localStorage` 키: `little-school:v1`)

> **[09 문서로 대체]** 저장 규칙(Store 경유, `little-school:v1` 단일 키 유지, schemaVersion)은 09 문서 4장 3을 따른다

```json
{
  "schemaVersion": 1,
  "createdAt": "2026-10-20",
  "lastBackupAt": null,
  "device": { "penSeen": false },
  "settings": {
    "dailyMinutes": 20,
    "graceMinutes": 5,
    "boardSize": 10,
    "audio": { "sfxOn": true, "sfxVolume": "normal", "voiceOn": true, "voiceVolume": "normal", "voiceRate": "slow" },
    "parentLock": { "type": "math", "pin": null },
    "penOnly": false,
    "audioEdited": false,
    "subjects": [
      { "id": "writing", "enabled": true, "order": 0, "starsPerSticker": 3 },
      { "id": "sample", "enabled": false, "order": 1, "starsPerSticker": 3 }
    ]
  },
  "rewards": {
    "stars": { "writing": 2 },
    "boards": [
      {
        "no": 1, "size": 10, "startedAt": "2026-10-20",
        "completedAt": "2026-10-28", "paidAt": "2026-10-29", "rewardText": "놀이터 가기",
        "stickers": [ { "art": "lion", "subject": "writing", "date": "2026-10-20" } ]
      },
      { "no": 2, "size": 10, "startedAt": "2026-10-28", "completedAt": "2026-11-05", "paidAt": null, "rewardText": null, "stickers": [] },
      { "no": 3, "size": 10, "startedAt": "2026-11-05", "completedAt": null, "paidAt": null, "rewardText": null, "stickers": [] }
    ]
  },
  "days": {
    "2026-10-21": {
      "extraMinutes": 0,
      "subjects": { "writing": { "ms": 900000, "stars": 3, "sticker": true } }
    }
  },
  "logs": {
    "writing": [ { "t": 1792480456009, "item": "ㄱ", "correct": true, "ms": 4200, "meta": { "category": "consonant" } } ]
  },
  "apps": {
    "writing": {
      "version": 1,
      "settings": { "difficulty": "easy", "freeHint": "outline", "autoDemo": true, "numberReading": "sino" },
      "data": {}
    }
  }
}
```

- `settings.dailyMinutes`: 10/15/20/30, `null` = 제한 없음(8-6)
- `settings.penOnly`: 펜으로만 사용하기(8-6, 아이 화면 전체). `device.penSeen`: 이 기기에 펜 입력이 한 번이라도 들어왔는지(항목 표시 조건, 2-5)
- `settings.audioEdited`: 부모가 공통 설정의 소리를 바꾼 적이 있는지(한글쓰기 앱 설정 이전 때 덮어쓰지 않게, 14-4)
- `lastBackupAt`: 마지막 백업 날짜(부모 모드 홈 ‘마지막 백업: N일 전’, 11-4)
- `settings.audio`: 공통 소리 설정(8-6). 과목별 설정에는 소리 항목을 두지 않는다
- `apps.<id>.settings`: 과목별 설정 페이지(8-5)의 값. 없는 키는 `settingsSchema`의 `default`
- `rewards.stars`: 과목별로 쌓인 교환 전 별. 날짜가 바뀌어도 유지(6-3 ‘모자란 별’)
- 과목의 ‘오늘 스티커 받음’ 여부 = `days[오늘].subjects[id].sticker`
- 판 상태는 필드로 판단한다
  - `completedAt == null` → 지금 모으는 판 (항상 마지막 1개)
  - `completedAt != null && paidAt == null` → 보상 대기 (슬라이드에 표시)
  - `paidAt != null` → 보상 기록
- `rewards.boards`는 지우지 않고 계속 보관(판 하나가 작아 용량 걱정 없음)
- `logs`는 과목별 최근 500건만 보관(오래된 것부터 삭제)
- `days`는 최근 90일만 보관
- 저장은 변경 후 300ms 디바운스로 한 번에
- `schemaVersion`이 바뀌면 `storage.migrate()`에서 순차 변환
- 읽을 때 형식에 맞지 않는 값은 기본값으로 바꾼다(`storage.normalize()`). JSON이 깨져 읽을 수 없으면 원본을 `little-school:v1:broken`에 남기고 새로 시작한다
- 앱이 가려질 때(`visibilitychange`·`pagehide`)는 디바운스를 기다리지 않고 바로 저장

---

## 10. 디자인 기준

- 화면 기준: **가로 1024×768pt 고정**(2-4). 아이패드 홈 화면 앱은 상태 표시줄(20pt) 아래 **1024×748pt**가 앱 화면이다(11-1). 세로 레이아웃은 만들지 않는다
- **두 기기 비율 대응**: 아이패드 4:3, 갤럭시 탭 약 5:3. **높이를 기준**으로 크기를 정하고(배율 `--u` = 앱 화면 높이 ÷ 748 → 아이패드에서 1), 가로는 1024~1280 범위에서 늘어난다고 보고 설계한다. 늘어난 폭은 칸 사이 간격과 양옆 여백이 흡수한다(격자 칸 수는 바꾸지 않음)
- 크기는 CSS 변수 `--u`(높이 기준 단위)로 계산해 두 기기에서 같은 비율로 보이게 한다
- 아이 화면의 사용 영역: 앱 화면 748pt에서 상단 바(64pt)를 빼면 과목 영역은 약 **1024×684pt**. 과목은 이 안에 모두 들어가게 설계한다
- **아이 화면에는 세로 스크롤을 두지 않는다.** 한 화면에 안 들어가면 페이지를 옆으로 넘기거나 단계를 나눈다
- 화면 배치는 가로 비율을 활용한다: 왼쪽에 문제·그림, 오른쪽에 보기·버튼처럼 좌우로 나누는 배치를 기본으로 한다
- 터치 대상 최소 60×60px, 주요 버튼 88px 이상, 버튼 사이 간격 16px 이상
- 글꼴: 시스템 글꼴 `-apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Noto Sans CJK KR', sans-serif`. 웹폰트는 용량 때문에 쓰지 않음. 기기마다 글꼴이 달라 글자 폭·한자 모양이 조금씩 다르므로 두 기기에서 넘침을 확인한다
- 아이 화면의 글자는 최소 24px, 지시문은 항상 음성 동반
- 색: 밝은 파스텔 배경 + 과목별 고유 색 1개. CSS 변수로 관리
- 애니메이션은 `transform`, `opacity`만 사용(에어1 성능)
- 아이 화면에서는 한 화면에 선택지 4개 이하

---

## 11. PWA·배포

### 11-1. `index.html` 필수 메타

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="꼬마학교">
<link rel="apple-touch-icon" href="icons/apple-touch-icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
```

- iOS 12는 manifest보다 위 `apple-*` 메타를 우선 사용하므로 둘 다 넣는다
- 상태 표시줄은 `default`(흰 띠 + 검은 시계). `black-translucent`는 시계가 흰 글씨로 고정되어 밝은 배경에 묻혀 안 보였다(2026-10-21 아이패드 확인)
- manifest(갤럭시 탭 Chrome이 사용): `"display": "standalone"`(아이패드처럼 상태 표시줄·시계가 보이게, 2026-10-22 부모 결정 — 처음에는 `fullscreen`), `"orientation": "landscape"`, `"start_url"`, `"scope"`를 `/little-school/`로, 아이콘 192·512px(+ `maskable`). `make-icons.mjs`가 안드로이드용 아이콘도 만들게 한다
- iOS 12 홈 화면 앱은 앱 내 페이지 이동 시 Safari로 튈 수 있다 → **페이지 이동 없이 해시 라우팅만** 사용

### 11-2. Service Worker (vite-plugin-pwa / Workbox)

- 한글쓰기 앱 설정을 그대로 가져온다: 빌드 결과물 전체 프리캐시, 새 버전 감지 시 배너
- **아이 화면에서는 “새 버전이 있어요” 배너를 띄우지 않는다.** 대신 부모 모드 홈에 표시하고, 부모가 ‘업데이트’를 눌러 새로고침
  - 단, **개발 기간**(`src/config.ts`의 `DEV_PERIOD = true`)에는 아이 화면에도 배너를 띄우고, 모든 화면 오른쪽 아래에 앱 버전을 옅게 표시한다. 과목을 어느 정도 만든 뒤 `false`로 바꿔 위 원칙으로 돌아간다(planning-log 2026-10-21 ‘개발 기간 표시’)
- 과목을 동적 import로 나누므로, 모든 과목 청크와 mp3가 프리캐시 목록(`globPatterns`)에 들어가는지 확인 → 비행기 모드에서 모든 과목이 열려야 한다. `scripts/check-precache.mjs`가 빌드 때 자동으로 검사한다
- 새 버전은 앱이 다시 보일 때, 1시간마다, 부모 홈을 열 때 확인한다
> **[09 문서로 대체]** 자기 호스트 업데이트 확인은 네트워크 금지의 예외로 허용, Capacitor 앱에서는 끔 (09 문서 4장 6)
- 등록 코드는 `src/pwa.ts`에만 둔다 → `src/platform/` (09 문서 4장 2로 대체)

### 11-3. GitHub Actions (`.github/workflows/deploy.yml`)

- 한글쓰기 앱 워크플로를 가져와 `main` push 시: `npm ci` → `vitest run`(호환성 테스트 포함) → `vite build` → `check-compat.mjs` → `check-precache.mjs`(빌드 파일이 모두 프리캐시에 있는지) → GitHub Pages 배포
- 하나라도 실패하면 배포 중단
- ~~`vite.config.ts`: `base: '/little-school/'`~~
> **[09 문서로 대체]** `base: './'`, manifest `start_url`·`scope`도 상대 경로 (09 문서 4장 1)

### 11-4. 데이터 보존 주의

- 홈 화면 앱과 브라우저 탭은 저장소가 분리될 수 있다 → **아이는 홈 화면 아이콘으로만 실행**(두 기기 모두)
- 갤럭시 탭에서는 첫 실행 때 `navigator.storage.persist()`를 요청해 저장소가 지워지지 않게 한다
- iOS 정리 정책으로 데이터가 지워질 수 있으므로 백업 기능을 주기적으로 사용하도록 부모 모드 홈에 “마지막 백업: N일 전” 표시

---

## 12. 구현 순서 (작업 단위)

1. **기반 가져오기**: 새 저장소 `little-school`을 만들고, 한글쓰기 앱에서 ★ 표시 파일(설정, `compat.ts`, `input.ts`, `router.ts`, `pwa.ts`, 효과음 합성 코드, 호환성 검사 2종, 아이콘 스크립트, 워크플로)을 복사한다. 쓰기 전용 코드(판정, 글자 데이터, 편집기)는 가져오지 않는다
2. 빈 화면으로 테스트 → 빌드 → 호환성 검사 → 배포까지 통과시키고, 아이패드 홈 화면 앱으로 뜨는지 확인
3. `storage`, 라우터 확장, 공통 스타일·컴포넌트 (+ 단위 테스트)
4. 시작 화면 + `audio`(깨우기, 효과음, speak)
5. 허브 + `types.ts` + `registry` + `app-host` + 샘플 과목 → 규약 검증
6. `rewards` + 별 애니메이션 + 스티커판 (+ 단위 테스트)
7. `session`(시간 측정) + 오늘 공부 끝 (+ 단위 테스트, 가짜 시계 사용)
8. 부모 모드: 잠금 → 홈 → 기록 → 과목 관리 → 과목별 설정 페이지(샘플 과목의 `settingsSchema`로 검증) → 공통 설정 → 백업/복원 → 잠금 안내
9. PWA 프리캐시·업데이트 흐름 확인(부모 모드에서만 업데이트)
10. 실기기 점검(13장 체크리스트)
11. **음원 마무리**(15장): 껍데기 대사 목록 정리 → 제작 자료 생성 → Typecast로 제작 → 음원 넣기 → 실기기 청취 확인
12. 태그 `v0.1.0`

---

## 13. 완료 기준 (실기기 체크리스트)

- [ ] `vitest run` 전체 통과, 호환성 검사 2종 통과, Actions로 자동 배포된다
- [ ] **아래 항목은 아이패드 에어1과 갤럭시 탭 S6 Lite 두 기기에서 모두 확인한다**
- [ ] 에어1 Safari ‘홈 화면에 추가’ / 갤럭시 Chrome ‘앱 설치’ → 주소창 없는 전체 화면으로 실행된다
- [ ] 갤럭시 탭에서 가로로 고정되고, 위쪽에 상태 표시줄(시계)이 보인다
- [ ] 두 기기 모두 화면 비율이 달라도 넘침·잘림 없이 한 화면에 들어간다
- [ ] 갤럭시 탭: S펜을 띄운 상태(호버)에서는 선이 그어지지 않고, 펜으로 쓰는 중 손바닥이 닿아도 선이 생기지 않는다
- [ ] 갤럭시 탭: 당겨서 새로고침, 길게 눌러 메뉴가 나오지 않는다
- [ ] 부모 모드 > 기기 정보에 화면 크기·입력 종류가 맞게 나온다
- [ ] 비행기 모드에서도 실행된다(오프라인)
- [ ] 시작 버튼 후 효과음이 난다
- [ ] 핀치 확대, 텍스트 선택, 길게 눌러 메뉴, 바운스 스크롤이 일어나지 않는다
- [ ] 샘플 과목 완료 시 별이 날아가고, 비율(3)에 도달하면 스티커가 붙는다
- [ ] 스티커를 받은 과목은 그날 별·스티커를 더 받지 않고 `오늘 스티커 ✓`가 보인다. 다른 과목은 따로 받을 수 있다
- [ ] 2/3에서 날짜를 넘기면(기기 날짜 변경으로 확인) 별 2개가 남아 있다
- [ ] 판이 다 차면 다 모은 날이 기록되고 다음 판이 자동 시작된다. 지급 전에도 새 판에 계속 쌓인다
- [ ] 스티커판 화면에서 좌우 슬라이드·화살표로 완성 판과 지금 판을 오간다
- [ ] 보상 지급에서 내용을 입력하면 그 판이 슬라이드에서 빠지고, 보상 기록에 다 모은 날·지급일·내용이 보인다
- [ ] 보상 기록에서 내용 수정, 지급 취소가 된다
- [ ] `rewards.ts` 단위 테스트: 과목별 비율, 과목당 하루 1장, 모자란 별 이월, 남는 별 버림, 판 넘김, 지급·취소
- [ ] 과목을 10번 열고 닫아도 느려지지 않는다(메모리 누수 없음)
- [ ] 하루 시간을 1분으로 설정하면(부모 모드 > 기기 정보 > 점검 도구) 한 판 후 ‘오늘 공부 끝’으로 간다. ‘10분 더’로 풀린다
- [ ] 부모 잠금: 3초 길게 누르기 + 곱셈 정답으로만 진입, 5분 무조작 시 자동 퇴장
- [ ] 샘플 과목의 설정 페이지가 `settingsSchema`만으로 자동 생성되고, 바꾼 값이 다음에 과목을 열 때 반영된다
- [ ] 공통 설정에서 효과음을 끄면 모든 화면에서 효과음이 나지 않고, 음성 읽기를 끄면 읽기가 멈춘다
- [ ] 백업 JSON 복사 → 전체 초기화 → 복원 시 별·스티커·기록이 그대로 돌아온다
- [ ] 앱 종료 후 다시 열어도 데이터가 유지된다
- [ ] 사용법 유도 상태에서 모든 화면이 정상 동작한다
- [ ] 모든 아이 화면이 가로 1024×748(아이패드 앱 화면)에 스크롤 없이 들어간다
- [ ] 세로로 돌리면 ‘옆으로 돌려 주세요’ 안내가 뜨고 학습 시간이 멈춘다. 가로로 돌리면 이어진다
- [ ] 외부로 나가는 링크가 하나도 없다
- [ ] `npm run voice:check` 통과: 껍데기 대사 ID가 모두 `voices.json`에 있고, 음원이 모두 들어 있다
- [ ] `ctx.audio.speak()`로 남은 임시 문장이 없다

---

## 14. 2단계 미리보기: 한글쓰기 앱 이식 가이드

> **이식 원본**: `legacy/writing-practice/`(**2026-10-22 2단계 완료 후 삭제함** — 필요하면 원본 `D:\@기타\@개인\쓰기App` 참고) — 한글쓰기 앱(`D:\@기타\@개인\쓰기App`, GitHub `jekim8435/writing-practice`)의 2026-10-21 사본(node_modules·dist·.git 제외). 2단계 작업은 이 사본을 읽어서 `src/`로 옮긴다. 사본은 직접 고치지 않고, 2단계가 끝나면 지운다. 원본 앱의 요구사항·설계는 `legacy/writing-practice/REQUIREMENTS.md`, `README.md` 참고
> 기존 한글쓰기 앱 저장소는 그대로 보관(참고용·롤백용)하고, 소스를 `little-school`로 옮겨 과목 모듈로 만든다. 과목 이름은 **또박또박 글씨 (Neat Letters)**, id는 `writing`.
> 기존 앱이 같은 스택(TypeScript + Vite + 바닐라 JS)이라 **iframe 없이 모듈로 바로 이식**한다.

### 14-1. 파일 이동 지도

| 기존 한글쓰기 앱 | 꼬마학교에서의 위치 | 처리 |
| --- | --- | --- |
| `src/judge/` (`resample.ts`, `matchStroke.ts`, `judgeGlyph.ts`, `config.ts`) — 리샘플링 32점, 시작·끝점/방향/모양/순서, 회전 방향 판정 | `src/shared/judge/` | 공통으로 승격. 받아쓰기·그림 교실·그림 셈놀이가 재사용 |
| `src/canvas/` (`stage.ts` 캔버스 2장 구조, `guide.ts`·`guideView.ts` 가이드 그리기) | `src/shared/canvas/` | 공통으로 승격 |
| `src/ui/input.ts`, `src/ui/compat.ts` | `src/ui/` | 1단계에서 이미 가져옴. 차이가 있으면 최신 쪽으로 합침. 갤럭시 탭 S펜 처리(2-5) 추가 |
| `src/audio/` (`sfx.ts` 효과음 합성, `speaker.ts` 음성, `lines.ts` 대사, `apply.ts` 설정 반영) | `sfx.ts`·`speaker.ts` → `src/core/audio.ts`(1단계) / `lines.ts` → `src/apps/writing/voices.json` | 과목 코드는 `ctx.audio`만 사용. `apply.ts`의 설정 반영은 공통 설정이 대신함 |
| `src/data/glyphs/`, `glyphs.ts`, `groups.ts`, `types.ts`, `svgPath.ts` (102자, 7개 그룹) | `src/apps/writing/data/` | 쓰기 전용이므로 과목 안에 둠. `groups.ts`의 그룹이 14-3의 카테고리(그룹 id는 그대로, 카테고리 id·이름·순서는 `src/apps/writing/categories.ts`). 판정·가이드가 쓰는 Point·Stroke·Glyph 모양은 `src/shared/types.ts` |
| `src/data/messages.ts` (칭찬·안내 문장) | `src/apps/writing/voices.json` | 문장은 대사 목록으로 옮기고 코드는 대사 ID로 부름. 공통으로 쓸 칭찬은 껍데기 `shell.praise.*`로 |
| `editor.html`, `preview.html`, `src/dev/` (글자 편집기·미리보기) | `tools/glyph-editor.html`, `tools/glyph-preview.html`, `tools/dev/` | 개발 서버에서만 열리게 하고 배포 빌드에서 제외 |
| `src/router.ts` + `src/screens/` (`home.ts` → `modeSelect.ts` → `practice.ts` → `ending.ts`) | `src/apps/writing/screens/` + 과목 내부 미니 라우터 | 과목 안에서만 화면 전환(주소 해시는 `#/app/writing` 유지). 기존 ‘홈’은 과목 첫 화면(카테고리 선택)으로, ‘엔딩’은 별 지급 후 `ctx.exit()` |
| `src/screens/settings.ts` + `src/store/settings.ts` (키 `wp.settings`) | 과목별 설정 → `settingsSchema` / 효과음·음성 → 공통 설정 | 아이 화면의 설정 화면은 삭제. 값은 1회성 마이그레이션(14-4) |
| `src/store/progress.ts` (키 `wp.lastGroup` 등) | `ctx.store` | 기존 앱은 글자별 클리어를 저장하지 않았음. 14-3의 카테고리 진행 저장은 새로 만든다 |
| `voice/clips/*.mp3` (96개, Typecast 제작) | `public/apps/writing/voice/` | 파일은 그대로 옮긴다. 파일 이름(`praise-1.mp3`, `digit-0.mp3` 등)이 대사 ID 규칙과 다르므로 `voices.json`의 `file`로 연결(이름을 바꾸지 않음) |
| `voice/대사목록.csv`, `voice/typecast.json`, `scripts/voice-make.mjs`, `scripts/voice-lines.ts` | `docs/voice/_template/`에 사본 보관 완료 → 15장 음원 도구의 바탕 | 15-3 참고 |
| `public/sw-bridge.js`, `src/pwa.ts`, 아이콘, 워크플로 | 꼬마학교 것 사용 | 과목 쪽에서는 삭제 |
| `vite.config.ts`의 `base: './'`(상대 경로) | 꼬마학교 `vite.config.ts` | 1단계에서 `/little-school/`로 정함(Capacitor 빌드만 `./`) → `./`로 통일 (09 문서 4장 1로 대체). 과목은 리소스 경로를 `ctx.baseUrl`로 계산 |
| Vitest 테스트 298개(이식 시점 305개) | `tests/shared/judge/`, `tests/apps/writing/` | 판정·글자 데이터·편집기 266개는 경로만 고쳐 그대로 통과. 삭제한 코드(설정 저장소·녹음 재생기·메모리 진행 기록·옛 호환성 검사)의 테스트는 새 구조의 테스트로 대신함 |

### 14-2. 작업 순서

1. 14-1 표대로 파일을 옮기고 import 경로를 고친다 → 기존 테스트 298개가 먼저 통과하게 만든다
2. 과목 진입점 `src/apps/writing/index.ts`에서 `mount(el, ctx)`: 기존 `document.body`/최상위 컨테이너 대신 `el` 안에 그린다
3. `unmount()`: 캔버스 이벤트(`ctx.input.attach`의 해제 함수), `resize`·`orientationchange` 리스너, 진행 중인 `speechSynthesis` 발화, 타이머를 모두 정리
4. 저장 이전: 기존 `localStorage` 키가 있으면 한 번 읽어 `ctx.store`로 옮기고 기존 키는 남겨 둔다(롤백 대비). 이후로는 `ctx.store`만 사용
5. 보상 연결: **카테고리 하나를 모두 클리어하면 `ctx.reward.star(1, 'clear:<카테고리>')`** (14-3). 기존 엔딩 팡파레는 칭찬 연출로 남기고, 별·스티커 연출은 껍데기가 맡는다. 오늘 스티커를 이미 받았으면(`ctx.reward.status().doneToday`) 엔딩에서 별 연출만 생략
6. 기록 연결: 글자 하나를 끝낼 때마다 `ctx.log.record({ item: '가', correct, ms, meta: { errors: ['order', 'direction'] } })` → 부모 모드에 ‘자주 틀린 글자’와 틀린 이유가 나온다
7. 설정 이식: 기존 설정 6개를 14-4 표대로 나눈다 — 과목 설정 4개는 `settingsSchema`로, 효과음·음성 읽기는 공통 설정으로. 기존 설정 화면과 그 진입 버튼은 삭제하고, 설정을 읽던 코드는 `ctx.settings`로 바꾼다
8. **가로 고정 정리**: 기존 앱은 세로·가로 모두 지원하므로, 가로 배치만 남기고 세로 전용 CSS·분기는 삭제한다. 쓰기 칸과 가이드·버튼이 1024×684pt 과목 영역 안에 스크롤 없이 들어가는지 확인한다(0~100 좌표 저장 방식은 그대로 유지). 회전 대응 코드는 껍데기의 세로 안내 화면이 대신하므로, 과목 안의 회전 처리는 크기 변경 대응만 남긴다
9. CSS를 `.app-writing` 아래로 한정하고, 공통과 겹치는 옛 Safari 대체 규칙은 `src/ui/styles.css` 하나로 합친다. 기존 앱의 flex `gap` + `.no-flexgap` 대체 규칙은 꼬마학교 호환성 검사가 막으므로 자식 `margin`으로 바꾼다(2-2)
10. `registry.ts`에 `writing` 추가, 샘플 과목 숨김
11. 실기기 확인(**두 기기 모두**): 13장 체크리스트 + 기존 앱에서 하던 실기기 테스트 + 과목 10번 열고 닫기(메모리)
12. **갤럭시 탭 S펜 점검**: 기존 앱은 에어1 위주로 검증했으므로 S펜으로 102자를 쓰면서 확인 — 호버 무시, 손바닥 무시, 판정 허용 범위(펜은 손가락보다 정확해 ‘어려움’ 난이도도 시험), 쓰기 칸이 5:3 화면에서 잘리지 않는지

### 14-3. 또박또박 글씨의 카테고리와 별 기준

아이가 카테고리를 골라 연습하고, **한 카테고리를 모두 클리어하면 별 1개**를 받는다. 7개 카테고리의 글자 수 합은 102자로 기존 글자 데이터와 같다.

| 카테고리 | id | 글자 | 글자 수 |
| --- | --- | --- | --- |
| 숫자 | `digit` | 0 ~ 9 | 10 |
| 자음 | `consonant` | ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ | 14 |
| 모음 | `vowel` | ㅏ ㅑ ㅓ ㅕ ㅗ ㅛ ㅜ ㅠ ㅡ ㅣ | 10 |
| 쌍자음 | `double-consonant` | ㄲ ㄸ ㅃ ㅆ ㅉ | 5 |
| 합성모음 | `compound-vowel` | ㅐ ㅒ ㅔ ㅖ ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ | 11 |
| 영어 소문자 | `lower` | a ~ z | 26 |
| 영어 대문자 | `upper` | A ~ Z | 26 |

**클리어 규칙** (2026-10-21 부모 결정 반영)

- 회차는 카테고리마다 하나. 따라 쓰기·혼자 쓰기 어느 쪽으로 써도 같은 회차에 반영된다
- ‘획 순서 오류 없이’ = 한 글자를 끝까지 쓴 한 번의 시도에 틀린 획이 하나도 없음. 따라 쓰기에서 한 획이라도 틀렸으면 그 글자는 회차 끝에 다시 나온다. 혼자 쓰기는 [확인]에서 틀리면 회차 끝에 다시, [다시 쓰기]로 맞히면 클리어
- 위쪽 글자 띠: 이번 회차 클리어 ✓, 나중에 다시 쓸 글자 표시, 눌러서 아무 글자로 옮겨 갈 수 있다

- 클리어 = 그 카테고리의 모든 글자를 이번 회차에서 한 번씩 **획 순서 오류 없이** 완성
- 틀린 글자는 회차 끝에 다시 나온다(맞힐 때까지)
- 중간에 나가도 회차 진행 상황은 `ctx.store`에 저장되어 이어서 할 수 있다
- 같은 카테고리를 다시 클리어해도 별을 받는다(단, 6-3의 과목당 하루 스티커 1장 제한 적용)
- 카테고리 선택 화면: 카테고리마다 클리어 횟수와 진행 중 회차(예: `자음 9/14`) 표시
- 기록: 글자마다 `ctx.log.record({ item: 'ㄹ', correct, ms, meta: { category: 'consonant', errors: ['order'] } })`

**글자 수가 다른 문제**: 쌍자음(5자)과 영어(26자)는 클리어에 걸리는 시간이 크게 다르다. 처음에는 이대로 운영하고, 영어가 너무 길면 `a~m`, `n~z`처럼 반으로 나누는 것을 검토한다.

### 14-4. 기존 설정 이식

기존 앱의 설정 6개를 **과목 설정(부모 모드 > 또박또박 글씨 설정)**과 **공통 설정(부모 모드 > 공통 설정)**으로 나눈다.

| 기존 설정 | 옮길 곳 | key / 위치 | 형식 | 묶음 |
| --- | --- | --- | --- | --- |
| 판정 난이도 | 과목 설정 | `difficulty` | select: `easy` 쉬움 / `normal` 보통 / `hard` 어려움 (`judge/config.ts`의 세 단계) | 판정 |
| 혼자 쓰기 힌트 | 과목 설정 | `freeHint` | select: `outline` 윤곽 보여 주기 / `none` 없음 | 도움 |
| 획순 애니메이션 자동 재생 | 과목 설정 | `autoDemo` | toggle | 도움 |
| 숫자 읽기 | 과목 설정 | `numberReading` | select: `sino` 일, 이, 삼 / `native` 하나, 둘, 셋 | 읽기 |
| 효과음 (`sound`) | **공통 설정** | `settings.audio.sfxOn` | 켜기/끄기 | 소리 |
| 음성 읽기 (`voice`) | **공통 설정** | `settings.audio.voiceOn` | 켜기/끄기 | 소리 |

- 기존 앱 `src/store/settings.ts`의 기본값: `difficulty: 'easy'`, `freeHint: 'outline'`, `autoDemo: true`, `sound: true`, `voice: true`, `numberReading: 'sino'` — 과목 설정 기본값은 이것을 그대로 쓴다. key 이름도 기존 앱과 같게 해서 코드 변경을 줄인다

- 기본값은 **기존 앱의 기본값을 그대로** 쓴다(표의 형식만 맞춤). 기존 설정 코드에서 기본값을 확인해 `settingsSchema`의 `default`에 적는다
- `settingsSchema`는 `src/apps/writing/settings.ts`에 따로 두고, 각 항목에 `help` 설명을 붙인다
  - 예: 혼자 쓰기 힌트 — “혼자 쓰기에서 글자 윤곽을 흐리게 보여 줘요”
  - 예: 숫자 읽기 — “숫자를 읽어 줄 때 ‘일, 이, 삼’ 또는 ‘하나, 둘, 셋’으로 읽어요”
- 숫자 읽기는 지금은 또박또박 글씨 설정으로 둔다. 구슬 세기 등 다른 과목에서도 필요해지면 공통 설정으로 올린다

**코드 변경**

1. 설정을 읽던 곳(판정 허용 범위, 힌트 표시, 애니메이션 자동 재생, 숫자 읽기 문구)을 `ctx.settings.<key>`로 바꾼다
2. 효과음·음성 재생 전에 기존 설정을 확인하던 `if` 문은 모두 지우고 `ctx.audio.sfx()` / `ctx.audio.speak()`만 호출한다(켜기/끄기는 껍데기가 처리)
3. 아이 화면의 설정 화면, 설정 버튼, 설정 저장 코드를 삭제한다
4. 혼자 쓰기 화면에서 음성이 꺼져 있으면(`ctx.audio.voiceOn === false`) 읽어 줄 글자를 화면에 크게 표시한다

**1회성 마이그레이션** (첫 실행 때 한 번)

- 기존 `localStorage` 설정 키 `wp.settings`가 있으면 읽어서
  - 과목 설정 4개 → `apps.writing.settings`
  - 효과음·음성 읽기 → `settings.audio.sfxOn`, `settings.audio.voiceOn` (**부모가 꼬마학교 공통 설정을 아직 바꾼 적이 없을 때만** 덮어씀)
- 옮긴 뒤 `apps.writing.data.migratedFrom = '<기존 키>'`로 표시해 다시 실행되지 않게 하고, 기존 키는 롤백 대비로 남겨 둔다
- 마이그레이션은 단위 테스트로 확인: 기존 설정 예시 JSON → 기대 결과
- 주의: 두 앱이 같은 GitHub Pages 주소(`jekim8435.github.io`) 아래라 브라우저에서는 저장소를 공유하지만, **아이패드 홈 화면 앱은 앱마다 저장소가 따로**라서 기존 값을 못 읽을 수 있다. 이때는 기본값으로 시작하고 부모가 설정 페이지에서 다시 맞춘다(설정 6개라 부담 적음)

### 14-5. 2단계 완료 기준

- [x] 기존 테스트(판정·데이터·편집기 266개, 이식 시점 305개 중 삭제 코드 몫은 새 테스트로) + 꼬마학교 테스트 전체 통과(421개), 호환성 검사 통과
- [x] 102자 모두 기존 앱과 같은 판정 결과(같은 입력에 같은 결과 — 판정 테스트로 확인)
- [ ] 카테고리 클리어 시 별이 쌓이고, 3개면 스티커로 교환된다. 그 뒤로는 그날 별이 더 나오지 않는다
- [ ] 부모 모드에 ‘자주 틀린 글자’가 보인다
- [ ] 기존 앱에서 쓰던 설정·진도가 첫 실행 때 옮겨져 있다(설정 4개는 또박또박 글씨 설정, 효과음·음성은 공통 설정)
- [ ] 또박또박 글씨 설정 페이지에서 바꾼 4개 항목이 과목을 다시 열면 반영된다
- [ ] 공통 설정에서 효과음·음성 읽기를 끄면 또박또박 글씨에서도 꺼진다
- [ ] 아이 화면에 설정 버튼이 남아 있지 않다
- [x] 글자 편집기는 개발 서버에서 열리고, 배포판에는 없다
- [ ] 또박또박 글씨의 모든 화면이 가로에서 스크롤 없이 보이고, 세로 전용 코드가 남아 있지 않다
- [x] 기존 Typecast 음원이 모두 `say(id)`로 재생되고, `npm run voice:check` 통과
- [x] 이식하면서 새로 생긴 대사(카테고리 클리어, 오늘 스티커 받음 등)를 정리해 `docs/voice/step2-writing/`에 제작 자료를 만들고, 음원을 제작해 넣었다

---

## 15. 음원 관리와 단계별 마무리

> 원칙: **개발 중에는 음원 없이 만들고, 단계나 과목을 마무리할 때 그 단계에서 필요한 음원 목록을 정리해 한꺼번에 제작해 넣는다.** 문장이 개발 중에 계속 바뀌기 때문에, 미리 만들면 다시 만드는 일이 생긴다.

### 15-1. 전체 흐름

```
개발 중                         마무리 단계                               완료
voices.json에 대사 등록   →   "음원 목록 정리해줘"                →   음원 넣기
say(id)로 재생                 · 대사 목록(voice-list.md)                 · voice:check 통과
(음원 없으면 내장 음성)        · Typecast 요청 JSON                       · 실기기 청취
                               → 부모가 Typecast로 제작
```

### 15-2. 대사 등록 (`voices.json`)

- 껍데기: `src/voices.json` / 과목: `src/apps/<id>/voices.json`
- 대사 ID 규칙: `<과목 id 또는 shell>.<화면>.<이름>`, 영문 소문자·숫자·`-`·`.`만 사용
  - 예: `shell.done.bye`, `shell.sticker.board-complete`, `writing.clear.consonant`
  - 글자처럼 수가 많은 대사는 규칙으로 만든다: `writing.char.u3131`(ㄱ의 유니코드). 한글을 파일 이름에 쓰지 않는다
- 음원 위치: `public/voice/<ID>.mp3`(껍데기), `public/apps/<id>/voice/<ID>.mp3`(과목)

```json
{
  "shell.done.bye": {
    "text": "오늘 공부 끝! 내일 또 만나요",
    "tone": "밝고 다정하게, 끝을 살짝 올려서",
    "where": "오늘 공부 끝 화면",
    "producedText": "오늘 공부 끝! 내일 또 만나요"
  },
  "writing.char.u3131": {
    "text": "기역",
    "where": "또박또박 글씨 — 글자 읽기",
    "file": "consonant_01.mp3",
    "producedText": "기역"
  }
}
```

| 필드 | 뜻 |
| --- | --- |
| `text` | 들려줄 문장(필수). 음원이 없을 때 내장 음성이 이 문장을 읽는다 |
| `tone` | 말투·감정 메모. Typecast 감정·속도 선택에 쓴다 |
| `where` | 쓰이는 화면(제작할 때 상황 이해용) |
| `file` | 파일 이름이 ID와 다를 때만(기존 한글쓰기 음원 등) |
| `producedText` | **음원을 만들 때의 문장.** `text`와 다르면 “문장이 바뀌어 다시 만들어야 함”으로 판단 |
| `tts` | `true`면 음원을 만들지 않고 내장 음성으로 두기로 한 대사(목록에서 제외) |

### 15-3. 마무리 산출물 (`docs/voice/<단계 또는 과목>/`)

단계나 과목을 마무리할 때 Claude Code에 “**이번 단계 음원 목록 정리해줘**”라고 요청하면, `scripts/voice-list.mjs`(`npm run voice:list -- <대상>`)로 아래 자료를 만든다.

> **바탕 도구**: 한글쓰기 앱에서 이미 쓰고 있는 Typecast 도구를 그대로 가져와 확장한다(사본: `docs/voice/_template/`)
> - `voice-make.mjs`: 대사목록 CSV를 읽어 Typecast API로 mp3를 만들고, ffmpeg로 앞뒤 무음 자르기·모노 64kbps 변환·음량(LUFS) 맞춤까지 한다. `--list-voices`, `--dry-run`, `--only`, `--force` 옵션
> - `typecast.json`: 모델(`ssfm-v30`), 한국어·영어 목소리 ID, 빠르기·높이, 음량 기준(`lufs: -16`), 파일 이름 앞부분별 감정(`praise-` → happy 등)
> - `대사목록.csv`: 파일 이름, 읽을 문장, 언어, 쓰이는 곳
> - 꼬마학교에서는 `scripts/voice-make.mjs`로 옮기고, 입력을 CSV 하나 대신 **`voices.json` → 대상별 CSV 생성 → 제작**으로 바꾼다. 감정은 `voices.json`의 `tone` 대신 `typecast.json`의 `styles`(ID 앞부분 기준)를 쓴다
> - 목소리 ID·말투 설정은 한글쓰기 앱과 같은 값을 써서 **과목이 달라도 같은 목소리**로 들리게 한다

| 파일 | 내용 |
| --- | --- |
| `voice-list.md` | 제작할 대사 표: 번호, 대사 ID, 문장, 말투, 쓰이는 화면, 파일 이름, 상태(신규 / 문장 변경). 부모가 검토하고 문장을 고치는 용도 |
| `대사목록.csv` | `voice-make.mjs`가 읽는 형식(파일 이름, 읽을 문장, 언어, 쓰이는 곳) — 한글쓰기 앱과 같은 형식 |

- 대상은 `producedText`가 없거나 `text`와 다른 대사, 그리고 `tts: true`가 아닌 대사뿐이다. 이미 만든 음원은 다시 나오지 않는다
- 제작: `npm run voice:make -- --csv docs/voice/<대상>/대사목록.csv` (먼저 `--dry-run`으로 확인). 저장 위치는 CSV의 ‘저장 위치’ 칸을 따르고, 만든 대사의 `producedText`는 자동으로 갱신된다. Typecast 설정은 `docs/voice/typecast.json`
- Typecast API 키는 환경변수 `TYPECAST_API_KEY`로만 넣고 저장소에 넣지 않는다
- **전체 재생성**: `npm run voice:regen-all` — 모든 voices.json의 음원(한글쓰기 앱에서 가져온 93개 포함)을 덮어써서 다시 만든다. 대상 개수·글자 수를 보여 주고 `yes`를 입력해야 시작, `--dry-run`은 API를 부르지 않는다 (09 문서 6장 음원 재생성, R-10)

### 15-4. 음원 넣기와 확인

1. 받은 mp3를 정해진 폴더에 `<ID>.mp3`로 넣는다(규격: mp3 모노, 22kHz, 64kbps 안팎, 앞뒤 무음 0.1초 이하, 파일 간 음량 맞춤)
   > **[09 문서로 대체]** Typecast가 준 mp3를 원본 바이트 그대로 넣는다. 위 규격에 맞추려고 다시 압축·인코딩하지 않는다(AI 생성 메타데이터·워터마크 보존, 09 문서 6장 ③)
2. 제작한 대사의 `producedText`를 `text`와 같게 갱신(스크립트 `npm run voice:mark -- <대상>`)
   > **[09 문서로 대체]** `voice:mark`(손으로 만든 음원)는 쓰지 않는다. `voice:make`가 자동 갱신하고, 전체 재생성 명령을 둔다 (09 문서 6장 음원 재생성)
3. `npm run voice:check` — 아래 중 하나라도 있으면 실패(배포 워크플로에도 포함)
   - 코드에서 `say()`로 부르는데 `voices.json`에 없는 ID
   - `tts: true`가 아닌데 음원 파일이 없는 대사
   - 문장이 바뀌었는데 다시 만들지 않은 대사(`text` ≠ `producedText`)
   - 어떤 대사에도 연결되지 않은 남는 mp3 파일
4. 프리캐시 목록에 새 음원이 들어갔는지 확인(비행기 모드에서 재생)
5. 실기기에서 화면을 돌며 들어 보고, 어색한 대사는 `text`·`tone`을 고쳐 다음 마무리 때 다시 만든다

### 15-5. 단계별 음원 마무리 시점

| 시점 | 대상 | 예상 대사 |
| --- | --- | --- |
| 1단계 마무리 | 껍데기 `src/voices.json` | 시작 인사, 과목 이름(샘플), 오늘 공부 끝, 스티커 받음, 오늘 스티커는 받았어요, 스티커판 완성, 집으로 갈까요(확인 말풍선), 정답·오답 칭찬 몇 가지 — 10~20개 |
| 2단계 마무리 | 또박또박 글씨 + 껍데기 추가분 | 기존 Typecast 음원은 이전만. 새로 생긴 것: 과목 이름, 카테고리 이름 7개, 카테고리 클리어 칭찬, 혼자 쓰기 힌트 안내 등 |
| 과목마다 마무리 | 그 과목 `voices.json` | 과목 이름, 지시문, 칭찬, 문제별 대사(단어·숫자·한자 훈음 등) |

- 부모 모드 화면은 음성을 쓰지 않는다(목록에서 제외)
- 칭찬·격려 대사는 과목끼리 겹치므로 껍데기에 공통으로 두고(`shell.praise.*`) 과목은 가져다 쓴다. 과목 고유의 칭찬만 과목에 둔다

---

## 부록. 새 과목 추가 체크리스트 (3단계 이후 공통)

- [ ] `src/apps/<id>/index.ts`에 규약(4-2) 구현, 단위 테스트는 `tests/apps/<id>/`
- [ ] `registry.ts`에 한 줄 추가
- [ ] 아이에게 들려주는 문장은 모두 `voices.json`에 등록하고 `ctx.audio.say(id)`로 재생(개발 중에는 내장 음성으로 대신 읽힘)
- [ ] **마무리: 음원 목록 정리**(15장) → `docs/voice/<과목 id>/` 제작 자료 생성 → Typecast 제작 → `public/apps/<id>/voice/`에 넣기 → `npm run voice:check` 통과 → 실기기 청취
- [ ] 한 판 3~5분, 정답 시 `ctx.reward.star()`, 문제마다 `ctx.log.record()`
- [ ] `unmount()`에서 정리 확인(10번 열고 닫기 테스트)
- [ ] 호환성 검사 2종 통과(2-2)
- [ ] 가로 1024×684pt 과목 영역 안에 스크롤 없이 들어간다(10장). 세로 레이아웃은 만들지 않는다
- [ ] 아이패드 에어1과 갤럭시 탭 S6 Lite **두 기기에서** 실기기 확인(손가락·정전식 펜·S펜) 후 `main`에 병합 → 자동 배포
