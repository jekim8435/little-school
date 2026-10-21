# 음원 제작 목록 — step1-shell

대상: shell, sample · 9개 · 만든 날 2026-10-21

문장을 고치고 싶으면 이 표가 아니라 `voices.json`의 `text`를 고친 뒤 `npm run voice:list`를 다시 실행한다.

| 번호 | 대사 ID | 문장 | 말투 | 쓰이는 화면 | 파일 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `shell.start.hello` | 안녕! 꼬마학교에 온 걸 환영해요 | 밝고 다정하게, 반갑게 인사하듯 | 시작 화면 — ‘시작!’ 버튼을 눌렀을 때 | `public/voice/shell.start.hello.mp3` | 신규 |
| 2 | `shell.app.home-confirm` | 집으로 갈까요? 한 번 더 누르면 가요 | 부드럽게 물어보듯 | 과목 화면 — 집 버튼을 한 번 눌렀을 때 | `public/voice/shell.app.home-confirm.mp3` | 신규 |
| 3 | `shell.app.sticker-done` | 오늘 스티커는 받았어요. 연습은 계속할 수 있어요 | 칭찬하듯 밝게 | 과목 화면 — 오늘 스티커를 이미 받은 과목에 들어올 때 | `public/voice/shell.app.sticker-done.mp3` | 신규 |
| 4 | `shell.sticker.got` | 스티커를 받았어요! | 신나게, 축하하듯 | 과목 화면 — 별이 모여 스티커로 바뀔 때 | `public/voice/shell.sticker.got.mp3` | 신규 |
| 5 | `shell.sticker.board-complete` | 스티커판 완성! 엄마 아빠에게 보여 주세요 | 아주 신나게, 자랑스럽게 | 과목 화면 — 스티커판의 마지막 칸이 채워질 때 | `public/voice/shell.sticker.board-complete.mp3` | 신규 |
| 6 | `shell.done.bye` | 오늘 공부 끝! 내일 또 만나요 | 밝고 다정하게, 끝을 살짝 올려서 | 오늘 공부 끝 화면 | `public/voice/shell.done.bye.mp3` | 신규 |
| 7 | `shell.rotate.turn` | 옆으로 돌려 주세요 | 부드럽게 부탁하듯 | 세로 방향 안내 화면 | `public/voice/shell.rotate.turn.mp3` | 신규 |
| 8 | `sample.hub.name` | 샘플 | 또박또박, 밝게 | 허브 — 샘플 타일을 눌렀을 때 | `public/apps/sample/voice/sample.hub.name.mp3` | 신규 |
| 9 | `sample.play.intro` | 동그라미를 모두 눌러 보세요 | 다정하게 안내하듯 | 샘플 과목 — 시작할 때 | `public/apps/sample/voice/sample.play.intro.mp3` | 신규 |
