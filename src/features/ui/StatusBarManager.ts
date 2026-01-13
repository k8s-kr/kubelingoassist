// src/status-bar.ts
import * as vscode from 'vscode';
import { TranslationUtils } from '../translation/TranslationUtils';
import { i18n } from '../i18n';

const STATUS_BAR_PRIORITY = 99;

export class StatusBarManager {
  private languageStatusBarItem: vscode.StatusBarItem;
  private currentOriginalPath?: string;
  private currentTranslationPath?: string;
  private updateTimeout?: NodeJS.Timeout;
  private translationUtils = new TranslationUtils();

  constructor() {
    this.languageStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, STATUS_BAR_PRIORITY);
    this.languageStatusBarItem.command = 'kubelingoassist.openTranslationFile';
    this.languageStatusBarItem.text = `$(globe) ${i18n.t('ui.statusBar.translationFile')}`;
    this.languageStatusBarItem.tooltip = i18n.t('ui.statusBar.openTranslationFile');
    this.languageStatusBarItem.show();
  }

  public async updateAllStatusBarItems(originalPath?: string, translationPath?: string) {
    if (originalPath && translationPath) {
      this.currentOriginalPath = originalPath;
      this.currentTranslationPath = translationPath;

      const sourceLanguage = this.translationUtils.extractLanguageCode(originalPath);
      const targetLanguage = this.translationUtils.extractLanguageCode(translationPath);

      const lineComparison = await this.translationUtils.compareLineCounts(originalPath, translationPath);
      let lineInfo = '';

      if (lineComparison) {
        if (lineComparison.isEqual) lineInfo = ' ✓';
        else lineInfo = ` (${lineComparison.percentage}%)`;
      }

      this.languageStatusBarItem.text = `$(globe) ${sourceLanguage} → ${targetLanguage}${lineInfo}`;
      this.languageStatusBarItem.tooltip = lineComparison
        ? i18n.t('ui.statusBar.lineComparison', {
            originalLines: lineComparison.originalLines.toString(),
            translationLines: lineComparison.translationLines.toString(),
            percentage: lineComparison.percentage.toString()
          })
        : i18n.t('ui.statusBar.openTranslationFile');
    } else {
      this.languageStatusBarItem.text = `$(globe) ${i18n.t('ui.statusBar.translationFile')}`;
      this.languageStatusBarItem.tooltip = i18n.t('ui.statusBar.openTranslationFile');
    }
  }

  /**
   * Auto refresh line count for currently open files
   */
  public async refreshLineCount() {
    if (this.currentOriginalPath && this.currentTranslationPath) {
      await this.updateAllStatusBarItems(this.currentOriginalPath, this.currentTranslationPath);
    }
  }

  /**
   * Debounced line count update to prevent too frequent calls on document changes
   */
  public debouncedRefreshLineCount(delay: number = 1000) {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    this.updateTimeout = setTimeout(async () => {
      await this.refreshLineCount();
    }, delay);
  }


  public dispose() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.languageStatusBarItem.dispose();
  }

  public getItems(): vscode.StatusBarItem[] {
    return [this.languageStatusBarItem];
  }
}
