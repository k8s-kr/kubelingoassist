import * as vscode from 'vscode';
import { i18n } from '../features/i18n';

export enum ErrorType {
    GIT = 'git',
    FILE_SYSTEM = 'fileSystem',
    NETWORK = 'network',
    CONFIGURATION = 'configuration',
    UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export interface ErrorInfo {
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    userMessage: string;
    originalError?: Error;
    context?: Record<string, unknown>;
}

export class ErrorHandler {
    private static outputChannel: vscode.OutputChannel | null = null;

    static initialize(): void {
        if (!ErrorHandler.outputChannel) {
            ErrorHandler.outputChannel = vscode.window.createOutputChannel('KubeLingoAssist');
        }
    }

    static handle(error: unknown, context?: string): ErrorInfo {
        const errorInfo = ErrorHandler.parseError(error, context);
        ErrorHandler.logError(errorInfo);
        ErrorHandler.showUserMessage(errorInfo);
        return errorInfo;
    }

    static parseError(error: unknown, context?: string): ErrorInfo {
        const originalError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = originalError.message.toLowerCase();

        if (errorMessage.includes('git') || errorMessage.includes('repository')) {
            return {
                type: ErrorType.GIT,
                severity: ErrorSeverity.ERROR,
                message: originalError.message,
                userMessage: i18n.t('errors.gitOperationFailed') || 'Git operation failed.',
                originalError,
                context: { operation: context }
            };
        }

        if (errorMessage.includes('enoent') || errorMessage.includes('file') || errorMessage.includes('directory')) {
            return {
                type: ErrorType.FILE_SYSTEM,
                severity: ErrorSeverity.ERROR,
                message: originalError.message,
                userMessage: i18n.t('errors.fileOperationFailed') || 'File operation failed.',
                originalError,
                context: { operation: context }
            };
        }

        if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
            return {
                type: ErrorType.NETWORK,
                severity: ErrorSeverity.ERROR,
                message: originalError.message,
                userMessage: i18n.t('errors.networkError') || 'Network error occurred.',
                originalError,
                context: { operation: context }
            };
        }

        return {
            type: ErrorType.UNKNOWN,
            severity: ErrorSeverity.ERROR,
            message: originalError.message,
            userMessage: i18n.t('errors.unexpectedError') || 'An unexpected error occurred.',
            originalError,
            context: { operation: context }
        };
    }

    static logError(errorInfo: ErrorInfo): void {
        ErrorHandler.initialize();

        const timestamp = new Date().toISOString();
        const contextStr = errorInfo.context ? JSON.stringify(errorInfo.context) : 'N/A';

        const logMessage = `
[${timestamp}] ${errorInfo.severity.toUpperCase()}
Type: ${errorInfo.type}
Message: ${errorInfo.message}
Context: ${contextStr}
Stack: ${errorInfo.originalError?.stack || 'N/A'}
-------------------------------------------`;

        ErrorHandler.outputChannel?.appendLine(logMessage);

        if (errorInfo.severity === ErrorSeverity.CRITICAL || errorInfo.severity === ErrorSeverity.ERROR) {
            console.error('[KubeLingoAssist]', errorInfo.message, errorInfo.context);
        }
    }

    static showUserMessage(errorInfo: ErrorInfo): void {
        const showDetails = i18n.t('common.showDetails') || 'Show Details';

        switch (errorInfo.severity) {
            case ErrorSeverity.INFO:
                vscode.window.showInformationMessage(errorInfo.userMessage);
                break;

            case ErrorSeverity.WARNING:
                vscode.window.showWarningMessage(errorInfo.userMessage);
                break;

            case ErrorSeverity.ERROR:
            case ErrorSeverity.CRITICAL:
                vscode.window.showErrorMessage(errorInfo.userMessage, showDetails).then(selection => {
                    if (selection === showDetails) {
                        ErrorHandler.outputChannel?.show();
                    }
                });
                break;
        }
    }

    static showOutputChannel(): void {
        ErrorHandler.outputChannel?.show();
    }

    static dispose(): void {
        ErrorHandler.outputChannel?.dispose();
        ErrorHandler.outputChannel = null;
    }
}

export async function safeExecute<T>(
    operation: () => Promise<T>,
    context?: string,
    fallback?: T
): Promise<T | undefined> {
    try {
        return await operation();
    } catch (error) {
        ErrorHandler.handle(error, context);
        return fallback;
    }
}

export function safeExecuteSync<T>(
    operation: () => T,
    context?: string,
    fallback?: T
): T | undefined {
    try {
        return operation();
    } catch (error) {
        ErrorHandler.handle(error, context);
        return fallback;
    }
}
