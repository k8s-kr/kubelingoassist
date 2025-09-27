/**
 * 국립국어원 표준국어대사전 API를 활용한 한국어 언어 검증 서비스
 */

import * as vscode from 'vscode';
import * as https from 'https';
import { URL } from 'url';

/**
 * 표준국어대사전 API 검색 요청 파라미터
 */
export interface KoreanDictionarySearchRequest {
  /** 검색어 (필수) */
  query: string;
  /** 검색 시작 번호 (1-1000, 기본값: 1) */
  start?: number;
  /** 결과 개수 (10-100, 기본값: 10) */
  num?: number;
  /** 응답 형식 (xml/json, 기본값: xml) */
  responseType?: 'xml' | 'json';
  /** 검색 방법 (exact, include 등) */
  method?: 'exact' | 'include' | 'start' | 'end';
  /** 단어 종류 (word, phrase, idiom) */
  type1?: 'word' | 'phrase' | 'idiom';
  /** 어종 (native, chinese, foreign, mixed) */
  type2?: 'native' | 'chinese' | 'foreign' | 'mixed';
  /** 품사 */
  pos?: string;
}

/**
 * 표준국어대사전 API 검색 응답 데이터
 */
export interface KoreanDictionarySearchResponse {
  /** 전체 결과 수 */
  total: number;
  /** 검색 시작 번호 */
  start: number;
  /** 결과 개수 */
  num: number;
  /** 검색 결과 목록 */
  items: KoreanDictionaryItem[];
}

/**
 * 사전 검색 결과 항목
 */
export interface KoreanDictionaryItem {
  /** 단어 고유 코드 */
  targetCode: string;
  /** 단어 */
  word: string;
  /** 동음이의어 번호 */
  supNo?: string;
  /** 품사 */
  pos?: string;
  /** 뜻풀이 */
  definition: string;
  /** 상세 페이지 링크 */
  link: string;
  /** 어휘 유형 */
  type?: string;
}

/**
 * 한국어 용어 검증 결과
 */
export interface KoreanTermValidationResult {
  /** 원본 용어 */
  originalTerm: string;
  /** 검증 성공 여부 */
  isValid: boolean;
  /** 표준 표기 (있는 경우) */
  standardNotation?: string;
  /** 추천 표기법들 */
  suggestions: string[];
  /** 검증 근거 (표준국어대사전, 외래어 표기법 등) */
  source: 'standard_dictionary' | 'foreign_word_notation' | 'manual_check';
  /** 추가 정보 */
  details?: string;
}

/**
 * 국립국어원 표준국어대사전 API를 활용한 한국어 언어 검증 서비스
 */
export class KoreanLanguageValidator {
  private static readonly API_BASE_URL = 'https://stdict.korean.go.kr/api';
  private apiKey: string | null = null;

  /**
   * KoreanLanguageValidator 인스턴스를 생성합니다.
   *
   * @param context - VS Code 확장 프로그램 컨텍스트
   */
  constructor(private context: vscode.ExtensionContext) {
    this.loadAPIKey();
  }

  /**
   * 저장된 API 키를 로드합니다.
   */
  private async loadAPIKey(): Promise<void> {
    try {
      const key = await this.context.secrets.get('korean-dictionary-api-key');
      this.apiKey = key || null;
    } catch (error) {
      console.warn('Korean Dictionary API key not found in secrets storage');
      this.apiKey = null;
    }
  }

  /**
   * API 키를 설정하고 저장합니다.
   *
   * @param apiKey - 32자리 표준국어대사전 API 인증키
   */
  async setAPIKey(apiKey: string): Promise<void> {
    if (apiKey.length !== 32) {
      throw new Error('Korean Dictionary API key must be 32 characters long');
    }

    this.apiKey = apiKey;
    await this.context.secrets.store('korean-dictionary-api-key', apiKey);
  }

  /**
   * API 키 설정 여부를 확인합니다.
   */
  hasAPIKey(): boolean {
    const hasKey = this.apiKey !== null && this.apiKey.length === 32;
    console.log(`KoreanLanguageValidator.hasAPIKey: Korean dictionary has key: ${hasKey}`);
    return hasKey;
  }

  /**
   * 표준국어대사전에서 단어를 검색합니다.
   *
   * @param request - 검색 요청 파라미터
   * @returns 검색 결과
   */
  async searchDictionary(request: KoreanDictionarySearchRequest): Promise<KoreanDictionarySearchResponse> {
    if (!this.hasAPIKey()) {
      throw new Error('Korean Dictionary API key is not configured. Please set your API key first.');
    }

    const params = new URLSearchParams({
      key: this.apiKey!,
      q: encodeURIComponent(request.query),
      start: (request.start || 1).toString(),
      num: (request.num || 10).toString(),
      req_type: request.responseType || 'json'
    });

    // 선택적 파라미터 추가
    if (request.method) params.append('method', request.method);
    if (request.type1) params.append('type1', request.type1);
    if (request.type2) params.append('type2', request.type2);
    if (request.pos) params.append('pos', request.pos);

    try {
      const response = await this.makeHttpsRequest(`${KoreanLanguageValidator.API_BASE_URL}/search.do?${params.toString()}`);
      const data = JSON.parse(response);

      // API 응답을 표준 형식으로 변환
      return this.parseSearchResponse(data);
    } catch (error: any) {
      throw new Error(`Korean Dictionary API error: ${error.message}`);
    }
  }

  /**
   * API 응답을 표준 형식으로 파싱합니다.
   *
   * @param apiResponse - 원본 API 응답
   * @returns 파싱된 검색 결과
   */
  private parseSearchResponse(apiResponse: any): KoreanDictionarySearchResponse {
    const channel = apiResponse.channel;
    const items = channel.item || [];

    return {
      total: parseInt(channel.total) || 0,
      start: parseInt(channel.start) || 1,
      num: parseInt(channel.num) || 10,
      items: Array.isArray(items) ? items.map(this.parseSearchItem) : [this.parseSearchItem(items)]
    };
  }

  /**
   * 개별 검색 항목을 파싱합니다.
   *
   * @param item - 원본 API 응답 항목
   * @returns 파싱된 사전 항목
   */
  private parseSearchItem(item: any): KoreanDictionaryItem {
    return {
      targetCode: item.target_code || '',
      word: item.word || '',
      supNo: item.sup_no,
      pos: item.pos,
      definition: item.definition || '',
      link: item.link || '',
      type: item.type
    };
  }

  /**
   * Kubernetes 기술 용어의 한국어 표기를 검증합니다.
   *
   * @param term - 검증할 한국어 용어
   * @returns 검증 결과
   */
  async validateKoreanTerm(term: string): Promise<KoreanTermValidationResult> {
    const result: KoreanTermValidationResult = {
      originalTerm: term,
      isValid: false,
      suggestions: [],
      source: 'manual_check'
    };

    try {
      // 1. 표준국어대사전에서 정확한 일치 검색
      const exactSearch = await this.searchDictionary({
        query: term,
        method: 'exact',
        num: 5
      });

      if (exactSearch.total > 0) {
        result.isValid = true;
        result.source = 'standard_dictionary';
        result.standardNotation = exactSearch.items[0].word;
        result.details = exactSearch.items[0].definition;
        return result;
      }

      // 2. 유사 단어 검색 (포함 검색)
      const similarSearch = await this.searchDictionary({
        query: term,
        method: 'include',
        num: 10
      });

      if (similarSearch.total > 0) {
        result.suggestions = similarSearch.items
          .slice(0, 5)
          .map(item => item.word)
          .filter(word => word !== term);

        // 가장 유사한 단어가 있으면 추천
        if (result.suggestions.length > 0) {
          result.source = 'standard_dictionary';
        }
      }

      // 3. 외래어 표기법 검증을 위한 추가 로직
      if (this.isLikelyForeignWord(term)) {
        const foreignWordSuggestions = this.getForeignWordNotationSuggestions(term);
        result.suggestions.push(...foreignWordSuggestions);
        result.source = 'foreign_word_notation';
        result.details = '외래어 표기법에 따른 추천 표기입니다.';
      }

    } catch (error) {
      console.warn('Korean Dictionary API validation failed:', error);
      result.source = 'manual_check';
      result.details = 'API 검증 실패로 수동 확인이 필요합니다.';
    }

    return result;
  }

  /**
   * 외래어로 보이는 단어인지 확인합니다.
   *
   * @param term - 검사할 용어
   * @returns 외래어 가능성 여부
   */
  private isLikelyForeignWord(term: string): boolean {
    // 외래어 표기에 자주 사용되는 패턴들
    const foreignWordPatterns = [
      /[ㅋㅌㅍㅂㅅㅊㅈㄱㄷ][ㅏㅓㅗㅜㅡㅣ][ㄴㄹㅁ]?어$/, // ~어 로 끝나는 패턴
      /[ㅋㅌㅍ][ㅡㅜㅗ][ㄴㄹㅁ]?$/, // 자음군 패턴
      /라이브러리|프레임워크|인터페이스|클러스터|컨테이너/, // 자주 사용되는 IT 외래어
    ];

    return foreignWordPatterns.some(pattern => pattern.test(term));
  }

  /**
   * 외래어 표기법에 따른 표기 제안을 생성합니다.
   *
   * @param term - 원본 용어
   * @returns 제안 표기 목록
   */
  private getForeignWordNotationSuggestions(term: string): string[] {
    const suggestions: string[] = [];

    // 기본적인 외래어 표기법 규칙들
    const commonCorrections = [
      // 받침 처리
      [/ㅋ$/, 'ㄱ'],
      [/ㅌ$/, 'ㅅ'],
      [/ㅍ$/, 'ㅂ'],
      // 장음 처리
      [/ㅏㅏ/, 'ㅏ'],
      [/ㅓㅓ/, 'ㅓ'],
      [/ㅗㅗ/, 'ㅗ'],
      [/ㅜㅜ/, 'ㅜ'],
    ];

    let correctedTerm = term;
    commonCorrections.forEach(([pattern, replacement]) => {
      if (typeof pattern === 'object' && 'test' in pattern) {
        correctedTerm = correctedTerm.replace(pattern as RegExp, replacement as string);
      }
    });

    if (correctedTerm !== term) {
      suggestions.push(correctedTerm);
    }

    return suggestions;
  }

  /**
   * Kubernetes 문서 번역 시 특정 단어들의 표기를 일괄 검증합니다.
   *
   * @param terms - 검증할 용어 목록
   * @returns 검증 결과 목록
   */
  async validateMultipleTerms(terms: string[]): Promise<KoreanTermValidationResult[]> {
    const results: KoreanTermValidationResult[] = [];

    // API 호출량 제한을 고려한 배치 처리
    const batchSize = 5;
    for (let i = 0; i < terms.length; i += batchSize) {
      const batch = terms.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(term => this.validateKoreanTerm(term))
      );
      results.push(...batchResults);

      // API 호출 간격 조절 (초당 요청 수 제한 대응)
      if (i + batchSize < terms.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * 번역된 텍스트에서 잠재적 오류를 찾아 검증 제안을 제공합니다.
   *
   * @param translatedText - 번역된 한국어 텍스트
   * @returns 검증 결과 및 개선 제안
   */
  async analyzeTranslatedText(translatedText: string): Promise<{
    potentialIssues: KoreanTermValidationResult[];
    overallScore: number;
    recommendations: string[];
  }> {
    // 기술 용어로 보이는 단어들 추출
    const technicalTerms = this.extractTechnicalTerms(translatedText);
    const validationResults = await this.validateMultipleTerms(technicalTerms);

    const potentialIssues = validationResults.filter(result =>
      !result.isValid || result.suggestions.length > 0
    );

    // 전체 품질 점수 계산
    const overallScore = this.calculateQualityScore(validationResults);

    // 개선 권장 사항 생성
    const recommendations = this.generateRecommendations(validationResults);

    return {
      potentialIssues,
      overallScore,
      recommendations
    };
  }

  /**
   * 텍스트에서 기술 용어로 보이는 단어들을 추출합니다.
   *
   * @param text - 분석할 텍스트
   * @returns 추출된 기술 용어 목록
   */
  private extractTechnicalTerms(text: string): string[] {
    // Kubernetes 관련 기술 용어 패턴
    const patterns = [
      /[ㄱ-ㅎㅏ-ㅣ가-힣]+(?:클러스터|노드|파드|서비스|디플로이먼트|컨테이너|네임스페이스)/g,
      /(?:오토|다운로드|업로드|스케줄|라우팅|로드밸런서|프록시)/g,
      /[ㄱ-ㅎㅏ-ㅣ가-힣]*(?:API|HTTP|HTTPS|YAML|JSON)/g
    ];

    const terms = new Set<string>();

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => terms.add(match.trim()));
      }
    });

    return Array.from(terms).filter(term => term.length > 1);
  }

  /**
   * 검증 결과를 바탕으로 전체 품질 점수를 계산합니다.
   *
   * @param results - 검증 결과 목록
   * @returns 품질 점수 (0-100)
   */
  private calculateQualityScore(results: KoreanTermValidationResult[]): number {
    if (results.length === 0) return 100;

    const validTerms = results.filter(r => r.isValid).length;
    const baseScore = (validTerms / results.length) * 100;

    // 표준국어대사전에서 검증된 용어들에 보너스 점수
    const standardTerms = results.filter(r => r.source === 'standard_dictionary').length;
    const bonusScore = (standardTerms / results.length) * 10;

    return Math.min(100, Math.round(baseScore + bonusScore));
  }

  /**
   * 검증 결과를 바탕으로 개선 권장 사항을 생성합니다.
   *
   * @param results - 검증 결과 목록
   * @returns 권장 사항 목록
   */
  private generateRecommendations(results: KoreanTermValidationResult[]): string[] {
    const recommendations: string[] = [];

    const invalidTerms = results.filter(r => !r.isValid);
    const termsWithSuggestions = results.filter(r => r.suggestions.length > 0);

    if (invalidTerms.length > 0) {
      recommendations.push(`${invalidTerms.length}개의 용어가 표준국어대사전에서 확인되지 않았습니다. 수동 검토가 필요합니다.`);
    }

    if (termsWithSuggestions.length > 0) {
      recommendations.push(`${termsWithSuggestions.length}개의 용어에 대해 대안 표기법이 제안되었습니다.`);
    }

    const foreignWordTerms = results.filter(r => r.source === 'foreign_word_notation');
    if (foreignWordTerms.length > 0) {
      recommendations.push('외래어 표기법 검토가 필요한 용어들이 있습니다. 국립국어원 외래어 표기법을 참고하세요.');
    }

    return recommendations;
  }

  /**
   * HTTPS 요청을 보내는 헬퍼 메서드
   *
   * @param url - 요청 URL
   * @returns 응답 데이터
   *
   * @private
   */
  private makeHttpsRequest(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET'
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

      req.end();
    });
  }
}