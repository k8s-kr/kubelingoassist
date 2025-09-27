import React, { useState } from 'react';

export const TranslationGuideTooltip: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="translation-guide-tooltip">
      <span
        className="tooltip-trigger"
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        ℹ️
      </span>
      <div className={`tooltip-content ${isVisible ? 'visible' : ''}`}>
        <div className="tooltip-title">번역 용어 참조</div>
        <ol>
          <li>쿠버네티스 한글화팀 용어집</li>
        </ol>
      </div>
    </div>
  );
};