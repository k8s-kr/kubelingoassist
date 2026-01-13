import { useEffect, useRef, useCallback } from 'react';
import { VSCodeAPI, VSCodeOutboundMessage } from '../types/vscode';

declare global {
  // eslint-disable-next-line no-var
  var acquireVsCodeApi: undefined | (() => VSCodeAPI);
  interface Window {
    initialState?: any;
  }
}

export const useTranslationVSCodeAPI = () => {
  const vscodeApiRef = useRef<VSCodeAPI | null>(null);

  useEffect(() => {
    if (typeof acquireVsCodeApi !== 'undefined') {
      vscodeApiRef.current = acquireVsCodeApi();
    }
  }, []);

  const sendMessageToExtension = useCallback((message: VSCodeOutboundMessage) => {
    vscodeApiRef.current?.postMessage(message);
  }, []);

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

  const openTranslationFile = useCallback(() => {
    sendMessageToExtension({ type: 'openTranslationFile' });
  }, [sendMessageToExtension]);

  const openReviewFile = useCallback(() => {
    sendMessageToExtension({ type: 'openReviewFile' });
  }, [sendMessageToExtension]);

  const toggleSyncScroll = useCallback(() => {
    sendMessageToExtension({ type: 'toggleSyncScroll' });
  }, [sendMessageToExtension]);

  const changeMode = useCallback((mode: string) => {
    sendMessageToExtension({ type: 'changeMode', mode });
  }, [sendMessageToExtension]);

  const fetchPRInfo = useCallback((prNumber: number) => {
    sendMessageToExtension({ type: 'fetchPRInfo', prNumber });
  }, [sendMessageToExtension]);

  return {
    openTranslationFile,
    openReviewFile,
    toggleSyncScroll,
    changeMode,
    fetchPRInfo,
    vscodeApi: vscodeApiRef.current,
    vscodeGetState: getWebviewState,
    vscodeSetState: saveWebviewState,
    initialState: typeof window !== 'undefined' ? window.initialState : undefined,
  };
};
