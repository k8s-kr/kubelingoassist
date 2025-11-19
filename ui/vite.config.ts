import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',                    // ✅ webview에서 상대경로 안전
  resolve: {
    alias: {
      '@shared-i18n': path.resolve(__dirname, '../src/features/i18n'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    cssCodeSplit: false,         // ✅ CSS 한 파일로 강제
    target: 'esnext',            // ✅ 최신 브라우저용
    minify: true,                // ✅ 번들 최소화
    sourcemap: false,            // ✅ 소스맵 제거
    rollupOptions: {
      input: 'src/main.tsx',     // ✅ 진입점 명시 (필요시)
      output: {
        format: 'es',            // ✅ ES Module로 번들링
        entryFileNames: 'main.js',
        chunkFileNames: 'chunk-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'main.css'
          }
          return '[name]-[hash][extname]'
        }
      }
    }
  }
})