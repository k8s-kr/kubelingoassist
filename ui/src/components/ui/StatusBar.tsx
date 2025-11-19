import React from 'react';
import { uiI18n } from '../../i18n';

interface StatusBarProps {
  text?: string;
  kubelingoEnabled?: boolean;
  onToggleKubelingo?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  text = uiI18n.t('ui.status.kubelingoAssist'),
  kubelingoEnabled,
  onToggleKubelingo 
}) => {
  return (
    <div className="status-bar">
      <span className="status-text">{text}</span>
      {kubelingoEnabled !== undefined && onToggleKubelingo && (
        <button
          className={`status-toggle ${kubelingoEnabled ? 'status-toggle-on' : 'status-toggle-off'}`}
          onClick={onToggleKubelingo}
        >
          {kubelingoEnabled ? uiI18n.t('ui.status.on') : uiI18n.t('ui.status.off')}
        </button>
      )}
    </div>
  );
};