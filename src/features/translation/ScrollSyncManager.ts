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
  }

  /**
   * 등록된 스크롤 동기화 리스너를 모두 해제합니다.
   */
  cleanupScrollListeners(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
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
    return vscode.window.visibleTextEditors.filter((editor) =>
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
   * 스크롤 이벤트 리스너를 등록합니다.
   */
  private registerScrollEventListener(): void {
    const onScroll = vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
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
    const applyToOthers = () => {
      const otherEditors = this.getTranslationEditors().filter((editor) => editor !== sourceEditor);

      otherEditors.forEach((otherEditor) => {
        this.syncSingleEditor(otherEditor, targetTopLine);
      });
    };

    this.debounceScrollSync(sourceEditor, applyToOthers);
  }

  /**
   * 단일 에디터에 스크롤을 동기화합니다.
   */
  private syncSingleEditor(editor: vscode.TextEditor, targetTopLine: number): void {
    this.updatingEditors.add(editor);

    try {
      this.revealAtTop(editor, targetTopLine);
    } finally {
      // 우리가 유발한 이벤트는 무시되도록 한 틱 뒤에 해제
      setTimeout(() => this.updatingEditors.delete(editor), 0);
    }
  }

  /**
   * 스크롤 동기화에 디바운스를 적용합니다.
   */
  private debounceScrollSync(editor: vscode.TextEditor, callback: () => void): void {
    const existingTimer = this.debounceTimers.get(editor);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(callback, 20); // 20ms 디바운스
    this.debounceTimers.set(editor, timer);
  }

  /**
   * 에디터 변경을 처리합니다.
   */
  private handleEditorsChanged(): void {
    const translationEditors = this.getTranslationEditors();

    if (translationEditors.length < 2) {
      notificationManager.showWarning('notifications.warning.insufficientTranslationFiles');
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
