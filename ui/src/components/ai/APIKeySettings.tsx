import React, { useState, useEffect } from 'react';
import { useTranslationVSCodeAPI } from '../../hooks/useVSCodeAPI';

interface APIKeyStatus {
  openai: boolean;
  claude: boolean;
  gemini: boolean;
  koreanDictionary: boolean;
}

interface APIKeyData {
  openai?: string;
  claude?: string;
  gemini?: string;
  koreanDictionary?: string;
}

interface APIKeySettingsProps {
  className?: string;
}

const providerLabels = {
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
  koreanDictionary: '한국어 사전'
};

export const APIKeySettings: React.FC<APIKeySettingsProps> = ({ className = '' }) => {
  const { vscodeApi } = useTranslationVSCodeAPI();
  const [keyStatus, setKeyStatus] = useState<APIKeyStatus>({
    openai: false,
    claude: false,
    gemini: false,
    koreanDictionary: false
  });
  const [keyData, setKeyData] = useState<APIKeyData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'apiKeyStatusResponse') {
        console.log('APIKeySettings: Received apiKeyStatusResponse:', message);

        if (message.payload.error) {
          setError(message.payload.error);
          setIsLoading(false);
          return;
        }

        setKeyStatus(message.payload.status);
        setKeyData(message.payload.keys || {});
        setError(null);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // API 키 상태 요청
    if (vscodeApi) {
      console.log('APIKeySettings: Requesting API key status...');
      vscodeApi.postMessage({ type: 'getAPIKeyStatus' });

      // 타임아웃 설정 (10초 후에도 응답이 없으면 에러 처리)
      const timeout = setTimeout(() => {
        console.warn('APIKeySettings: Timeout waiting for API key status response');
        setError('API 키 상태 확인 요청이 시간 초과되었습니다.');
        setIsLoading(false);
      }, 10000);

      // cleanup 함수에서 타임아웃 클리어
      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeout);
      };
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [vscodeApi]);

  const handleKeyChange = (provider: string, value: string) => {
    setKeyData(prev => ({
      ...prev,
      [provider]: value
    }));
  };

  const handleSaveKey = (provider: string) => {
    const key = keyData[provider as keyof APIKeyData];
    if (key && vscodeApi) {
      vscodeApi.postMessage({
        type: 'saveAPIKey',
        payload: { provider, key }
      });
    }
  };

  const handleDeleteKey = (provider: string) => {
    if (vscodeApi) {
      vscodeApi.postMessage({
        type: 'deleteAPIKey',
        payload: { provider }
      });
    }
  };

  const toggleExpanded = (provider: string) => {
    setExpandedProvider(expandedProvider === provider ? null : provider);
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  if (isLoading) {
    return (
      <div className={`api-key-settings loading ${className}`}>
        <div className="loading-text">API 키 상태 확인 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`api-key-settings error ${className}`}>
        <div className="settings-header">
          <h3>API 키 설정</h3>
        </div>
        <div className="error-message">
          ❌ 오류: {error}
        </div>
        <button
          className="retry-button"
          onClick={() => {
            setError(null);
            setIsLoading(true);
            if (vscodeApi) {
              vscodeApi.postMessage({ type: 'getAPIKeyStatus' });
            }
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className={`api-key-settings ${className}`}>
      <div className="settings-header">
        <h3>API 키 설정</h3>
      </div>

      <div className="key-list">
        {Object.entries(keyStatus).map(([provider, hasKey]) => (
          <div key={provider} className="key-item">
            <div
              className="key-header"
              onClick={() => toggleExpanded(provider)}
            >
              <span className="provider-name">
                {providerLabels[provider as keyof typeof providerLabels]}
              </span>
              <span className={`status ${hasKey ? 'has-key' : 'no-key'}`}>
                {hasKey ? '✅ 설정됨' : '❌ 미설정'}
              </span>
              <span className="expand-icon">
                {expandedProvider === provider ? '▼' : '▶'}
              </span>
            </div>

            {expandedProvider === provider && (
              <div className="key-details">
                {hasKey && (
                  <div className="current-key">
                    <label>현재 키:</label>
                    <span className="masked-key">
                      {maskKey(keyData[provider as keyof APIKeyData] || '***-hidden-***')}
                    </span>
                  </div>
                )}

                <div className="key-input-group">
                  <label>
                    {hasKey ? '새 키 입력:' : 'API 키 입력:'}
                  </label>
                  <input
                    type="password"
                    className="key-input"
                    value={keyData[provider as keyof APIKeyData] || ''}
                    onChange={(e) => handleKeyChange(provider, e.target.value)}
                    placeholder={`${providerLabels[provider as keyof typeof providerLabels]} API 키를 입력하세요`}
                  />
                </div>

                <div className="key-actions">
                  <button
                    className="save-button"
                    onClick={() => handleSaveKey(provider)}
                    disabled={!keyData[provider as keyof APIKeyData]?.trim()}
                  >
                    저장
                  </button>
                  {hasKey && (
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteKey(provider)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};