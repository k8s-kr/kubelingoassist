/**
 * 한국어 Kubernetes 번역을 위한 데이터
 */

import { LanguageTranslationGuide } from './kubernetes-prompts';

/**
 * 한국어 Kubernetes 용어 사전 (Kubernetes 공식 한글화 용어집 기준)
 */
const KOREAN_KUBERNETES_TERMINOLOGY = {
  'Access': '접근', 'Active': 'Active', 'Active Job': '액티브 잡', 'Addons': '애드온',
  'admission controller': '어드미션 컨트롤러', 'Age': '기간', 'Allocation': '할당량',
  'alphanumeric': '영숫자', 'Annotation': '어노테이션', 'APIService': 'API서비스',
  'App': '앱', 'Application': '애플리케이션', 'Args': 'Args', 'array': '배열',
  'autoscaler': '오토스케일러', 'availability zone': '가용성 영역', 'bare pod': '베어 파드',
  'beta': '베타', 'Binding': '바인딩', 'Bootstrap': '부트스트랩', 'Build': '빌드',
  'Cache': '캐시', 'Calico': '캘리코', 'canary': '카나리', 'cascading': '캐스케이딩',
  'CertificateSigningRequest': 'CertificateSigningRequest', 'character set': '캐릭터 셋',
  'Charts': '차트', 'checkpoint': '체크포인트', 'Cilium': '실리움', 'CLI': 'CLI',
  'Cluster': '클러스터', 'ClusterRole': '클러스터롤', 'ClusterRoleBinding': '클러스터롤바인딩',
  'Command Line Tool': '커맨드라인 툴', 'ComponentStatus': '컴포넌트스테이터스',
  'ConfigMap': '컨피그맵', 'configuration': '구성', 'Connection': '연결',
  'containerized': '컨테이너화 된', 'Container': '컨테이너', 'Context': '컨텍스트',
  'Control Plane': '컨트롤 플레인', 'controller': '컨트롤러', 'ControllerRevision': '컨트롤러리비전',
  'cron job': '크론 잡', 'CronJob': '크론잡', 'CSIDriver': 'CSI드라이버', 'CSINode': 'CSI노드',
  'custom metrics': '사용자 정의 메트릭', 'custom resource': '사용자 정의 리소스',
  'CustomResourceDefinition': '커스텀리소스데피니션', 'Daemon': '데몬', 'DaemonSet': '데몬셋',
  'Dashboard': '대시보드', 'Data Plane': '데이터 플레인', 'Deployment': '디플로이먼트',
  'deprecated': '사용 중단', 'descriptor': '디스크립터', 'Desired number of pods': '의도한 파드의 수',
  'Desired State': '의도한 상태', 'disruption': '중단', 'distros': '배포판', 'Docker': '도커',
  'Dockerfile': 'Dockerfile', 'Docker Swarm': 'Docker Swarm', 'Downward API': '다운워드 API',
  'draining': '드레이닝', 'egress': '이그레스', 'endpoint': '엔드포인트',
  'EndpointSlice': '엔드포인트슬라이스', 'Endpoints': '엔드포인트', 'entry point': '진입점',
  'Event': '이벤트', 'evict': '축출하다', 'eviction': '축출', 'Exec': 'Exec',
  'expose': '노출시키다', 'extension': '익스텐션', 'Failed': 'Failed', 'Federation': '페더레이션',
  'field': '필드', 'finalizer': '파이널라이저', 'Flannel': '플란넬', 'form': '형식',
  'Google Compute Engine': 'Google Compute Engine', 'hash': '해시', 'headless': '헤드리스',
  'health check': '헬스 체크', 'Heapster': '힙스터', 'Heartbeat': '하트비트',
  'Homebrew': 'Homebrew', 'hook': '훅', 'Horizontal Pod Autoscaler': 'Horizontal Pod Autoscaler',
  'hosted zone': '호스팅 영역', 'hostname': '호스트네임', 'Huge page': 'Huge page',
  'Hypervisor': '하이퍼바이저', 'idempotent': '멱등성', 'Image': '이미지',
  'Image Pull Secrets': '이미지 풀 시크릿', 'Ingress': '인그레스', 'IngressClass': '인그레스클래스',
  'Init Container': '초기화 컨테이너', 'Instance group': '인스턴스 그룹', 'introspection': '인트로스펙션',
  'Istio': '이스티오', 'Job': '잡', 'Kubelet': 'Kubelet', 'kubectl': 'kubectl',
  'kube-proxy': 'kube-proxy', 'Kubernetes': '쿠버네티스', 'Kube-router': 'Kube-router',
  'label': '레이블', 'Lease': '리스', 'lifecycle': '라이프사이클', 'LimitRange': '리밋레인지',
  'limit': '한도', 'Linux': '리눅스', 'load': '부하', 'LocalSubjectAccessReview': '로컬서브젝트액세스리뷰',
  'Log': '로그', 'loopback': '루프백', 'Lost': 'Lost', 'Machine': '머신', 'manifest': '매니페스트',
  'Master': '마스터', 'metadata': '메타데이터', 'metric': '메트릭', 'masquerading': '마스커레이딩',
  'Minikube': 'Minikube', 'Mirror pod': '미러 파드', 'monitoring': '모니터링', 'multihomed': '멀티홈드',
  'MutatingWebhookConfiguration': 'MutatingWebhookConfiguration', 'naked pod': '네이키드 파드',
  'Namespace': '네임스페이스', 'netfilter': '넷필터', 'NetworkPolicy': '네트워크폴리시',
  'Node': '노드', 'node lease': '노드 리스', 'Object': '오브젝트', 'observability': '가시성',
  'Operator': '오퍼레이터', 'Orchestrate': '오케스트레이션하다', 'Orchestration': '오케스트레이션',
  'Output': '출력', 'parameter': '파라미터', 'patch': '패치', 'payload': '페이로드',
  'Pending': 'Pending', 'PersistentVolume': '퍼시스턴트볼륨', 'PersistentVolumeClaim': '퍼시스턴트볼륨클레임',
  'pipeline': '파이프라인', 'Pipeline': '파이프라인', 'placeholder pod': '플레이스홀더 파드',
  'Pod': '파드', 'Pod Preset': '파드 프리셋', 'PodAntiAffinity': '파드안티어피니티',
  'PodDisruptionBudget': 'PodDisruptionBudget', 'PodSecurityPolicy': '파드시큐리티폴리시',
  'PodTemplate': '파드템플릿', 'postfix': '접미사', 'prefix': '접두사', 'PriorityClass': '프라이어리티클래스',
  'Privileged': '특권을 가진', 'Prometheus': '프로메테우스', 'proof of concept': '개념 증명',
  'Pull Request': '풀 리퀘스트', 'Pull Secret Credentials': '풀 시크릿 자격증명',
  'QoS Class': 'QoS 클래스', 'Quota': '쿼터', 'readiness gate': '준비성 게이트',
  'readiness probe': '준비성 프로브', 'Ready': 'Ready', 'Reclaim Policy': '반환 정책',
  'redirect': '리다이렉트', 'redirection': '리다이렉션', 'Registry': '레지스트리',
  'Release': '릴리스', 'ReplicaSet': '레플리카셋', 'replicas': '레플리카',
  'ReplicationController': '레플리케이션컨트롤러', 'repository': '리포지터리', 'request': '요청',
  'resource': '리소스', 'ResourceQuota': '리소스쿼터', 'return': '반환하다', 'revision': '리비전',
  'Role': '롤', 'RoleBinding': '롤바인딩', 'rollback': '롤백', 'rolling update': '롤링 업데이트',
  'rollout': '롤아웃', 'Romana': '로마나', 'Running': 'Running', 'runtime': '런타임',
  'Runtime': '런타임', 'RuntimeClass': '런타임클래스', 'Scale': '스케일', 'Secret': '시크릿',
  'segment': '세그먼트', 'Selector': '셀렉터', 'Self-healing': '자가 치유',
  'SelfSubjectAccessReview': '셀프서브젝트액세스리뷰', 'SelfSubjectRulesReview': 'SelfSubjectRulesReview',
  'Service': '서비스', 'ServiceAccount': '서비스어카운트', 'service discovery': '서비스 디스커버리',
  'service mesh': '서비스 메시', 'Session': '세션', 'Session Affinity': '세션 어피니티',
  'Setting': '세팅', 'Shell': '셸', 'sidecar': '사이드카', 'Sign In': '로그인',
  'Sign Out': '로그아웃', 'skew': '차이', 'snippet': '스니펫', 'spec': '명세',
  'specification': '명세', 'StatefulSet': '스테이트풀셋', 'stateless': '스테이트리스',
  'Static pod': '스태틱 파드', 'StorageClass': '스토리지클래스', 'SubjectAccessReview': '서브젝트액세스리뷰',
  'Sub-Object': '서브-오브젝트', 'support': '지원', 'Surge': '증가율', 'System': '시스템',
  'taint': '테인트', 'Task': '태스크', 'telepresence': '텔레프레즌스', 'Terminated': 'Terminated',
  'TokenReview': '토큰리뷰', 'tolerations': '톨러레이션', 'Topology spread constraints': '토폴로지 분배 제약 조건',
  'Tools': '도구', 'traffic': '트래픽', 'Type': '타입', 'ubuntu': '우분투', 'use case': '유스케이스',
  'userspace': '유저스페이스', 'Utilization': '사용량', 'ValidatingWebhookConfiguration': 'ValidatingWebhookConfiguration',
  'verbosity': '로그 상세 레벨', 'virtualization': '가상화', 'Volume': '볼륨',
  'VolumeAttachment': '볼륨어태치먼트', 'Waiting': 'Waiting', 'Walkthrough': '연습',
  'Weave-net': '위브넷', 'Windows': '윈도우', 'Worker': '워커', 'Workload': '워크로드',
  'YAML': 'YAML', 'etcd': 'etcd'
} as const;

/**
 * 한국어 번역 가이드 (Kubernetes 공식 한글화 가이드 기반)
 */
export const KOREAN_TRANSLATION_GUIDE: LanguageTranslationGuide = {
  language: 'Korean',
  terminology: KOREAN_KUBERNETES_TERMINOLOGY,

  guidelines: [
    '명령어(kubectl, docker)는 그대로 유지',
    'YAML 필드(metadata, spec, status)는 번역하지 않음',
    '파일명/경로는 그대로 유지',
    'URL/링크는 그대로 유지',
    '코드 블록 내용은 주석만 번역, 코드는 유지',
    'API 버전(apps/v1, v1)은 그대로 유지',
    '가로폭은 원문을 따름 (유지보수 편의를 위해)',
    '모든 기능 게이트(feature gate)는 원문 형태 유지 (예: Accelerators, AdvancedAuditing)',
    '리뷰어 주석은 필요시 주석 처리'
  ],

  styleGuide: [
    '평어체 사용을 원칙으로 함 (합니다, 됩니다)',
    '일부 메인 페이지에서만 예외적으로 높임말 사용',
    '명령형 → 청유형/평어체 변환 ("사이트를 방문하라" → "사이트를 방문하자" 또는 "가이드를 참고한다")',
    '번역체 지양: 이중 피동 표현 ("되어지다" → "되다")',
    '번역체 지양: 불필요한 소유격 제거 ("그의 손으로" → "손으로")',
    '번역체 지양: 과다한 복수형 지양 ("배들, 사과들" → "배, 사과")',
    '자연스럽고 무리가 없는 우리글로 번역',
    '번역체보다 자연스러운 문장 우선'
  ],

  specialRules: [
    // API 오브젝트 번역 규칙
    'kubectl api-resources의 kind: 외래어 표기법 적용 + 영문 병기 (예: Deployment → 디플로이먼트(Deployment))',
    '표현 간결함 예외: Pod → 파드, Service → 서비스 (병기 없음)',
    'kind가 아닌 API 오브젝트: 원문 그대로 유지 (예: DeploymentList, ConfigMapKeySelector)',
    'API 오브젝트 필드명, 파일명, 경로: 번역하지 않음 (단, 주석은 번역 가능)',
    'camelCase API 오브젝트는 띄어쓰기 없이 처리 (configMap → 컨피그맵)',

    // 한영 병기 규칙
    '페이지 내에서 해당 용어가 처음 사용될 때만 한영 병기',
    '이후에는 한글만 표기',
    '제목에도 한영 병기 적용',
    '필요에 따라 추가 병기 허용 (자연스러움, 명확성 향상을 위해)',

    // 용어 한글화 우선순위
    '용어 한글화 우선순위: 1) 한글 단어 (순 우리말, 한자어, 외래어) → 2) 한영 병기 → 3) 영어 단어',
    '자연스러움을 최우선으로 하여 무리한 한글화는 지양',

    // 기타 특별 규칙
    'Horizontal Pod Autoscaler는 예외적으로 API 오브젝트이지만 외래어 표기법 적용하지 않고 원문 그대로 표기',
    '국립국어원 외래어 표기법(https://kornorms.korean.go.kr/regltn/regltnView.do?regltn_code=0003#a)에 따라 API 오브젝트 한글 표기',
    '불확실한 외래어 표기는 국립국어원 표준국어대사전 API 활용 가능',

    // 팀 마일스톤 관리 관련
    '한글화팀은 main 브랜치에서 분기한 개발 브랜치 사용',

    // 참고 링크들
    'PR 랭글러 관련: /ko/docs/contribute/advanced/#일주일-동안-pr-랭글러-wrangler-되기',
    '한글화팀 슬랙 채널: #kubernetes-docs-ko (https://kubernetes.slack.com/archives/CA1MMR86S)',
    'GitHub 릴리스: https://github.com/eundms/kubelingoassist/releases',

    // 유용한 GitHub 쿼리들
    'CLA 서명 없음 쿼리 참조 가능',
    'LGTM 필요 쿼리 참조 가능',
    '퀵윈(Quick Wins) 쿼리 참조 가능'
  ]
};