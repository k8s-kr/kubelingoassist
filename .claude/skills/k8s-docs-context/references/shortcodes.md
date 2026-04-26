# Hugo Shortcode 레퍼런스

kubernetes/website에서 사용되는 Hugo shortcode 전체 목록 (빈도순).

## 구문 차이

- `{{< shortcode >}}` — raw content (마크다운 처리 안 함)
- `{{% shortcode %}}` — 내부 마크다운 처리

## 주요 Shortcode

### `{{< ref >}}` — 내부 참조 링크 (6115건)

```markdown
[Pod 개요]({{< ref "/docs/concepts/workloads/pods/" >}})
[특정 섹션]({{< ref "/docs/concepts/workloads/pods/#pod-lifecycle" >}})
```

Hugo가 빌드 시 실제 URL로 변환. 현재 언어에 해당 페이지가 있으면 그 언어로, 없으면 en fallback.

**번역 시**: ref 경로는 변경하지 않는다. Hugo가 자동 처리.
**LinkValidator 관점**: 이 패턴을 파싱해서 참조 대상 존재 여부를 검증할 수 있음.

### `{{% heading %}}` — 표준화 제목 (1152건)

```markdown
{{% heading "prerequisites" %}}
{{% heading "whatsnext" %}}
{{% heading "objectives" %}}
{{% heading "cleanup" %}}
```

content_type에 따라 특정 heading이 필수:
- concept: `whatsnext`
- task: `prerequisites`
- tutorial: `prerequisites`, `objectives`, `cleanup`

### `{{< glossary_tooltip >}}` — 용어 툴팁 (1133건)

```markdown
{{< glossary_tooltip text="Pod" term_id="pod" >}}
```

- `text` — 표시할 텍스트 (번역 대상)
- `term_id` — `reference/glossary/`의 문서 ID (번역하지 않음)

### `{{< note >}}` / `{{< caution >}}` / `{{< warning >}}` — 알림 박스

```markdown
{{< note >}}
이 기능은 v1.27부터 사용 가능합니다.
{{< /note >}}

{{< caution >}}
프로덕션에서 사용하기 전에 테스트하세요.
{{< /caution >}}

{{< warning >}}
이 작업은 되돌릴 수 없습니다.
{{< /warning >}}
```

빈도: note(860), caution(127), warning(60)

### `{{< feature-state >}}` — Feature 성숙도 배지 (402건)

```markdown
{{< feature-state feature_gate_name="PodDisruptionConditions" >}}
```

### `{{% code_sample %}}` — 코드 예제 참조 (345건)

```markdown
{{% code_sample file="pods/probe/exec-liveness.yaml" %}}
```

`content/en/examples/` 디렉토리의 파일을 참조. 번역하지 않음.

### `{{< skew >}}` — 버전 스큐 (299건)

버전 호환성 정보를 표시.

### `{{< include >}}` — 파일 포함 (166건)

```markdown
{{< include "task-tutorial-prereqs.md" >}}
```

`content/en/includes/` 디렉토리의 파일을 포함. 번역하지 않음.

### `{{< param >}}` — Hugo 파라미터 (155건)

```markdown
{{< param "version" >}}    <!-- 현재 v1.36 -->
```

### `{{< tabs >}}` + `{{% tab %}}` — 탭 (117건)

```markdown
{{< tabs name="tab-group-name" >}}
{{% tab name="Linux" %}}
Linux 내용
{{% /tab %}}
{{% tab name="macOS" %}}
macOS 내용
{{% /tab %}}
{{< /tabs >}}
```

### 기타

| Shortcode | 건수 | 설명 |
|---|---|---|
| `{{< table >}}` | 55 | 테이블 래퍼 |
| `{{% thirdparty-content >}}` | 45 | 서드파티 콘텐츠 경고 |
| `{{< glossary_definition >}}` | 33 | 용어 정의 (`term_id=`, `length=`, `prepend=`) |
| `{{< figure >}}` | 31 | 이미지 + 캡션 |
| `{{< mermaid >}}` | 29 | Mermaid 다이어그램 |
| `{{< highlight >}}` | 28 | 코드 하이라이트 |
| `{{< api-reference >}}` | 17 | API 레퍼런스 링크 |
| `{{< relref >}}` | 13 | 상대 참조 링크 |
| `{{< comment >}}` | 11 | HTML 코멘트 |
| `{{% alert >}}` | 14 | 알림 |
