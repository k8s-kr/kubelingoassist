import React from 'react';
import { uiI18n } from '../../i18n';

export const TranslationGuideTooltip: React.FC = () => {
  return (
    <div className="translation-guide-tooltip">
      <span className="tooltip-trigger">ℹ️</span>
      <div className="tooltip-content">
        <div className="tooltip-title">{uiI18n.t('ui.tooltip.translationGuideTitle')}</div>
        <ol>
          <li>{uiI18n.t('ui.tooltip.translationGuideItem')}</li>
        </ol>
      </div>
    </div>
  );
};
