/**
 * ResponseGenerator 테스트
 */

import * as assert from 'assert';
import { ResponseGenerator } from '../../features/ai/response-generator';
import { UserIntent } from '../../features/ai/intent-classifier';

describe('ResponseGenerator', () => {
    let generator: ResponseGenerator;

    beforeEach(() => {
        generator = new ResponseGenerator();
    });

    describe('번역 프롬프트 생성', () => {
        it('번역 요청에 대한 올바른 프롬프트를 생성한다', () => {
            const request = {
                intent: 'translation' as UserIntent,
                originalMessage: 'kubectl get pods 번역해줘',
                extractedText: 'kubectl get pods'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('Kubernetes'));
            assert(result.systemPrompt.includes('번역'));
            assert(result.userPrompt.includes('kubectl get pods'));
            assert(result.userPrompt.includes('한국어로 번역'));
        });

        it('추출된 텍스트가 없을 때 원본 메시지를 사용한다', () => {
            const request = {
                intent: 'translation' as UserIntent,
                originalMessage: 'translate this text',
                extractedText: undefined
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.userPrompt.includes('translate this text'));
        });
    });

    describe('유사 사례 검색 프롬프트 생성', () => {
        it('유사 사례 요청에 대한 적절한 프롬프트를 생성한다', () => {
            const request = {
                intent: 'find_similar' as UserIntent,
                originalMessage: 'deployment 비슷한 번역 사례 있나?'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('번역 전문가'));
            assert(result.systemPrompt.includes('비슷한'));
            assert(result.systemPrompt.includes('사례'));
            assert(result.systemPrompt.includes('예시'));
            assert(result.userPrompt === request.originalMessage);
        });

        it('제공할 정보 목록이 포함되어 있다', () => {
            const request = {
                intent: 'find_similar' as UserIntent,
                originalMessage: 'test'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('3-5개'));
            assert(result.systemPrompt.includes('번역 패턴'));
            assert(result.systemPrompt.includes('주의사항'));
            assert(result.systemPrompt.includes('용어 사용법'));
        });
    });

    describe('번역 검토 프롬프트 생성', () => {
        it('번역 검토 요청에 대한 체크리스트가 포함된 프롬프트를 생성한다', () => {
            const request = {
                intent: 'translation_check' as UserIntent,
                originalMessage: '파드 → Pod 이렇게 번역한게 맞나?'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('검토 전문가'));
            assert(result.systemPrompt.includes('검토 기준'));
            assert(result.systemPrompt.includes('기술적 정확성'));
            assert(result.systemPrompt.includes('자연스러운'));
            assert(result.systemPrompt.includes('일관성'));
        });

        it('검토 결과에 포함될 항목들이 명시되어 있다', () => {
            const request = {
                intent: 'translation_check' as UserIntent,
                originalMessage: 'test'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('품질 점수'));
            assert(result.systemPrompt.includes('1-10'));
            assert(result.systemPrompt.includes('좋은 점'));
            assert(result.systemPrompt.includes('개선이 필요한'));
            assert(result.systemPrompt.includes('수정 제안'));
            assert(result.systemPrompt.includes('대안 번역'));
        });
    });

    describe('용어 확인 프롬프트 생성', () => {
        it('용어 검증에 필요한 참고 기준이 포함되어 있다', () => {
            const request = {
                intent: 'terminology_check' as UserIntent,
                originalMessage: 'pod를 파드라고 번역하는게 맞나?'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('용어 검증 전문가'));
            assert(result.systemPrompt.includes('공식 한국어 문서'));
            assert(result.systemPrompt.includes('표준국어대사전'));
            assert(result.systemPrompt.includes('IT 업계'));
            assert(result.systemPrompt.includes('번역 일관성'));
        });

        it('답변에 포함될 정보가 명시되어 있다', () => {
            const request = {
                intent: 'terminology_check' as UserIntent,
                originalMessage: 'test'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('적절성'));
            assert(result.systemPrompt.includes('적절함/부적절함'));
            assert(result.systemPrompt.includes('표준/권장'));
            assert(result.systemPrompt.includes('맥락 설명'));
            assert(result.systemPrompt.includes('차이점'));
        });
    });

    describe('대안 번역 프롬프트 생성', () => {
        it('다양한 번역 방법이 제시되어 있다', () => {
            const request = {
                intent: 'alternative' as UserIntent,
                originalMessage: 'deployment를 다르게 번역하면?'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('창의적인'));
            assert(result.systemPrompt.includes('직역 vs 의역'));
            assert(result.systemPrompt.includes('격식체 vs 비격식체'));
            assert(result.systemPrompt.includes('기술적 표현 vs 쉬운 표현'));
            assert(result.systemPrompt.includes('간결한 표현 vs 상세한 표현'));
        });

        it('장단점과 사용 상황 설명이 포함되어 있다', () => {
            const request = {
                intent: 'alternative' as UserIntent,
                originalMessage: 'test'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('장단점'));
            assert(result.systemPrompt.includes('적절한 사용 상황'));
        });
    });

    describe('설명 프롬프트 생성', () => {
        it('Kubernetes 개념 설명에 적합한 프롬프트를 생성한다', () => {
            const request = {
                intent: 'explanation' as UserIntent,
                originalMessage: 'Pod가 무엇인가요?'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('Kubernetes 전문가'));
            assert(result.systemPrompt.includes('초보자'));
            assert(result.systemPrompt.includes('명확하고 친근'));
            assert(result.systemPrompt.includes('실제 예시'));
            assert(result.systemPrompt.includes('kubectl 명령어'));
        });
    });

    describe('도움말 프롬프트 생성', () => {
        it('KubeLingoAssist 기능 안내가 포함되어 있다', () => {
            const request = {
                intent: 'help' as UserIntent,
                originalMessage: '이 도구 어떻게 사용하나요?'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('KubeLingoAssist'));
            assert(result.systemPrompt.includes('사용법 가이드'));
            assert(result.systemPrompt.includes('주요 기능'));
            assert(result.systemPrompt.includes('Ctrl+Alt+K'));
            assert(result.systemPrompt.includes('Ctrl+Alt+V'));
            assert(result.systemPrompt.includes('Cmd+Shift+T'));
        });

        it('지원 가능한 모든 기능이 나열되어 있다', () => {
            const request = {
                intent: 'help' as UserIntent,
                originalMessage: 'test'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('AI 번역'));
            assert(result.systemPrompt.includes('용어 검증'));
            assert(result.systemPrompt.includes('분할 화면'));
            assert(result.systemPrompt.includes('스크롤 동기화'));
            assert(result.systemPrompt.includes('번역 품질 분석'));
        });
    });

    describe('일반 대화 프롬프트 생성', () => {
        it('친근한 톤의 프롬프트를 생성한다', () => {
            const request = {
                intent: 'general' as UserIntent,
                originalMessage: '안녕하세요'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('친근하고'));
            assert(result.systemPrompt.includes('도움이 되는'));
            assert(result.systemPrompt.includes('KubeLingoAssist'));
        });

        it('도움 제안이 포함되어 있다', () => {
            const request = {
                intent: 'general' as UserIntent,
                originalMessage: 'test'
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.systemPrompt.includes('번역해줘'));
            assert(result.systemPrompt.includes('설명해줘'));
            assert(result.systemPrompt.includes('도움말'));
            assert(result.systemPrompt.includes('가이드'));
        });
    });

    describe('알 수 없는 의도 처리', () => {
        it('알 수 없는 의도는 일반 대화로 처리한다', () => {
            const request = {
                intent: 'unknown_intent' as any,
                originalMessage: 'test message'
            };

            const result = generator.generatePromptForIntent(request);

            // 일반 대화 프롬프트와 같아야 함
            assert(result.systemPrompt.includes('친근하고'));
            assert(result.systemPrompt.includes('KubeLingoAssist'));
        });
    });

    describe('프롬프트 구조 검증', () => {
        it('모든 의도에 대해 systemPrompt와 userPrompt를 반환한다', () => {
            const intents: UserIntent[] = [
                'translation',
                'find_similar',
                'translation_check',
                'terminology_check',
                'alternative',
                'explanation',
                'help',
                'general'
            ];

            intents.forEach(intent => {
                const request = {
                    intent,
                    originalMessage: 'test message'
                };

                const result = generator.generatePromptForIntent(request);

                assert(typeof result.systemPrompt === 'string',
                    `systemPrompt should be string for intent: ${intent}`);
                assert(typeof result.userPrompt === 'string',
                    `userPrompt should be string for intent: ${intent}`);
                assert(result.systemPrompt.length > 0,
                    `systemPrompt should not be empty for intent: ${intent}`);
                assert(result.userPrompt.length > 0,
                    `userPrompt should not be empty for intent: ${intent}`);
            });
        });

        it('userPrompt는 항상 원본 메시지를 포함한다', () => {
            const testMessage = 'unique test message 12345';
            const request = {
                intent: 'explanation' as UserIntent,
                originalMessage: testMessage
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.userPrompt.includes(testMessage));
        });
    });

    describe('에지 케이스', () => {
        it('빈 메시지를 처리한다', () => {
            const request = {
                intent: 'translation' as UserIntent,
                originalMessage: '',
                extractedText: ''
            };

            const result = generator.generatePromptForIntent(request);

            assert(typeof result.systemPrompt === 'string');
            assert(typeof result.userPrompt === 'string');
        });

        it('매우 긴 메시지를 처리한다', () => {
            const longMessage = 'A'.repeat(10000);
            const request = {
                intent: 'translation' as UserIntent,
                originalMessage: longMessage
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.userPrompt.includes(longMessage));
        });

        it('특수 문자가 포함된 메시지를 처리한다', () => {
            const specialMessage = '!@#$%^&*(){}[]|\\:";\'<>?,./ test message';
            const request = {
                intent: 'translation' as UserIntent,
                originalMessage: specialMessage
            };

            const result = generator.generatePromptForIntent(request);

            assert(result.userPrompt.includes(specialMessage));
        });
    });
});