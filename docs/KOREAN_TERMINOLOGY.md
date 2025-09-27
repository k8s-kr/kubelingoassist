# Kubernetes 한국어 번역 용어 사전

이 문서는 KubeLingoAssist에서 사용하는 Kubernetes 공식 한국어 용어 사전입니다.
[Kubernetes 공식 한글화 가이드](https://kubernetes.io/ko/docs/contribute/localization_ko/)를 기반으로 작성되었습니다.

## 📚 용어 사전 (260+ 용어)

### 핵심 Kubernetes 오브젝트

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Pod | 파드 | 병기 없음 (표현 간결함 예외) |
| Service | 서비스 | 병기 없음 (표현 간결함 예외) |
| Deployment | 디플로이먼트(Deployment) | 한영 병기 |
| ReplicaSet | 레플리카셋 | |
| StatefulSet | 스테이트풀셋 | |
| DaemonSet | 데몬셋 | |
| Job | 잡 | |
| CronJob | 크론잡 | |
| ConfigMap | 컨피그맵 | |
| Secret | 시크릿 | |
| Namespace | 네임스페이스 | |
| Node | 노드 | |
| Cluster | 클러스터 | |

### 네트워킹

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Ingress | 인그레스 | |
| IngressClass | 인그레스클래스 | |
| NetworkPolicy | 네트워크폴리시 | |
| Endpoints | 엔드포인트 | |
| EndpointSlice | 엔드포인트슬라이스 | |
| Service Discovery | 서비스 디스커버리 | |
| Load Balancer | 로드밸런서 | |

### 스토리지

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Volume | 볼륨 | |
| PersistentVolume | 퍼시스턴트볼륨 | |
| PersistentVolumeClaim | 퍼시스턴트볼륨클레임 | |
| StorageClass | 스토리지클래스 | |
| VolumeAttachment | 볼륨어태치먼트 | |

### 보안 및 접근 제어

| 영어 | 한국어 | 비고 |
|------|--------|------|
| ServiceAccount | 서비스어카운트 | |
| Role | 롤 | |
| RoleBinding | 롤바인딩 | |
| ClusterRole | 클러스터롤 | |
| ClusterRoleBinding | 클러스터롤바인딩 | |
| PodSecurityPolicy | 파드시큐리티폴리시 | |

### 설정 및 메타데이터

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Annotation | 어노테이션 | |
| Label | 레이블 | |
| Selector | 셀렉터 | |
| Metadata | 메타데이터 | |
| Finalizer | 파이널라이저 | |

### 컨테이너 및 이미지

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Container | 컨테이너 | |
| Containerized | 컨테이너화 된 | |
| Image | 이미지 | |
| Init Container | 초기화 컨테이너 | |
| Sidecar | 사이드카 | |
| Registry | 레지스트리 | |

### 스케줄링 및 오토스케일링

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Autoscaler | 오토스케일러 | |
| Horizontal Pod Autoscaler | Horizontal Pod Autoscaler | 예외적으로 원문 그대로 표기 |
| Scale | 스케일 | |
| Scheduler | 스케줄러 | |
| Taint | 테인트 | |
| Tolerations | 톨러레이션 | |

### 모니터링 및 로깅

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Monitoring | 모니터링 | |
| Observability | 가시성 | |
| Metric | 메트릭 | |
| Log | 로그 | |
| Health Check | 헬스 체크 | |
| Readiness Probe | 준비성 프로브 | |
| Liveness Probe | 활성 프로브 | |

### 상태 및 라이프사이클

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Running | Running | 상태값은 영문 유지 |
| Pending | Pending | 상태값은 영문 유지 |
| Failed | Failed | 상태값은 영문 유지 |
| Succeeded | Succeeded | 상태값은 영문 유지 |
| Lifecycle | 라이프사이클 | |
| Rolling Update | 롤링 업데이트 | |
| Rollback | 롤백 | |
| Rollout | 롤아웃 | |

## 🔧 번역 규칙

### 1. API 오브젝트 번역 규칙
- **kubectl api-resources의 kind**: 외래어 표기법 적용 + 영문 병기
  - 예: Deployment → 디플로이먼트(Deployment)
- **표현 간결함 예외**: Pod → 파드, Service → 서비스 (병기 없음)
- **kind가 아닌 API 오브젝트**: 원문 그대로 유지
  - 예: DeploymentList, ConfigMapKeySelector
- **camelCase API 오브젝트**: 띄어쓰기 없이 처리
  - 예: configMap → 컨피그맵

### 2. 한영 병기 규칙
- 페이지 내에서 해당 용어가 **처음 사용될 때만** 한영 병기
- 이후에는 **한글만 표기**
- 제목에도 한영 병기 적용
- 필요에 따라 추가 병기 허용 (자연스러움, 명확성 향상을 위해)

### 3. 번역하지 않는 요소들
- **명령어**: kubectl, docker 등
- **YAML 필드**: metadata, spec, status 등
- **파일명/경로**: 그대로 유지
- **URL/링크**: 그대로 유지
- **API 버전**: apps/v1, v1 등
- **기능 게이트**: Accelerators, AdvancedAuditing 등

### 4. 문체 가이드
- **평어체 사용을 원칙**으로 함 (합니다, 됩니다)
- 일부 메인 페이지에서만 예외적으로 높임말 사용
- **명령형 → 청유형/평어체 변환**
  - "사이트를 방문하라" → "사이트를 방문하자" 또는 "가이드를 참고한다"

### 5. 번역체 지양
- **이중 피동 표현**: "되어지다" → "되다"
- **불필요한 소유격**: "그의 손으로" → "손으로"
- **과다한 복수형**: "배들, 사과들" → "배, 사과"

## 📖 참고 자료

- [Kubernetes 공식 한글화 가이드](https://kubernetes.io/ko/docs/contribute/localization_ko/)
- [국립국어원 외래어 표기법](https://kornorms.korean.go.kr/regltn/regltnView.do?regltn_code=0003#a)
- [표준국어대사전](https://stdict.korean.go.kr/)
- [한글화팀 슬랙 채널](https://kubernetes.slack.com/archives/CA1MMR86S) (#kubernetes-docs-ko)

## 🤝 기여하기

용어 사전에 대한 수정이나 추가 제안은:
1. [GitHub Issues](https://github.com/eundms/kubelingoassist/issues)에 제보
2. 한글화팀 슬랙 채널에서 논의
3. Pull Request로 직접 수정 제안

용어 선정은 Kubernetes 공식 한글화 가이드와 국립국어원 표준을 따릅니다.