---
name: k8s-docs-context
description: |
  Kubernetes 공식 문서(kubernetes/website)의 구조, 규칙, 번역 패턴에 대한 context를 제공하는 skill. KubeLingoAssist 개발 시 k8s 문서 구조에 맞는 코드를 작성할 때 사용한다. "content 디렉토리 구조가 어떻게 되지?", "frontmatter 필드가 뭐가 있어?", "링크 규칙이 어떻게 돼?", "번역 파일은 어디에 놓아야 해?" 같은 질문에 사용한다. 새로운 번역/검증/경로 처리 로직을 구현할 때도 반드시 참조한다.
---

# Kubernetes Documentation Context

kubernetes/website 리포지토리의 문서 구조와 번역 규칙을 정리한 레퍼런스다. KubeLingoAssist가 다루는 도메인 지식이므로 새 feature 구현 시 이 context를 기반으로 코드를 작성한다.

## 디렉토리 구조

```
kubernetes/website/
├── content/
│   ├── en/                    # 영어 원본 (source of truth)
│   │   ├── docs/
│   │   │   ├── concepts/      # 개념 설명
│   │   │   ├── tasks/         # 태스크 가이드
│   │   │   ├── tutorials/     # 튜토리얼
│   │   │   ├── reference/     # API/CLI 레퍼런스
│   │   │   ├── contribute/    # 기여 가이드
│   │   │   └── setup/         # 설치 가이드
│   │   ├── blog/              # 블로그 포스트
│   │   └── _index.md          # 섹션 인덱스
│   ├── ko/                    # 한국어 번역
│   │   └── docs/              # en/docs와 동일한 구조
│   ├── ja/                    # 일본어
│   ├── zh-cn/                 # 중국어 간체
│   ├── fr/                    # 프랑스어
│   ├── de/                    # 독일어
│   ├── es/                    # 스페인어
│   └── ... (기타 언어)
├── static/                    # 정적 파일 (이미지 등)
├── layouts/                   # Hugo 레이아웃 템플릿
├── data/                      # 데이터 파일
└── Makefile                   # 빌드 스크립트
```

## 핵심 패턴: `content/{lang}/docs/` 경로

이 패턴은 KubeLingoAssist의 모든 로직의 기초다.

### 경로 변환 규칙

```
원본:    content/en/docs/concepts/overview.md
번역:    content/ko/docs/concepts/overview.md
         content/ja/docs/concepts/overview.md
```

- 영어(`en`)와 번역 파일은 `content/` 아래 언어 코드만 다르고 나머지 경로는 동일
- `core/path-utils.ts`의 `CONTENT_LANG_REGEX`(`/content/([^/]+)/`)가 이 패턴을 캡처

### 번역 대상 판별

- `content/{non-en}/docs/` 패턴에 매칭되면 번역 파일
- `content/en/docs/`는 원본이므로 번역 파일이 아님
- `content/{lang}/blog/`은 `docs/` 아래가 아니므로 현재 `TRANSLATION_FILE_REGEX`에 매칭 안 됨 (주의)

## Frontmatter

모든 마크다운 파일은 YAML frontmatter로 시작한다:

```yaml
---
title: "Pod 개요"
content_type: concept          # concept, task, tutorial, reference 등
weight: 10                     # 메뉴 정렬 순서
description: "Pod에 대해..."    # 페이지 설명
no_list: true                  # 하위 페이지 목록 표시 여부
---
```

번역 시 주의점:
- `title`, `description`은 번역한다
- `content_type`, `weight`, `no_list` 등 메타 필드는 번역하지 않는다
- 원본에 없는 필드를 추가하거나 삭제하지 않는다

## 링크 규칙

### 내부 링크

```markdown
[Pod 개요](/docs/concepts/workloads/pods/)
[kubectl 설치](/docs/tasks/tools/install-kubectl-linux/)
```

- 내부 링크는 `/docs/`로 시작하는 절대 경로를 사용
- 언어 prefix(`/ko/docs/`)를 쓰지 않는다 — Hugo가 자동으로 현재 언어의 페이지로 라우팅
- `LinkValidator`가 이 패턴을 검증한다

### 앵커 링크

```markdown
[섹션 이동](/docs/concepts/overview/#section-name)
```

- `#` 뒤의 앵커는 영어 원본의 heading을 기반으로 생성
- 번역해도 앵커 ID는 영어 원본 기준이므로 변경하지 않는다

### 외부 링크

```markdown
[Kubernetes GitHub](https://github.com/kubernetes/kubernetes)
```

- 외부 링크는 전체 URL을 사용
- 번역 시 변경하지 않는다

## 번역 워크플로우

### 새 번역 파일 생성

1. 영어 원본 파일을 대상 언어 디렉토리에 복사
2. frontmatter의 번역 가능 필드만 번역
3. 본문을 번역
4. 내부 링크는 그대로 유지 (Hugo가 처리)

### 번역 업데이트

영어 원본이 변경되면:
1. 변경된 원본과 기존 번역을 side-by-side로 비교
2. 변경된 부분만 번역에 반영
3. 새로 추가된 섹션은 번역하고, 삭제된 섹션은 제거

### 번역 완성도 판별

- 파일 존재 여부: 번역 파일이 있으면 해당 페이지는 번역됨
- 라인 수 비교: `StatusBarManager`가 원본과 번역의 라인 수를 비교해서 진행률 표시
- 라인 수가 같으면 ✓, 다르면 백분율로 표시

## 언어 코드

KubeLingoAssist가 지원하는 언어 코드:

| 코드 | 언어 | 상태 |
|------|------|------|
| en | English | 원본 |
| ko | 한국어 | 완전 지원 |
| ja | 日本語 | 완전 지원 |
| zh-cn | 简体中文 | placeholder |
| fr | Français | placeholder |
| de | Deutsch | placeholder |
| es | Español | placeholder |

i18n 리소스 파일: `src/features/i18n/resources/{lang}.ts`

## 코드 작성 시 참고사항

1. **경로 처리 함수는 `core/path-utils.ts`에서 가져온다** — regex를 직접 작성하지 않는다
2. **`content/` 경로는 OS-independent하게 처리한다** — `path.join()` 사용, 하드코딩된 `/` 주의
3. **Git diff에서 파일 경로는 repo root 상대경로로 온다** — `content/ko/docs/...` 형태
4. **VS Code에서의 파일 경로는 절대경로다** — `/home/user/website/content/ko/docs/...` 형태
5. **blog/은 현재 TRANSLATION_FILE_REGEX에 포함 안 됨** — 필요시 확장 고려
