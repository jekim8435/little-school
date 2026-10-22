import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import pkg from './package.json';

// 앱 코드는 Node 타입을 쓰지 않으므로 설정 파일에서 필요한 만큼만 선언한다
declare const process: { env: Record<string, string | undefined> };

// 네이티브(Capacitor) 빌드: VITE_NATIVE=1 npm run build → 서비스 워커를 만들지 않는다
const native = process.env.VITE_NATIVE === '1';

// 모든 경로는 상대 경로 (09 문서 4장 1, R-03). 배포 주소(/little-school/)에 의존하지 않는다.
// manifest의 start_url·scope도 './' → manifest 파일 위치 기준으로 풀린다(GitHub Pages에서는 /little-school/)
const BASE = './';

export default defineConfig({
  base: BASE,
  server: { host: true },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // 한국 시각 'YYYY-MM-DD HH:mm'
    __BUILD_TIME__: JSON.stringify(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')),
  },
  build: {
    // 실사용 기기: 아이패드 에어 1 (iOS 12.5 / Safari 12).
    // ??, ?., 클래스 필드 같은 새 문법을 Safari 12가 읽을 수 있게 풀어서 내보낸다.
    // 빌드 뒤 scripts/check-compat.mjs가 결과물을 다시 검사한다 (npm run check:compat).
    target: ['es2019', 'safari12'],
    cssTarget: ['safari12'],
  },
  plugins: [
    VitePWA({
      disable: native,
      // 새 버전은 자동으로 바꾸지 않고 "새 버전이 있어요" 배너로 묻는다 (src/pwa.ts)
      registerType: 'prompt',
      injectRegister: false,
      // 아이콘은 아래 globPatterns로 이미 미리 캐시되므로 따로 넣지 않는다 (중복 방지)
      includeAssets: [],
      includeManifestIcons: false,
      manifest: {
        name: '꼬마학교',
        short_name: '꼬마학교',
        description: '꼬마를 위한 놀이 학습 앱',
        lang: 'ko',
        start_url: BASE,
        scope: BASE,
        // 갤럭시 탭(Chrome): 주소창 없는 앱 화면 + 가로 고정 (iOS 12는 무시, 명세 2-4·11-1).
        // 상태 표시줄(시계)은 아이패드처럼 보이게 둔다 (2026-10-22 부모 결정, 처음에는 fullscreen이었음)
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#fff8ef',
        theme_color: '#fff8ef',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 빌드 결과물 전부를 미리 캐시한다 → 설치 후 네트워크 요청 0건
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,mp3,m4a}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
