import { TranslationResource, SupportedLanguage } from '@shared-i18n/types';
import { en } from '@shared-i18n/resources/en';
import { ko } from '@shared-i18n/resources/ko';
import { ja } from '@shared-i18n/resources/ja';

const sharedResources: Record<SupportedLanguage, TranslationResource> = {
  en,
  ko,
  ja,
  'zh-cn': en,
  'zh': en,
  'fr': en,
  'de': en,
  'es': en,
};

class UIi18n {
  private currentLanguage: SupportedLanguage = 'en';
  private resources: Record<SupportedLanguage, TranslationResource> = sharedResources;

  private constructor() {
    this.initializeLanguage();
  }

  private static instance: UIi18n;

  public static getInstance(): UIi18n {
    if (!UIi18n.instance) {
      UIi18n.instance = new UIi18n();
    }
    return UIi18n.instance;
  }

  private initializeLanguage(): void {
    const browserLang = (navigator.language ?? 'en').toLowerCase();
    const baseLang = browserLang.split('-')[0];

    if (this.isSupportedLanguage(browserLang)) {
      this.currentLanguage = browserLang;
    } else if (this.isSupportedLanguage(baseLang)) {
      this.currentLanguage = baseLang as SupportedLanguage;
    }
  }

  private isSupportedLanguage(lang: string): lang is SupportedLanguage {
    return Object.prototype.hasOwnProperty.call(this.resources, lang);
  }

  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
  }

  private getNestedValue(obj: any, path: string): string {
    return path.split('.').reduce((current, key) => current?.[key], obj) || path;
  }

  public t(key: string): string {
    const resource = this.resources[this.currentLanguage];
    let translation = this.getNestedValue(resource, key);
    
    // Fallback to English if translation not found
    if (translation === key && this.currentLanguage !== 'en') {
      translation = this.getNestedValue(this.resources.en, key);
    }
    
    return translation;
  }
}

export const uiI18n = UIi18n.getInstance();