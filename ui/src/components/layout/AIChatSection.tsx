import React, { useState } from 'react';
import { AIChat } from '../chat';
import { APIKeySettings } from '../ai/APIKeySettings';

interface AIChatSectionProps {
  onSendMessage: (message: string) => void;
}

export const AIChatSection: React.FC<AIChatSectionProps> = ({ onSendMessage }) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="ai-section">
      <div className="ai-section-header">
        <button
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
          title={showSettings ? '설정 닫기' : '설정 열기'}
        >
          ⚙️ {showSettings ? '설정 닫기' : '설정'}
        </button>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <APIKeySettings />
        </div>
      )}

      <AIChat onSendMessage={onSendMessage} />
    </div>
  );
};