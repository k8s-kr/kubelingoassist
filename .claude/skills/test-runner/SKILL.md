---
name: test-runner
description: |
  KubeLingoAssist 프로젝트의 빌드, lint, 테스트를 실행하고 결과를 분석하는 skill. 코드 변경 후 검증이 필요할 때, "돌아가?", "테스트 돌려줘", "빌드해봐", "lint 체크해봐" 같은 요청에 사용한다. 코드를 수정한 뒤에는 항상 이 skill을 사용해서 검증한다.
---

# Test Runner for KubeLingoAssist

코드 변경 후 빌드/lint/테스트를 실행하고 결과를 분석하는 skill이다. VS Code extension 프로젝트 특성상 빌드가 UI(Vite) + TypeScript 2단계이고, 테스트는 Extension Host가 필요해서 수동으로 돌리기 번거롭다.

## 빌드 파이프라인

프로젝트 루트: 워크스페이스에서 `kubelingoassist` 디렉토리를 찾는다.

### Step 1: Lint (선택적, 빠른 피드백용)

```bash
cd <project-root>
npm run lint
```

ESLint로 TypeScript 코드를 검사한다. `--fix` 옵션이 필요하면:

```bash
npm run lint:fix
```

### Step 2: Format Check (선택적)

```bash
npm run format:check
```

Prettier 포맷 검사. 자동 수정:

```bash
npm run format
```

### Step 3: Build (필수)

```bash
npm run compile
```

이 명령어는 두 단계를 순서대로 실행한다:
1. `npm run build-ui` — `ui/` 디렉토리에서 Vite로 React UI 빌드
2. `npx tsc -p ./` — TypeScript 컴파일 (`out/` 디렉토리에 출력)

빌드 실패 시 가장 흔한 원인:
- TypeScript 타입 에러 → 에러 메시지의 파일:라인 확인
- UI 빌드 실패 → `ui/` 디렉토리의 dependency 확인 (`cd ui && npm install`)
- import 경로 오타 → 상대 경로 `../` 깊이 확인

### Step 4: Test (필수)

```bash
npm test
```

이 명령어는 `compile` 후 `node ./out/test/runTest.js`를 실행한다.

테스트는 `@vscode/test-electron`을 통해 VS Code Extension Host에서 실행되므로:
- 디스플레이가 없는 환경에서는 `xvfb-run -a npm test` 사용
- 테스트 프레임워크: Mocha
- 테스트 위치: `src/test/suite/*.test.ts`

## 실행 전략

상황에 따라 다르게 실행한다:

### 빠른 검증 (타입 체크만)
```bash
npx tsc --noEmit
```
빌드 없이 타입 에러만 빠르게 확인한다.

### 표준 검증 (코드 변경 후)
```bash
npm run lint && npm run compile && npm test
```

### 풀 검증 (PR 전)
```bash
npm run lint && npm run format:check && npm run compile && npm test
```

CI(`ci.yml`)에서 실행하는 것과 동일한 순서다.

## 실패 분석 가이드

### TypeScript 컴파일 에러
- `Cannot find module` → import 경로 확인, barrel export(`index.ts`) 업데이트 여부 확인
- `Property does not exist` → 타입 정의 확인, `core/types.ts` 참조
- `Argument of type` → VS Code API 타입 불일치, `@types/vscode` 버전 확인

### Lint 에러
- `@typescript-eslint` 규칙 위반이 대부분
- `--fix`로 자동 수정 가능한 건 자동 수정하고, 나머지만 보고

### 테스트 실패
- 테스트 파일: `src/test/suite/` 아래
- 파일 시스템 모킹: `(validator as any).fileExists = () => ...` 패턴
- VS Code API 모킹이 필요한 테스트는 Extension Host에서만 동작

### UI 빌드 실패
- `cd ui && npm install`로 dependency 재설치
- Vite 설정: `ui/vite.config.ts` 확인

## 결과 보고

실행 후 다음을 정리해서 보고한다:
1. 각 단계(lint/build/test)의 성공/실패 여부
2. 실패한 경우 핵심 에러 메시지와 해당 파일:라인
3. 수정 방향 제안 (가능하면 구체적인 코드 수정까지)
