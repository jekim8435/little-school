# 꼬마학교 (Little School)

아이(2022년생)를 위한 태블릿 학습 웹앱(PWA). 허브 앱에 과목을 하나씩 끼워 넣는 구조입니다.

- 기획·명세: [`docs/README.md`](docs/README.md) (문서 지도) — 배포·이식성·정책은 [`docs/06_배포_스토어_정책.md`](docs/06_배포_스토어_정책.md)가 우선
- 라이선스·출처: [`docs/licenses.md`](docs/licenses.md)

## 음성 출처

이 앱의 음성은 AI 음성 합성 서비스 타입캐스트(Typecast)로 만들었습니다.

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm test         # 단위 테스트
npm run build    # 타입 검사 → 빌드 → Safari 12 호환성 검사 → 프리캐시 검사
npm run voice:check                  # 음원 확인
npm run voice:regen-all -- --dry-run # 전체 음원 재생성 미리 보기 (크레딧 0)
npm run build:deploy # 배포용: 테스트 → 음원 확인 → 빌드 (Cloudflare Pages가 실행)
```

## 배포 (Cloudflare Pages)

주소: (Cloudflare 프로젝트를 만든 뒤 적기 — `https://<프로젝트 이름>.pages.dev/`)

`main`에 push하면 Cloudflare Pages가 저장소를 가져가 빌드하고 배포합니다. GitHub 저장소는 비공개입니다.
테스트·음원 확인·빌드(호환성·프리캐시 검사 포함) 중 하나라도 실패하면 배포되지 않고, 이전 버전이 그대로 남습니다.

### 처음 한 번

1. Cloudflare 대시보드 **Workers & Pages → Create application**에서 맨 아래 **Continue to Pages**를 누릅니다.
   (위쪽 큰 버튼들은 Workers 프로젝트를 만들므로 쓰지 않습니다.)
2. **Import an existing Git repository**로 GitHub 저장소 `jekim8435/little-school`을 연결합니다.
   저장소를 비공개로 바꾼 뒤라면 Cloudflare GitHub 앱에 이 저장소 접근 권한을 줘야 목록에 보입니다.
3. 빌드 설정:

   | 항목 | 값 |
   |---|---|
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npm run build:deploy` |
   | Build output directory | `dist` |
   | 환경 변수 | `NODE_VERSION` = `22` |

모든 경로가 상대 경로(`base: './'`)라 어느 주소에 올려도 그대로 동작합니다.

### 옛 주소(GitHub Pages)에서 옮길 때

주소가 바뀌면 브라우저 저장소도 새로 시작합니다(별·스티커·기록·설정이 따라오지 않음).

1. 옛 홈 화면 앱(`jekim8435.github.io/little-school/`)의 부모 모드 → **백업**에서 백업 글자를 복사해 메모 등에 붙여 둡니다.
2. 새 주소를 열어 홈 화면에 추가하고, 홈 화면 아이콘으로 실행한 뒤 부모 모드 → **백업**의 복원 칸에 붙여 넣습니다.
3. 옛 홈 화면 아이콘은 지웁니다. 저장소를 비공개로 바꾸면 GitHub Pages는 꺼집니다(무료 계정).
