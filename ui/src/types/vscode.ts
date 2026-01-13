export interface VSCodeAPI {
  postMessage: (message: unknown) => void;
  getState?: <T = any>() => T | undefined;
  setState?: (state: any) => void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VSCodeAPI;
    initialState?: any;
  }
}

export type VSCodeOutboundMessage =
  | { type: 'openTranslationFile' }
  | { type: 'openReviewFile' }
  | { type: 'toggleSyncScroll' }
  | { type: 'changeMode'; mode: string }
  | { type: 'aiChat'; payload: { message: string } };

export type VSCodeInboundMessage =
  | { type: 'stateUpdate'; payload: { syncScrollEnabled: boolean; mode?: string; language?: string } }
  ;

export type VSCodeMessage = VSCodeOutboundMessage | VSCodeInboundMessage;
