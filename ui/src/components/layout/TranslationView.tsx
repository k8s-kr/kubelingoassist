import React, { useState, useEffect } from 'react';
import { useTranslationVSCodeAPI } from '../../hooks/useVSCodeAPI';
import { TranslationControlSection } from './TranslationControlSection';
import { KubelingoMode, KUBELINGO_MODES } from '../../types/modes';

interface TranslationAppState {
  isSyncScrollEnabled: boolean;
  isKubelingoEnabled: boolean;
  currentMode: KubelingoMode;
}

export const TranslationView: React.FC = () => {
  const {
    openTranslationFile: handleOpenTranslation,
    openReviewFile: handleOpenReviewFile,
    toggleSyncScroll: handleToggleSyncScroll,
    toggleKubelingo: handleToggleKubelingo,
    changeMode: handleChangeMode,
    initialState,
    vscodeGetState,
    vscodeSetState,
  } = useTranslationVSCodeAPI();

  const [translationAppState, setTranslationAppState] = useState<TranslationAppState>({
    isSyncScrollEnabled: false,
    isKubelingoEnabled: true,
    currentMode: KUBELINGO_MODES.TRANSLATION,
  });

  useEffect(() => {
    // 1) 웹뷰 로컬(getState) 우선 복원
    const savedState = vscodeGetState?.();
    if (savedState) {
      setTranslationAppState(previousState => ({
        ...previousState,
        isSyncScrollEnabled: typeof savedState.syncScrollEnabled === 'boolean' ? savedState.syncScrollEnabled : previousState.isSyncScrollEnabled,
        isKubelingoEnabled: typeof savedState.kubelingoEnabled === 'boolean' ? savedState.kubelingoEnabled : previousState.isKubelingoEnabled,
        currentMode: savedState.mode && Object.values(KUBELINGO_MODES).includes(savedState.mode) ? savedState.mode : previousState.currentMode,
      }));
    } else if (initialState) {
      // 2) 확장에서 주입한 초기 상태
      setTranslationAppState(previousState => ({
        ...previousState,
        isSyncScrollEnabled: typeof initialState.syncScrollEnabled === 'boolean' ? initialState.syncScrollEnabled : previousState.isSyncScrollEnabled,
        isKubelingoEnabled: typeof initialState.kubelingoEnabled === 'boolean' ? initialState.kubelingoEnabled : previousState.isKubelingoEnabled,
        currentMode: initialState.mode && Object.values(KUBELINGO_MODES).includes(initialState.mode) ? initialState.mode : previousState.currentMode,
      }));
    }

    // 3) 확장 → 웹뷰 상태 방송 수신
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === 'stateUpdate' && message?.payload) {
        const { syncScrollEnabled: nextSyncEnabled, kubelingoEnabled: nextKubelingoEnabled, mode: nextMode } = message.payload;
        
        setTranslationAppState(previousState => {
          const updatedState = { ...previousState };
          if (typeof nextSyncEnabled === 'boolean') updatedState.isSyncScrollEnabled = nextSyncEnabled;
          if (typeof nextKubelingoEnabled === 'boolean') updatedState.isKubelingoEnabled = nextKubelingoEnabled;
          if (nextMode && Object.values(KUBELINGO_MODES).includes(nextMode)) updatedState.currentMode = nextMode;
          
          // 수신 즉시 웹뷰 로컬에도 저장
          vscodeSetState?.(updatedState);
          return updatedState;
        });
      }
    };

    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 최초 1회만

  // 로컬 state가 바뀔 때(초기화 포함) 웹뷰 로컬 스토리지에도 저장
  useEffect(() => {
    vscodeSetState?.(translationAppState);
  }, [translationAppState, vscodeSetState]);

  const onToggleSyncScroll = () => {
    // 실제 토글은 확장에서 수행 → stateUpdate 수신 후 위에서 반영
    handleToggleSyncScroll();
  };

  const onToggleKubelingo = () => {
    console.log('onToggleKubelingo called');
    // Send command to extension to toggle kubelingo
    console.log('Sending toggleKubelingo message to extension');
    handleToggleKubelingo();
  };

  const onModeChange = (newMode: KubelingoMode) => {
    // Send command to extension to change mode
    handleChangeMode(newMode);
  };


  return (
    <div>
      <TranslationControlSection
        isSyncScrollEnabled={translationAppState.isSyncScrollEnabled}
        isKubelingoEnabled={translationAppState.isKubelingoEnabled}
        currentMode={translationAppState.currentMode}
        onOpenTranslationFile={handleOpenTranslation}
        onOpenReviewFile={handleOpenReviewFile}
        onToggleSyncScroll={onToggleSyncScroll}
        onToggleKubelingo={onToggleKubelingo}
        onModeChange={onModeChange}
      />
    </div>
  );
};
