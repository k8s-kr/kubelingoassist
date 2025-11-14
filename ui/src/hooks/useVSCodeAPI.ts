import { useEffect, useRef, useCallback } from 'react';
import { VSCodeAPI, VSCodeOutboundMessage } from '../types/vscode';

// VS Code 웹뷰 전역 타입 안전 처리 (존재하지 않을 수도 있음)
declare global {
  // eslint-disable-next-line no-var
  var acquireVsCodeApi: undefined | (() => VSCodeAPI);
  interface Window {
    initialState?: any; // 확장에서 주입하는 초기 상태
  }
}

export const useTranslationVSCodeAPI = () => {
  const vscodeApiRef = useRef<VSCodeAPI | null>(null);

  // mount 시 한 번만 VS Code API 확보
  useEffect(() => {
    if (typeof acquireVsCodeApi !== 'undefined') {
      vscodeApiRef.current = acquireVsCodeApi();
    }
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

  const toggleKubelingo = useCallback(() => {
    sendMessageToExtension({ type: 'toggleKubelingo' });
  }, [sendMessageToExtension]);

  const changeMode = useCallback((mode: string) => {
    sendMessageToExtension({ type: 'changeMode', mode });
  }, [sendMessageToExtension]);

  const fetchPRInfo = useCallback((prNumber: number) => {
    sendMessageToExtension({ type: 'fetchPRInfo', prNumber });
  }, [sendMessageToExtension]);

  const pushCommentsToGitHub = useCallback((reviewEvent?: string) => {
    sendMessageToExtension({ type: 'pushCommentsToGitHub', reviewEvent });
  }, [sendMessageToExtension]);

  return {
    // Extension command wrappers
    openTranslationFile,
    openReviewFile,
    toggleSyncScroll,
    toggleKubelingo,
    changeMode,
    fetchPRInfo,
    pushCommentsToGitHub,

    // Raw VSCode API reference (if needed)
    vscodeApi: vscodeApiRef.current,

    // Webview state persistence helpers
    vscodeGetState: getWebviewState,
    vscodeSetState: saveWebviewState,

    // Initial state injected by extension
    initialState: typeof window !== 'undefined' ? window.initialState : undefined,
  };
};
