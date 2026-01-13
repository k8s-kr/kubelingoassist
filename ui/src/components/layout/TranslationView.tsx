import React, { useState, useEffect } from 'react';
import { useTranslationVSCodeAPI } from '../../hooks/useVSCodeAPI';
import { TranslationControlSection } from './TranslationControlSection';
import { KubelingoMode, KUBELINGO_MODES } from '../../types/modes';
import { uiI18n } from '../../i18n';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from '@shared-i18n/types';

interface TranslationAppState {
  isSyncScrollEnabled: boolean;
  currentMode: KubelingoMode;
  language?: SupportedLanguage;
}

export const TranslationView: React.FC = () => {
  const {
    openTranslationFile: handleOpenTranslation,
    openReviewFile: handleOpenReviewFile,
    toggleSyncScroll: handleToggleSyncScroll,
    changeMode: handleChangeMode,
    fetchPRInfo: handleFetchPRInfo,
    initialState,
    vscodeGetState,
    vscodeSetState,
  } = useTranslationVSCodeAPI();

  const [translationAppState, setTranslationAppState] = useState<TranslationAppState>({
    isSyncScrollEnabled: false,
    currentMode: KUBELINGO_MODES.TRANSLATION,
    language: undefined,
  });

  const applyLanguage = (language?: string) => {
    if (!language) return;
    if ((SUPPORTED_LANGUAGES as string[]).includes(language)) {
      uiI18n.setLanguage(language as SupportedLanguage);
    }
  };

  useEffect(() => {
    const savedState = vscodeGetState?.();
    if (savedState) {
      setTranslationAppState(previousState => {
        const nextState = {
        ...previousState,
        isSyncScrollEnabled: typeof savedState.syncScrollEnabled === 'boolean' ? savedState.syncScrollEnabled : previousState.isSyncScrollEnabled,
        currentMode: savedState.mode && Object.values(KUBELINGO_MODES).includes(savedState.mode) ? savedState.mode : previousState.currentMode,
          language: savedState.language ?? previousState.language,
        };
        applyLanguage(nextState.language);
        return nextState;
      });
    } else if (initialState) {
      setTranslationAppState(previousState => {
        const nextState = {
        ...previousState,
        isSyncScrollEnabled: typeof initialState.syncScrollEnabled === 'boolean' ? initialState.syncScrollEnabled : previousState.isSyncScrollEnabled,
        currentMode: initialState.mode && Object.values(KUBELINGO_MODES).includes(initialState.mode) ? initialState.mode : previousState.currentMode,
          language: initialState.language ?? previousState.language,
        };
        applyLanguage(nextState.language);
        return nextState;
      });
    }

    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === 'stateUpdate' && message?.payload) {
        const { syncScrollEnabled: nextSyncEnabled, mode: nextMode, language: nextLanguage } = message.payload;

        setTranslationAppState(previousState => {
          const updatedState = { ...previousState };
          if (typeof nextSyncEnabled === 'boolean') updatedState.isSyncScrollEnabled = nextSyncEnabled;
          if (nextMode && Object.values(KUBELINGO_MODES).includes(nextMode)) updatedState.currentMode = nextMode;
          if (typeof nextLanguage === 'string') {
            updatedState.language = nextLanguage;
            applyLanguage(nextLanguage);
          }
          vscodeSetState?.(updatedState);
          return updatedState;
        });
      }
    };

    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    vscodeSetState?.(translationAppState);
  }, [translationAppState, vscodeSetState]);

  const onModeChange = (newMode: KubelingoMode) => {
    handleChangeMode(newMode);
  };

  return (
    <div>
      <TranslationControlSection
        isSyncScrollEnabled={translationAppState.isSyncScrollEnabled}
        currentMode={translationAppState.currentMode}
        onOpenTranslationFile={handleOpenTranslation}
        onOpenReviewFile={handleOpenReviewFile}
        onToggleSyncScroll={handleToggleSyncScroll}
        onModeChange={onModeChange}
        onFetchPRInfo={handleFetchPRInfo}
      />
    </div>
  );
};
