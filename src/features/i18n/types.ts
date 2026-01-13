export type SupportedLanguage = 'en' | 'ko' | 'ja' | 'zh-cn' | 'zh' | 'fr' | 'de' | 'es';

export interface TranslationKeys {
  common: {
    ok: string;
    cancel: string;
    create: string;
    overwrite: string;
    loading: string;
    error: string;
    success: string;
  };

  commands: {
    openTranslationFile: string;
    openReviewFile: string;
    toggleSyncScroll: string;
    changeMode: string;
  };

  messages: {
    noActiveFile: string;
    invalidFilePath: string;
    cannotFindTranslationPath: string;
    splitViewOpened: string;
    syncScrollEnabled: string;
    syncScrollDisabled: string;
    reviewModeEnabled: string;
    translationModeEnabled: string;
    translationFileNotExists: string;
    createNewFile: string;
    fileAlreadyExists: string;
    fileCopied: string;
    fileCopyFailed: string;
    originalFileNotFound: string;
    gitUtilitiesNotAvailable: string;
    noRecentCommits: string;
    noTranslationFilesFound: string;
    openedForReview: string;
    failedToOpenReviewMode: string;
    failedToGetRecentCommits: string;
    couldNotDetermineOriginalPath: string;
    reviewFileNotTranslationFile: string;
    couldNotFindEnglishFile: string;
    englishFileNotFound: string;
    notKubernetesRepo: string;
    kubernetesRepoOnly: string;
    pr: {
      enterPRNumber: string;
      enterValidPRNumber: string;
      fetchingPR: string;
      failedToFetchPR: string;
      noTranslationFilesInPR: string;
      checkingOutPR: string;
      prFetchedSuccess: string;
      failedToFetchPRInfo: string;
    };
  };

  notifications: {
    info: {
      extensionActivated: string;
      configurationSaved: string;
      fileProcessed: string;
      operationCompleted: string;
      dataExported: string;
      settingsUpdated: string;
      apiKeyStatus: string;
      aiChatMessage: string;
    };
    warning: {
      configurationMissing: string;
      performanceIssue: string;
      deprecatedFeature: string;
      connectionIssue: string;
      storageLimit: string;
      unsavedChanges: string;
      deleteApiKey: string;
      insufficientTranslationFiles: string;
    };
    error: {
      configurationError: string;
      networkError: string;
      fileSystemError: string;
      validationError: string;
      authenticationError: string;
      unexpectedError: string;
      noActiveEditor: string;
      noTextSelected: string;
      noApiKey: string;
      translationFailed: string;
      failedToSaveApiKey: string;
      failedToDeleteApiKey: string;
      webviewMessageProcessingError: string;
    };
    success: {
      configurationLoaded: string;
      connectionEstablished: string;
      dataProcessed: string;
      backupCreated: string;
      updateInstalled: string;
      taskCompleted: string;
      apiKeySaved: string;
      apiKeyDeleted: string;
      translationCompleted: string;
    };
  };

  ui: {
    selectTargetLanguage: string;
    selectFileToReview: string;
    fileStatus: {
      modified: string;
      added: string;
      other: string;
    };
    fromCommit: string;
    statusBar: {
      translationFile: string;
      openTranslationFile: string;
      lineComparison: string;
      autoRefreshLineCount: string;
    };
    aiConfig: {
      currentProviderSelect: string;
      enterApiKey: string;
      apiKeyStorageNote: string;
      configuredStatus: string;
      notConfiguredStatus: string;
      configureApiKeys: string;
      setApiKeyDescription: string;
      delete: string;
    };
    test: {
      startingTests: string;
    };
    accessibility: {
      translationModeSelector: string;
      openReviewFile: string;
      openTranslationFile: string;
      enableSyncScroll: string;
      disableSyncScroll: string;
    };
    status: {
      kubelingoAssist: string;
      on: string;
      off: string;
    };
    translationPanel: {
      modes: {
        translation: string;
        review: string;
      };
      buttons: {
        openTranslationFile: string;
        openReviewFile: string;
        syncOn: string;
        syncOff: string;
        fetchPR: string;
      };
      placeholder: {
        prNumber: string;
      };
      accessibility: {
        prNumberInput: string;
        fetchPRByNumber: string;
      };
    };
  };

  paths: {
    contentDirectory: string;
    englishContent: string;
    translationContent: string;
  };
}

export type TranslationResource = TranslationKeys;

export interface LanguageInfo {
    label: string;
    value: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'ko', 'ja', 'zh-cn', 'zh', 'fr', 'de', 'es'];

export const LANGUAGE_NAMES: { [key: string]: string } = {
        'en': 'English',
        'ko': '한국어',
        'ja': '日本語',
        'zh-cn': '中文(简体)',
        'zh': '中文(繁体)',
        'fr': 'Français',
        'de': 'Deutsch',
        'es': 'Español',
        'it': 'Italiano',
        'pt-br': 'Português',
        'ru': 'Русский',
        'uk': 'Українська',
        'pl': 'Polski',
        'hi': 'हिन्दी',
        'vi': 'Việt Nam',
        'id': 'Indonesia'
    };

export const LANGUAGE_OPTIONS: LanguageInfo[] = [
        { label: '한국어 (ko)', value: 'ko' },
        { label: '日本語 (ja)', value: 'ja' },
        { label: '中文 (zh-cn)', value: 'zh-cn' },
        { label: '中文 (zh)', value: 'zh' },
        { label: 'Français (fr)', value: 'fr' },
        { label: 'Deutsch (de)', value: 'de' },
        { label: 'Español (es)', value: 'es' },
        { label: 'Italiano (it)', value: 'it' },
        { label: 'Português (pt-br)', value: 'pt-br' },
        { label: 'Русский (ru)', value: 'ru' },
        { label: 'Українська (uk)', value: 'uk' },
        { label: 'Polski (pl)', value: 'pl' },
        { label: 'हिन्दी (hi)', value: 'hi' },
        { label: 'Việt Nam (vi)', value: 'vi' },
        { label: 'Indonesia (id)', value: 'id' }
    ];