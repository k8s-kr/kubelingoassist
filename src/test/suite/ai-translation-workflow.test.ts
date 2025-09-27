/**
 * AI 번역 워크플로우 통합 테스트
 * 전체 시스템이 함께 작동하는지 테스트
 */

import * as assert from 'assert';
import { IntentClassifier } from '../../features/ai/intent-classifier';
import { AIIntentClassifier } from '../../features/ai/ai-intent-classifier';
import { ResponseGenerator } from '../../features/ai/response-generator';
import { AIService } from '../../features/ai/ai-service';

// Mock AIService for integration testing
class MockAIServiceForIntegration extends AIService {
    private responseMap: Map<string, string> = new Map();

    constructor() {
        super({} as any);
        this.setupDefaultResponses();
    }

    private setupDefaultResponses() {
        // 의도 분류용 응답들
        this.responseMap.set('INTENT_CLASSIFICATION', `{
            "intent": "translation",
            "confidence": 0.9,
            "reasoning": "사용자가 번역을 요청함",
            "extractedText": "kubectl get pods"
        }`);

        // 번역 응답
        this.responseMap.set('TRANSLATION', 'kubectl get pods → 파드 목록을 가져옵니다');

        // 검토 응답
        this.responseMap.set('TRANSLATION_CHECK', `번역 품질 검토 결과:

**점수**: 8/10

**좋은 점**:
- 기술적으로 정확함
- 자연스러운 한국어 표현

**개선 사항**:
- "파드"보다 "Pod"가 더 일반적으로 사용됨`);

        // 사례 검색 응답
        this.responseMap.set('FIND_SIMILAR', `유사한 번역 사례들:

1. kubectl get deployments → 배포 목록 가져오기
2. kubectl get services → 서비스 목록 조회
3. kubectl get nodes → 노드 상태 확인`);
    }

    setMockResponse(key: string, response: string) {
        this.responseMap.set(key, response);
    }

    async translateText(request: any): Promise<any> {
        // 의도 분류 요청인지 확인
        if (request.context && request.context.includes('의도 분류')) {
            return {
                translatedText: this.responseMap.get('INTENT_CLASSIFICATION') || '{"intent": "general", "confidence": 0.5}'
            };
        }

        // 번역 요청 타입에 따라 응답 결정
        if (request.context && request.context.includes('검토')) {
            return { translatedText: this.responseMap.get('TRANSLATION_CHECK') || '검토 완료' };
        }

        if (request.context && request.context.includes('사례')) {
            return { translatedText: this.responseMap.get('FIND_SIMILAR') || '사례를 찾지 못했습니다' };
        }

        // 기본 번역 응답
        return {
            translatedText: this.responseMap.get('TRANSLATION') || `번역 결과: ${request.sourceText}`
        };
    }
}

describe('AI Translation Workflow Integration', () => {
    let mockAIService: MockAIServiceForIntegration;
    let intentClassifier: IntentClassifier;
    let aiIntentClassifier: AIIntentClassifier;
    let responseGenerator: ResponseGenerator;

    beforeEach(() => {
        mockAIService = new MockAIServiceForIntegration();
        intentClassifier = new IntentClassifier();
        aiIntentClassifier = new AIIntentClassifier(mockAIService);
        responseGenerator = new ResponseGenerator();
    });

    describe('하이브리드 의도 분류 워크플로우', () => {
        it('명확한 키워드는 빠른 분류로 처리한다', async () => {
            const message = 'kubectl get pods 번역해줘';

            // 1단계: 빠른 키워드 분류
            const quickResult = intentClassifier.classifyIntent(message);

            assert.strictEqual(quickResult.intent, 'translation');
            assert(quickResult.confidence > 0.7);

            // 빠른 분류가 확실하므로 AI 분류는 생략
            // 2단계: 프롬프트 생성
            const promptConfig = responseGenerator.generatePromptForIntent({
                intent: quickResult.intent,
                originalMessage: message,
                extractedText: quickResult.extractedText
            });

            assert(promptConfig.systemPrompt.includes('번역'));
            assert(promptConfig.userPrompt.includes('kubectl get pods'));
        });

        it('애매한 경우 AI 분류를 사용한다', async () => {
            const ambiguousMessage = 'deployment scaling 문제';

            // 1단계: 빠른 키워드 분류 (낮은 신뢰도)
            const quickResult = intentClassifier.classifyIntent(ambiguousMessage);

            // 신뢰도가 낮으므로 AI 분류 사용
            if (quickResult.confidence <= 0.7) {
                // 2단계: AI 기반 의도 분류
                mockAIService.setMockResponse('INTENT_CLASSIFICATION', `{
                    "intent": "explanation",
                    "confidence": 0.85,
                    "reasoning": "deployment scaling에 대한 설명 요청으로 보임"
                }`);

                const aiResult = await aiIntentClassifier.classifyIntent(ambiguousMessage);

                assert.strictEqual(aiResult.intent, 'explanation');
                assert(aiResult.confidence > 0.8);

                // 3단계: 프롬프트 생성
                const promptConfig = responseGenerator.generatePromptForIntent({
                    intent: aiResult.intent,
                    originalMessage: ambiguousMessage
                });

                assert(promptConfig.systemPrompt.includes('Kubernetes 전문가'));
                assert(promptConfig.systemPrompt.includes('설명'));
            }
        });
    });

    describe('완전한 번역 워크플로우', () => {
        it('번역 요청 전체 플로우를 테스트한다', async () => {
            const message = '`kubectl apply -f deployment.yaml` translate to Korean';

            // 1. 의도 분류
            const classification = intentClassifier.classifyIntent(message);
            assert.strictEqual(classification.intent, 'translation');

            // 2. 프롬프트 생성
            const promptConfig = responseGenerator.generatePromptForIntent({
                intent: classification.intent,
                originalMessage: message,
                extractedText: classification.extractedText
            });

            // 3. AI 응답 생성
            const response = await mockAIService.translateText({
                sourceText: promptConfig.userPrompt,
                targetLanguage: 'Korean',
                context: promptConfig.systemPrompt
            });

            assert(response.translatedText.includes('kubectl'));
            assert(typeof response.translatedText === 'string');
        });

        it('번역 검토 전체 플로우를 테스트한다', async () => {
            const message = '파드 → Pod 이렇게 번역한게 자연스러운가?';

            // 1. 의도 분류 (AI 사용)
            mockAIService.setMockResponse('INTENT_CLASSIFICATION', `{
                "intent": "translation_check",
                "confidence": 0.9,
                "reasoning": "번역의 자연스러움을 확인하는 요청"
            }`);

            const aiClassification = await aiIntentClassifier.classifyIntent(message);
            assert.strictEqual(aiClassification.intent, 'translation_check');

            // 2. 프롬프트 생성
            const promptConfig = responseGenerator.generatePromptForIntent({
                intent: aiClassification.intent,
                originalMessage: message
            });

            assert(promptConfig.systemPrompt.includes('검토'));

            // 3. AI 응답 생성
            const response = await mockAIService.translateText({
                sourceText: promptConfig.userPrompt,
                targetLanguage: 'Korean',
                context: promptConfig.systemPrompt
            });

            assert(response.translatedText.includes('점수'));
            assert(response.translatedText.includes('좋은 점'));
        });

        it('유사 사례 검색 전체 플로우를 테스트한다', async () => {
            const message = 'kubectl 명령어 비슷한 번역 사례 보여줘';

            // 1. 의도 분류
            const classification = intentClassifier.classifyIntent(message);
            assert.strictEqual(classification.intent, 'find_similar');

            // 2. 프롬프트 생성
            const promptConfig = responseGenerator.generatePromptForIntent({
                intent: classification.intent,
                originalMessage: message
            });

            // 3. AI 응답 생성
            const response = await mockAIService.translateText({
                sourceText: promptConfig.userPrompt,
                targetLanguage: 'Korean',
                context: promptConfig.systemPrompt
            });

            assert(response.translatedText.includes('유사한 번역 사례'));
            assert(response.translatedText.includes('kubectl'));
        });
    });

    describe('에러 처리', () => {
        it('AI 서비스 오류시 graceful fallback을 수행한다', async () => {
            const failingAIService = {
                translateText: async () => {
                    throw new Error('AI service unavailable');
                }
            } as unknown as AIService;

            const failingAIClassifier = new AIIntentClassifier(failingAIService);

            const result = await failingAIClassifier.classifyIntent('번역해줘');

            // fallback 분류가 작동해야 함
            assert.strictEqual(result.intent, 'translation');
            assert(result.reasoning.includes('fallback'));
        });

        it('잘못된 AI 응답 형식도 처리한다', async () => {
            mockAIService.setMockResponse('INTENT_CLASSIFICATION', 'invalid json response');

            const result = await aiIntentClassifier.classifyIntent('test message');

            // fallback으로 처리되어야 함
            assert(typeof result.intent === 'string');
            assert(typeof result.confidence === 'number');
        });
    });

    describe('성능 테스트', () => {
        it('빠른 분류는 AI 호출 없이 즉시 처리된다', () => {
            const start = Date.now();

            const result = intentClassifier.classifyIntent('번역해줘');

            const elapsed = Date.now() - start;

            assert.strictEqual(result.intent, 'translation');
            assert(elapsed < 10, 'Quick classification should be very fast');
        });

        it('여러 메시지를 연속으로 처리할 수 있다', async () => {
            const messages = [
                '번역해줘: Hello World',
                '이 번역이 맞나?',
                '비슷한 사례 찾아줘',
                'Pod가 무엇인가요?'
            ];

            const results = await Promise.all(
                messages.map(async (message) => {
                    const classification = intentClassifier.classifyIntent(message);
                    const promptConfig = responseGenerator.generatePromptForIntent({
                        intent: classification.intent,
                        originalMessage: message,
                        extractedText: classification.extractedText
                    });

                    return {
                        message,
                        intent: classification.intent,
                        hasPrompt: Boolean(promptConfig.systemPrompt && promptConfig.userPrompt)
                    };
                })
            );

            results.forEach((result, index) => {
                assert(typeof result.intent === 'string', `Message ${index} should have valid intent`);
                assert(result.hasPrompt, `Message ${index} should generate valid prompts`);
            });
        });
    });

    describe('실제 시나리오 테스트', () => {
        it('번역자가 사용하는 실제 워크플로우를 시뮬레이션한다', async () => {
            // 시나리오: 번역자가 문서를 번역하면서 도움을 요청하는 상황

            // 1. 첫 번째 요청: 번역
            let message = 'Kubernetes deployment configuration';
            let result = intentClassifier.classifyIntent(message);
            assert.strictEqual(result.intent, 'translation');

            // 2. 두 번째 요청: 번역 검토
            message = '쿠버네티스 배포 구성 이렇게 번역한게 맞나?';
            mockAIService.setMockResponse('INTENT_CLASSIFICATION', `{
                "intent": "translation_check",
                "confidence": 0.95,
                "reasoning": "번역 검토 요청"
            }`);
            result = await aiIntentClassifier.classifyIntent(message);
            assert.strictEqual(result.intent, 'translation_check');

            // 3. 세 번째 요청: 대안 번역
            message = '배포 말고 다른 번역 방법은?';
            result = intentClassifier.classifyIntent(message);
            assert.strictEqual(result.intent, 'alternative');

            // 4. 네 번째 요청: 용어 확인
            message = 'deployment 공식 번역이 뭐야?';
            result = intentClassifier.classifyIntent(message);
            assert.strictEqual(result.intent, 'terminology_check');

            // 모든 단계가 올바른 의도로 분류됨
        });
    });
});