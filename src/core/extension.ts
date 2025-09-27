import * as vscode from 'vscode';
import { TranslationViewProvider } from '../features/ui/webview-providers';
import { StatusBarManager } from '../features/ui/StatusBarManager';
import { TranslationCommandManager } from '../features/translation/TranslationCommandManager';
import { ScrollSyncManager } from '../features/translation/ScrollSyncManager';
import { LinkValidator } from '../validators/link';
import { AICommands } from '../features/ai/ai-commands';
import { AITranslationCommands } from '../features/ai/commands';
import { KoreanFileNavigator } from '../features/navigation/korean-file-navigator';

let statusBarManager: StatusBarManager;
let linkValidator: LinkValidator;
let aiCommands: AICommands;
let translationCommandManager: TranslationCommandManager;
let scrollSyncManager: ScrollSyncManager;

export function activate(context: vscode.ExtensionContext) {
    // Status bar manager 초기화
    statusBarManager = new StatusBarManager();

    // Link validator 초기화
    linkValidator = new LinkValidator();

    // AI Commands 초기화
    aiCommands = new AICommands(context);


    // Translation Command Manager 초기화
    translationCommandManager = new TranslationCommandManager();

    // Scroll Sync Manager 초기화
    scrollSyncManager = new ScrollSyncManager();
    
    // Activity Bar 뷰 프로바이더 등록
    const provider = new TranslationViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('kubelingoassist-view', provider)
    );
    
    // Commands 모듈에 의존성 설정
    translationCommandManager.setDependencies(statusBarManager, provider);
    
    // Commands 등록
    translationCommandManager.registerCommands(context);
    
    // AI Commands 등록
    aiCommands.registerCommands();

    // Korean File Navigator 명령어 등록
    const showLocaleFileLinksCommand = vscode.commands.registerCommand(
        'kubelingoassist.showKoreanFileLinks',
        () => KoreanFileNavigator.showLocaleFileQuickPick(false)
    );

    const showCurrentFileLinksCommand = vscode.commands.registerCommand(
        'kubelingoassist.showCurrentFileLinks',
        () => KoreanFileNavigator.showLocaleFileQuickPick(true)
    );

    context.subscriptions.push(showLocaleFileLinksCommand, showCurrentFileLinksCommand);
    
    // 저장된 상태로 초기화 (상태바, 웹뷰 동기화)
    translationCommandManager.initStateFromStorage(context);
    
    // 이미 열려있는 모든 문서에 대해 링크 검증 실행
    vscode.workspace.textDocuments.forEach(document => {
        linkValidator.validateLinks(document);
    });
    
    // 문서 변경 시 링크 검증 및 라인수 업데이트
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
        linkValidator.validateLinks(event.document);
        
        // 마크다운 파일 변경시 라인수 업데이트 (디바운싱 적용)
        if (event.document.languageId === 'markdown') {
            statusBarManager.debouncedRefreshLineCount();
        }
    });
    
    // 문서 저장 시 라인수 업데이트
    const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument(async (document) => {
        // 마크다운 파일인 경우에만 라인수 업데이트
        if (document.languageId === 'markdown') {
            await statusBarManager.refreshLineCount();
        }
    });
    
    // 문서 열기 시 링크 검증
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument((document) => {
        linkValidator.validateLinks(document);
    });
    
    context.subscriptions.push(
        ...statusBarManager.getItems(),
        linkValidator.getDiagnostics(),
        linkValidator.getCodeActionProvider(),
        onDidChangeTextDocument,
        onDidSaveTextDocument,
        onDidOpenTextDocument
    );
}

export function deactivate() {
    if (scrollSyncManager) {
        scrollSyncManager.cleanupScrollListeners();
    }
    if (statusBarManager) {
        statusBarManager.dispose();
    }
    if (linkValidator) {
        linkValidator.dispose();
    }
}