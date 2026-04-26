---
name: pr-prep
description: |
  KubeLingoAssist 프로젝트의 PR 준비를 자동화하는 skill. lint, format, build, test를 순서대로 실행하고, CHANGELOG 초안을 생성하고, PR description을 작성한다. "PR 올릴 준비해줘", "머지해도 되나 체크해줘", "CI 통과할지 확인해봐", "CHANGELOG 업데이트해줘", "릴리스 준비" 같은 요청에 사용한다. 코드 작업을 마무리하고 PR을 만들려고 할 때 트리거한다.
---

# PR Preparation for KubeLingoAssist

PR을 올리기 전에 CI에서 실패하지 않도록 로컬에서 검증하고, 필요한 문서(CHANGELOG, PR description)를 준비하는 skill이다.

## Pre-flight 체크

CI(`ci.yml`)에서 실행하는 것과 동일한 순서로 로컬 검증을 수행한다.

### Step 1: Lint

```bash
cd <project-root>
npm run lint
```

실패 시:
- `npm run lint:fix`로 자동 수정 시도
- 자동 수정 안 되는 항목은 수동 수정 필요
- 수정 후 다시 lint 실행

### Step 2: Format Check

```bash
npm run format:check
```

실패 시:
- `npm run format`으로 자동 포맷
- 변경된 파일을 stage에 추가

### Step 3: Build

```bash
npm run compile
```

UI 빌드(`build-ui`) + TypeScript 컴파일을 수행한다.
실패 시 에러 메시지를 분석해서 수정 방향을 제시한다.

### Step 4: Test

```bash
npm test
```

테스트는 Extension Host에서 실행되므로 headless 환경에서는:
```bash
xvfb-run -a npm test
```

## CHANGELOG 업데이트

### 현재 CHANGELOG 포맷

프로젝트의 CHANGELOG.md가 있다면 기존 포맷을 따른다. 없다면 다음 포맷으로 생성한다:

```markdown
# Changelog

## [Unreleased]

### Added
- 새로운 기능

### Changed
- 변경된 기능

### Fixed
- 버그 수정
```

### 커밋 히스토리 분석

```bash
# develop 브랜치에서 분기 후 커밋들
git log develop..HEAD --oneline

# 또는 main에서 분기 후
git log main..HEAD --oneline
```

각 커밋을 분류한다:
- `feat:` / `add:` → Added
- `fix:` → Fixed
- `refactor:` / `chore:` → Changed
- `docs:` → Documentation
- `test:` → Tests

## PR Description 생성

### 변경 파일 분석

```bash
# 변경된 파일 목록
git diff --name-only develop..HEAD

# 변경 통계
git diff --stat develop..HEAD
```

### PR Description 템플릿

```markdown
## Summary

[변경 사항 요약 — 무엇을 왜 변경했는지]

## Changes

- [핵심 변경 1]
- [핵심 변경 2]

## Test Plan

- [ ] `npm run lint` 통과
- [ ] `npm run format:check` 통과
- [ ] `npm run compile` 성공
- [ ] `npm test` 통과
- [ ] [기능별 수동 테스트 항목]
```

## 릴리스 체크리스트

릴리스(`release.yml`)를 준비할 때의 추가 체크리스트:

1. **버전 업데이트**: `package.json`의 `version` 필드
   - patch: 버그 수정 (0.0.x)
   - minor: 새 기능 (0.x.0)
   - major: breaking change (x.0.0)

2. **CHANGELOG.md**: `[Unreleased]`를 실제 버전과 날짜로 변경
   ```markdown
   ## [0.0.9] - 2025-01-15
   ```

3. **UI 빌드 포함 확인**: `ui/dist/`가 최신 상태인지 확인

4. **태그 생성**: 릴리스 후
   ```bash
   git tag v0.0.9
   git push origin v0.0.9
   ```
   → GitHub Actions가 자동으로 VS Code Marketplace에 publish

## 결과 보고

모든 체크를 완료한 후 다음을 정리한다:

1. **Pre-flight 결과**: 각 단계의 성공/실패
2. **CHANGELOG 초안**: 사용자 검토용
3. **PR Description 초안**: 사용자 검토용
4. **주의사항**: 수동 확인이 필요한 항목
