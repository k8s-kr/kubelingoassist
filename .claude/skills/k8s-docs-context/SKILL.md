---
name: k8s-docs-context
description: |
  Kubernetes 공식 문서(kubernetes/website)의 실제 구조, 규칙, 번역 패턴에 대한 정확한 context를 제공하는 skill. KubeLingoAssist 개발 시 k8s 문서 구조에 맞는 코드를 작성할 때 사용한다. "content 디렉토리 구조가 어떻게 되지?", "frontmatter 필드가 뭐가 있어?", "링크 규칙이 어떻게 돼?", "번역 파일은 어디에 놓아야 해?", "Hugo shortcode가 뭐가 있어?" 같은 질문에 사용한다. 새로운 번역/검증/경로 처리 로직을 구현할 때도 반드시 참조한다.
---

# Kubernetes Documentation Context

kubernetes/website 리포지토리를 직접 분석한 결과를 기반으로 한 레퍼런스다. KubeLingoAssist가 다루는 도메인 지식이므로 새 feature 구현 시 이 context를 기반으로 코드를 작성한다.

상세 정보가 필요하면 `references/` 디렉토리의 개별 파일을 읽는다:
- `references/frontmatter.md` — 전체 frontmatter 필드 인벤토리
- `references/shortcodes.md` — Hugo shortcode 패턴과 빈도
- `references/hugo-config.md` — hugo.toml 핵심 설정

## 리포지토리 최상위 구조

```
kubernetes/website/
├── content/              # 모든 콘텐츠 (언어별 디렉토리)
├── static/               # 정적 파일 (css, fonts, images, js)
├── layouts/              # Hugo 레이아웃 (shortcodes/, partials/, docs/)
├── data/                 # announcements/, canonical-tags/, releases/
├── i18n/                 # 언어별 UI 문자열 ({lang}/{lang}.toml)
├── archetypes/           # 콘텐츠 템플릿 (concepts.md, tasks.md, tutorials.md, blog-post.md)
├── assets/               # 아이콘, 이미지, JS, SCSS
├── api-ref-assets/       # OpenAPI swagger + API 레퍼런스 생성 설정
├── api-ref-generator/    # Git submodule → kubernetes-sigs/reference-docs
├── hugo.toml             # Hugo 설정 (632줄)
├── Makefile              # 빌드 (make serve, make build 등)
├── netlify.toml          # Netlify 배포 설정
├── go.mod / go.sum       # Hugo module (Docsy theme)
└── package.json          # npm dependency
```

## 지원 언어 (16개)

```
content/
├── en/     # English (원본, source of truth)
├── ko/     # 한국어 (538 .md 파일 / en 1610 기준)
├── ja/     # 日本語
├── zh-cn/  # 简体中文
├── bn/     # বাংলা (Bengali)
├── de/     # Deutsch
├── es/     # Español
├── fr/     # Français
├── hi/     # हिन्दी
├── id/     # Indonesian
├── it/     # Italiano
├── pl/     # Polski
├── pt-br/  # Português (Brasil)
├── ru/     # Русский
├── uk/     # Українська
└── vi/     # Tiếng Việt
```

hugo.toml에서 각 언어의 weight, contentDir, title이 정의되어 있다. 언어별 i18n 문자열은 `i18n/{lang}/{lang}.toml`에 위치한다 (en: 755줄, ko: 440줄 — 부족한 키는 en으로 fallback).

## content/en/ 구조

```
content/en/
├── _index.html           # 홈페이지 (layout: home)
├── _common-resources/    # 공유 이미지
├── docs/                 # ★ 핵심 문서
│   ├── concepts/         # 개념 (architecture, workloads, services-networking, storage, ...)
│   ├── tasks/            # 태스크 (configure-pod-container, access-application-cluster, ...)
│   ├── tutorials/        # 튜토리얼 (hello-minikube.md, kubernetes-basics/, ...)
│   ├── reference/        # 레퍼런스
│   │   ├── command-line-tools-reference/feature-gates/  # ★ 464개 개별 feature gate .md
│   │   ├── glossary/     # 개별 용어집 .md 파일
│   │   ├── kubectl/generated/  # 자동 생성된 kubectl docs
│   │   └── kubernetes-api/     # 자동 생성된 API docs
│   ├── contribute/       # 기여 가이드
│   ├── setup/            # 설치 가이드
│   ├── home/             # 문서 포털 홈
│   └── images/           # 문서 이미지
├── blog/                 # 블로그
│   └── _posts/           # 연도별 (2015-2026)
├── case-studies/         # 사례 연구
├── examples/             # YAML/JSON 예제 (shortcode로 참조)
├── includes/             # 재사용 스니펫 (task-tutorial-prereqs.md 등)
├── releases/             # 릴리스 정보, 버전 스큐 정책
├── community/
├── training/
└── search.md
```

### content_type 분포 (docs/ 내)

| content_type | 개수 | 설명 |
|---|---|---|
| feature_gate | 464 | Feature Gate 개별 문서 |
| concept | 267 | 개념 설명 |
| task | 178 | 태스크 가이드 |
| tool-reference | 142 | CLI 도구 레퍼런스 |
| api_reference | 91 | API 레퍼런스 (자동 생성) |
| tutorial | 27 | 튜토리얼 |
| reference | 17 | 일반 레퍼런스 |

## Frontmatter 필드

### 공통 필드 (거의 모든 문서)

```yaml
---
title: "Pod 개요"                    # 페이지 제목 (번역 대상)
content_type: concept                # concept, task, tutorial, reference, feature_gate, tool-reference, api_reference
weight: 10                           # 메뉴 정렬 순서
description: "Pod에 대해 설명합니다"   # 페이지 설명 (번역 대상)
---
```

### 자주 쓰이는 필드

```yaml
reviewers:                           # GitHub 리뷰어
  - sig-docs-ko-reviews
approvers:                           # GitHub 승인자
  - sig-docs-ko-owners
linkTitle: "Pod"                     # 짧은 네비게이션 제목 (번역 대상)
no_list: true                        # 하위 페이지 목록 표시 안 함
api_metadata:                        # 관련 API 객체
  - apiVersion: "v1"
    kind: "Pod"
min-kubernetes-server-version: v1.10 # 최소 K8s 버전 (task)
```

### 특수 필드

```yaml
# Feature Gate 전용
stages:
  - stage: alpha              # alpha, beta, stable, deprecated
    defaultValue: false
    fromVersion: "1.27"
    toVersion: "1.29"

# Glossary 전용
id: pod
full_link: /docs/concepts/workloads/pods/
short_description: "가장 작은 배포 단위"
aka: ["파드"]
tags: ["core-object", "fundamental"]

# Blog 전용
layout: blog
date: 2026-03-20T10:00:00-08:00
slug: kubernetes-1-36-release
author: >
  [Name](https://github.com/username)
draft: true

# 빌드 제어
_build:
  list: never
  render: false
layout: docsportal_home              # 특수 레이아웃
auto_generated: true                 # 자동 생성 문서 표시
```

### 번역 시 주의

- **번역 대상**: `title`, `description`, `linkTitle`, `short_description`
- **번역하지 않음**: `content_type`, `weight`, `no_list`, `api_metadata`, `stages`, `_build`, `layout`, `reviewers`, `approvers`, `id`, `full_link`, `tags`, `min-kubernetes-server-version`

## 링크 패턴

### Hugo `ref` shortcode (6115건, 가장 많음)

```markdown
[Pod 개요]({{< ref "/docs/concepts/workloads/pods/" >}})
```
- Hugo가 빌드 시 실제 URL로 변환
- 현재 언어의 페이지가 있으면 해당 언어로, 없으면 en으로 fallback
- **LinkValidator가 검증해야 할 핵심 패턴**

### 직접 경로 링크

```markdown
[some text](/docs/concepts/architecture/#node-components)
```
- `/docs/`로 시작하는 절대 경로
- 언어 prefix 없음 — Hugo가 자동 라우팅
- 앵커(`#`)는 영어 heading 기준으로 생성됨

### Hugo `relref` shortcode (13건, 드묾)

```markdown
[link text]({{< relref "/docs/concepts/overview/" >}})
```

### 파라미터화된 링크

```markdown
/docs/reference/generated/kubernetes-api/{{< param "version" >}}/#node-v1-core
```

## Hugo Shortcode (빈도순 상위)

| Shortcode | 건수 | 설명 |
|---|---|---|
| `{{< ref "..." >}}` | 6115 | 내부 참조 링크 |
| `{{% heading "..." %}}` | 1152 | 표준화 제목 (prerequisites, whatsnext, objectives, cleanup) |
| `{{< glossary_tooltip >}}` | 1133 | 용어 툴팁 (`text=`, `term_id=`) |
| `{{< note >}}` | 860 | 참고 |
| `{{< feature-state >}}` | 402 | Feature 성숙도 배지 |
| `{{% code_sample file="..." %}}` | 345 | `examples/` 디렉토리에서 코드 참조 |
| `{{< skew >}}` | 299 | 버전 스큐 |
| `{{< include "..." >}}` | 166 | `includes/`에서 파일 포함 |
| `{{< param "..." >}}` | 155 | Hugo 파라미터 참조 |
| `{{< caution >}}` | 127 | 주의 |
| `{{< tabs >}}` + `{{% tab %}}` | 117 | 탭 컨테이너 |
| `{{< warning >}}` | 60 | 경고 |
| `{{< mermaid >}}` | 29 | Mermaid 다이어그램 |

**`{{< >}}` vs `{{% %}}`**: `{{< >}}`는 raw content, `{{% %}}`는 내부 마크다운 처리.

## 번역 워크플로우

### 경로 변환 규칙

```
원본:    content/en/docs/concepts/overview.md
번역:    content/ko/docs/concepts/overview.md
         content/ja/docs/concepts/overview.md
```
언어 코드만 다르고 나머지 경로 동일. `core/path-utils.ts`의 `CONTENT_LANG_REGEX`가 이 패턴을 캡처.

### 언어별 OWNERS 파일

각 언어 디렉토리에 `OWNERS` 파일이 있어 리뷰어/승인자 그룹을 정의:
```yaml
# content/ko/OWNERS
reviewers:
  - sig-docs-ko-reviews
approvers:
  - sig-docs-ko-owners
labels:
  - area/localization
  - language/ko
```

### 번역 대상 판별

- `content/{non-en}/docs/` → 번역 파일 (현재 `TRANSLATION_FILE_REGEX`)
- `content/en/docs/` → 원본
- `content/{lang}/blog/` → `docs/` 아래가 아니므로 현재 regex에 매칭 안 됨 (**확장 검토 필요**)
- `content/{lang}/releases/`, `content/{lang}/community/` 등도 현재 미포함

### Content Archetype (콘텐츠 템플릿)

`archetypes/` 디렉토리에 정의:

**concept**: `<!-- overview -->` → `<!-- body -->` → `{{% heading "whatsnext" %}}`
**task**: `<!-- overview -->` → `{{% heading "prerequisites" %}}` → `<!-- steps -->` → `<!-- discussion -->`
**tutorial**: `<!-- overview -->` → `{{% heading "prerequisites" %}}` → `{{% heading "objectives" %}}` → `<!-- lessoncontent -->` → `{{% heading "cleanup" %}}`

이 구조를 번역 시에도 유지해야 한다.

### 재사용 콘텐츠

- `content/en/includes/` — `{{< include "task-tutorial-prereqs.md" >}}`로 참조
- `content/en/examples/` — `{{% code_sample file="pods/probe/exec-liveness.yaml" %}}`로 참조
- 이 파일들은 보통 번역하지 않음 (영어 원본을 그대로 참조)

## 코드 작성 시 참고

1. **경로 regex는 `core/path-utils.ts`에서 가져온다** — 직접 작성 금지
2. **현재 `TRANSLATION_FILE_REGEX`는 `docs/`만 매칭** — blog, releases 등 확장이 필요하면 이 regex를 수정
3. **Git diff 경로는 repo root 상대경로** — `content/ko/docs/...` 형태
4. **VS Code 파일 경로는 절대경로** — `/home/user/website/content/ko/docs/...` 형태
5. **Hugo shortcode 안의 경로는 참조 해석이 필요** — `{{< ref "/docs/..." >}}`의 경로는 Hugo가 빌드 시 해석
6. **feature_gate 문서가 464개로 가장 많음** — 대량 파일 처리 시 성능 고려
7. **자동 생성 문서(`auto_generated: true`, `_build.render: false`)는 번역 대상이 아닐 수 있음**
8. **Hugo 현재 버전**: 0.133.0, 현재 K8s 문서 버전: v1.36
