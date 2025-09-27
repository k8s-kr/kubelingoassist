/**
 * AI 기반 의도 분류기 - 실제 AI 모델을 사용하여 사용자 의도를 분류
 */

import { AIService } from './ai-service';
import { UserIntent } from './intent-classifier';

interface AIIntentResult {
  intent: UserIntent;
  confidence: number;
  reasoning: string;
  extractedText?: string;
}

/**
 * AI를 활용한 지능적인 의도 분류기
 */
export class AIIntentClassifier {
  constructor(private aiService: AIService) {}

  /**
   * AI를 사용하여 사용자 메시지의 의도를 분류합니다.
   */
  async classifyIntent(message: string): Promise<AIIntentResult> {
    const classificationPrompt = this.createIntentClassificationPrompt();

    try {
      const response = await this.aiService.translateText({
        sourceText: message,
        targetLanguage: 'Korean', // 분류 결과를 한국어로 받기
        context: 'Intent classification for translation workflow'
      });

      return this.parseAIResponse(response.translatedText, message);
    } catch (error) {
      console.error('AI intent classification failed:', error);
      // AI 실패시 기본값 반환
      return {
        intent: 'general',
        confidence: 0.3,
        reasoning: 'AI 분류 실패, 기본 의도로 설정',
        extractedText: message
      };
    }
  }

  /**
   * 의도 분류를 위한 AI 프롬프트 생성
   */
  private createIntentClassificationPrompt(): string {
    return `당신은 Kubernetes 번역 워크플로우를 위한 의도 분류 전문가입니다.

사용자의 메시지를 분석하여 다음 의도 중 하나로 분류해주세요:

🎯 **분류 가능한 의도:**
1. **translation** - 텍스트 번역 요청
   - "번역해줘", "translate", "한국어로 바꿔줘"
   - 영어 텍스트를 한국어로 변환 요청

2. **find_similar** - 유사 번역 사례 요청
   - "비슷한 사례", "다른 예시", "참고할 번역"
   - 비교할 번역 예제 요청

3. **translation_check** - 번역 검토/검증 요청
   - "번역이 맞나?", "자연스러운가?", "이렇게 번역해도 되나?"
   - 기존 번역의 품질 확인 요청

4. **terminology_check** - 용어 확인 요청
   - "이 용어 맞나?", "표준 용어는?", "공식 번역은?"
   - 특정 용어의 적절성 확인

5. **alternative** - 대안 번역 요청
   - "다르게 번역하면?", "다른 표현은?", "대안은?"
   - 다양한 번역 옵션 요청

6. **explanation** - Kubernetes 개념 설명 요청
   - "무엇인가?", "어떤 역할?", "차이점은?"
   - 기술적 개념 이해 요청

7. **help** - 도구 사용법/도움말 요청
   - "사용법", "도움말", "어떻게 써?", "기능은?"
   - 확장 프로그램 관련 질문

8. **general** - 일반 대화
   - 위 분류에 해당하지 않는 일반적인 대화

📋 **응답 형식 (JSON):**
{
  "intent": "분류된_의도",
  "confidence": 0.0-1.0,
  "reasoning": "분류 근거 설명",
  "extractedText": "번역할 텍스트 (translation 의도인 경우만)"
}

**중요:** 응답은 반드시 유효한 JSON 형식으로만 해주세요.`;
  }

  /**
   * AI 응답을 파싱하여 의도 분류 결과를 추출합니다.
   */
  private parseAIResponse(response: string, originalMessage: string): AIIntentResult {
    try {
      // JSON 추출 시도
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON not found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        intent: parsed.intent || 'general',
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        reasoning: parsed.reasoning || '파싱된 AI 응답',
        extractedText: parsed.extractedText
      };
    } catch (error) {
      console.error('Failed to parse AI intent response:', error);

      // 파싱 실패시 간단한 휴리스틱 사용
      return this.fallbackClassification(originalMessage);
    }
  }

  /**
   * AI 파싱 실패시 사용하는 간단한 휴리스틱 분류
   */
  private fallbackClassification(message: string): AIIntentResult {
    const lowerMessage = message.toLowerCase();

    // 명확한 키워드들만 확인
    if (lowerMessage.includes('번역') || lowerMessage.includes('translate')) {
      return {
        intent: 'translation',
        confidence: 0.7,
        reasoning: '키워드 기반 fallback: 번역 요청',
        extractedText: message
      };
    }

    if (lowerMessage.includes('맞나') || lowerMessage.includes('검토')) {
      return {
        intent: 'translation_check',
        confidence: 0.6,
        reasoning: '키워드 기반 fallback: 검토 요청'
      };
    }

    if (lowerMessage.includes('사례') || lowerMessage.includes('예시')) {
      return {
        intent: 'find_similar',
        confidence: 0.6,
        reasoning: '키워드 기반 fallback: 사례 요청'
      };
    }

    // 영어 비율이 높으면 번역 요청일 가능성
    const englishRatio = (message.match(/[a-zA-Z]/g) || []).length / message.length;
    if (englishRatio > 0.7) {
      return {
        intent: 'translation',
        confidence: 0.5,
        reasoning: '키워드 기반 fallback: 영어 텍스트 비율 높음',
        extractedText: message
      };
    }

    return {
      intent: 'general',
      confidence: 0.3,
      reasoning: '키워드 기반 fallback: 일반 대화'
    };
  }
}