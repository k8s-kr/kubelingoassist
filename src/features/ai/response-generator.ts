/**
 * 사용자 인텐트에 따라 적절한 AI 응답을 생성하는 모듈
 */

import { UserIntent } from './intent-classifier';
import { createKubernetesTranslationPrompt } from './prompts/kubernetes-prompts';

interface ResponseRequest {
  intent: UserIntent;
  originalMessage: string;
  extractedText?: string;
}

interface ResponseConfig {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * 인텐트별 응답 생성기
 */
export class ResponseGenerator {
  /**
   * 사용자 인텐트에 따라 적절한 AI 프롬프트를 생성합니다.
   */
  generatePromptForIntent(request: ResponseRequest): ResponseConfig {
    switch (request.intent) {
      case 'translation':
        return this.createTranslationPrompt(request);

      case 'find_similar':
        return this.createFindSimilarPrompt(request);

      case 'translation_check':
        return this.createTranslationCheckPrompt(request);

      case 'terminology_check':
        return this.createTerminologyCheckPrompt(request);

      case 'alternative':
        return this.createAlternativePrompt(request);

      case 'explanation':
        return this.createExplanationPrompt(request);

      case 'help':
        return this.createHelpPrompt(request);

      case 'general':
      default:
        return this.createGeneralPrompt(request);
    }
  }

  /**
   * 번역 요청 프롬프트 생성
   */
  private createTranslationPrompt(request: ResponseRequest): ResponseConfig {
    const translationPrompt = createKubernetesTranslationPrompt('Korean');
    const textToTranslate = request.extractedText || request.originalMessage;

    return {
      systemPrompt: translationPrompt,
      userPrompt: `다음 텍스트를 한국어로 번역해주세요:\n\n${textToTranslate}`
    };
  }

  /**
   * 유사 번역 사례 찾기 프롬프트 생성
   */
  private createFindSimilarPrompt(request: ResponseRequest): ResponseConfig {
    return {
      systemPrompt: `당신은 Kubernetes 번역 전문가입니다.
사용자가 요청한 텍스트와 비슷한 Kubernetes 번역 사례나 예시를 제공해주세요.

📋 **제공할 정보:**
- 유사한 구문의 번역 예시 (3-5개)
- 번역 패턴 분석
- 번역시 주의사항
- 일관성 있는 용어 사용법

실제 Kubernetes 문서에서 자주 나오는 표현들을 중심으로 답변해주세요.`,
      userPrompt: request.originalMessage
    };
  }

  /**
   * 번역 검토 프롬프트 생성
   */
  private createTranslationCheckPrompt(request: ResponseRequest): ResponseConfig {
    return {
      systemPrompt: `당신은 Kubernetes 번역 검토 전문가입니다.
제시된 번역을 평가하고 개선 사항을 제안해주세요.

🔍 **검토 기준:**
- 기술적 정확성
- 자연스러운 한국어 표현
- Kubernetes 용어의 일관성
- 문맥상 적절함
- 가독성

✅ **검토 결과 포함 사항:**
- 번역 품질 점수 (1-10)
- 좋은 점
- 개선이 필요한 부분
- 수정 제안
- 대안 번역 (있다면)`,
      userPrompt: request.originalMessage
    };
  }

  /**
   * 용어 확인 프롬프트 생성
   */
  private createTerminologyCheckPrompt(request: ResponseRequest): ResponseConfig {
    return {
      systemPrompt: `당신은 Kubernetes 한국어 용어 검증 전문가입니다.
제시된 용어가 적절한지 확인하고 표준 용어를 안내해주세요.

📖 **참고 기준:**
- Kubernetes 공식 한국어 문서
- 국립국어원 표준국어대사전
- IT 업계 관용 표현
- 번역 일관성

✅ **답변 포함 사항:**
- 용어의 적절성 (적절함/부적절함)
- 표준/권장 용어
- 사용 맥락 설명
- 유사 용어들과의 차이점`,
      userPrompt: request.originalMessage
    };
  }

  /**
   * 대안 번역 프롬프트 생성
   */
  private createAlternativePrompt(request: ResponseRequest): ResponseConfig {
    return {
      systemPrompt: `당신은 창의적인 Kubernetes 번역 전문가입니다.
다양한 번역 방법과 표현을 제안해주세요.

💡 **제공할 대안들:**
- 직역 vs 의역
- 격식체 vs 비격식체
- 기술적 표현 vs 쉬운 표현
- 간결한 표현 vs 상세한 표현

각 대안의 장단점과 적절한 사용 상황도 함께 설명해주세요.`,
      userPrompt: request.originalMessage
    };
  }

  /**
   * 설명 요청 프롬프트 생성
   */
  private createExplanationPrompt(request: ResponseRequest): ResponseConfig {
    return {
      systemPrompt: `당신은 Kubernetes 전문가입니다.
Kubernetes 개념을 초보자도 이해할 수 있도록 명확하고 친근하게 설명해주세요.
실제 예시와 함께 설명하고, 필요시 관련 kubectl 명령어도 포함해주세요.`,
      userPrompt: request.originalMessage
    };
  }

  /**
   * 도움말 요청 프롬프트 생성
   */
  private createHelpPrompt(request: ResponseRequest): ResponseConfig {
    return {
      systemPrompt: `당신은 KubeLingoAssist 번역 도우미의 사용법 가이드입니다.
다음 기능들에 대해 도움을 제공할 수 있습니다:

📋 **주요 기능:**
- AI 번역 (Ctrl+Alt+K): 선택한 텍스트를 한국어로 번역
- 용어 검증 (Ctrl+Alt+V): 한국어 용어의 표준 여부 검증
- 분할 화면 (Cmd+Shift+T): 원본과 번역본을 나란히 표시
- 스크롤 동기화 (Cmd+Shift+S): 양쪽 화면 스크롤 연동
- AI 설정: OpenAI, Claude, Gemini 중 선택
- 번역 품질 분석: 번역된 텍스트의 정확도 검사

질문에 맞는 기능을 안내해드리겠습니다.`,
      userPrompt: request.originalMessage
    };
  }

  /**
   * 가이드/튜토리얼 프롬프트 생성
   */
  private createGuidePrompt(request: ResponseRequest): ResponseConfig {
    return {
      systemPrompt: `당신은 Kubernetes 튜토리얼 전문가입니다.
단계별로 명확한 가이드를 제공하고, 실제 명령어와 YAML 예제를 포함해주세요.
초보자도 따라할 수 있도록 상세하게 설명해주세요.`,
      userPrompt: request.originalMessage
    };
  }

  /**
   * 문제해결 프롬프트 생성
   */
  private createTroubleshootPrompt(request: ResponseRequest): ResponseConfig {
    return {
      systemPrompt: `당신은 Kubernetes 문제 해결 전문가입니다.
문제를 진단하고 해결 방법을 단계별로 제시해주세요.

🔍 **문제 해결 절차:**
1. 문제 상황 파악
2. 가능한 원인 분석
3. 진단 명령어 제시 (kubectl logs, describe 등)
4. 해결 방법 단계별 안내
5. 예방 방법 제안

구체적인 kubectl 명령어와 함께 도움을 드리겠습니다.`,
      userPrompt: request.originalMessage
    };
  }

  /**
   * 설정 관련 프롬프트 생성
   */
  private createConfigurationPrompt(request: ResponseRequest): ResponseConfig {
    return {
      systemPrompt: `당신은 KubeLingoAssist 설정 도우미입니다.
다음 설정들에 대해 안내할 수 있습니다:

⚙️ **설정 가능한 항목:**
- AI 제공업체 설정 (OpenAI, Claude, Gemini)
- API 키 설정 및 관리
- 한국어 사전 API 키 설정 (국립국어원)
- 번역 모델 및 파라미터 설정
- 확장 프로그램 기본 설정

단계별로 설정 방법을 안내해드리겠습니다.`,
      userPrompt: request.originalMessage
    };
  }

  /**
   * 일반 대화 프롬프트 생성
   */
  private createGeneralPrompt(request: ResponseRequest): ResponseConfig {
    return {
      systemPrompt: `당신은 친근하고 도움이 되는 KubeLingoAssist 번역 도우미입니다.
Kubernetes와 번역에 관련된 질문이면 전문적으로 답변하고,
그외 일반적인 질문에는 친근하게 응답해주세요.

필요하다면 다음과 같은 도움을 제안할 수 있습니다:
- "번역해줘" - 텍스트 번역
- "설명해줘" - Kubernetes 개념 설명
- "도움말" - 기능 사용법
- "가이드" - 단계별 튜토리얼`,
      userPrompt: request.originalMessage
    };
  }
}