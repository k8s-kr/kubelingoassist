# Frontmatter 필드 전체 인벤토리

kubernetes/website 리포지토리의 마크다운 파일에서 사용되는 모든 frontmatter 필드를 정리한 문서.

## 공통 필드

| 필드 | 타입 | 번역 여부 | 설명 |
|---|---|---|---|
| `title` | string | ✅ 번역 | 페이지 제목 |
| `content_type` | string | ❌ | concept, task, tutorial, reference, feature_gate, tool-reference, api_reference |
| `weight` | number | ❌ | 메뉴 정렬 순서 |
| `description` | string | ✅ 번역 | 페이지 설명 |
| `linkTitle` | string | ✅ 번역 | 짧은 네비게이션 제목 |
| `no_list` | boolean | ❌ | 하위 페이지 목록 표시 안 함 |
| `reviewers` | string[] | ❌ | GitHub 리뷰어 |
| `approvers` | string[] | ❌ | GitHub 승인자 |

## 네비게이션/메뉴 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `main_menu` | boolean | 최상위 메뉴 항목 |
| `card` | object | 홈페이지 카드 (`name`, `weight`, `title`, `anchors`) |
| `menu` | object | Hugo 메뉴 할당 (e.g., `main: weight: 20`) |

## API/도구 참조 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `api_metadata` | array | 관련 API 객체 (`apiVersion`, `kind` 쌍) |
| `min-kubernetes-server-version` | string | 최소 K8s 버전 (e.g., `v1.10`) |
| `package` | string | Go 패키지 경로 (tool-reference) |
| `auto_generated` | boolean | 자동 생성 문서 |

## 빌드/렌더링 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `_build` | object | `list: never`, `render: false` — 데이터 전용 문서 |
| `layout` | string | 특수 레이아웃: home, docsportal_home, glossary, blog, cve-feed, kubectl-all-subcommands |
| `sitemap` | object | `priority` 필드 |
| `outputs` | string[] | 커스텀 출력 포맷 |
| `draft` | boolean | 초안 (빌드에서 제외) |

## Feature Gate 전용

```yaml
stages:
  - stage: alpha         # alpha, beta, stable, deprecated
    defaultValue: false
    fromVersion: "1.27"
    toVersion: "1.29"
```

## Glossary 전용

| 필드 | 타입 | 번역 여부 | 설명 |
|---|---|---|---|
| `id` | string | ❌ | 용어 ID |
| `full_link` | string | ❌ | 메인 문서 경로 |
| `short_description` | string | ✅ 번역 | 간단 설명 |
| `aka` | string[] | ✅ 번역 | 대체 이름 |
| `tags` | string[] | ❌ | 태그 (core-object, fundamental, networking, tool 등) |

## Blog 전용

| 필드 | 타입 | 설명 |
|---|---|---|
| `layout` | "blog" | 고정값 |
| `date` | string | ISO 8601 (e.g., `2026-03-20T10:00:00-08:00`) |
| `slug` | string | URL 슬러그 |
| `author` | string | 저자 (GitHub 링크 포함 가능) |
| `draft` | boolean | 초안 |

## Case Study 전용

| 필드 | 타입 | 설명 |
|---|---|---|
| `case_study_styles` | boolean | 스타일 적용 |
| `new_case_study_styles` | boolean | 신규 스타일 |
| `cid` | string | e.g., `caseStudies` |
| `logo` | string | 로고 파일명 |
| `featured` | boolean | 추천 |
| `quote` | string | 인용문 |
| `heading_background` | string | 배경 이미지 경로 |
| `case_study_details` | array | `Company`, `Location`, `Industry` |
