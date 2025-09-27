/**
 * Kubernetes 문서 번역을 위한 다국어 특화 프롬프트 시스템
 */

import { KOREAN_TRANSLATION_GUIDE } from './korean';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 지원되는 번역 언어 목록 (필요에 따라 확장 가능)
 */
export type SupportedLanguage = 'Korean';

/**
 * 언어별 번역 가이드 인터페이스
 */
export interface LanguageTranslationGuide {
  /** 언어 이름 */
  language: SupportedLanguage;
  /** 언어별 용어 사전 */
  terminology: Record<string, string>;
  /** 언어별 특화 가이드라인 */
  guidelines: string[];
  /** 문체/톤 가이드 */
  styleGuide: string[];
  /** 특별 규칙 */
  specialRules: string[];
}

/**
 * 언어별 번역 가이드 저장소
 */
const LANGUAGE_GUIDES: Record<SupportedLanguage, LanguageTranslationGuide> = {
  Korean: KOREAN_TRANSLATION_GUIDE
};

/**
 * 언어별로 특화된 Kubernetes 번역 프롬프트를 생성합니다.
 */
export function createKubernetesTranslationPrompt(targetLanguage: string): string {
  // 지원되는 언어인지 확인
  const languageKey = targetLanguage as SupportedLanguage;
  const guide = LANGUAGE_GUIDES[languageKey];

  if (!guide) {
    // 기본 범용 프롬프트
    return `You are a professional translator specializing in Kubernetes documentation.
Translate the following text to ${targetLanguage}.
Maintain technical accuracy and keep code blocks, links, and formatting intact.
Keep command names (kubectl, docker), YAML fields (metadata, spec, status), and technical paths unchanged.`;
  }

  const terminologyList = Object.entries(guide.terminology)
    .map(([en, translated]) => `- ${en} → ${translated}`)
    .join('\n');

  const guidelinesList = guide.guidelines.map(g => `- ${g}`).join('\n');
  const styleGuideList = guide.styleGuide.map(s => `- ${s}`).join('\n');
  const specialRulesList = guide.specialRules.map(r => `- ${r}`).join('\n');

  // 프롬프트 템플릿 파일 읽기 및 치환
  if (languageKey === 'Korean') {
    try {
      const templatePath = path.join(__dirname, 'korean-prompt.txt');
      const template = fs.readFileSync(templatePath, 'utf-8');

      return template
        .replace('{{terminologyList}}', terminologyList)
        .replace('{{guidelinesList}}', guidelinesList)
        .replace('{{styleGuideList}}', styleGuideList)
        .replace('{{specialRulesList}}', specialRulesList)
        .replace('{{targetLanguage}}', targetLanguage);
    } catch (error) {
      // 파일을 읽을 수 없는 경우 기본 프롬프트 사용
      return `당신은 Kubernetes 문서 번역 전문가입니다. ${targetLanguage}로 번역해주세요.

## Kubernetes 공식 용어 사전
${terminologyList}
## 번역 가이드라인
${guidelinesList}`;
    }
  }

  // 다른 언어들은 간소화된 프롬프트 사용
  return `You are a professional Kubernetes documentation translator for ${guide.language}.

## Translation Principles
- Maintain technical accuracy for all Kubernetes concepts
- Use consistent terminology from the dictionary below
- Preserve code blocks, links, and markdown formatting
- Follow language-specific style guidelines

## ${guide.language} Kubernetes Terminology
${terminologyList}

## Translation Guidelines
${guidelinesList}

## Style Guide
${styleGuideList}

## Special Rules
${specialRulesList}

Please translate to ${targetLanguage} following these guidelines strictly.`;
}

/**
 * 새로운 언어 지원을 위한 템플릿 가이드를 생성합니다.
 */
export function createLanguageGuideTemplate(language: SupportedLanguage): LanguageTranslationGuide {
  return {
    language,
    terminology: {
      'Pod': `${language} translation for Pod`,
      'Service': `${language} translation for Service`,
      'Deployment': `${language} translation for Deployment`
      // Add more terms as needed
    },
    guidelines: [
      'Keep commands (kubectl, docker) in English',
      'Do not translate YAML fields (metadata, spec, status)',
      'Preserve file paths and URLs'
    ],
    styleGuide: [
      `Use formal ${language} language`,
      'Prioritize natural expression over literal translation'
    ],
    specialRules: [
      'Keep recognized technical terms in English where appropriate'
    ]
  };
}