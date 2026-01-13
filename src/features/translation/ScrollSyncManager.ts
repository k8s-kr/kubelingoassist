import * as vscode from 'vscode';
import { notificationManager } from '../notifications';
import { isKubernetesContentFile } from '../../utils';

const SCROLL_DEBOUNCE_MS = 20;
const EDITOR_UNLOCK_DELAY_MS = 50;

export class ScrollSyncManager {
    private disposables: vscode.Disposable[] = [];
    private updatingEditors = new WeakSet<vscode.TextEditor>();
    private debounceTimers = new WeakMap<vscode.TextEditor, NodeJS.Timeout>();

    setupSynchronizedScrolling(): void {
        this.cleanupScrollListeners();
        this.registerScrollEventListener();
        this.registerEditorsChangedListener();
    }

    cleanupScrollListeners(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }

    private getTranslationEditors(): vscode.TextEditor[] {
        return vscode.window.visibleTextEditors.filter(editor =>
            isKubernetesContentFile(editor.document.fileName)
        );
    }

    private revealAtTop(editor: vscode.TextEditor, targetTopLine: number): void {
        const safeLine = Math.max(0, Math.min(targetTopLine, editor.document.lineCount - 1));
        const range = new vscode.Range(safeLine, 0, safeLine, 0);
        editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
    }

    private registerScrollEventListener(): void {
        const onScroll = vscode.window.onDidChangeTextEditorVisibleRanges(event => {
            this.handleScrollEvent(event);
        });

        this.disposables.push(onScroll);
    }

    private registerEditorsChangedListener(): void {
        const onEditorsChanged = vscode.window.onDidChangeVisibleTextEditors(() => {
            this.handleEditorsChanged();
        });

        this.disposables.push(onEditorsChanged);
    }

    private handleScrollEvent(event: vscode.TextEditorVisibleRangesChangeEvent): void {
        const editor = event.textEditor;

        if (!isKubernetesContentFile(editor.document.fileName)) {
            return;
        }

        if (this.updatingEditors.has(editor)) {
            return;
        }

        const visibleRange = event.visibleRanges[0];
        if (!visibleRange) {
            return;
        }

        const currentTopLine = visibleRange.start.line;
        this.syncScrollToOtherEditors(editor, currentTopLine);
    }

    private syncScrollToOtherEditors(sourceEditor: vscode.TextEditor, targetTopLine: number): void {
        const applyToOthers = () => {
            const otherEditors = this.getTranslationEditors().filter(editor => 
                editor !== sourceEditor
            );
            
            otherEditors.forEach(otherEditor => {
                this.syncSingleEditor(otherEditor, targetTopLine);
            });
        };

        this.debounceScrollSync(sourceEditor, applyToOthers);
    }

    private syncSingleEditor(editor: vscode.TextEditor, targetTopLine: number): void {
        this.updatingEditors.add(editor);

        try {
            this.revealAtTop(editor, targetTopLine);
        } finally {
            setTimeout(() => this.updatingEditors.delete(editor), EDITOR_UNLOCK_DELAY_MS);
        }
    }

    private debounceScrollSync(editor: vscode.TextEditor, callback: () => void): void {
        const existingTimer = this.debounceTimers.get(editor);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(callback, SCROLL_DEBOUNCE_MS);
        this.debounceTimers.set(editor, timer);
    }

    private handleEditorsChanged(): void {
        const translationEditors = this.getTranslationEditors();

        if (translationEditors.length < 2) {
            notificationManager.showWarning('notifications.warning.insufficientTranslationFiles');
        }
    }

    dispose(): void {
        this.cleanupScrollListeners();
    }
}