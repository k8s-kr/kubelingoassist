import React, { useState, useEffect } from 'react';
import { useTranslationVSCodeAPI } from '../../hooks/useVSCodeAPI';

interface AIConfig {
  provider: 'openai' | 'claude' | 'gemini';
  model?: string;
  hasKey: boolean;
}

interface AIProviderSelectorProps {
  className?: string;
}

const providerLabels = {
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini'
};

const modelOptions = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  gemini: ['gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro']
};

export const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({ className = '' }) => {
  const { vscodeApi } = useTranslationVSCodeAPI();
  const [currentConfig, setCurrentConfig] = useState<AIConfig | null>(null);
  const [availableProviders, setAvailableProviders] = useState<AIConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // VS Code에서 AI 설정 정보를 받는 메시지 리스너
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'aiConfigResponse') {
        setCurrentConfig(message.payload.currentConfig);
        setAvailableProviders(message.payload.availableProviders);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // 초기 AI 설정 정보 요청
    if (vscodeApi) {
      vscodeApi.postMessage({ type: 'getAIConfig' });

      // 5초 후에도 응답이 없으면 로딩 상태 해제
      const timeout = setTimeout(() => {
        setIsLoading(false);
        setCurrentConfig(null);
      }, 5000);

      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeout);
      };
    } else {
      // vscodeApi가 없으면 로딩 상태를 해제하고 에러 상태로 설정
      setIsLoading(false);
      setCurrentConfig(null);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [vscodeApi]);

  const handleProviderChange = (provider: 'openai' | 'claude' | 'gemini') => {
    if (vscodeApi) {
      vscodeApi.postMessage({
        type: 'updateAIConfig',
        payload: { provider, model: modelOptions[provider][0] }
      });
    }
  };


  if (isLoading) {
    return (
      <div className={`ai-provider-selector loading ${className}`}>
        <div className="loading-text">AI 설정 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className={`ai-provider-selector ${className}`}>
      <select
        className="provider-select"
        value={currentConfig?.provider || 'openai'}
        onChange={(e) => handleProviderChange(e.target.value as any)}
      >
        {availableProviders.map((provider) => (
          <option
            key={provider.provider}
            value={provider.provider}
            disabled={!provider.hasKey}
          >
            {providerLabels[provider.provider]}
            {!provider.hasKey && ' (키 없음)'}
            {provider.provider === currentConfig?.provider && provider.hasKey && ' ✓'}
          </option>
        ))}
      </select>
    </div>
  );
};