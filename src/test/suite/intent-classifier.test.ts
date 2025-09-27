/**
 * IntentClassifier 유닛 테스트
 */

import * as assert from 'assert';
import { IntentClassifier, UserIntent } from '../../features/ai/intent-classifier';

describe('IntentClassifier', () => {
    let classifier: IntentClassifier;

    beforeEach(() => {
        classifier = new IntentClassifier();
    });

    describe('번역 의도 분류', () => {
        it('명확한 번역 요청을 올바르게 분류한다', () => {
            const testCases = [
                '번역해줘',
                '번역 해주세요',
                'translate this',
                '한국어로 번역해줘',
                '"kubectl get pods" 번역해줘',
                '`deployment.yaml` 번역',
                '다음을 번역: Hello World'
            ];

            testCases.forEach(message => {
                const result = classifier.classifyIntent(message);
                assert.strictEqual(
                    result.intent,
                    'translation',
                    `"${message}" should be classified as translation, but got ${result.intent}`
                );
                assert(result.confidence > 0.7, `Confidence should be > 0.7 for "${message}"`);
            });
        });

        it('번역할 텍스트를 올바르게 추출한다', () => {
            const testCases = [
                { input: '"kubectl get pods" 번역해줘', expected: 'kubectl get pods' },
                { input: '`deployment.yaml` 번역', expected: 'deployment.yaml' },
                { input: "'Hello World' 번역해주세요", expected: 'Hello World' },
                { input: '번역: This is a test', expected: 'This is a test' }
            ];

            testCases.forEach(({ input, expected }) => {
                const result = classifier.classifyIntent(input);
                assert.strictEqual(result.extractedText, expected,
                    `Should extract "${expected}" from "${input}"`);
            });
        });
    });

    describe('번역 검토 의도 분류', () => {
        it('번역 검토 요청을 올바르게 분류한다', () => {
            const testCases = [
                '이렇게 번역한게 맞나?',
                '번역이 맞나요?',
                '번역 검토해주세요',
                '올바른 번역인가요?',
                'review this translation',
                '자연스러운 번역인가?'
            ];

            testCases.forEach(message => {
                const result = classifier.classifyIntent(message);
                assert.strictEqual(
                    result.intent,
                    'translation_check',
                    `"${message}" should be classified as translation_check`
                );
            });
        });
    });

    describe('유사 사례 검색 의도 분류', () => {
        it('비슷한 사례 요청을 올바르게 분류한다', () => {
            const testCases = [
                '비슷한 사례 찾아줘',
                '유사한 예시가 있나?',
                '다른 번역 예시',
                '참고할 번역이 있을까?',
                'similar translation examples',
                '비교할 번역 사례'
            ];

            testCases.forEach(message => {
                const result = classifier.classifyIntent(message);
                assert.strictEqual(
                    result.intent,
                    'find_similar',
                    `"${message}" should be classified as find_similar`
                );
            });
        });
    });

    describe('용어 확인 의도 분류', () => {
        it('용어 확인 요청을 올바르게 분류한다', () => {
            const testCases = [
                '이 용어가 맞나?',
                'pod 번역이 맞나요?',
                '표준 용어는?',
                '공식 용어 확인',
                'terminology correct?',
                '적절한 용어인가?'
            ];

            testCases.forEach(message => {
                const result = classifier.classifyIntent(message);
                assert.strictEqual(
                    result.intent,
                    'terminology_check',
                    `"${message}" should be classified as terminology_check`
                );
            });
        });
    });

    describe('대안 번역 의도 분류', () => {
        it('대안 번역 요청을 올바르게 분류한다', () => {
            const testCases = [
                '다른 번역 방법은?',
                '다르게 번역하면?',
                '대안 번역 있나?',
                'alternative translation',
                '바꿔서 번역해볼까?',
                '다른 표현은?'
            ];

            testCases.forEach(message => {
                const result = classifier.classifyIntent(message);
                assert.strictEqual(
                    result.intent,
                    'alternative',
                    `"${message}" should be classified as alternative`
                );
            });
        });
    });

    describe('설명 의도 분류', () => {
        it('Kubernetes 개념 설명 요청을 올바르게 분류한다', () => {
            const testCases = [
                'Pod가 무엇인가요?',
                'Service 설명해주세요',
                'deployment와 pod 차이점은?',
                'kubernetes 개념 알려주세요',
                '네임스페이스 역할은?'
            ];

            testCases.forEach(message => {
                const result = classifier.classifyIntent(message);
                assert.strictEqual(
                    result.intent,
                    'explanation',
                    `"${message}" should be classified as explanation`
                );
            });
        });
    });

    describe('도움말 의도 분류', () => {
        it('도움말 요청을 올바르게 분류한다', () => {
            const testCases = [
                '도움말',
                '사용법 알려주세요',
                '어떻게 사용하나요?',
                'help',
                '기능이 뭐가 있나요?',
                '단축키는?',
                'API 키 설정 방법'
            ];

            testCases.forEach(message => {
                const result = classifier.classifyIntent(message);
                assert.strictEqual(
                    result.intent,
                    'help',
                    `"${message}" should be classified as help`
                );
            });
        });
    });

    describe('휴리스틱 분석', () => {
        it('영어 비율이 높은 텍스트를 번역 요청으로 분류한다', () => {
            const englishText = 'This is a deployment configuration for nginx pod';
            const result = classifier.classifyIntent(englishText);

            assert.strictEqual(result.intent, 'translation');
            assert.strictEqual(result.extractedText, englishText);
            assert(result.reasoning.includes('영어 텍스트 비율'));
        });

        it('질문 형태의 Kubernetes 용어를 설명 요청으로 분류한다', () => {
            const question = 'pod 이게 뭐죠?';
            const result = classifier.classifyIntent(question);

            assert.strictEqual(result.intent, 'explanation');
            assert(result.reasoning.includes('Kubernetes 용어 포함'));
        });

        it('일반적인 질문을 도움말로 분류한다', () => {
            const question = '이거 어떻게 써요?';
            const result = classifier.classifyIntent(question);

            assert.strictEqual(result.intent, 'help');
        });

        it('패턴이 없는 메시지를 일반 대화로 분류한다', () => {
            const general = '안녕하세요';
            const result = classifier.classifyIntent(general);

            assert.strictEqual(result.intent, 'general');
            assert(result.confidence < 0.5);
        });
    });

    describe('신뢰도 측정', () => {
        it('명확한 키워드가 있을 때 높은 신뢰도를 반환한다', () => {
            const result = classifier.classifyIntent('번역해주세요');
            assert(result.confidence > 0.8, 'Should have high confidence for clear keywords');
        });

        it('애매한 경우 낮은 신뢰도를 반환한다', () => {
            const result = classifier.classifyIntent('뭔가 이상해요');
            assert(result.confidence < 0.6, 'Should have low confidence for ambiguous messages');
        });
    });

    describe('에지 케이스', () => {
        it('빈 문자열을 처리한다', () => {
            const result = classifier.classifyIntent('');
            assert.strictEqual(result.intent, 'general');
        });

        it('공백만 있는 문자열을 처리한다', () => {
            const result = classifier.classifyIntent('   ');
            assert.strictEqual(result.intent, 'general');
        });

        it('특수문자만 있는 문자열을 처리한다', () => {
            const result = classifier.classifyIntent('!@#$%');
            assert.strictEqual(result.intent, 'general');
        });

        it('매우 긴 텍스트를 처리한다', () => {
            const longText = 'A'.repeat(1000) + ' 번역해주세요';
            const result = classifier.classifyIntent(longText);
            assert.strictEqual(result.intent, 'translation');
        });
    });
});