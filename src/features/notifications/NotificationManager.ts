import * as vscode from 'vscode';
import { I18n } from '../i18n/i18n';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export class NotificationManager {
    private i18n: I18n;

    public constructor(i18n: I18n) {
        this.i18n = i18n;
    }

    public showInfo(key: string, params?: Record<string, string>, ...items: string[]): Thenable<string | undefined> {
        return this.i18n.showInformationMessage(key, params, ...items);
    }

    public showWarning(key: string, params?: Record<string, string>, ...items: string[]): Thenable<string | undefined> {
        return this.i18n.showWarningMessage(key, params, ...items);
    }

    public showError(key: string, params?: Record<string, string>, ...items: string[]): Thenable<string | undefined> {
        return this.i18n.showErrorMessage(key, params, ...items);
    }

    public showSuccess(key: string, params?: Record<string, string>, ...items: string[]): Thenable<string | undefined> {
        return this.i18n.showInformationMessage(key, params, ...items);
    }

    public show(type: NotificationType, key: string, params?: Record<string, string>, ...items: string[]): Thenable<string | undefined> {
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

    public showExtensionActivated(): Thenable<string | undefined> {
        return this.showInfo('notifications.info.extensionActivated');
    }

    public showConfigurationSaved(): Thenable<string | undefined> {
        return this.showSuccess('notifications.success.configurationLoaded');
    }

    public showConfigurationError(error?: string): Thenable<string | undefined> {
        return this.showError('notifications.error.configurationError', error ? { error } : undefined);
    }

    public showNetworkError(error?: string): Thenable<string | undefined> {
        return this.showError('notifications.error.networkError', error ? { error } : undefined);
    }

    public showFileSystemError(error?: string): Thenable<string | undefined> {
        return this.showError('notifications.error.fileSystemError', error ? { error } : undefined);
    }

    public showTaskCompleted(): Thenable<string | undefined> {
        return this.showSuccess('notifications.success.taskCompleted');
    }

    public showUnsavedChanges(): Thenable<string | undefined> {
        return this.showWarning('notifications.warning.unsavedChanges');
    }
}

import { container } from '../../core/ServiceContainer';

export function getNotificationManager(): NotificationManager {
    return container.getNotificationManager();
}