import React, { useState, useEffect } from 'react';
import { ChatHistory } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { TranslationGuideTooltip } from '../ui';
import { AIProviderSelector } from '../ai/AIProviderSelector';

interface AIChatProps {
  onSendMessage?: (message: string) => void;
}

export const AIChat: React.FC<AIChatProps> = ({ onSendMessage }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // VS Code에서 AI 응답을 받는 메시지 리스너 설정
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'aiTranslationResponse') {
        const aiMessage: ChatMessage = {
          id: (Date.now() + Math.random()).toString(),
          text: message.payload.response,
          isUser: false,
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, aiMessage]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSendMessage = (message: string) => {
    // 사용자 메시지를 대화 내역에 추가
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);

    // VS Code 확장으로 AI 번역 요청 전달
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'aiTranslationRequest',
        payload: {
          message: message,
          messageId: userMessage.id
        }
      });
    }

    if (onSendMessage) {
      onSendMessage(message);
    }
  };

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <div className="header-title">
          <span>번역 도우미</span>
          <TranslationGuideTooltip />
        </div>
      </div>

      <ChatHistory messages={chatHistory} />

      <AIProviderSelector />

      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};