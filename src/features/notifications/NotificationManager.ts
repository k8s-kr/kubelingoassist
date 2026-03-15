import { i18n } from '../i18n';

/**
 * 알림 타입을 정의합니다.
 */
export type NotificationType = 'info' | 'warning' | 'error' | 'success';

/**
 * 알림 관리를 위한 중앙화된 서비스 클래스입니다.
 * 모든 알림 메시지를 i18n을 통해 관리합니다.
 */
export class NotificationManager {
  private static instance: NotificationManager;

  private constructor() {}

  /**
   * NotificationManager의 싱글톤 인스턴스를 반환합니다.
   */
  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 정보 알림을 표시합니다.
   * @param key - i18n 키 (예: 'notifications.info.extensionActivated')
   * @param params - 템플릿 매개변수
   * @param items - 추가 버튼 아이템들
   */
  public showInfo(
    key: string,
    params?: Record<string, string>,
    ...items: string[]
  ): Thenable<string | undefined> {
    return i18n.showInformationMessage(key, params, ...items);
  }

  /**
   * 경고 알림을 표시합니다.
   * @param key - i18n 키 (예: 'notifications.warning.configurationMissing')
   * @param params - 템플릿 매개변수
   * @param items - 추가 버튼 아이템들
   */
  public showWarning(
    key: string,
    params?: Record<string, string>,
    ...items: string[]
  ): Thenable<string | undefined> {
    return i18n.showWarningMessage(key, params, ...items);
  }

  /**
   * 오류 알림을 표시합니다.
   * @param key - i18n 키 (예: 'notifications.error.configurationError')
   * @param params - 템플릿 매개변수
   * @param items - 추가 버튼 아이템들
   */
  public showError(
    key: string,
    params?: Record<string, string>,
    ...items: string[]
  ): Thenable<string | undefined> {
    return i18n.showErrorMessage(key, params, ...items);
  }

  /**
   * 성공 알림을 표시합니다.
   * @param key - i18n 키 (예: 'notifications.success.configurationLoaded')
   * @param params - 템플릿 매개변수
   * @param items - 추가 버튼 아이템들
   */
  public showSuccess(
    key: string,
    params?: Record<string, string>,
    ...items: string[]
  ): Thenable<string | undefined> {
    return i18n.showInformationMessage(key, params, ...items);
  }

  /**
   * 타입에 따라 적절한 알림을 표시합니다.
   * @param type - 알림 타입
   * @param key - i18n 키
   * @param params - 템플릿 매개변수
   * @param items - 추가 버튼 아이템들
   */
  public show(
    type: NotificationType,
    key: string,
    params?: Record<string, string>,
    ...items: string[]
  ): Thenable<string | undefined> {
    switch (type) {
      case 'info':
        return this.showInfo(key, params, ...items);
      case 'warning':
        return this.showWarning(key, params, ...items);
      case 'error':
        return this.showError(key, params, ...items);
      case 'success':
        return this.showSuccess(key, params, ...items);
      default:
        return this.showInfo(key, params, ...items);
    }
  }

  // 편의 메서드들 - 자주 사용되는 알림들

  /**
   * 확장 프로그램 활성화 알림을 표시합니다.
   */
  public showExtensionActivated(): Thenable<string | undefined> {
    return this.showInfo('notifications.info.extensionActivated');
  }

  /**
   * 설정 저장 완료 알림을 표시합니다.
   */
  public showConfigurationSaved(): Thenable<string | undefined> {
    return this.showSuccess('notifications.success.configurationLoaded');
  }

  /**
   * 설정 오류 알림을 표시합니다.
   */
  public showConfigurationError(error?: string): Thenable<string | undefined> {
    return this.showError('notifications.error.configurationError', error ? { error } : undefined);
  }

  /**
   * 네트워크 오류 알림을 표시합니다.
   */
  public showNetworkError(error?: string): Thenable<string | undefined> {
    return this.showError('notifications.error.networkError', error ? { error } : undefined);
  }

  /**
   * 파일 시스템 오류 알림을 표시합니다.
   */
  public showFileSystemError(error?: string): Thenable<string | undefined> {
    return this.showError('notifications.error.fileSystemError', error ? { error } : undefined);
  }

  /**
   * 작업 완료 알림을 표시합니다.
   */
  public showTaskCompleted(): Thenable<string | undefined> {
    return this.showSuccess('notifications.success.taskCompleted');
  }

  /**
   * 저장되지 않은 변경사항 경고를 표시합니다.
   */
  public showUnsavedChanges(): Thenable<string | undefined> {
    return this.showWarning('notifications.warning.unsavedChanges');
  }
}

// 전역 인스턴스 export
export const notificationManager = NotificationManager.getInstance();
