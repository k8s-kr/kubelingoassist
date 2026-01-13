import React from 'react';
import { uiI18n } from '../../i18n';

interface StatusBarProps {
  text?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  text = uiI18n.t('ui.status.kubelingoAssist')
}) => {
  return (
    <div className="status-bar">
      <span className="status-text">{text}</span>
    </div>
  );
};