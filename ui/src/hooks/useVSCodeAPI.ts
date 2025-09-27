import { useEffect, useRef, useCallback } from 'react';
import { VSCodeAPI, VSCodeOutboundMessage } from '../types/vscode';

// VS Code 웹뷰 전역 타입 안전 처리 (존재하지 않을 수도 있음)
declare global {
  // eslint-disable-next-line no-var
  var acquireVsCodeApi: undefined | (() => VSCodeAPI);
  interface Window {
    initialState?: any; // 확장에서 주입하는 초기 상태
    vscodeApi?: VSCodeAPI; // 싱글톤 저장
  }
}

// 글로벌 싱글톤 VSCode API 인스턴스
let globalVscodeApi: VSCodeAPI | null = null;

const getVSCodeAPI = (): VSCodeAPI | null => {
  if (globalVscodeApi) {
    return globalVscodeApi;
  }

  if (typeof window !== 'undefined' && window.vscodeApi) {
    globalVscodeApi = window.vscodeApi;
    return globalVscodeApi;
  }

  if (typeof acquireVsCodeApi !== 'undefined') {
    globalVscodeApi = acquireVsCodeApi();
    if (typeof window !== 'undefined') {
      window.vscodeApi = globalVscodeApi;
    }
    return globalVscodeApi;
  }

  return null;
};

export const useTranslationVSCodeAPI = () => {
  const vscodeApiRef = useRef<VSCodeAPI | null>(null);

  // mount 시 한 번만 VS Code API 확보
  useEffect(() => {
    vscodeApiRef.current = getVSCodeAPI();
  }, []);

  const sendMessageToExtension = useCallback((message: VSCodeOutboundMessage) => {
    vscodeApiRef.current?.postMessage(message);
  }, []);

  // ---- 상태 영속화 유틸 ----
  const getWebviewState = useCallback((): any | undefined => {
    try {
      return vscodeApiRef.current?.getState?.();
    } catch {
      return undefined;
    }
  }, []);

  const saveWebviewState = useCallback((state: any) => {
    try {
      vscodeApiRef.current?.setState?.(state);
    } catch {
      /* noop */
    }
  }, []);

  // ---- 명령 래퍼 ----
  const openTranslationFile = useCallback(() => {
    sendMessageToExtension({ type: 'openTranslationFile' });
  }, [sendMessageToExtension]);

  const openReviewFile = useCallback(() => {
    sendMessageToExtension({ type: 'openReviewFile' });
  }, [sendMessageToExtension]);

  const toggleSyncScroll = useCallback(() => {
    sendMessageToExtension({ type: 'toggleSyncScroll' });
  }, [sendMessageToExtension]);

  const sendAIMessage = useCallback((message: string) => {
    sendMessageToExtension({ type: 'aiChat', payload: { message } });
  }, [sendMessageToExtension]);

  const toggleKubelingo = useCallback(() => {
    sendMessageToExtension({ type: 'toggleKubelingo' });
  }, [sendMessageToExtension]);

  const changeMode = useCallback((mode: string) => {
    sendMessageToExtension({ type: 'changeMode', mode });
  }, [sendMessageToExtension]);

  return {
    // Extension command wrappers
    openTranslationFile,
    openReviewFile,
    toggleSyncScroll,
    sendAIMessage,
    toggleKubelingo,
    changeMode,

    // Raw VSCode API reference (if needed)
    vscodeApi: vscodeApiRef.current,

    // Webview state persistence helpers
    vscodeGetState: getWebviewState,
    vscodeSetState: saveWebviewState,

    // Initial state injected by extension
    initialState: typeof window !== 'undefined' ? window.initialState : undefined,
  };
};
