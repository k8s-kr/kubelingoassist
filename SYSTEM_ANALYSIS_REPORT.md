# KubeLingoAssist 시스템 분석 보고서

**분석 일자**: 2026-01-12
**프로젝트 버전**: 0.0.7
**분석 범위**: VS Code Extension 전체 코드베이스

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [API 엔드포인트 목록](#2-api-엔드포인트-목록)
3. [핵심 비즈니스 규칙](#3-핵심-비즈니스-규칙)
4. [잠재적 버그 및 코드 스멜](#4-잠재적-버그-및-코드-스멜)
5. [권장 개선 사항](#5-권장-개선-사항)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 유형
- **VS Code Extension**: Kubernetes 문서 번역 생산성 향상 도구
- **주요 기능**: Translation Mode (번역 모드), Review Mode (PR 리뷰 모드)

### 1.2 기술 스택
| 항목 | 기술 |
|------|------|
| 언어 | TypeScript 4.9.5 |
| 런타임 | VS Code Extension API 1.75.0+ |
| UI | React 18.2.0 + Vite |
| 테스트 | Mocha + @vscode/test-electron |
| 의존성 | uuid ^9.0.1 |

### 1.3 아키텍처 구조

```
src/
├── core/                    # 확장 진입점 및 핵심 타입
│   ├── extension.ts         # activate/deactivate 함수
│   └── types.ts             # 공통 타입 정의
├── features/
│   ├── translation/         # 번역 기능 (핵심)
│   ├── git/                 # Git 연동
│   ├── review/              # PR 리뷰 기능
│   ├── ui/                  # Webview 및 상태바
│   ├── i18n/                # 국제화 (EN/KO/JA)
│   └── notifications/       # 알림 관리
└── validators/              # 링크 유효성 검증
```

---

## 2. API 엔드포인트 목록

### 2.1 VS Code 명령어 (Commands)

| 명령어 ID | 단축키 | 기능 요약 | 구현 위치 |
|-----------|--------|-----------|-----------|
| `kubelingoassist.openTranslationFile` | `Cmd+Shift+T` (Mac) / `Alt+Shift+T` (Win) | 영문 파일에서 번역 파일 열기, 또는 번역 파일에서 원문 열기. Split View로 양쪽 표시 | `TranslationCommandManager.ts:145` |
| `kubelingoassist.openReviewFile` | `Cmd+Shift+R` / `Alt+Shift+R` | 리뷰 모드에서 번역 파일의 영문 원본을 함께 열기 | `TranslationCommandManager.ts:180` |
| `kubelingoassist.toggleSyncScroll` | `Cmd+Shift+E` / `Alt+Shift+E` | 분할 화면 스크롤 동기화 토글 | `TranslationCommandManager.ts:297` |
| `kubelingoassist.toggleKubelingo` | - | 확장 기능 전체 활성화/비활성화 | `TranslationCommandManager.ts:319` |
| `kubelingoassist.changeMode` | - | Translation/Review 모드 전환 | `TranslationCommandManager.ts:338` |
| `kubelingoassist.fetchPRInfo` | - | GitHub PR 정보 가져오기 (gh CLI 사용) | `extension.ts:21` |

### 2.2 Webview 메시지 API

| 메시지 타입 | 방향 | 페이로드 | 기능 |
|-------------|------|----------|------|
| `openTranslationFile` | UI → Extension | - | 번역 파일 열기 명령 실행 |
| `openReviewFile` | UI → Extension | - | 리뷰 파일 열기 명령 실행 |
| `toggleSyncScroll` | UI → Extension | - | 스크롤 동기화 토글 |
| `toggleKubelingo` | UI → Extension | - | 확장 활성화 토글 |
| `changeMode` | UI → Extension | `mode: 'translation' \| 'review'` | 모드 변경 |
| `fetchPRInfo` | UI → Extension | `prNumber: number` | PR 정보 조회 |
| `stateUpdate` | Extension → UI | `WebviewState` | 상태 동기화 브로드캐스트 |
| `prInfo` | Extension → UI | `PRDetails` | PR 상세 정보 전송 |
| `prList` | Extension → UI | `PRInfo[]` | PR 목록 전송 |

### 2.3 GitHub CLI (gh) API 호출

| 메서드 | gh 명령어 | 기능 |
|--------|-----------|------|
| `PRInfoService.getPRInfo()` | `gh pr view {N} --json ...` | PR 기본 정보 조회 |
| `PRInfoService.getPRFiles()` | `gh pr view {N} --json files` | PR 변경 파일 목록 |
| `PRInfoService.getPRCommits()` | `gh pr view {N} --json commits` | PR 커밋 목록 |
| `PRInfoService.getPRComments()` | `gh api repos/{owner}/{repo}/pulls/{N}/comments` | PR 리뷰 댓글 |
| `PRInfoService.getFileDiff()` | `gh pr diff {N} -- "{file}"` | 특정 파일 diff |
| `PRInfoService.checkoutPR()` | `gh pr checkout {N} -b {branch}` | PR 브랜치 체크아웃 |
| `PRInfoService.listRecentPRs()` | `gh pr list --limit {N}` | 최근 PR 목록 |
| `PRInfoService.getParentRepo()` | `gh repo view --json isFork,parent` | Fork 저장소 감지 |

### 2.4 Git 명령어 API

| 메서드 | Git 명령어 | 기능 |
|--------|-----------|------|
| `GitCommandExecutor.getCommitInfo()` | `git log -1 --pretty=format:"%H\|%s\|%an\|%ad"` | 최근 커밋 정보 |
| `GitCommandExecutor.getChangedFilesInCommit()` | `git show --name-status --pretty= {hash}` | 커밋 내 변경 파일 |
| `GitCommandExecutor.getCurrentBranch()` | `git branch --show-current` | 현재 브랜치명 |
| `GitCommandExecutor.getRemoteUrl()` | `git remote get-url origin` | 원격 저장소 URL |

### 2.5 VS Code Document Providers

| Provider | 등록 대상 | 기능 |
|----------|----------|------|
| `WebviewViewProvider` | `kubelingoassist-view` | React Webview 패널 제공 |
| `DocumentLinkProvider` | `markdown` 파일 | 번역 파일 링크 클릭 시 해당 파일 열기 |
| `CodeActionProvider` | `markdown` 파일 | Quick Fix로 언어 경로 추가 제안 |
| `DiagnosticCollection` | `markdown` 파일 | 번역 링크 검증 경고 표시 |

---

## 3. 핵심 비즈니스 규칙

### 3.1 파일 경로 유효성 검증

#### 3.1.1 Kubernetes 문서 구조 검증
```typescript
// 위치: TranslationUtils.ts:168
// 규칙: /content/ 디렉토리가 포함된 경로만 처리
private isKubernetesContentPath(normalizedPath: string): boolean {
    return normalizedPath.includes('/content/');
}
```

#### 3.1.2 영문 파일 판별
```typescript
// 위치: TranslationUtils.ts:172
// 규칙: /content/en/ 경로 포함 여부로 영문 파일 판별
private isEnglishFile(normalizedPath: string): boolean {
    return normalizedPath.includes('/content/en/');
}
```

#### 3.1.3 번역 파일 판별
```typescript
// 위치: link.ts:106
// 규칙: /content/{lang}/docs/ 패턴 중 lang이 'en'이 아닌 경우
const TRANSLATION_FILE_PATTERN = /\/content\/([^\/]+)\/docs\//;
private isTranslationFile(filePath: string): boolean {
    const match = filePath.match(CONSTANTS.TRANSLATION_FILE_PATTERN);
    return match !== null && match[1] !== CONSTANTS.EXCLUDED_LANGUAGE;
}
```

### 3.2 지원 언어 제약조건

```typescript
// 위치: features/i18n/index.ts (추론)
// 지원 언어 목록
SUPPORTED_LANGUAGES = ['en', 'ko', 'ja', 'zh-cn', 'zh', 'fr', 'de', 'es'];

// 번역 리소스 구현 상태
// - 완전 구현: en, ko, ja
// - 미구현 (영어 fallback): zh-cn, zh, fr, de, es
```

### 3.3 저장소 유효성 검증

```typescript
// 위치: GitRepositoryDetector.ts:35-46
// 규칙: 다음 중 하나라도 충족하면 kubernetes/website 저장소로 인정
// 1. remote URL에 'kubernetes/website' 포함
// 2. 특정 파일 존재: hugo.toml, netlify.toml, api-ref-assets, update-imported-docs
// 3. content 디렉토리 내 2개 이상의 언어 디렉토리 존재
// 4. package.json의 name에 'kubernetes' 포함 또는 @docsy/hugo-base 의존성
```

### 3.4 링크 검증 규칙

```typescript
// 위치: link.ts:57-100
// 규칙: 번역 파일에서 /docs/로 시작하는 링크 검사

// 검증 조건:
// 1. 이미 언어 코드가 포함된 링크는 스킵 (/ko/docs/, /ja/docs/ 등)
// 2. 영어 코드가 포함된 링크도 스킵 (/en/docs/)
// 3. 해당 언어의 번역 파일이 존재하는 경우 경고 표시
// 4. 폴더 링크(/docs/concepts/)와 파일 링크(/docs/concepts/overview) 모두 처리

// 링크 패턴: [텍스트](/docs/경로)
const LINK_REGEX = /\[([^\]]*)\]\(\/docs\/([^)]*)\)/g;
```

### 3.5 PR 번역 파일 필터링

```typescript
// 위치: PRInfoService.ts:522-556
// 규칙: PR에서 번역 관련 파일만 필터링

// 필터링 조건:
// 1. content/{lang}/ 경로에서 lang이 'en'이 아닌 모든 언어
// 2. i18n/{lang}/ 경로의 파일도 포함
// 3. 마크다운 파일(.md)만 리뷰 대상으로 추출
```

### 3.6 스크롤 동기화 규칙

```typescript
// 위치: ScrollSyncManager.ts:36-46
// 규칙: /content/ 경로를 포함한 파일들 간 스크롤 동기화

// 동기화 조건:
// 1. 파일 경로에 '/content/' 또는 '\\content\\' 포함
// 2. 2개 이상의 번역 파일 에디터가 열려있어야 함
// 3. 절대 라인 번호 기준으로 동기화 (맨 위 라인 기준)
// 4. 20ms 디바운스 적용으로 성능 최적화
```

### 3.7 상태 지속성 규칙

```typescript
// 위치: TranslationCommandManager.ts:16-18
// 규칙: 워크스페이스 상태 저장 키

static readonly KEY_SYNC = 'syncScrollEnabled';      // 스크롤 동기화 상태
static readonly KEY_KUBELINGO = 'kubelingoEnabled';  // 확장 활성화 상태
static readonly KEY_MODE = 'kubelingoMode';          // 현재 모드 (translation/review)

// 저장소: vscode.ExtensionContext.workspaceState
```

### 3.8 PR 브랜치 명명 규칙

```typescript
// 위치: PRInfoService.ts:602-608, 614
// 규칙: PR 체크아웃 시 브랜치명 형식

// 형식: pr-{번호}/{제목-slug}
// 예시: pr-123/add-korean-translation-for-concepts

// 제목 슬러그 변환 규칙:
// 1. 소문자 변환
// 2. 영문, 숫자, 한글 외 문자를 하이픈으로 변환
// 3. 연속 하이픈을 단일 하이픈으로
// 4. 앞뒤 하이픈 제거
// 5. 최대 50자 제한
```

---

## 4. 잠재적 버그 및 코드 스멜

### 4.1 심각도 중간 (Medium)

#### 4.1.1 싱글톤 패턴 남용
**위치**:
- `i18n.ts:29-36`
- `NotificationManager.ts:19-26`

**문제점**:
- 테스트 시 모킹이 어려움
- 전역 상태로 인한 부작용 가능성
- 의존성 주입 패턴과 충돌

#### 4.1.2 하드코딩된 정규식
**위치**: `link.ts:23-26`
```typescript
const CONSTANTS = {
    LINK_REGEX: /\[([^\]]*)\]\(\/docs\/([^)]*)\)/g,
    LANGUAGE_CODE_REGEX: /^[a-z]{2}\/|^en\//,
    TRANSLATION_FILE_PATTERN: /\/content\/([^\/]+)\/docs\//,
```
**문제점**:
- 정규식이 상수로 선언되었지만 `g` 플래그로 인해 상태를 가짐 (lastIndex)
- 동일 정규식 재사용 시 예기치 않은 동작 가능

**권장 수정**:
```typescript
// 메서드 내에서 새 RegExp 생성 또는 g 플래그 제거
const linkRegex = new RegExp(CONSTANTS.LINK_REGEX.source, 'g');
```

### 4.2 설계 문제

#### 4.2.1 순환 의존성 가능성
**패턴**:
- `TranslationCommandManager` → `StatusBarManager`, `TranslationViewProvider`, `PRInfoService`
- 이들이 다시 `TranslationCommandManager`를 참조하면 순환 발생

#### 4.2.2 초기화 순서 의존성
**위치**: `GitService.ts:14-19`
```typescript
constructor() {
    this.workspaceRoot = this.initializeWorkspaceRoot();
    // workspaceRoot가 설정된 후에야 다른 서비스 초기화 가능
}

private initializeWorkspaceRoot(): string {
    const tempDetector = new GitRepositoryDetector('', new GitCommandExecutor(''));
    return tempDetector.findGitRepository();
}
```
**문제점**: 빈 문자열로 임시 객체를 생성하는 것은 코드 스멜

#### 4.2.3 책임 분리 미흡
**위치**: `TranslationCommandManager.ts`
- 500줄 이상의 대규모 클래스
- 상태 관리, 명령어 등록, Git 연동, 파일 처리 등 다양한 책임 보유
- Single Responsibility Principle 위반

### 4.3 보안 관련

#### 4.3.1 명령어 인젝션 가능성
**위치**: `PRInfoService.ts:220-221`
```typescript
const command = `gh pr view ${prNumber} ${repoOption} --json ...`;
const { stdout, stderr } = await exec(command, { cwd });
```
**문제점**: `prNumber`가 숫자로 검증되지만, `repoOption`은 문자열 조합
- 현재는 내부 생성 값이므로 위험도 낮음
- 향후 외부 입력 시 주의 필요

#### 4.3.2 파일 경로 트래버설
**위치**: `FilePathResolver.ts:11-13`
```typescript
resolveAbsolutePath(relativePath: string): string {
    return path.join(this.workspaceRoot, relativePath.split('/').join(path.sep));
}
```
**문제점**: `../` 등의 경로 트래버설 검증 없음
- 현재는 Git 출력에서 오는 값이므로 위험도 낮음

---

## 5. 권장 개선 사항

### 5.1 장기 개선

1. **테스트 커버리지 확대**: 현재 테스트 파일은 존재하나 커버리지 측정 필요
2. **의존성 주입 도입**: 싱글톤 패턴을 DI로 전환하여 테스트 용이성 개선
3. **이벤트 기반 아키텍처**: 명령어 간 결합도 감소

---

## 부록: 파일별 라인 수 및 복잡도

| 파일 | 라인 수 | 복잡도 평가 |
|------|---------|------------|
| `TranslationCommandManager.ts` | 211 | 낮음 - 리팩토링 완료 |
| `PRInfoService.ts` | 687 | 높음 - 기능별 분리 고려 |
| `link.ts` | 192 | 낮음 - 중복 제거 완료 |
| `TranslationUtils.ts` | 330 | 낮음 - 중복 코드 제거 완료 |
| `webview-providers.ts` | 277 | 낮음 |
| `i18n.ts` | 149 | 낮음 |
| `StatusBarManager.ts` | 88 | 낮음 |
| `GitService.ts` | 126 | 낮음 |
| `TranslationStateManager.ts` | 89 | 낮음 - 신규 |
| `ReviewModeHandler.ts` | 135 | 낮음 - 신규 |
| `ScrollSyncManager.ts` | 167 | 낮음 |

---

*이 보고서는 2026-01-12 기준 코드베이스 분석 결과입니다.*
