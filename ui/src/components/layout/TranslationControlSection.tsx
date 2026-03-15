import React from 'react';
import { ControlButton } from '../ui';
import { KubelingoMode, KUBELINGO_MODES } from '../../types/modes';
import { uiI18n } from '../../i18n';

interface TranslationControlSectionProps {
  isSyncScrollEnabled: boolean;
  currentMode: KubelingoMode;
  onOpenTranslationFile: () => void;
  onOpenReviewFile: () => void;
  onToggleSyncScroll: () => void;
  onModeChange: (mode: KubelingoMode) => void;
  onFetchPRInfo?: (prNumber: number) => void;
}

export const TranslationControlSection: React.FC<TranslationControlSectionProps> = ({
  isSyncScrollEnabled,
  currentMode,
  onOpenTranslationFile,
  onOpenReviewFile,
  onToggleSyncScroll,
  onModeChange,
  onFetchPRInfo
}) => {
  const [prNumber, setPrNumber] = React.useState<string>('');

  const handleFetchPR = () => {
    const num = parseInt(prNumber);
    if (!isNaN(num) && num > 0 && onFetchPRInfo) {
      onFetchPRInfo(num);
    }
  };
  return (
    <>
      <div className="button-group">
        <select
          value={currentMode}
          onChange={(e) => onModeChange(e.target.value as KubelingoMode)}
          className={`mode-select enabled`}
          aria-label={uiI18n.t('ui.accessibility.translationModeSelector')}
        >
          <option value={KUBELINGO_MODES.TRANSLATION}>{uiI18n.t('ui.translationPanel.modes.translation')}</option>
          <option value={KUBELINGO_MODES.REVIEW}>{uiI18n.t('ui.translationPanel.modes.review')}</option>
        </select>

        <ControlButton
          variant="primary"
          onClick={currentMode === KUBELINGO_MODES.REVIEW ? onOpenReviewFile : onOpenTranslationFile}
          aria-label={currentMode === KUBELINGO_MODES.REVIEW ? uiI18n.t('ui.accessibility.openReviewFile') : uiI18n.t('ui.accessibility.openTranslationFile')}
        >
          {currentMode === KUBELINGO_MODES.REVIEW ? uiI18n.t('ui.translationPanel.buttons.openReviewFile') : uiI18n.t('ui.translationPanel.buttons.openTranslationFile')}
        </ControlButton>

        <ControlButton
          variant={isSyncScrollEnabled ? 'sync-enabled' : 'secondary'}
          onClick={onToggleSyncScroll}
          aria-label={isSyncScrollEnabled ? uiI18n.t('ui.accessibility.disableSyncScroll') : uiI18n.t('ui.accessibility.enableSyncScroll')}
        >
          {isSyncScrollEnabled ? uiI18n.t('ui.translationPanel.buttons.syncOn') : uiI18n.t('ui.translationPanel.buttons.syncOff')}
        </ControlButton>
      </div>

      {currentMode === KUBELINGO_MODES.REVIEW && (
        <div className="pr-fetch-section">
          <div className="button-group">
            <input
              type="number"
              className="pr-number-input"
              placeholder={uiI18n.t('ui.translationPanel.placeholder.prNumber')}
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFetchPR()}
              aria-label={uiI18n.t('ui.translationPanel.accessibility.prNumberInput')}
            />
            <ControlButton
              variant="primary"
              onClick={handleFetchPR}
              disabled={!prNumber || isNaN(parseInt(prNumber))}
              aria-label={uiI18n.t('ui.translationPanel.accessibility.fetchPRByNumber')}
            >
              {uiI18n.t('ui.translationPanel.buttons.fetchPR')}
            </ControlButton>
          </div>
        </div>
      )}

    </>
  );
};