import * as vscode from 'vscode';
import { TranslationKeys, SupportedLanguage, TranslationResource } from './types';
import { en } from './resources/en';
import { ko } from './resources/ko';
import { ja } from './resources/ja';

export class I18n {
    private currentLanguage: SupportedLanguage;
    private resources: Record<SupportedLanguage, TranslationResource> = {
        'en': en,
        'ko': ko,
        'ja': ja,
        'zh-cn': en, // TODO: Add Chinese Simplified
        'zh': en,    // TODO: Add Chinese Traditional
        'fr': en,    // TODO: Add French
        'de': en,    // TODO: Add German
        'es': en,    // TODO: Add Spanish
    };

    public constructor() {
        this.currentLanguage = this.initializeLanguage();
    }

    private initializeLanguage(): SupportedLanguage {
        const vsCodeLang = (vscode.env.language ?? 'en').toLowerCase();
        const baseLang = vsCodeLang.split('-')[0];
        
        let resolvedLanguage: SupportedLanguage = 'en';

        if (this.isSupportedLanguage(vsCodeLang)) {
            resolvedLanguage = vsCodeLang;
        } else if (this.isSupportedLanguage(baseLang)) {
            resolvedLanguage = baseLang as SupportedLanguage;
            }

        console.log('[KubeLingoAssist][I18n] VS Code language:', vscode.env.language, '→ resolved:', resolvedLanguage);
        return resolvedLanguage;
    }

    private isSupportedLanguage(lang: string): lang is SupportedLanguage {
        return Object.keys(this.resources).includes(lang);
    }

    public getCurrentLanguage(): SupportedLanguage {
        return this.currentLanguage;
    }

    public setLanguage(language: SupportedLanguage): void {
        this.currentLanguage = language;
        console.log('[KubeLingoAssist][I18n] Language manually set to:', language);
    }

    private getNestedValue(obj: any, path: string): string {
        return path.split('.').reduce((current, key) => current?.[key], obj) || path;
    }

    public t(key: string, params?: Record<string, string>): string {
        const resource = this.resources[this.currentLanguage];
        let translation = this.getNestedValue(resource, key);

        if (translation === key && this.currentLanguage !== 'en') {
            translation = this.getNestedValue(this.resources.en, key);
        }

        if (params) {
            Object.entries(params).forEach(([param, value]) => {
                translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
            });
        }
        
        return translation;
    }

    public showInformationMessage(key: string, params?: Record<string, string>, ...items: string[]): Thenable<string | undefined> {
        return vscode.window.showInformationMessage(this.t(key, params), ...items);
    }

    public showWarningMessage(key: string, params?: Record<string, string>, ...items: string[]): Thenable<string | undefined> {
        return vscode.window.showWarningMessage(this.t(key, params), ...items);
    }

    public showErrorMessage(key: string, params?: Record<string, string>, ...items: string[]): Thenable<string | undefined> {
        return vscode.window.showErrorMessage(this.t(key, params), ...items);
    }

    public showQuickPick<T extends vscode.QuickPickItem>(
        items: readonly T[] | Thenable<readonly T[]>,
        options?: vscode.QuickPickOptions & { placeholderKey?: string; placeholderParams?: Record<string, string> }
    ): Thenable<T | undefined> {
        const quickPickOptions = { ...options };
        if (options?.placeholderKey) {
            quickPickOptions.placeHolder = this.t(options.placeholderKey, options.placeholderParams);
        }
        return vscode.window.showQuickPick(items, quickPickOptions);
    }
}

import { container } from '../../core/ServiceContainer';

export function getI18n(): I18n {
    return container.getI18n();
}