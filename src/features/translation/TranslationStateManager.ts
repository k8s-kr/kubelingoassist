import * as vscode from 'vscode';

export class TranslationStateManager {
    private static readonly KEY_SYNC = 'syncScrollEnabled';
    private static readonly KEY_MODE = 'kubelingoMode';

    private context: vscode.ExtensionContext | null = null;
    private _isSyncScrollEnabled = false;
    private _currentMode: 'translation' | 'review' = 'translation';

    initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        this.loadState();
    }

    private loadState(): void {
        if (!this.context) {
            return;
        }

        this._isSyncScrollEnabled = this.context.workspaceState.get<boolean>(
            TranslationStateManager.KEY_SYNC,
            false
        );

        this._currentMode = this.context.workspaceState.get<'translation' | 'review'>(
            TranslationStateManager.KEY_MODE,
            'translation'
        );
    }

    get isSyncScrollEnabled(): boolean {
        return this._isSyncScrollEnabled;
    }

    set isSyncScrollEnabled(value: boolean) {
        this._isSyncScrollEnabled = value;
        this.context?.workspaceState.update(TranslationStateManager.KEY_SYNC, value);
    }

    get currentMode(): 'translation' | 'review' {
        return this._currentMode;
    }

    set currentMode(value: 'translation' | 'review') {
        this._currentMode = value;
        this.context?.workspaceState.update(TranslationStateManager.KEY_MODE, value);
    }

    toggleSyncScroll(): boolean {
        this.isSyncScrollEnabled = !this._isSyncScrollEnabled;
        return this._isSyncScrollEnabled;
    }

    getState(): {
        isSyncScrollEnabled: boolean;
        currentMode: 'translation' | 'review';
    } {
        return {
            isSyncScrollEnabled: this._isSyncScrollEnabled,
            currentMode: this._currentMode,
        };
    }
}
