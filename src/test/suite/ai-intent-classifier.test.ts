/**
 * AIIntentClassifier 테스트
 */

import * as assert from 'assert';
import { AIIntentClassifier } from '../../features/ai/ai-intent-classifier';
import { AIService } from '../../features/ai/ai-service';
import { UserIntent } from '../../features/ai/intent-classifier';

// Mock AIService
class MockAIService extends AIService {
    private mockResponses: Map<string, string> = new Map();

    constructor() {
        super({} as any); // Mock context
    }

    // 테스트용 Mock 응답 설정
    setMockResponse(input: string, response: string) {
        this.mockResponses.set(input, response);
    }

    async translateText(request: any): Promise<any> {
        const mockResponse = this.mockResponses.get(request.sourceText);
        if (mockResponse) {
            return { translatedText: mockResponse };
        }

        // 기본 mock 응답 (JSON 형태)
        return {
            translatedText: `{
                "intent": "general",
                "confidence": 0.5,
                "reasoning": "Mock response",
                "extractedText": "${request.sourceText}"
            }`
        };
    }
}

describe('AIIntentClassifier', () => {
    let mockAIService: MockAIService;
    let aiClassifier: AIIntentClassifier;

    beforeEach(() => {
        mockAIService = new MockAIService();
        aiClassifier = new AIIntentClassifier(mockAIService);
    });

    describe('AI 기반 의도 분류', () => {
        it('유효한 JSON 응답을 올바르게 파싱한다', async () => {
            const mockResponse = `{
                "intent": "translation",
                "confidence": 0.9,
                "reasoning": "사용자가 명시적으로 번역을 요청함",
                "extractedText": "Hello World"
            }`;

            mockAIService.setMockResponse('Hello World 번역해줘', mockResponse);

            const result = await aiClassifier.classifyIntent('Hello World 번역해줘');

            assert.strictEqual(result.intent, 'translation');
            assert.strictEqual(result.confidence, 0.9);
            assert.strictEqual(result.reasoning, '사용자가 명시적으로 번역을 요청함');
            assert.strictEqual(result.extractedText, 'Hello World');
        });

        it('다양한 의도 타입을 올바르게 처리한다', async () => {
            const testCases = [
                {
                    input: '이 번역이 맞나?',
                    mockResponse: `{
                        "intent": "translation_check",
                        "confidence": 0.8,
                        "reasoning": "번역 검증 요청"
                    }`
                },
                {
                    input: '비슷한 사례 찾아줘',
                    mockResponse: `{
                        "intent": "find_similar",
                        "confidence": 0.85,
                        "reasoning": "유사 사례 요청"
                    }`
                },
                {
                    input: 'Pod가 무엇인가요?',
                    mockResponse: `{
                        "intent": "explanation",
                        "confidence": 0.9,
                        "reasoning": "Kubernetes 개념 설명 요청"
                    }`
                }
            ];

            for (const testCase of testCases) {
                mockAIService.setMockResponse(testCase.input, testCase.mockResponse);
                const result = await aiClassifier.classifyIntent(testCase.input);

                const expected = JSON.parse(testCase.mockResponse);
                assert.strictEqual(result.intent, expected.intent);
                assert.strictEqual(result.confidence, expected.confidence);
            }
        });
    });

    describe('JSON 파싱 처리', () => {
        it('잘못된 JSON 형식을 fallback으로 처리한다', async () => {
            const invalidJsonResponse = 'This is not a valid JSON response';
            mockAIService.setMockResponse('test message', invalidJsonResponse);

            const result = await aiClassifier.classifyIntent('test message');

            // fallback 분류가 실행되어야 함
            assert(typeof result.intent === 'string');
            assert(typeof result.confidence === 'number');
            assert(result.reasoning.includes('fallback'));
        });

        it('부분적으로 유효한 JSON을 추출한다', async () => {
            const partialJsonResponse = `Some text before {
                "intent": "translation",
                "confidence": 0.7,
                "reasoning": "Extracted from partial JSON"
            } and some text after`;

            mockAIService.setMockResponse('partial json test', partialJsonResponse);

            const result = await aiClassifier.classifyIntent('partial json test');

            assert.strictEqual(result.intent, 'translation');
            assert.strictEqual(result.confidence, 0.7);
            assert.strictEqual(result.reasoning, 'Extracted from partial JSON');
        });

        it('신뢰도 값을 0-1 범위로 제한한다', async () => {
            const testCases = [
                { confidence: -0.5, expected: 0 },
                { confidence: 1.5, expected: 1 },
                { confidence: 0.7, expected: 0.7 }
            ];

            for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i];
                const mockResponse = `{
                    "intent": "translation",
                    "confidence": ${testCase.confidence},
                    "reasoning": "Test confidence bounds"
                }`;

                mockAIService.setMockResponse(`test${i}`, mockResponse);
                const result = await aiClassifier.classifyIntent(`test${i}`);

                assert.strictEqual(result.confidence, testCase.expected,
                    `Confidence ${testCase.confidence} should be clamped to ${testCase.expected}`);
            }
        });
    });

    describe('Fallback 분류', () => {
        it('AI 호출 실패시 fallback 분류를 사용한다', async () => {
            // AI 서비스가 에러를 던지도록 설정
            const errorAIService = {
                translateText: async () => {
                    throw new Error('AI service failed');
                }
            } as unknown as AIService;

            const errorClassifier = new AIIntentClassifier(errorAIService);
            const result = await errorClassifier.classifyIntent('번역해줘');

            // fallback이 작동해야 함
            assert.strictEqual(result.intent, 'translation');
            assert(result.reasoning.includes('fallback'));
        });

        it('영어 텍스트를 번역 의도로 분류한다', async () => {
            mockAIService.setMockResponse('invalid response', 'invalid json');

            const englishText = 'This is an English sentence for translation';
            const result = await aiClassifier.classifyIntent(englishText);

            assert.strictEqual(result.intent, 'translation');
            assert.strictEqual(result.extractedText, englishText);
            assert(result.reasoning.includes('영어 텍스트 비율'));
        });

        it('검토 키워드를 검토 의도로 분류한다', async () => {
            mockAIService.setMockResponse('invalid response', 'invalid json');

            const checkMessage = '이 번역이 맞나요?';
            const result = await aiClassifier.classifyIntent(checkMessage);

            assert.strictEqual(result.intent, 'translation_check');
            assert(result.reasoning.includes('검토 요청'));
        });

        it('사례 키워드를 사례 검색 의도로 분류한다', async () => {
            mockAIService.setMockResponse('invalid response', 'invalid json');

            const similarMessage = '비슷한 사례가 있나요?';
            const result = await aiClassifier.classifyIntent(similarMessage);

            assert.strictEqual(result.intent, 'find_similar');
            assert(result.reasoning.includes('사례 요청'));
        });
    });

    describe('의도 분류 프롬프트', () => {
        it('올바른 프롬프트 구조를 생성한다', async () => {
            // classifyIntent 호출시 생성되는 프롬프트를 간접적으로 테스트
            const testMessage = 'test prompt structure';

            // Mock에서 받은 요청을 확인할 수 있도록 설정
            let receivedRequest: any = null;
            const spyAIService = {
                translateText: async (request: any) => {
                    receivedRequest = request;
                    return {
                        translatedText: `{
                            "intent": "general",
                            "confidence": 0.5,
                            "reasoning": "Test"
                        }`
                    };
                }
            } as unknown as AIService;

            const spyClassifier = new AIIntentClassifier(spyAIService);
            await spyClassifier.classifyIntent(testMessage);

            // 프롬프트 구조 확인
            assert(receivedRequest.sourceText === testMessage);
            assert(receivedRequest.targetLanguage === 'Korean');
            assert(receivedRequest.context.includes('의도 분류'));
            assert(receivedRequest.context.includes('JSON'));
        });
    });

    describe('에지 케이스', () => {
        it('빈 문자열을 처리한다', async () => {
            const result = await aiClassifier.classifyIntent('');

            assert(typeof result.intent === 'string');
            assert(typeof result.confidence === 'number');
            assert(result.confidence >= 0 && result.confidence <= 1);
        });

        it('매우 긴 텍스트를 처리한다', async () => {
            const longText = 'A'.repeat(5000);
            const result = await aiClassifier.classifyIntent(longText);

            assert(typeof result.intent === 'string');
            assert(typeof result.confidence === 'number');
        });

        it('특수 문자가 포함된 텍스트를 처리한다', async () => {
            const specialChars = '!@#$%^&*(){}[]|\\:";\'<>?,./ 번역해줘';
            const result = await aiClassifier.classifyIntent(specialChars);

            assert(typeof result.intent === 'string');
            assert(typeof result.confidence === 'number');
        });
    });
});