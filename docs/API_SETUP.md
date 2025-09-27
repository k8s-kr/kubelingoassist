# API 키 설정 가이드

KubeLingoAssist의 AI 기능을 사용하기 위한 API 키 설정 방법을 안내합니다.

## 🔑 필요한 API 키

### 1. AI 번역 제공업체 (택 1)
- **OpenAI** (추천)
- **Anthropic Claude**
- **Google Gemini**

### 2. 한국어 검증 (선택사항)
- **국립국어원 표준국어대사전 API**

## 🚀 AI 제공업체 API 키 발급

### OpenAI (추천)

#### 발급 절차:
1. [OpenAI Platform](https://platform.openai.com/) 접속
2. 회원가입/로그인
3. 상단 우측 프로필 → "View API keys"
4. "Create new secret key" 클릭
5. 키 이름 입력 후 생성
6. **키를 안전한 곳에 복사** (다시 볼 수 없음)

#### 비용:
- GPT-4: $0.03/1K tokens (입력), $0.06/1K tokens (출력)
- GPT-3.5-turbo: $0.001/1K tokens (입력), $0.002/1K tokens (출력)

#### 권장 모델:
- `gpt-4` - 최고 품질
- `gpt-3.5-turbo` - 경제적

### Anthropic Claude

#### 발급 절차:
1. [Anthropic Console](https://console.anthropic.com/) 접속
2. 회원가입/로그인
3. "API Keys" 섹션
4. "Create Key" 클릭
5. 키 이름 입력 후 생성
6. 키 복사 및 저장

#### 비용:
- Claude-3-Sonnet: $0.003/1K tokens (입력), $0.015/1K tokens (출력)
- Claude-3-Haiku: $0.00025/1K tokens (입력), $0.00125/1K tokens (출력)

#### 권장 모델:
- `claude-3-sonnet-20240229` - 균형잡힌 성능
- `claude-3-haiku-20240307` - 빠르고 경제적

### Google Gemini

#### 발급 절차:
1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. Google 계정으로 로그인
3. "Create API Key" 클릭
4. 프로젝트 선택 또는 생성
5. API 키 생성 및 복사

#### 비용:
- Gemini Pro: 무료 (월 한도 있음)
- 유료: $0.00025/1K tokens (입력), $0.0005/1K tokens (출력)

#### 권장 모델:
- `gemini-pro` - 범용적 사용

## 🇰🇷 국립국어원 표준국어대사전 API

### 발급 절차:
1. [표준국어대사전 오픈 API](https://stdict.korean.go.kr/openapi/openApiInfo.do) 접속
2. 회원가입/로그인 (국립국어원 홈페이지 통합 회원)
3. "오픈 API 사용 신청" 메뉴
4. 신청서 작성 및 제출
5. 승인 후 32자리 인증키 발급

### 특징:
- **무료 제공**
- 일일 API 호출 한도 있음
- 한국어 용어 검증에만 사용
- 번역 품질 향상에 도움

## ⚙️ VS Code에서 API 키 설정

### 방법 1: Configure AI 사용 (권장)
```
1. Ctrl+Shift+P (명령 팔레트)
2. "Configure AI" 입력 및 선택
3. AI 제공업체 선택
4. API 키 입력
```

### 방법 2: 직접 설정
```
1. Ctrl+Shift+P
2. 아래 명령 중 하나 선택:
   - "OpenAI API 키 설정"
   - "Claude API 키 설정"
   - "Gemini API 키 설정"
   - "한국어 사전 API 키 설정"
3. API 키 입력
```

### 설정 확인
```
Ctrl+Shift+P → "API 키 상태 확인"
```

## 🔒 보안 주의사항

### API 키 보안:
- ✅ VS Code Secrets API로 암호화 저장
- ✅ 로컬 머신에만 저장
- ✅ 소스코드에 하드코딩 금지
- ✅ 정기적인 키 재발급 권장

### 비용 관리:
- API 사용량 모니터링
- 사용 한도 설정 (OpenAI, Claude)
- 불필요한 키는 삭제

## 🛠️ 고급 설정

### settings.json 설정:
```json
{
  "kubelingoassist.ai.provider": "openai",
  "kubelingoassist.ai.model": "gpt-4",
  "kubelingoassist.ai.maxTokens": 2000,
  "kubelingoassist.ai.temperature": 0.7,
  "kubelingoassist.ai.baseUrl": "https://api.openai.com/v1"
}
```

### 제공업체별 권장 설정:

#### OpenAI:
```json
{
  "kubelingoassist.ai.provider": "openai",
  "kubelingoassist.ai.model": "gpt-4",
  "kubelingoassist.ai.temperature": 0.3
}
```

#### Claude:
```json
{
  "kubelingoassist.ai.provider": "claude",
  "kubelingoassist.ai.model": "claude-3-sonnet-20240229",
  "kubelingoassist.ai.temperature": 0.5
}
```

#### Gemini:
```json
{
  "kubelingoassist.ai.provider": "gemini",
  "kubelingoassist.ai.model": "gemini-pro",
  "kubelingoassist.ai.temperature": 0.7
}
```

## 🐛 문제 해결

### 일반적인 오류들:

#### "API key not found"
- **원인**: API 키가 설정되지 않음
- **해결**: `Configure AI` 명령으로 키 설정

#### "Invalid API key"
- **원인**: 잘못된 키 또는 만료된 키
- **해결**: 키 재발급 및 재설정

#### "Quota exceeded"
- **원인**: 사용 한도 초과
- **해결**: 사용 한도 확인 및 조정

#### "Network error"
- **원인**: 네트워크 연결 문제
- **해결**: 인터넷 연결 및 방화벽 설정 확인

## 💡 사용 팁

### 효율적인 사용:
1. **개발/테스트**: GPT-3.5-turbo 또는 Claude-Haiku 사용
2. **프로덕션**: GPT-4 또는 Claude-Sonnet 사용
3. **경제적**: Gemini Pro 무료 한도 활용
4. **품질 중시**: 한국어 사전 API 함께 사용

### 비용 최적화:
1. 긴 문서는 문단별로 나누어 번역
2. temperature 값을 낮게 설정 (0.3-0.5)
3. 불필요한 context 제거
4. 배치 번역 활용

## 📞 지원

API 키 설정 관련 문제는:
- [GitHub Issues](https://github.com/eundms/kubelingoassist/issues)에 문의
- 각 제공업체의 공식 문서 참조
- VS Code Extension 로그 확인