---
name: arch-guard
description: |
  KubeLingoAssist 프로젝트의 아키텍처 규칙을 검증하는 skill. 새 파일 생성, import 추가, 모듈 간 의존성 변경 등 코드 구조에 영향을 주는 작업을 할 때 반드시 사용한다.
  이 skill은 다음 상황에서 트리거되어야 한다: 새 TypeScript 파일 생성, import 문 추가/수정, 새 클래스나 함수를 어디에 놓을지 결정할 때, 모듈 간 의존성을 추가할 때, path-utils나 싱글톤 관련 코드를 작성할 때. "이 파일 어디에 만들어야 해?", "이 import 괜찮아?" 같은 질문에도 사용한다.
---

# Architecture Guard for KubeLingoAssist

이 skill은 KubeLingoAssist 프로젝트의 아키텍처 규칙을 enforce한다. 바이브코딩으로 빠르게 코드를 작성하다 보면 레이어 규칙을 깨기 쉬운데, 이 skill이 가드레일 역할을 한다.

## 프로젝트 디렉토리 구조

```
src/
├── core/                    # Layer 0: 공유 인프라 (다른 feature에 의존 금지)
│   ├── types.ts             # CommitInfo, CommitFile 등 공유 타입
│   ├── path-utils.ts        # 경로 관련 유틸리티 집중
│   └── extension.ts         # activate/deactivate 진입점 (유일한 오케스트레이터)
├── features/                # Layer 1: 기능 모듈
│   ├── git/                 # Git 통합 (Facade 패턴)
│   ├── translation/         # 번역 핵심 기능
│   ├── review/              # PR 리뷰
│   ├── ui/                  # UI 컴포넌트
│   ├── i18n/                # 국제화 (싱글톤)
│   └── notifications/       # 알림 관리 (싱글톤)
├── validators/              # Layer 2: 검증 로직
│   └── link.ts
└── test/
    └── suite/
```

## 검증 규칙

코드를 작성하거나 수정할 때 다음 규칙을 반드시 확인한다.

### Rule 1: Layer 의존성 방향

의존성은 반드시 위에서 아래로만 흐른다:

- **core/** → 어떤 feature에도 의존하지 않는다. `vscode` API와 Node.js 표준 라이브러리만 사용 가능.
- **features/** → `core/`에 의존 가능. 다른 feature 간 의존은 최소화한다 (불가피하면 interface를 통해).
- **validators/** → `core/`와 `features/`에 의존 가능.
- **extension.ts** → 모든 모듈을 조합하는 유일한 오케스트레이터. 새 모듈을 추가하면 여기서 초기화하고 연결한다.

**위반 예시:**
```typescript
// ❌ core/path-utils.ts에서 features를 import
import { GitService } from '../features/git';

// ❌ features/git/에서 features/translation/을 직접 import
import { TranslationUtils } from '../translation/TranslationUtils';

// ✅ features/git/에서 core/를 import
import { extractLanguageCode } from '../../core/path-utils';
```

### Rule 2: 경로 관련 로직은 `core/path-utils.ts`에 집중

`content/{lang}/` 패턴을 다루는 regex를 직접 작성하지 말고, `core/path-utils.ts`의 기존 함수를 먼저 확인한다.

사용 가능한 함수:
- `extractLanguageCode(filePath)` — 경로에서 언어 코드 추출
- `isTranslationFile(filePath)` — 번역 대상 파일인지 판별 (en 제외)
- `getContentRoot(filePath)` — content 루트 디렉토리 추출
- `getOriginalEnglishPath(translationPath)` — 영어 원본 경로 반환
- `fileExistsSync(filePath)` — 파일/디렉토리 존재 여부

새 경로 유틸리티가 필요하면 이 파일에 추가한다. 다른 파일에 흩어놓지 않는다.

### Rule 3: 싱글톤 패턴 준수

다음 모듈은 싱글톤이다. 직접 `new`로 인스턴스를 생성하지 않는다:
- **i18n** — `import { i18n } from '../features/i18n'`로 가져와서 사용
- **NotificationManager** — 싱글톤 인스턴스를 가져와서 사용

### Rule 4: Git 모듈은 Facade 패턴

`features/git/` 모듈은 `GitService`가 facade 역할을 한다:
- 외부에서는 `GitService`만 import한다
- `GitCommandExecutor`, `CommitParser`, `FilePathResolver`, `GitRepositoryDetector`는 직접 import하지 않는다
- 새 Git 관련 기능은 `GitService`를 통해 노출한다

### Rule 5: 새 VS Code command 등록 위치

- 기존 command 체계(translation, review, sync 등)에 속하는 command → `TranslationCommandManager.registerCommands()`에 추가
- PR 관련 command → `extension.ts`의 `registerPRCommands()`에 추가
- 완전히 새로운 도메인의 command → 새 CommandManager 클래스를 만들고 `extension.ts`에서 초기화

### Rule 6: 테스트 파일 위치

- 테스트 파일은 `src/test/suite/` 아래에 `*.test.ts`로 만든다
- 파일 시스템 의존 테스트에서는 `(validator as any).fileExists = () => ...` 패턴으로 모킹한다
- VS Code API 의존 테스트는 `@vscode/test-electron`으로 Extension Host에서 실행된다

## 검증 체크리스트

새 코드를 작성하기 전에 이 체크리스트를 확인한다:

1. **파일 위치가 맞는가?** — 해당 코드가 속할 레이어(core/features/validators)를 확인
2. **import 방향이 맞는가?** — 상위 레이어에서 하위 레이어를 import하고 있지 않은지 확인
3. **경로 regex를 새로 만들고 있지 않은가?** — `path-utils.ts`에 이미 있는 함수가 아닌지 확인
4. **싱글톤을 new로 만들고 있지 않은가?** — i18n, NotificationManager 확인
5. **Git 내부 모듈을 직접 import하고 있지 않은가?** — GitService facade만 사용하는지 확인
6. **barrel export(index.ts)를 업데이트했는가?** — 새 모듈 추가 시 해당 디렉토리의 index.ts 업데이트
