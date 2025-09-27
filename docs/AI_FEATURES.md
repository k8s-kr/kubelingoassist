# KubeLingoAssist AI 기능 사용법

KubeLingoAssist는 AI 번역과 한국어 용어 검증을 통해 Kubernetes 문서 번역 품질을 향상시킵니다.

## 🤖 지원되는 AI 제공업체

- **OpenAI GPT** (GPT-4, GPT-3.5 등)
- **Anthropic Claude** (Claude-3-Sonnet, Claude-3-Haiku 등)
- **Google Gemini** (Gemini-Pro 등)
- **국립국어원 표준국어대사전 API** (한국어 용어 검증)

## 🔧 초기 설정

### 1. AI 제공업체 API 키 설정

#### 방법 1: 명령 팔레트 사용
```
Ctrl+Shift+P → "Configure AI" → 제공업체 선택 → API 키 입력
```

#### 방법 2: 개별 설정
- OpenAI: `Ctrl+Shift+P` → "OpenAI API 키 설정"
- Claude: `Ctrl+Shift+P` → "Claude API 키 설정"
- Gemini: `Ctrl+Shift+P` → "Gemini API 키 설정"

### 2. 한국어 사전 API 키 설정 (선택사항)
```
Ctrl+Shift+P → "한국어 사전 API 키 설정" → 32자리 API 키 입력
```

> 💡 **한국어 사전 API 키 발급**: [국립국어원 표준국어대사전 오픈 API](https://stdict.korean.go.kr/openapi/openApiInfo.do)에서 발급 가능

### 3. 설정 상태 확인
```
Ctrl+Shift+P → "API 키 상태 확인"
```

## 🌐 번역 기능

### 1. 한국어로 번역
#### 사용법:
1. 번역할 영어 텍스트 선택
2. `Ctrl+Alt+K` 또는 우클릭 → "선택한 텍스트를 한국어로 번역"
3. 번역 결과가 새 문서에 표시됨

#### 특징:
- **Kubernetes 특화 프롬프트** 사용
- **260+ 공식 한국어 용어 사전** 적용
- **국립국어원 API 자동 검증** (API 키 설정시)
- **번역 품질 점수** 제공

### 2. 다른 언어로 번역
#### 사용법:
1. 텍스트 선택
2. 우클릭 → "선택한 텍스트를 다른 언어로 번역"
3. 목표 언어 선택
4. 번역 실행

#### 지원 언어:
- 한국어 (Korean)
- 영어 (English)
- 일본어 (Japanese)
- 중국어 (Chinese)

## 🔍 한국어 검증 기능

### 1. 개별 용어 검증
#### 사용법:
1. 한국어 용어 선택 (선택사항)
2. `Ctrl+Alt+V` 또는 우클릭 → "한국어 용어 검증"
3. 선택 없으면 입력창에서 용어 입력
4. 검증 결과 확인

#### 검증 내용:
- 표준국어대사전 등재 여부
- 표준 표기법 제안
- 유사 용어 추천
- 외래어 표기법 검토

### 2. 번역 품질 분석
#### 사용법:
1. 한국어 번역문 선택
2. 우클릭 → "번역 품질 분석"
3. 상세 분석 결과 문서 확인

#### 분석 내용:
- **전체 품질 점수** (0-100점)
- **문제 용어 식별**
- **개선 권장사항**
- **표기법 제안**

## 📋 번역 결과 해석

### 번역 결과 문서 구조:
```markdown
# Kubernetes 문서 번역 결과

**원본 텍스트:** [원본]
**번역 언어:** Korean
**번역 결과:** [번역문]
**신뢰도:** 85.2%

## 한국어 용어 검증 결과
**전체 품질 점수:** 88/100

**주의가 필요한 용어들:**
- **컨테이너** → 추천: 컨테이너 (표준국어대사전 확인됨)
- **오케스트레이션** → 추천: 오케스트레이션

**개선 권장사항:**
- 2개의 용어에 대해 대안 표기법이 제안되었습니다.
- 외래어 표기법 검토가 필요한 용어들이 있습니다.
```

## ⚙️ 고급 설정

### VS Code 설정을 통한 AI 제공업체 설정:
```json
{
  "kubelingoassist.ai.provider": "openai",
  "kubelingoassist.ai.model": "gpt-4",
  "kubelingoassist.ai.maxTokens": 2000,
  "kubelingoassist.ai.temperature": 0.7
}
```

### 지원하는 모델:
- **OpenAI**: `gpt-4`, `gpt-3.5-turbo`
- **Claude**: `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
- **Gemini**: `gemini-pro`, `gemini-pro-vision`

## 🎯 사용 팁

### 1. 최적의 번역 품질을 위해:
- 한국어 사전 API 키 설정 권장
- 문맥 정보가 풍부한 텍스트 선택
- 기술 용어가 포함된 문장 단위로 번역

### 2. 검증 기능 활용:
- 번역 후 의심스러운 용어는 개별 검증
- 전체 문서 완성 후 품질 분석 실행
- 검증 결과의 권장사항 적극 활용

### 3. 키보드 단축키 활용:
- `Ctrl+Alt+K`: 한국어 번역
- `Ctrl+Alt+V`: 용어 검증
- `Ctrl+Shift+P`: 명령 팔레트

## 🔒 보안 및 개인정보

- 모든 API 키는 VS Code의 **암호화된 보안 저장소**에 저장
- API 키는 로컬에만 저장되며 외부로 전송되지 않음
- 번역 요청만 각 AI 제공업체로 전송됨

## 🐛 문제 해결

### 일반적인 문제들:

#### 1. "API key not found" 에러
**해결법**: `Ctrl+Shift+P` → "Configure AI"로 API 키 설정

#### 2. 한국어 검증이 작동하지 않음
**해결법**:
- 한국어 사전 API 키 설정 확인
- 32자리 키 길이 확인
- [국립국어원 오픈 API](https://stdict.korean.go.kr/openapi/openApiInfo.do)에서 키 유효성 확인

#### 3. 번역 품질이 낮음
**해결법**:
- 더 구체적인 문맥 제공
- 문장 단위로 나누어서 번역
- 다른 AI 제공업체 시도

#### 4. 명령어가 보이지 않음
**해결법**: 확장 프로그램 재시작 또는 VS Code 재시작

## 📚 참고 자료

- [Kubernetes 공식 한글화 가이드](https://kubernetes.io/ko/docs/contribute/localization_ko/)
- [국립국어원 표준국어대사전](https://stdict.korean.go.kr/)
- [국립국어원 외래어 표기법](https://kornorms.korean.go.kr/regltn/regltnView.do?regltn_code=0003#a)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
- [Google Gemini API](https://ai.google.dev/docs)

## 🤝 기여하기

이 기능에 대한 피드백이나 개선 제안은 [GitHub Issues](https://github.com/eundms/kubelingoassist/issues)를 통해 제출해 주세요.