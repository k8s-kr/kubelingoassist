# Hugo 설정 레퍼런스

hugo.toml (632줄)에서 KubeLingoAssist 개발에 관련된 핵심 설정을 정리.

## 기본 설정

```toml
baseURL = "https://kubernetes.io"
title = "Kubernetes"
theme = ["docsy"]
contentDir = "content/en"      # 기본 콘텐츠 디렉토리
defaultContentLanguage = "en"
enableGitInfo = true
timeZone = "UTC"
disableKinds = ["taxonomy"]
timeout = "180s"
```

## 버전 정보

```toml
[params]
version = "v1.36"              # 현재 문서 버전
latest = "v1.36"

# 지원되는 버전 (5개)
# v1.36 (main)
# v1.35 (release-1.35)
# v1.34 (release-1.34)
# v1.33 (release-1.33)
# v1.32 (release-1.32)
```

## 언어 설정

각 언어는 hugo.toml에서 다음과 같이 정의:

```toml
[languages.ko]
title = "Kubernetes"
languageName = "한국어 (Korean)"
languageNameLatinScript = "Korean"
contentDir = "content/ko"
weight = 10
languagedirection = "ltr"

[languages.ko.params]
time_format_blog = "2006.01.02"
language_alternatives = ["en"]
description = "프로덕션급 컨테이너 관리"
```

### 언어별 weight (정렬 순서)

1. en, 2. bn, 3. zh-cn, 4. fr, 5. de, 6. hi, 7. id, 8. it, 9. ja, 10. ko, 11. pl, 12. pt-br, 13. ru, 14. es, 15. uk, 16. vi

## Segments (선택적 언어 빌드)

로컬 개발 시 특정 언어만 빌드:
```bash
make serve segments=en,ko
```

hugo.toml에 각 언어의 segment 정의:
```toml
[segments.ko]
[[segments.ko.includes]]
lang = "ko"
```

## 무시 파일

```toml
ignoreFiles = [
  "(?:^|/)OWNERS$",
  "README[-]+[a-z]*.md",
  "node_modules"
]
```

## 블로그 Permalink

```toml
[permalinks.blog]
"_posts" = "/:section/:year/:month/:day/:slug/"
```

## 빌드 환경 (netlify.toml)

```toml
HUGO_VERSION = "0.133.0"
NODE_VERSION = "20.17.0"
```

빌드 명령:
```bash
git submodule update --init --recursive --depth 1 && make production-build && npx -y pagefind --site public
```

## i18n 문자열

각 언어의 UI 문자열은 `i18n/{lang}/{lang}.toml`에 위치.

```toml
# i18n/ko/ko.toml 예시
[caution]
other = "주의:"

[cleanup_heading]
other = "정리"

[whatsnext_heading]
other = "다음 내용"
```

Hugo module mount:
```toml
[[module.mounts]]
source = "i18n/ko"
target = "i18n"
lang = "ko"
```

en: 755줄, ko: 440줄 — 부족한 키는 en fallback.

## Makefile 주요 타겟

| 타겟 | 설명 |
|---|---|
| `make serve` | 로컬 개발 서버 |
| `make serve segments=en,ko` | 특정 언어만 빌드 |
| `make container-serve` | Docker 개발 서버 |
| `make build` | 비프로덕션 빌드 |
| `make production-build` | 프로덕션 빌드 |
| `make api-reference` | API 레퍼런스 재생성 |
