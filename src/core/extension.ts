import * as vscode from 'vscode';
import { TranslationViewProvider } from '../features/ui/webview-providers';
import { StatusBarManager } from '../features/ui/StatusBarManager';
import { TranslationCommandManager } from '../features/translation/TranslationCommandManager';
import { ScrollSyncManager } from '../features/translation/ScrollSyncManager';
import { LinkValidator } from '../validators/link';
import { PRInfoService } from '../features/review/PRInfoService';
import { i18n } from '../features/i18n';

let statusBarManager: StatusBarManager;
let linkValidator: LinkValidator;
let translationCommandManager: TranslationCommandManager;
let scrollSyncManager: ScrollSyncManager;
let prInfoService: PRInfoService;

function registerPRCommands(context: vscode.ExtensionContext) {
    // PR 정보 가져오기 명령어
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'kubelingoassist.fetchPRInfo',
            async (prNumber?: number) => {
                try {
                    if (!prNumber) {
                        const input = await vscode.window.showInputBox({
                            prompt: i18n.t('messages.pr.enterPRNumber'),
                            placeHolder: '123',
                            validateInput: (value) => {
                                const num = parseInt(value);
                                if (isNaN(num) || num <= 0) {
                                    return i18n.t('messages.pr.enterValidPRNumber');
                                }
                                return null;
                            }
                        });

                        if (!input) {
                            return;
                        }

                        prNumber = parseInt(input);
                    }

                    // PR 상세 정보 가져오기
                    i18n.showInformationMessage('messages.pr.fetchingPR', { number: String(prNumber) });

                    const prDetails = await prInfoService.getPRDetails(prNumber);
                    if (!prDetails) {
                        i18n.showErrorMessage('messages.pr.failedToFetchPR', { number: String(prNumber) });
                        return;
                    }

                    // PR 브랜치로 체크아웃
                    i18n.showInformationMessage('messages.pr.checkingOutPR', { number: String(prNumber) });
                    await prInfoService.checkoutPR(prNumber, prDetails.title);

                    // PR의 변경된 파일들 모두 열기
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (!workspaceFolders || workspaceFolders.length === 0) {
                        i18n.showErrorMessage('messages.noActiveFile');
                        return;
                    }

                    const workspaceRoot = workspaceFolders[0].uri.fsPath;
                    let openedCount = 0;
                    let skippedCount = 0;

                    // 마크다운 파일만 필터링
                    const markdownFiles = prInfoService.filterMarkdownFiles(prDetails.files);

                    // PR의 변경된 파일들 모두 열기 (영문 파일과 함께 열지 않음)
                    for (const file of markdownFiles) {
                        try {
                            const filePath = `${workspaceRoot}/${file.path}`;
                            const fileUri = vscode.Uri.file(filePath);
                            await vscode.commands.executeCommand('vscode.open', fileUri);
                            openedCount++;
                        } catch (error) {
                            console.error(`Failed to open file ${file.path}:`, error);
                            skippedCount++;
                        }
                    }

                    i18n.showInformationMessage('messages.pr.prFetchedSuccess', {
                        number: String(prNumber),
                        title: prDetails.title,
                        count: String(openedCount),
                        author: prDetails.author,
                        state: prDetails.state
                    });

                    if (skippedCount > 0) {
                        console.warn(`Skipped ${skippedCount} file(s) due to errors`);
                    }
                } catch (error) {
                    i18n.showErrorMessage('messages.pr.failedToFetchPRInfo', { error: String(error) });
                    console.error('fetchPRInfo error:', error);
                }
            }
        )
    );
}

export function activate(context: vscode.ExtensionContext) {
    // Status bar manager 초기화
    statusBarManager = new StatusBarManager();

    // Link validator 초기화
    linkValidator = new LinkValidator();

    // Translation Command Manager 초기화
    translationCommandManager = new TranslationCommandManager();

    // Scroll Sync Manager 초기화
    scrollSyncManager = new ScrollSyncManager();

    // PR Info Service 초기화
    prInfoService = new PRInfoService();

    // Activity Bar 뷰 프로바이더 등록
    const provider = new TranslationViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('kubelingoassist-view', provider)
    );

    // Commands 모듈에 의존성 설정
    translationCommandManager.setDependencies(statusBarManager, provider, prInfoService);

    // Commands 등록
    translationCommandManager.registerCommands(context);
    registerPRCommands(context);

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