// src/webview-providers.ts
import * as vscode from 'vscode';
import { notificationManager } from '../notifications';

// Types and Interfaces
interface WebviewMessage {
  type: string;
  payload?: any;
  mode?: 'translation' | 'review';
  prNumber?: number;
  reviewEvent?: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES';
}

interface WebviewState {
  syncScrollEnabled: boolean;
  kubelingoEnabled: boolean;
  mode: 'translation' | 'review';
  currentPR?: number;
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
    FETCH_PR_INFO: string;
    OPEN_PR_FILE: string;
    PUSH_COMMENTS_TO_GITHUB: string;
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
    FETCH_PR_INFO: 'kubelingoassist.fetchPRInfo',
    OPEN_PR_FILE: 'kubelingoassist.openPRFile',
    PUSH_COMMENTS_TO_GITHUB: 'kubelingoassist.pushCommentsToGitHub',
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

  constructor(private readonly _extensionUri: vscode.Uri) {}

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

  public sendPRInfo(prInfo: any) {
    for (const view of this.views) {
      if (view.visible) {
        view.webview.postMessage({ type: 'prInfo', payload: prInfo });
      }
    }
  }

  public sendPRList(prList: any[]) {
    for (const view of this.views) {
      if (view.visible) {
        view.webview.postMessage({ type: 'prList', payload: prList });
      }
    }
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

  private _handleWebviewMessage(msg: WebviewMessage) {
    try {
      console.log('Webview received message:', msg);
      
      const messageHandlers: { [key: string]: () => void } = {
        openTranslationFile: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.OPEN_TRANSLATION_FILE),
        openReviewFile: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.OPEN_REVIEW_FILE),
        toggleSyncScroll: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.TOGGLE_SYNC_SCROLL),
        toggleKubelingo: () => {
          console.log('Executing toggleKubelingo command');
          this._executeCommand(WEBVIEW_CONFIG.COMMANDS.TOGGLE_KUBELINGO);
        },
        changeMode: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.CHANGE_MODE, msg.mode),
        fetchPRInfo: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.FETCH_PR_INFO, msg.prNumber),
        openPRFile: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.OPEN_PR_FILE, msg.payload),
        pushCommentsToGitHub: () => this._executeCommand(WEBVIEW_CONFIG.COMMANDS.PUSH_COMMENTS_TO_GITHUB, msg.reviewEvent),
        aiChat: () => {
          const message = msg?.payload?.message ?? '';
          notificationManager.showInfo('notifications.info.aiChatMessage', { message });
        },
      };

      const handler = messageHandlers[msg?.type];
      if (handler) {
        handler();
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
}
