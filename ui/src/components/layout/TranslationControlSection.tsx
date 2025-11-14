import React from 'react';
import { ControlButton, StatusBar } from '../ui';
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
          aria-label={uiI18n.t('accessibility.translationModeSelector')}
        >
          <option value={KUBELINGO_MODES.TRANSLATION}>{uiI18n.t('modes.translation')}</option>
          <option value={KUBELINGO_MODES.REVIEW}>{uiI18n.t('modes.review')}</option>
        </select>

        <ControlButton
          variant="primary"
          onClick={currentMode === KUBELINGO_MODES.REVIEW ? onOpenReviewFile : onOpenTranslationFile}
          aria-label={currentMode === KUBELINGO_MODES.REVIEW ? uiI18n.t('accessibility.openReviewFile') : uiI18n.t('accessibility.openTranslationFile')}
        >
          {currentMode === KUBELINGO_MODES.REVIEW ? uiI18n.t('buttons.openReviewFile') : uiI18n.t('buttons.openTranslationFile')}
        </ControlButton>

        <ControlButton
          variant={isSyncScrollEnabled ? 'sync-enabled' : 'secondary'}
          onClick={onToggleSyncScroll}
          aria-label={isSyncScrollEnabled ? uiI18n.t('accessibility.disableSyncScroll') : uiI18n.t('accessibility.enableSyncScroll')}
        >
          {isSyncScrollEnabled ? uiI18n.t('buttons.syncOn') : uiI18n.t('buttons.syncOff')}
        </ControlButton>
      </div>

      {currentMode === KUBELINGO_MODES.REVIEW && (
        <div className="pr-fetch-section" style={{ marginTop: '10px' }}>
          <div className="button-group">
            <input
              type="number"
              placeholder="PR #"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFetchPR()}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid var(--vscode-input-border)',
                backgroundColor: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                width: '80px',
                fontSize: '13px'
              }}
              aria-label="PR number input"
            />
            <ControlButton
              variant="primary"
              onClick={handleFetchPR}
              disabled={!prNumber || isNaN(parseInt(prNumber))}
              aria-label="Fetch PR by number"
            >
              PR 가져오기
            </ControlButton>
          </div>
        </div>
      )}

    </>
  );
};