import * as vscode from 'vscode';
import * as https from 'https';
import { URL } from 'url';
import { ConfigManager, AIConfig } from './config';
import { createKubernetesTranslationPrompt } from './prompts/kubernetes-prompts';
import { KoreanLanguageValidator, KoreanTermValidationResult } from './korean-language-validator';

/**
 * AI 번역 요청을 위한 인터페이스입니다.
 */
export interface AITranslationRequest {
  /** 번역할 원본 텍스트 */
  sourceText: string;
  /** 번역 대상 언어 (예: 'Korean', 'Japanese') */
  targetLanguage: string;
  /** 번역에 도움이 되는 추가 컨텍스트 정보 (선택사항) */
  context?: string;
}

/**
 * AI 번역 응답을 위한 인터페이스입니다.
 */
export interface AITranslationResponse {
  /** 번역된 텍스트 */
  translatedText: string;
  /** 번역의 신뢰도 (0-1 범위, 선택사항) */
  confidence?: number;
  /** 대안 번역 제안들 (선택사항) */
  suggestions?: string[];
  /** 한국어 언어 검증 결과 (한국어 번역시에만) */
  validationResult?: {
    potentialIssues: KoreanTermValidationResult[];
    overallScore: number;
    recommendations: string[];
  };
}

/**
 * 다양한 AI 제공업체를 통한 번역 서비스를 관리하는 클래스입니다.
 * OpenAI GPT, Anthropic Claude, Google Gemini를 지원합니다.
 */
export class AIService {
  private configManager: ConfigManager;
  private koreanValidator: KoreanLanguageValidator;

  /**
   * AIService 인스턴스를 생성합니다.
   *
   * @param context - VS Code 확장 프로그램 컨텍스트
   */
  constructor(private context: vscode.ExtensionContext) {
    this.configManager = new ConfigManager(context);
    this.koreanValidator = new KoreanLanguageValidator(context);
  }

  /**
   * 구성된 AI 제공업체를 사용하여 텍스트를 번역합니다.
   * 설정에 따라 OpenAI, Claude, 또는 Gemini를 자동으로 선택합니다.
   * 한국어 번역시 국립국어원 API를 통한 검증을 추가로 수행합니다.
   *
   * @param request - 번역 요청 정보
   * @returns 번역 결과를 포함한 응답 객체
   *
   * @throws API 키가 설정되지 않은 경우
   * @throws 지원하지 않는 AI 제공업체인 경우
   * @throws API 호출 실패시
   *
   * @example
   * ```typescript
   * const response = await aiService.translateText({
   *   sourceText: 'Hello, world!',
   *   targetLanguage: 'Korean',
   *   context: 'Kubernetes documentation greeting'
   * });
   * console.log(response.translatedText); // '안녕하세요, 세계!'
   * console.log(response.validationResult?.overallScore); // 85
   * ```
   */
  async translateText(request: AITranslationRequest): Promise<AITranslationResponse> {
    const config = this.configManager.getAIConfig();
    const apiKey = await this.configManager.getAPIKey(config.provider);

    if (!apiKey) {
      throw new Error(`API key not found for ${config.provider}. Please configure your API key first.`);
    }

    let response: AITranslationResponse;

    switch (config.provider) {
      case 'openai':
        response = await this.translateWithOpenAI(request, config, apiKey);
        break;
      case 'claude':
        response = await this.translateWithClaude(request, config, apiKey);
        break;
      case 'gemini':
        response = await this.translateWithGemini(request, config, apiKey);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }

    // 한국어 번역인 경우 추가 검증 수행
    if (request.targetLanguage.toLowerCase() === 'korean' && this.koreanValidator.hasAPIKey()) {
      try {
        const validationResult = await this.koreanValidator.analyzeTranslatedText(response.translatedText);
        response.validationResult = validationResult;

        // 검증 결과를 바탕으로 신뢰도 조정
        if (response.confidence) {
          const validationScore = validationResult.overallScore / 100;
          response.confidence = (response.confidence + validationScore) / 2;
        }
      } catch (error) {
        console.warn('Korean language validation failed:', error);
        // 검증 실패시에도 번역 결과는 반환
      }
    }

    return response;
  }

  /**
   * OpenAI GPT API를 사용하여 텍스트를 번역합니다.
   * 
   * @param request - 번역 요청 정보
   * @param config - AI 설정 정보
   * @param apiKey - OpenAI API 키
   * @returns OpenAI API를 통한 번역 결과
   * 
   * @throws OpenAI API 호출 실패시 HTTP 에러
   * 
   * @private
   */
  private async translateWithOpenAI(
    request: AITranslationRequest,
    config: AIConfig,
    apiKey: string
  ): Promise<AITranslationResponse> {
    try {
      const postData = JSON.stringify({
        model: config.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: createKubernetesTranslationPrompt(request.targetLanguage)
          },
          {
            role: 'user',
            content: request.context ?
              `Context: ${request.context}\n\nText to translate: ${request.sourceText}` :
              request.sourceText
          }
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature
      });

      const response = await this.makeHttpsRequest(
        config.baseUrl || 'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        },
        postData
      );

      const data = JSON.parse(response);
      return {
        translatedText: data.choices[0].message.content,
        confidence: 0.95
      };
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Anthropic Claude API를 사용하여 텍스트를 번역합니다.
   * 
   * @param request - 번역 요청 정보
   * @param config - AI 설정 정보
   * @param apiKey - Claude API 키
   * @returns Claude API를 통한 번역 결과
   * 
   * @throws Claude API 호출 실패시 HTTP 에러
   * 
   * @private
   */
  private async translateWithClaude(
    request: AITranslationRequest,
    config: AIConfig,
    apiKey: string
  ): Promise<AITranslationResponse> {
    try {
      const postData = JSON.stringify({
        model: config.model || 'claude-3-sonnet-20240229',
        max_tokens: config.maxTokens,
        messages: [
          {
            role: 'user',
            content: createKubernetesTranslationPrompt(request.targetLanguage) + `

${request.context ? `Context: ${request.context}\n\n` : ''}Text to translate: ${request.sourceText}`
          }
        ]
      });

      const response = await this.makeHttpsRequest(
        config.baseUrl || 'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(postData)
          }
        },
        postData
      );

      const data = JSON.parse(response);
      return {
        translatedText: data.content[0].text,
        confidence: 0.95
      };
    } catch (error: any) {
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  /**
   * Google Gemini API를 사용하여 텍스트를 번역합니다.
   * 
   * @param request - 번역 요청 정보
   * @param config - AI 설정 정보
   * @param apiKey - Gemini API 키
   * @returns Gemini API를 통한 번역 결과
   * 
   * @throws Gemini API 호출 실패시 HTTP 에러
   * 
   * @private
   */
  private async translateWithGemini(
    request: AITranslationRequest,
    config: AIConfig,
    apiKey: string
  ): Promise<AITranslationResponse> {
    try {
      const postData = JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: createKubernetesTranslationPrompt(request.targetLanguage) + `

${request.context ? `Context: ${request.context}\n\n` : ''}Text to translate: ${request.sourceText}`
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: config.maxTokens,
          temperature: config.temperature
        }
      });

      const response = await this.makeHttpsRequest(
        `${config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models'}/${config.model || 'gemini-pro'}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        },
        postData
      );

      const data = JSON.parse(response);
      return {
        translatedText: data.candidates[0].content.parts[0].text,
        confidence: 0.95
      };
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  /**
   * 현재 AI 설정 정보를 가져옵니다.
   *
   * @returns AI 설정 객체
   */
  async getConfig(): Promise<AIConfig> {
    return this.configManager.getAIConfig();
  }

  /**
   * 모든 지원되는 AI 제공업체와 한국어 검증 API의 키 설정 상태를 확인합니다.
   *
   * @returns 각 제공업체별 API 키 설정 여부를 나타내는 객체
   *
   * @example
   * ```typescript
   * const status = await aiService.checkAPIKeyStatus();
   * // Returns: { openai: true, claude: false, gemini: true, koreanDictionary: false }
   *
   * if (status.openai) {
   *   console.log('OpenAI API 키가 설정되어 있습니다.');
   * }
   * ```
   */
  async checkAPIKeyStatus(): Promise<{ [provider: string]: boolean }> {
    console.log('AIService.checkAPIKeyStatus: Starting status check...');

    try {
      const result = {
        openai: await this.configManager.hasAPIKey('openai'),
        claude: await this.configManager.hasAPIKey('claude'),
        gemini: await this.configManager.hasAPIKey('gemini'),
        koreanDictionary: this.koreanValidator.hasAPIKey()
      };

      console.log('AIService.checkAPIKeyStatus: Status check completed:', result);
      return result;
    } catch (error) {
      console.error('AIService.checkAPIKeyStatus: Error during status check:', error);
      throw error;
    }
  }

  /**
   * 한국어 검증 서비스에 API 키를 설정합니다.
   *
   * @param apiKey - 32자리 표준국어대사전 API 인증키
   * @throws API 키가 유효하지 않은 경우
   *
   * @example
   * ```typescript
   * await aiService.setKoreanDictionaryAPIKey('your-32-character-api-key-here');
   * console.log('Korean Dictionary API key has been set successfully.');
   * ```
   */
  async setKoreanDictionaryAPIKey(apiKey: string): Promise<void> {
    return this.koreanValidator.setAPIKey(apiKey);
  }

  /**
   * 한국어 용어를 개별적으로 검증합니다.
   *
   * @param term - 검증할 한국어 용어
   * @returns 검증 결과
   *
   * @example
   * ```typescript
   * const result = await aiService.validateKoreanTerm('컨테이너');
   * if (result.isValid) {
   *   console.log(`"${result.originalTerm}"은(는) 표준 용어입니다.`);
   * } else {
   *   console.log(`추천 표기: ${result.suggestions.join(', ')}`);
   * }
   * ```
   */
  async validateKoreanTerm(term: string): Promise<KoreanTermValidationResult> {
    if (!this.koreanValidator.hasAPIKey()) {
      throw new Error('Korean Dictionary API key is not configured. Please set your API key first.');
    }
    return this.koreanValidator.validateKoreanTerm(term);
  }

  /**
   * HTTPS 요청을 보내는 헬퍼 메서드
   *
   * @param url - 요청 URL
   * @param options - 요청 옵션
   * @param postData - POST 데이터 (선택사항)
   * @returns 응답 데이터
   *
   * @private
   */
  private makeHttpsRequest(url: string, options: any, postData?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (postData) {
        req.write(postData);
      }

      req.end();
    });
  }
}