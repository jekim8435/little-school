# 꼬마학교 (Little School)

아이(2022년생)를 위한 태블릿 학습 웹앱(PWA). 허브 앱에 과목을 하나씩 끼워 넣는 구조입니다.

- 기획·명세: [`docs/`](docs/) — 배포·이식성·정책은 [`docs/09_배포_플랫폼_스토어출시.md`](docs/09_배포_플랫폼_스토어출시.md)가 우선
- 라이선스·출처: [`docs/licenses.md`](docs/licenses.md)

## 음성 출처

이 앱의 음성은 AI 음성 합성 서비스 타입캐스트(Typecast)로 만들었습니다.

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm test         # 단위 테스트
npm run build    # 타입 검사 → 빌드 → Safari 12 호환성 검사 → 프리캐시 검사
```
