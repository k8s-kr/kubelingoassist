import * as vscode from 'vscode';
import { notificationManager } from '../notifications';

/**
 * 스크롤 동기화를 관리하는 클래스입니다.
 * 번역 파일들 간의 스크롤 위치를 동기화하는 기능을 제공합니다.
 */
export class ScrollSyncManager {
    private disposables: vscode.Disposable[] = [];
    private updatingEditors = new WeakSet<vscode.TextEditor>();
    private debounceTimers = new WeakMap<vscode.TextEditor, NodeJS.Timeout>();

    /**
     * 번역 파일들 간의 스크롤을 동기화합니다.
     * - 대상: 경로에 /content/ 가 포함된 에디터들
     * - 기준: 절대 "맨 위 라인" 기준으로 동기화
     */
    setupSynchronizedScrolling(): void {
        this.cleanupScrollListeners(); // 중복 등록 방지
        this.registerScrollEventListener();
        this.registerEditorsChangedListener();

        // 초기 동기화: 활성 에디터의 현재 위치를 기준으로 다른 에디터들 동기화
        this.performInitialSync();
    }

    /**
     * 등록된 스크롤 동기화 리스너를 모두 해제합니다.
     */
    cleanupScrollListeners(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
        this.clearDebounceTimers();
    }

    /**
     * 파일이 번역 파일인지 확인합니다.
     */
    private isTranslationFile(fileName: string): boolean {
        return fileName.includes('/content/') || fileName.includes('\\content\\');
    }

    /**
     * 현재 표시되는 번역 파일 에디터들을 반환합니다.
     */
    private getTranslationEditors(): vscode.TextEditor[] {
        return vscode.window.visibleTextEditors.filter(editor => 
            this.isTranslationFile(editor.document.fileName)
        );
    }

    /**
     * 에디터를 지정된 라인으로 스크롤합니다.
     */
    private revealAtTop(editor: vscode.TextEditor, targetTopLine: number): void {
        const safeLine = Math.max(0, Math.min(targetTopLine, editor.document.lineCount - 1));
        const range = new vscode.Range(safeLine, 0, safeLine, 0);
        editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
    }

    /**
     * 초기 동기화를 수행합니다.
     * 활성 에디터의 현재 스크롤 위치를 기준으로 다른 에디터들을 동기화합니다.
     */
    private performInitialSync(): void {
        const activeEditor = vscode.window.activeTextEditor;
        const translationEditors = this.getTranslationEditors();

        if (!activeEditor || !this.isTranslationFile(activeEditor.document.fileName)) {
            return;
        }

        if (translationEditors.length < 2) {
            return;
        }

        // 활성 에디터의 현재 스크롤 위치 가져오기
        const activeVisibleRange = activeEditor.visibleRanges[0];
        if (!activeVisibleRange) {
            return;
        }

        const currentTopLine = activeVisibleRange.start.line;

        // 다른 에디터들을 같은 라인 번호로 동기화
        const otherEditors = translationEditors.filter(editor => editor !== activeEditor);
        otherEditors.forEach(editor => {
            this.syncSingleEditor(editor, currentTopLine);
        });
    }

    /**
     * 스크롤 이벤트 리스너를 등록합니다.
     */
    private registerScrollEventListener(): void {
        const onScroll = vscode.window.onDidChangeTextEditorVisibleRanges(event => {
            this.handleScrollEvent(event);
        });

        this.disposables.push(onScroll);
    }

    /**
     * 에디터 변경 이벤트 리스너를 등록합니다.
     */
    private registerEditorsChangedListener(): void {
        const onEditorsChanged = vscode.window.onDidChangeVisibleTextEditors(() => {
            this.handleEditorsChanged();
        });

        this.disposables.push(onEditorsChanged);
    }

    /**
     * 스크롤 이벤트를 처리합니다.
     */
    private handleScrollEvent(event: vscode.TextEditorVisibleRangesChangeEvent): void {
        const editor = event.textEditor;

        if (!this.isTranslationFile(editor.document.fileName)) {
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


    /**
     * 다른 에디터들로 스크롤을 동기화합니다.
     */
    private syncScrollToOtherEditors(sourceEditor: vscode.TextEditor, targetTopLine: number): void {
        const otherEditors = this.getTranslationEditors().filter(editor =>
            editor !== sourceEditor
        );

        // 즉시 동기화 - 디바운스 제거하여 정확성 향상
        otherEditors.forEach(otherEditor => {
            this.syncSingleEditor(otherEditor, targetTopLine);
        });
    }

    /**
     * 단일 에디터에 스크롤을 동기화합니다.
     */
    private syncSingleEditor(editor: vscode.TextEditor, targetTopLine: number): void {
        this.updatingEditors.add(editor);

        try {
            // 정확한 라인 동기화: 1라인 차이라도 즉시 동기화
            const currentTopLine = editor.visibleRanges[0]?.start.line || 0;
            if (currentTopLine !== targetTopLine) {
                this.revealAtTop(editor, targetTopLine);
            }
        } finally {
            // 즉시 해제하여 다음 스크롤 이벤트를 정확히 처리
            setTimeout(() => this.updatingEditors.delete(editor), 10);
        }
    }


    /**
     * 에디터 변경을 처리합니다.
     */
    private handleEditorsChanged(): void {
        const translationEditors = this.getTranslationEditors();

        if (translationEditors.length < 2) {
            notificationManager.showWarning('notifications.warning.insufficientTranslationFiles');
            return;
        }

        // 새로 열린 에디터가 있다면 기존 에디터의 스크롤 위치와 동기화
        if (translationEditors.length >= 2) {
            const activeEditor = vscode.window.activeTextEditor;
            const referenceEditor = translationEditors.find(editor =>
                editor !== activeEditor && editor.visibleRanges.length > 0
            );

            if (referenceEditor && activeEditor && this.isTranslationFile(activeEditor.document.fileName)) {
                const referenceTopLine = referenceEditor.visibleRanges[0]?.start.line || 0;
                this.syncSingleEditor(activeEditor, referenceTopLine);
            }
        }
    }

    /**
     * 모든 디바운스 타이머를 정리합니다.
     */
    private clearDebounceTimers(): void {
        // WeakMap은 자동으로 정리되지만, 명시적으로 타이머를 클리어할 수 있다면 좋습니다
        // 하지만 WeakMap의 특성상 직접 순회할 수 없으므로 자연스럽게 정리됩니다
    }

    /**
     * 리소스 정리를 위한 dispose 메서드
     */
    dispose(): void {
        this.cleanupScrollListeners();
    }
}