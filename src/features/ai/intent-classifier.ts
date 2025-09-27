/**
 * 사용자 메시지의 의도를 분류하는 인텐트 분류기
 */

export type UserIntent =
  | 'translation'           // "번역해줘" - 텍스트 번역 요청
  | 'find_similar'         // "비슷한 사례 찾아줘" - 유사 번역 사례/예시 요청
  | 'translation_check'    // "이렇게 번역하는게 맞아?" - 번역 검토/검증 요청
  | 'terminology_check'    // "이 용어 맞나?" - 특정 용어 확인
  | 'alternative'          // "다른 번역 방법은?" - 대안 번역 제안 요청
  | 'explanation'          // 쿠버네티스 개념 설명 요청
  | 'help'                // 도움말/사용법 문의
  | 'general';            // 일반 대화

interface IntentClassificationResult {
  intent: UserIntent;
  confidence: number;
  extractedText?: string; // 번역할 텍스트 (번역 의도인 경우)
  reasoning: string;
}

/**
 * 키워드 기반 인텐트 분류기
 */
export class IntentClassifier {
  private readonly intentPatterns = {
    translation: [
      /번역\s*해?\s*(주세요|줘|해줘)/i,
      /translate/i,
      /(영어|한국어|일본어|중국어)로\s*(번역|바꿔)/i,
      /다음.*번역/i,
      /이것.*번역/i,
      /"([^"]+)"\s*번역/i,
      /'([^']+)'\s*번역/i,
      /`([^`]+)`\s*번역/i
    ],

    find_similar: [
      /비슷한.*사례/i,
      /유사한.*예시/i,
      /다른.*번역.*예/i,
      /참고.*번역/i,
      /비교.*번역/i,
      /비슷하게.*번역된/i,
      /example.*translation/i,
      /similar.*case/i
    ],

    translation_check: [
      /이렇게.*번역.*맞/i,
      /번역.*맞나/i,
      /번역.*검토/i,
      /번역.*확인/i,
      /올바른.*번역/i,
      /translation.*correct/i,
      /review.*translation/i,
      /적절한.*번역/i,
      /자연스러운.*번역/i
    ],

    terminology_check: [
      /용어.*맞/i,
      /단어.*맞/i,
      /(pod|service|deployment|namespace).*번역.*맞/i,
      /표준.*용어/i,
      /공식.*용어/i,
      /terminology.*correct/i,
      /적절한.*용어/i
    ],

    alternative: [
      /다른.*번역.*방법/i,
      /다르게.*번역/i,
      /대안.*번역/i,
      /alternative.*translation/i,
      /다른.*표현/i,
      /바꿔서.*번역/i
    ],

    explanation: [
      /무엇인가요?\?/i,
      /뭔가요?\?/i,
      /설명해/i,
      /알려주세요/i,
      /(pod|service|deployment|namespace|ingress|configmap|secret).*무엇/i,
      /(쿠버네티스|k8s|kubernetes).*개념/i,
      /차이점.*무엇/i,
      /어떤.*역할/i
    ],

    help: [
      /도움말/i,
      /사용법/i,
      /어떻게.*사용/i,
      /help/i,
      /기능.*무엇/i,
      /단축키/i,
      /명령어.*무엇/i,
      /API.*키.*설정/i,
      /(설정|configure).*방법/i
    ]
  };

  /**
   * 사용자 메시지를 분석하여 의도를 분류합니다.
   */
  classifyIntent(message: string): IntentClassificationResult {
    const normalizedMessage = message.trim();

    // 각 인텐트별로 패턴 매칭
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        const match = normalizedMessage.match(pattern);
        if (match) {
          let extractedText: string | undefined;
          let confidence = 0.8;

          // 번역 의도인 경우 번역할 텍스트 추출
          if (intent === 'translation') {
            extractedText = this.extractTranslationText(normalizedMessage, match);
            confidence = extractedText ? 0.9 : 0.7;
          }

          return {
            intent: intent as UserIntent,
            confidence,
            extractedText,
            reasoning: `패턴 매칭: ${pattern.source}`
          };
        }
      }
    }

    // 패턴이 매칭되지 않은 경우 휴리스틱 분석
    return this.heuristicAnalysis(normalizedMessage);
  }

  /**
   * 번역할 텍스트를 추출합니다.
   */
  private extractTranslationText(message: string, match: RegExpMatchArray): string | undefined {
    // 따옴표나 백틱으로 감싸진 텍스트 찾기
    const quotedText = message.match(/"([^"]+)"|'([^']+)'|`([^`]+)`/);
    if (quotedText) {
      return quotedText[1] || quotedText[2] || quotedText[3];
    }

    // "다음을 번역해주세요: ..." 패턴
    const colonPattern = message.match(/번역.*:\s*(.+)$/i);
    if (colonPattern) {
      return colonPattern[1].trim();
    }

    // 명시적인 번역 표시가 없으면 전체 메시지가 번역 대상일 가능성
    if (message.length < 200 && !message.includes('?') && !message.includes('어떻게')) {
      return message;
    }

    return undefined;
  }

  /**
   * 휴리스틱 분석을 통한 인텐트 추론
   */
  private heuristicAnalysis(message: string): IntentClassificationResult {
    // 질문 형태인지 확인
    const isQuestion = message.includes('?') ||
                      message.includes('무엇') ||
                      message.includes('어떻게') ||
                      message.includes('왜') ||
                      message.includes('뭐');

    // Kubernetes 용어 포함 확인
    const k8sTerms = ['pod', 'service', 'deployment', 'namespace', 'ingress',
                     'configmap', 'secret', 'node', 'cluster', 'kubectl',
                     '파드', '서비스', '배포', '네임스페이스', '클러스터'];
    const hasK8sTerms = k8sTerms.some(term =>
      message.toLowerCase().includes(term.toLowerCase())
    );

    // 영어 텍스트가 많으면 번역 요청일 가능성
    const englishRatio = (message.match(/[a-zA-Z]/g) || []).length / message.length;

    if (englishRatio > 0.7 && !isQuestion) {
      return {
        intent: 'translation',
        confidence: 0.6,
        extractedText: message,
        reasoning: '영어 텍스트 비율이 높고 질문 형태가 아님'
      };
    }

    if (isQuestion && hasK8sTerms) {
      return {
        intent: 'explanation',
        confidence: 0.6,
        reasoning: '질문 형태이면서 Kubernetes 용어 포함'
      };
    }

    if (isQuestion) {
      return {
        intent: 'help',
        confidence: 0.5,
        reasoning: '질문 형태'
      };
    }

    // 기본값: 일반 대화
    return {
      intent: 'general',
      confidence: 0.3,
      reasoning: '특정 패턴 없음, 일반 대화로 추정'
    };
  }
}