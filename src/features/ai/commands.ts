/**
 * VS Code 확장 명령어 정의 - AI 번역 및 한국어 검증 기능
 */

import * as vscode from 'vscode';
import { AIService } from './ai-service';

/**
 * AI 번역 관련 VS Code 명령어를 등록하고 관리합니다.
 */
export class AITranslationCommands {
  private aiService: AIService;

  constructor(private context: vscode.ExtensionContext) {
    this.aiService = new AIService(context);
    this.registerCommands();
  }

  /**
   * 모든 AI 번역 관련 명령어를 등록합니다.
   */
  private registerCommands(): void {
    // 선택된 텍스트를 한국어로 번역
    const translateToKoreanCommand = vscode.commands.registerCommand(
      'k8sTranslationHelper.translateToKorean',
      () => this.translateSelectedText('Korean')
    );

    // 선택된 텍스트를 다른 언어로 번역 (언어 선택 프롬프트)
    const translateToLanguageCommand = vscode.commands.registerCommand(
      'k8sTranslationHelper.translateToLanguage',
      () => this.translateWithLanguageSelection()
    );

    // 한국어 용어 검증
    const validateKoreanTermCommand = vscode.commands.registerCommand(
      'k8sTranslationHelper.validateKoreanTerm',
      () => this.validateSelectedKoreanTerm()
    );

    // 한국어 사전 API 키 설정
    const setKoreanDictionaryKeyCommand = vscode.commands.registerCommand(
      'k8sTranslationHelper.setKoreanDictionaryAPIKey',
      () => this.setKoreanDictionaryAPIKey()
    );

    // API 키 상태 확인
    const checkAPIStatusCommand = vscode.commands.registerCommand(
      'k8sTranslationHelper.checkAPIStatus',
      () => this.showAPIKeyStatus()
    );

    // 번역 품질 분석
    const analyzeTranslationQualityCommand = vscode.commands.registerCommand(
      'k8sTranslationHelper.analyzeTranslationQuality',
      () => this.analyzeTranslationQuality()
    );

    // 명령어를 컨텍스트에 등록
    this.context.subscriptions.push(
      translateToKoreanCommand,
      translateToLanguageCommand,
      validateKoreanTermCommand,
      setKoreanDictionaryKeyCommand,
      checkAPIStatusCommand,
      analyzeTranslationQualityCommand
    );
  }

  /**
   * 선택된 텍스트를 지정된 언어로 번역합니다.
   */
  private async translateSelectedText(targetLanguage: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('활성화된 에디터가 없습니다.');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText.trim()) {
      vscode.window.showErrorMessage('번역할 텍스트를 선택해주세요.');
      return;
    }

    try {
      // 진행 상태 표시
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `${targetLanguage}로 번역 중...`,
          cancellable: false,
        },
        async () => {
          return await this.aiService.translateText({
            sourceText: selectedText,
            targetLanguage,
            context: 'Kubernetes documentation'
          });
        }
      );

      // 번역 결과를 새로운 에디터에 표시
      await this.showTranslationResult(result, selectedText, targetLanguage);

    } catch (error) {
      vscode.window.showErrorMessage(`번역 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 언어 선택 후 번역을 수행합니다.
   */
  private async translateWithLanguageSelection(): Promise<void> {
    const languageOptions = [
      { label: '한국어 (Korean)', value: 'Korean' },
      { label: '영어 (English)', value: 'English' },
      { label: '일본어 (Japanese)', value: 'Japanese' },
      { label: '중국어 (Chinese)', value: 'Chinese' }
    ];

    const selectedLanguage = await vscode.window.showQuickPick(
      languageOptions,
      {
        placeHolder: '번역할 언어를 선택하세요',
        matchOnDescription: true
      }
    );

    if (selectedLanguage) {
      await this.translateSelectedText(selectedLanguage.value);
    }
  }

  /**
   * 선택된 한국어 용어를 검증합니다.
   */
  private async validateSelectedKoreanTerm(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('활성화된 에디터가 없습니다.');
      return;
    }

    const selection = editor.selection;
    let selectedText = editor.document.getText(selection).trim();

    if (!selectedText) {
      // 선택된 텍스트가 없으면 사용자 입력 받기
      const inputText = await vscode.window.showInputBox({
        prompt: '검증할 한국어 용어를 입력하세요',
        placeHolder: '예: 컨테이너, 클러스터, 파드'
      });

      if (!inputText) {
        return;
      }
      selectedText = inputText.trim();
    }

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: '한국어 용어 검증 중...',
          cancellable: false,
        },
        async () => {
          return await this.aiService.validateKoreanTerm(selectedText);
        }
      );

      await this.showValidationResult(result);

    } catch (error) {
      vscode.window.showErrorMessage(`용어 검증 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 한국어 사전 API 키를 설정합니다.
   */
  private async setKoreanDictionaryAPIKey(): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
      prompt: '국립국어원 표준국어대사전 API 키를 입력하세요',
      placeHolder: '32자리 API 키',
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) {
          return 'API 키를 입력해주세요.';
        }
        if (value.length !== 32) {
          return 'API 키는 32자리여야 합니다.';
        }
        return null;
      }
    });

    if (!apiKey) {
      return;
    }

    try {
      await this.aiService.setKoreanDictionaryAPIKey(apiKey);
      vscode.window.showInformationMessage('한국어 사전 API 키가 성공적으로 설정되었습니다.');
    } catch (error) {
      vscode.window.showErrorMessage(`API 키 설정 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 모든 API 키의 설정 상태를 표시합니다.
   */
  private async showAPIKeyStatus(): Promise<void> {
    try {
      const status = await this.aiService.checkAPIKeyStatus();

      const statusItems: string[] = [];
      statusItems.push(`OpenAI: ${status.openai ? '✅ 설정됨' : '❌ 미설정'}`);
      statusItems.push(`Claude: ${status.claude ? '✅ 설정됨' : '❌ 미설정'}`);
      statusItems.push(`Gemini: ${status.gemini ? '✅ 설정됨' : '❌ 미설정'}`);
      statusItems.push(`한국어 사전: ${status.koreanDictionary ? '✅ 설정됨' : '❌ 미설정'}`);

      const statusMessage = `API 키 설정 상태:\n\n${statusItems.join('\n')}`;

      await vscode.window.showInformationMessage(statusMessage, { modal: true });

    } catch (error) {
      vscode.window.showErrorMessage(`API 키 상태 확인 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 번역된 텍스트의 품질을 분석합니다.
   */
  private async analyzeTranslationQuality(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('활성화된 에디터가 없습니다.');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText.trim()) {
      vscode.window.showErrorMessage('분석할 한국어 텍스트를 선택해주세요.');
      return;
    }

    try {
      // KoreanLanguageValidator 인스턴스를 직접 사용
      const validator = new (await import('./korean-language-validator')).KoreanLanguageValidator(this.context);

      if (!validator.hasAPIKey()) {
        const setKey = await vscode.window.showWarningMessage(
          '한국어 사전 API 키가 설정되지 않았습니다. 지금 설정하시겠습니까?',
          '설정하기',
          '취소'
        );

        if (setKey === '설정하기') {
          await this.setKoreanDictionaryAPIKey();
          return;
        } else {
          return;
        }
      }

      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: '번역 품질 분석 중...',
          cancellable: false,
        },
        async () => {
          return await validator.analyzeTranslatedText(selectedText);
        }
      );

      await this.showQualityAnalysisResult(result);

    } catch (error) {
      vscode.window.showErrorMessage(`품질 분석 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 번역 결과를 새로운 문서에 표시합니다.
   */
  private async showTranslationResult(
    result: any,
    originalText: string,
    targetLanguage: string
  ): Promise<void> {
    let content = `# Kubernetes 문서 번역 결과\n\n`;
    content += `**원본 텍스트:**\n${originalText}\n\n`;
    content += `**번역 언어:** ${targetLanguage}\n\n`;
    content += `**번역 결과:**\n${result.translatedText}\n\n`;

    if (result.confidence) {
      content += `**신뢰도:** ${(result.confidence * 100).toFixed(1)}%\n\n`;
    }

    if (result.suggestions && result.suggestions.length > 0) {
      content += `**대안 번역:**\n`;
      result.suggestions.forEach((suggestion: string, index: number) => {
        content += `${index + 1}. ${suggestion}\n`;
      });
      content += '\n';
    }

    // 한국어 검증 결과 추가
    if (result.validationResult) {
      content += `## 한국어 용어 검증 결과\n\n`;
      content += `**전체 품질 점수:** ${result.validationResult.overallScore}/100\n\n`;

      if (result.validationResult.potentialIssues.length > 0) {
        content += `**주의가 필요한 용어들:**\n`;
        result.validationResult.potentialIssues.forEach((issue: any) => {
          content += `- **${issue.originalTerm}**`;
          if (issue.suggestions.length > 0) {
            content += ` → 추천: ${issue.suggestions.join(', ')}`;
          }
          if (issue.details) {
            content += ` (${issue.details})`;
          }
          content += '\n';
        });
        content += '\n';
      }

      if (result.validationResult.recommendations.length > 0) {
        content += `**개선 권장사항:**\n`;
        result.validationResult.recommendations.forEach((rec: string) => {
          content += `- ${rec}\n`;
        });
        content += '\n';
      }
    }

    // 새 문서 생성 및 표시
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
  }

  /**
   * 용어 검증 결과를 표시합니다.
   */
  private async showValidationResult(result: any): Promise<void> {
    let message = `용어 검증 결과: "${result.originalTerm}"\n\n`;

    if (result.isValid) {
      message += '✅ 표준국어대사전에서 확인된 용어입니다.';
      if (result.standardNotation) {
        message += `\n표준 표기: ${result.standardNotation}`;
      }
    } else {
      message += '⚠️ 표준국어대사전에서 확인되지 않는 용어입니다.';
    }

    if (result.suggestions.length > 0) {
      message += `\n\n추천 표기:\n${result.suggestions.join('\n')}`;
    }

    if (result.details) {
      message += `\n\n세부 정보:\n${result.details}`;
    }

    message += `\n\n검증 근거: ${this.getSourceDescription(result.source)}`;

    await vscode.window.showInformationMessage(message, { modal: true });
  }

  /**
   * 품질 분석 결과를 표시합니다.
   */
  private async showQualityAnalysisResult(result: any): Promise<void> {
    let content = `# 한국어 번역 품질 분석 결과\n\n`;
    content += `**전체 품질 점수:** ${result.overallScore}/100\n\n`;

    if (result.potentialIssues.length > 0) {
      content += `## 🔍 검토가 필요한 용어들\n\n`;
      result.potentialIssues.forEach((issue: any, index: number) => {
        content += `### ${index + 1}. ${issue.originalTerm}\n`;
        content += `- **상태:** ${issue.isValid ? '✅ 검증됨' : '⚠️ 미검증'}\n`;
        if (issue.standardNotation) {
          content += `- **표준 표기:** ${issue.standardNotation}\n`;
        }
        if (issue.suggestions.length > 0) {
          content += `- **추천 표기:** ${issue.suggestions.join(', ')}\n`;
        }
        content += `- **근거:** ${this.getSourceDescription(issue.source)}\n`;
        if (issue.details) {
          content += `- **세부 정보:** ${issue.details}\n`;
        }
        content += '\n';
      });
    } else {
      content += '✅ 모든 용어가 적절하게 번역되었습니다.\n\n';
    }

    if (result.recommendations.length > 0) {
      content += `## 💡 개선 권장사항\n\n`;
      result.recommendations.forEach((rec: string, index: number) => {
        content += `${index + 1}. ${rec}\n`;
      });
      content += '\n';
    }

    // 새 문서 생성 및 표시
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
  }

  /**
   * 검증 근거 소스를 한국어로 변환합니다.
   */
  private getSourceDescription(source: string): string {
    switch (source) {
      case 'standard_dictionary':
        return '표준국어대사전';
      case 'foreign_word_notation':
        return '외래어 표기법';
      case 'manual_check':
        return '수동 검토 필요';
      default:
        return '알 수 없음';
    }
  }
}