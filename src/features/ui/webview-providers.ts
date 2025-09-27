// src/webview-providers.ts
import * as vscode from 'vscode';
import { notificationManager } from '../notifications';
import { AIService } from '../ai/ai-service';
import { IntentClassifier } from '../ai/intent-classifier';
import { ResponseGenerator } from '../ai/response-generator';
import { AIIntentClassifier } from '../ai/ai-intent-classifier';

// Types and Interfaces
interface WebviewMessage {
  type: string;
  payload?: any;
  mode?: 'translation' | 'review';
}

interface WebviewState {
  syncScrollEnabled: boolean;
  kubelingoEnabled: boolean;
  mode: 'translation' | 'review';
}

interface WebviewConfig {
  VIEW_TYPE: string;
  UI_DIST_PATH: string[];
  COMMANDS: {
    OPEN_TRANSLATION_FILE: string;
    OPEN_REVIEW_FILE: string;
    TOGGLE_SYNC_SCROLL: string;
    TOGGLE_KUBELINGO: string;
    CHANGE_MODE: string;
  };
  FILES: {
    MAIN_JS: string;
    MAIN_CSS: string;
  };
}

// Configuration Constants
const WEBVIEW_CONFIG: WebviewConfig = {
  VIEW_TYPE: 'kubelingoassist-view',
  UI_DIST_PATH: ['ui', 'dist'],
  COMMANDS: {
    OPEN_TRANSLATION_FILE: 'kubelingoassist.openTranslationFile',
    OPEN_REVIEW_FILE: 'kubelingoassist.openReviewFile',
    TOGGLE_SYNC_SCROLL: 'kubelingoassist.toggleSyncScroll',
    TOGGLE_KUBELINGO: 'kubelingoassist.toggleKubelingo',
    CHANGE_MODE: 'kubelingoassist.changeMode',
  },
  FILES: {
    MAIN_JS: 'main.js',
    MAIN_CSS: 'main.css',
  },
};

/**
 * React Webview 호스트 (React가 렌더/상태 관리, 여긴 번들 로드 + 브리지)
 */
export class TranslationViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = WEBVIEW_CONFIG.VIEW_TYPE;
  private readonly views = new Set<vscode.WebviewView>();
  private state: WebviewState = {
    syncScrollEnabled: false,
    kubelingoEnabled: false,
    mode: 'translation',
  };
  private aiService: AIService;
  private intentClassifier: IntentClassifier;
  private aiIntentClassifier: AIIntentClassifier;
  private responseGenerator: ResponseGenerator;

  constructor(private readonly _extensionUri: vscode.Uri, private readonly context: vscode.ExtensionContext) {
    this.aiService = new AIService(context);
    this.intentClassifier = new IntentClassifier();
    this.aiIntentClassifier = new AIIntentClassifier(this.aiService);
    this.responseGenerator = new ResponseGenerator();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this.views.add(webviewView);
    webviewView.onDidDispose(() => this.views.delete(webviewView));
    
    // 패널 표시 상태 변경 감지
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // 패널이 다시 열렸을 때 현재 상태로 동기화
        this._broadcast();
      }
    });

    const webview = webviewView.webview;

    // ✅ 모듈 번들과 동적 chunk(assets/* 포함) 접근을 위해 dist 를 루트로 허용
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, ...WEBVIEW_CONFIG.UI_DIST_PATH)],
    };

    // 최초 1회만 HTML 주입
    webview.html = this._getHtml(webview, this.state);

    // UI → 확장 브리지
    webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
      this._handleWebviewMessage(msg);
    });

    // 초기 상태 방송(로딩 타이밍 커버)
    this._broadcast();
  }

  public setSyncScrollEnabled(enabled: boolean) {
    this._updateState({ syncScrollEnabled: enabled });
  }

  public setKubelingoEnabled(enabled: boolean) {
    this._updateState({ kubelingoEnabled: enabled });
  }

  public setMode(mode: 'translation' | 'review') {
    this._updateState({ mode });
  }

  public broadcastState(partialState: Partial<WebviewState>) {
    this._updateState(partialState);
  }

  private _updateState(partialState: Partial<WebviewState>) {
    this.state = { ...this.state, ...partialState };
    this._broadcast();
  }

  private _broadcast() {
    try {
      for (const view of this.views) {
        if (view.visible) {
          view.webview.postMessage({ type: 'stateUpdate', payload: this.state });
        }
      }
    } catch (error) {
      console.error('Failed to broadcast state:', error);
    }
  }

  private async _handleWebviewMessage(msg: WebviewMessage) {
    try {
      console.log('Webview received message:', msg?.type, msg);

      const messageHandlers: { [key: string]: () => void | Promise<void> } = {
        openTranslationFile: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.OPEN_TRANSLATION_FILE),
        openReviewFile: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.OPEN_REVIEW_FILE),
        toggleSyncScroll: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.TOGGLE_SYNC_SCROLL),
        toggleKubelingo: () => {
          console.log('Executing toggleKubelingo command');
          this._executeCommand(WEBVIEW_CONFIG.COMMANDS.TOGGLE_KUBELINGO);
        },
        changeMode: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.CHANGE_MODE, msg.mode),
        aiChat: () => {
          const message = msg?.payload?.message ?? '';
          notificationManager.showInfo('notifications.info.aiChatMessage', { message });
        },
        aiTranslationRequest: () => this._handleAITranslationRequest(msg.payload),
        getAIConfig: () => this._handleGetAIConfig(),
        updateAIConfig: () => this._handleUpdateAIConfig(msg.payload),
        configureAPIKey: () => this._handleConfigureAPIKey(msg.payload),
        showAPIKeyStatus: () => this._executeCommand('k8sTranslationHelper.checkAPIStatus'),
        getAPIKeyStatus: () => this._handleGetAPIKeyStatus(),
        saveAPIKey: () => this._handleSaveAPIKey(msg.payload),
        deleteAPIKey: () => this._handleDeleteAPIKey(msg.payload),
      };

      const handler = messageHandlers[msg?.type];
      if (handler) {
        await handler();
      } else {
        console.warn('Unknown message type:', msg?.type);
      }
    } catch (error) {
      console.error('Error handling webview message:', error);
      notificationManager.showError('notifications.error.webviewMessageProcessingError', { error: String(error) });
    }
  }

  private _executeCommand(command: string, ...args: any[]) {
    vscode.commands.executeCommand(command, ...args);
  }

  private async _handleAITranslationRequest(payload: any) {
    try {
      const { message, messageId } = payload;
      console.log(`Processing AI message: "${message}"`);

      // 1단계: 키워드 기반 빠른 분류 시도
      const quickClassification = this.intentClassifier.classifyIntent(message);

      let finalIntent;
      let extractedText;

      // 키워드 분류가 확실한 경우 (신뢰도 > 0.7)
      if (quickClassification.confidence > 0.7) {
        finalIntent = quickClassification.intent;
        extractedText = quickClassification.extractedText;
        console.log(`Quick classification: ${finalIntent} (confidence: ${quickClassification.confidence})`);
      } else {
        // 애매한 경우 AI에게 의도 분류 요청
        console.log(`Using AI for intent classification (quick confidence: ${quickClassification.confidence})`);
        const aiClassification = await this.aiIntentClassifier.classifyIntent(message);
        finalIntent = aiClassification.intent;
        extractedText = aiClassification.extractedText;
        console.log(`AI classification: ${finalIntent} (confidence: ${aiClassification.confidence})`);
      }

      // 2단계: 분류된 의도에 따라 적절한 AI 응답 생성
      const promptConfig = this.responseGenerator.generatePromptForIntent({
        intent: finalIntent,
        originalMessage: message,
        extractedText: extractedText
      });

      // 3단계: AI 응답 생성
      const response = await this.aiService.translateText({
        sourceText: promptConfig.userPrompt,
        targetLanguage: 'Korean',
        context: promptConfig.systemPrompt
      });

      // 결과를 웹뷰로 전달
      this._sendMessageToWebview({
        type: 'aiTranslationResponse',
        payload: {
          response: response.translatedText,
          messageId: messageId
        }
      });

    } catch (error) {
      console.error('AI request processing failed:', error);

      // 에러 메시지를 웹뷰로 전달
      this._sendMessageToWebview({
        type: 'aiTranslationResponse',
        payload: {
          response: `처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
          messageId: payload.messageId
        }
      });
    }
  }

  private _sendMessageToWebview(message: any) {
    for (const view of this.views) {
      if (view.visible) {
        view.webview.postMessage(message);
      }
    }
  }

  private _getHtml(webview: vscode.Webview, initialState: WebviewState) {
    const scriptUri = this._getResourceUri(webview, WEBVIEW_CONFIG.FILES.MAIN_JS);
    const styleUri = this._getResourceUri(webview, WEBVIEW_CONFIG.FILES.MAIN_CSS);
    const nonce = this._generateNonce();
    const cspContent = this._generateCSP(webview.cspSource, nonce);

    return this._generateHtmlTemplate({
      styleUri,
      scriptUri,
      nonce,
      cspContent,
      initialState,
    });
  }

  private _getResourceUri(webview: vscode.Webview, fileName: string): vscode.Uri {
    return webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, ...WEBVIEW_CONFIG.UI_DIST_PATH, fileName)
    );
  }

  private _generateCSP(cspSource: string, nonce: string): string {
    return `
      default-src 'none';
      img-src ${cspSource} blob: data:;
      style-src ${cspSource} 'unsafe-inline';
      script-src 'nonce-${nonce}' ${cspSource};
      font-src ${cspSource} data:;
    `;
  }

  private _generateHtmlTemplate({
    styleUri,
    scriptUri,
    nonce,
    cspContent,
    initialState,
  }: {
    styleUri: vscode.Uri;
    scriptUri: vscode.Uri;
    nonce: string;
    cspContent: string;
    initialState: WebviewState;
  }): string {
    return /* html */ `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="${cspContent}"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KubeLingoAssist</title>
  <link rel="stylesheet" href="${styleUri}" />
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    // React 최초 마운트용 초기 상태 (inline 스크립트는 nonce 로 허용)
    window.initialState = ${JSON.stringify(initialState)};
  </script>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _generateNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private async _handleGetAIConfig() {
    try {
      // AI 설정 정보와 API 키 상태 확인
      const status = await this.aiService.checkAPIKeyStatus();
      const config = await this.aiService.getConfig();

      const currentConfig = {
        provider: config.provider,
        model: config.model,
        hasKey: status[config.provider] || false
      };

      const availableProviders = [
        { provider: 'openai' as const, hasKey: status.openai || false },
        { provider: 'claude' as const, hasKey: status.claude || false },
        { provider: 'gemini' as const, hasKey: status.gemini || false }
      ];

      this._sendMessageToWebview({
        type: 'aiConfigResponse',
        payload: {
          currentConfig,
          availableProviders
        }
      });

    } catch (error) {
      console.error('Failed to get AI config:', error);
    }
  }

  private async _handleUpdateAIConfig(payload: any) {
    try {
      const { provider, model } = payload;
      if (!provider) return;

      // VS Code 설정 업데이트
      const config = vscode.workspace.getConfiguration('kubelingoassist');
      await config.update('ai.provider', provider, vscode.ConfigurationTarget.Global);

      if (model) {
        await config.update('ai.model', model, vscode.ConfigurationTarget.Global);
      }

      // 웹뷰에 업데이트된 설정 다시 전송
      await this._handleGetAIConfig();

      notificationManager.showInfo('notifications.info.aiConfigUpdated', { provider, model });

    } catch (error) {
      console.error('Failed to update AI config:', error);
      notificationManager.showError('notifications.error.aiConfigUpdateFailed', { error: String(error) });
    }
  }

  private async _handleConfigureAPIKey(payload: any) {
    try {
      const { provider } = payload;
      if (!provider) return;

      // provider에 따라 적절한 명령어 실행
      const commandMap: { [key: string]: string } = {
        openai: 'kubelingoassist.setOpenAIKey',
        claude: 'kubelingoassist.setClaudeKey',
        gemini: 'kubelingoassist.setGeminiKey'
      };

      const command = commandMap[provider];
      if (command) {
        this._executeCommand(command);
      } else {
        // 일반적인 AI 설정 대화상자 열기
        this._executeCommand('kubelingoassist.configureAI');
      }

    } catch (error) {
      console.error('Failed to configure API key:', error);
    }
  }

  private async _handleGetAPIKeyStatus() {
    try {
      console.log('_handleGetAPIKeyStatus: Starting API key status check...');

      const status = await this.aiService.checkAPIKeyStatus();
      console.log('_handleGetAPIKeyStatus: Got status from aiService:', status);

      const keys = await this._getAPIKeys();
      console.log('_handleGetAPIKeyStatus: Got keys:', Object.keys(keys));

      const response = {
        type: 'apiKeyStatusResponse',
        payload: {
          status,
          keys
        }
      };

      console.log('_handleGetAPIKeyStatus: Sending response to webview:', response);
      this._sendMessageToWebview(response);

    } catch (error) {
      console.error('Failed to get API key status:', error);

      // Send error response to webview
      this._sendMessageToWebview({
        type: 'apiKeyStatusResponse',
        payload: {
          status: { openai: false, claude: false, gemini: false, koreanDictionary: false },
          keys: {},
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  private async _handleSaveAPIKey(payload: any) {
    try {
      const { provider, key } = payload;
      if (!provider || !key) return;

      const { ConfigManager } = await import('../ai/config');
      const configManager = new ConfigManager(this.context);

      if (provider === 'koreanDictionary') {
        await this.aiService.setKoreanDictionaryAPIKey(key);
      } else {
        await configManager.setAPIKey(provider, key);
      }

      // 상태 업데이트
      await this._handleGetAPIKeyStatus();

      notificationManager.showInfo('notifications.info.apiKeyUpdated', { provider });

    } catch (error) {
      console.error('Failed to save API key:', error);
      notificationManager.showError('notifications.error.apiKeySaveFailed', { error: String(error) });
    }
  }

  private async _handleDeleteAPIKey(payload: any) {
    try {
      const { provider } = payload;
      if (!provider) return;

      const { ConfigManager } = await import('../ai/config');
      const configManager = new ConfigManager(this.context);

      if (provider === 'koreanDictionary') {
        await this.aiService.setKoreanDictionaryAPIKey('');
      } else {
        await configManager.deleteAPIKey(provider);
      }

      // 상태 업데이트
      await this._handleGetAPIKeyStatus();

      notificationManager.showInfo('notifications.info.apiKeyDeleted', { provider });

    } catch (error) {
      console.error('Failed to delete API key:', error);
      notificationManager.showError('notifications.error.apiKeyDeleteFailed', { error: String(error) });
    }
  }

  private async _getAPIKeys(): Promise<{ [key: string]: string }> {
    try {
      const { ConfigManager } = await import('../ai/config');
      const configManager = new ConfigManager(this.context);

      const keys: { [key: string]: string } = {};

      // 각 제공업체의 키를 가져와서 마스킹된 형태로 저장
      for (const provider of ['openai', 'claude', 'gemini']) {
        const key = await configManager.getAPIKey(provider);
        if (key) {
          keys[provider] = key;
        }
      }

      return keys;
    } catch (error) {
      console.error('Failed to get API keys:', error);
      return {};
    }
  }
}
