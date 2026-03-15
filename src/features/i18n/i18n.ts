import * as vscode from 'vscode';
import { SupportedLanguage, TranslationResource } from './types';
import { en } from './resources/en';
import { ko } from './resources/ko';
import { ja } from './resources/ja';

/**
 * 다국어 지원을 위한 국제화(i18n) 클래스입니다.
 */
export class I18n {
  private static instance: I18n;
  private currentLanguage: SupportedLanguage;
  private resources: Record<SupportedLanguage, TranslationResource> = {
    en: en,
    ko: ko,
    ja: ja,
    'zh-cn': en, // TODO: Add Chinese Simplified
    zh: en, // TODO: Add Chinese Traditional
    fr: en, // TODO: Add French
    de: en, // TODO: Add German
    es: en, // TODO: Add Spanish
  };

  private constructor() {
    this.currentLanguage = this.initializeLanguage();
  }

  /**
   * I18n 클래스의 싱글톤 인스턴스를 반환합니다.
   */
  public static getInstance(): I18n {
    if (!I18n.instance) {
      I18n.instance = new I18n();
    }
    return I18n.instance;
  }

  /**
   * VS Code 설정에서 언어를 초기화합니다.
   */
  private initializeLanguage(): SupportedLanguage {
    const vsCodeLang = (vscode.env.language ?? 'en').toLowerCase();
    const baseLang = vsCodeLang.split('-')[0];

    let resolvedLanguage: SupportedLanguage = 'en';

    if (this.isSupportedLanguage(vsCodeLang)) {
      resolvedLanguage = vsCodeLang;
    } else if (this.isSupportedLanguage(baseLang)) {
      resolvedLanguage = baseLang as SupportedLanguage;
    }

    console.log(
      '[KubeLingoAssist][I18n] VS Code language:',
      vscode.env.language,
      '→ resolved:',
      resolvedLanguage
    );
    return resolvedLanguage;
  }

  /**
   * 주어진 언어 코드가 지원되는지 확인합니다.
   */
  private isSupportedLanguage(lang: string): lang is SupportedLanguage {
    return Object.keys(this.resources).includes(lang);
  }

  /**
   * 현재 언어를 반환합니다.
   */
  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * 언어를 변경합니다.
   */
  public setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
    console.log('[KubeLingoAssist][I18n] Language manually set to:', language);
  }

  /**
   * 중첩된 객체에서 키를 사용해 값을 가져옵니다.
   */
  private getNestedValue(obj: TranslationResource, path: string): string {
    return (
      path.split('.').reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any, key: string) => current?.[key],
        obj as unknown as Record<string, unknown>
      ) || path
    );
  }

  /**
   * 번역 키에 해당하는 번역된 문자열을 반환합니다.
   *
   * @param key - 번역 키 (예: 'common.ok', 'messages.kubelingoDisabled')
   * @param params - 템플릿 매개변수 (예: { filename: 'test.md' })
   * @returns 번역된 문자열
   */
  public t(key: string, params?: Record<string, string>): string {
    const resource = this.resources[this.currentLanguage];
    let translation = this.getNestedValue(resource, key);

    // 번역을 찾을 수 없으면 영어를 fallback으로 사용
    if (translation === key && this.currentLanguage !== 'en') {
      translation = this.getNestedValue(this.resources.en, key);
    }

    // 매개변수 치환
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
      });
    }

    return translation;
  }

  /**
   * 메시지 표시 시 국제화된 텍스트를 사용합니다.
   */
  public showInformationMessage(
    key: string,
    params?: Record<string, string>,
    ...items: string[]
  ): Thenable<string | undefined> {
    return vscode.window.showInformationMessage(this.t(key, params), ...items);
  }

  /**
   * 경고 메시지 표시 시 국제화된 텍스트를 사용합니다.
   */
  public showWarningMessage(
    key: string,
    params?: Record<string, string>,
    ...items: string[]
  ): Thenable<string | undefined> {
    return vscode.window.showWarningMessage(this.t(key, params), ...items);
  }

  /**
   * 오류 메시지 표시 시 국제화된 텍스트를 사용합니다.
   */
  public showErrorMessage(
    key: string,
    params?: Record<string, string>,
    ...items: string[]
  ): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(this.t(key, params), ...items);
  }

  /**
   * Quick Pick 표시 시 국제화된 텍스트를 사용합니다.
   */
  public showQuickPick<T extends vscode.QuickPickItem>(
    items: readonly T[] | Thenable<readonly T[]>,
    options?: vscode.QuickPickOptions & {
      placeholderKey?: string;
      placeholderParams?: Record<string, string>;
    }
  ): Thenable<T | undefined> {
    const quickPickOptions = { ...options };
    if (options?.placeholderKey) {
      quickPickOptions.placeHolder = this.t(options.placeholderKey, options.placeholderParams);
    }
    return vscode.window.showQuickPick(items, quickPickOptions);
  }
}

// 전역 인스턴스 export
export const i18n = I18n.getInstance();
