# KubeLingoAssist

Kubernetes 문서 번역을 돕는 VS Code 확장 프로그램.

## Build & Test

```bash
npm run compile     # UI 빌드 + TypeScript 컴파일
npm test            # VS Code Extension Host에서 테스트 실행
npm run lint        # ESLint
```

## Architecture

```
src/
├── core/                    # 공유 인프라
│   ├── types.ts             # CommitInfo, CommitFile 등 공유 타입
│   ├── path-utils.ts        # 경로 관련 공유 유틸리티 (언어코드 추출, 번역파일 판별 등)
│   └── extension.ts         # VS Code activate/deactivate 진입점
├── features/
│   ├── git/                 # Git 통합 (Facade 패턴)
│   │   ├── GitService.ts         # 오케스트레이터
│   │   ├── GitCommandExecutor.ts # Shell 실행
│   │   ├── CommitParser.ts       # Git 출력 파싱
│   │   ├── FilePathResolver.ts   # 경로 처리
│   │   └── GitRepositoryDetector.ts
│   ├── translation/         # 번역 핵심 기능
│   │   ├── TranslationUtils.ts          # 경로 변환, Split View, 언어 처리
│   │   ├── TranslationCommandManager.ts # 상태 머신 + 커맨드 라우터
│   │   └── ScrollSyncManager.ts         # 스크롤 동기화
│   ├── review/              # PR 리뷰
│   │   └── PRInfoService.ts  # gh CLI 래퍼
│   ├── ui/                  # UI 컴포넌트
│   │   ├── StatusBarManager.ts
│   │   └── webview-providers.ts  # React UI 브릿지
│   ├── i18n/                # 국제화 (싱글톤)
│   └── notifications/       # 알림 관리 (싱글톤)
├── validators/
│   └── link.ts              # 마크다운 링크 검증 + CodeAction
└── test/
    └── suite/               # Mocha 테스트
```

### Layer Rules

1. **core/** - 다른 feature에 의존하지 않음. 공유 타입과 유틸리티만 제공
2. **features/** - core에 의존 가능, 다른 feature 간 의존은 최소화
3. **validators/** - core와 features에 의존 가능
4. **extension.ts** - 모든 모듈을 조합하는 유일한 오케스트레이터

### Key Conventions

- **경로 관련 유틸리티는 `core/path-utils.ts`에 집중**: `extractLanguageCode`, `isTranslationFile`, `getContentRoot`, `getOriginalEnglishPath`, `fileExistsSync` 등. 새로운 경로 관련 로직을 추가할 때 여기에 먼저 확인
- **content/{lang}/ 패턴**: Kubernetes 문서 구조는 `content/{언어코드}/docs/...` 형태. 이 패턴을 다루는 regex를 직접 작성하지 말고 `core/path-utils.ts`의 함수를 사용
- **싱글톤**: i18n, NotificationManager는 싱글톤. 직접 인스턴스 생성하지 않음
- **테스트에서 파일 시스템 모킹**: LinkValidator는 `fileExists` 필드를 통해 테스트에서 `(validator as any).fileExists = () => ...`로 모킹 가능
