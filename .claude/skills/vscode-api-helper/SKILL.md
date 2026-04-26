---
name: vscode-api-helper
description: |
  VS Code Extension API 사용 패턴을 KubeLingoAssist 프로젝트의 기존 코드 스타일에 맞게 안내하는 skill. 새 command, webview, diagnostic, code action, status bar, event listener 등을 추가할 때 사용한다. "command 어떻게 등록해?", "webview에 메시지 보내려면?", "diagnostic 추가하는 법", "status bar 업데이트", "QuickPick 사용법" 같은 질문이나 VS Code API를 사용하는 코드를 작성할 때 트리거한다.
---

# VS Code API Helper for KubeLingoAssist

VS Code Extension API를 프로젝트의 기존 패턴에 맞게 사용하도록 안내한다. 이 프로젝트는 VS Code ^1.75.0을 타겟하고, TypeScript 4.9.5로 컴파일한다.

## 프로젝트에서 사용 중인 VS Code API 패턴

### Command 등록

프로젝트의 command 등록은 두 곳에서 이루어진다:

**TranslationCommandManager (기존 명령어)**
```typescript
// src/features/translation/TranslationCommandManager.ts
registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('kubelingoassist.commandName', (args) =>
      this.handlerMethod(args)
    )
  );
}
```

**extension.ts의 registerPRCommands (PR 관련)**
```typescript
// src/core/extension.ts
function registerPRCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('kubelingoassist.fetchPRInfo', async () => {
      // ...
    })
  );
}
```

새 command 추가 시:
1. `package.json`의 `contributes.commands`에 등록
2. keybinding이 필요하면 `contributes.keybindings`에 추가
3. 핸들러를 적절한 위치에 구현
4. `context.subscriptions.push()`로 등록 — dispose 자동 관리

### QuickPick (파일/옵션 선택)

프로젝트에서 자주 쓰는 패턴:
```typescript
const items = files.map(file => ({
  label: file.path,
  description: i18n.t('ui.fileStatus.translation'),
  detail: i18n.t('ui.fromPR', { number: String(prNumber) }),
  // custom 필드 추가 가능
  filePath: file.absPath,
}));

const selected = await vscode.window.showQuickPick(items, {
  placeHolder: i18n.t('ui.selectFileToReview'),
  matchOnDescription: true,
  matchOnDetail: true,
});

if (!selected) return;  // 사용자가 취소
```

모든 사용자 facing 텍스트는 `i18n.t()` 또는 `i18n.showXxxMessage()`를 사용한다.

### InputBox

```typescript
const input = await vscode.window.showInputBox({
  prompt: i18n.t('messages.pr.enterPRNumber'),
  placeHolder: '123',
  validateInput: (value) => {
    const num = parseInt(value);
    if (isNaN(num) || num <= 0) {
      return i18n.t('messages.pr.enterValidPRNumber');
    }
    return null;  // valid
  },
});
```

### Webview (React UI)

프로젝트는 sidebar webview를 사용한다:

```typescript
// 등록 (extension.ts)
const provider = new TranslationViewProvider(context.extensionUri);
context.subscriptions.push(
  vscode.window.registerWebviewViewProvider('kubelingoassist-view', provider)
);
```

Webview ↔ Extension 메시지 통신:
```typescript
// Extension → Webview
provider.broadcastState({ syncScrollEnabled, kubelingoEnabled, mode });

// Webview → Extension (webview-providers.ts에서 처리)
webview.onDidReceiveMessage(message => {
  switch (message.command) {
    case 'toggleSyncScroll':
      vscode.commands.executeCommand('kubelingoassist.toggleSyncScroll');
      break;
  }
});
```

UI는 `ui/` 디렉토리에 React 18 + Vite로 구성되어 있다.

### Diagnostics & CodeAction

LinkValidator 패턴:
```typescript
// DiagnosticCollection 생성
private diagnosticCollection = vscode.languages.createDiagnosticCollection('kubelingoassist');

// Diagnostic 추가
const diagnostic = new vscode.Diagnostic(
  range,
  message,
  vscode.DiagnosticSeverity.Warning
);
diagnostic.code = 'untranslated-link';
diagnostics.push(diagnostic);
this.diagnosticCollection.set(document.uri, diagnostics);

// CodeActionProvider 등록
vscode.languages.registerCodeActionsProvider(
  { scheme: 'file', language: 'markdown' },
  this,
  { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
);
```

### Status Bar

```typescript
// StatusBarManager 패턴
private statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left,
  100
);

// 업데이트
statusBarItem.text = `en → ko (75%)`;
statusBarItem.tooltip = '번역 진행률';
statusBarItem.show();
```

디바운싱 패턴:
```typescript
private debounceTimer: NodeJS.Timeout | undefined;

debouncedRefreshLineCount(): void {
  if (this.debounceTimer) clearTimeout(this.debounceTimer);
  this.debounceTimer = setTimeout(() => this.refreshLineCount(), 300);
}
```

### Event Listeners

```typescript
// 문서 변경
vscode.workspace.onDidChangeTextDocument(event => {
  // event.document, event.contentChanges
});

// 문서 저장
vscode.workspace.onDidSaveTextDocument(document => { });

// 문서 열기
vscode.workspace.onDidOpenTextDocument(document => { });

// 에디터 스크롤 (ScrollSyncManager)
vscode.window.onDidChangeTextEditorVisibleRanges(event => {
  // event.textEditor, event.visibleRanges
});
```

모든 listener는 `context.subscriptions.push()`로 등록해서 extension 비활성화 시 자동 정리한다.

### Split View (Side by Side)

```typescript
// 왼쪽에 영어 원본
await vscode.window.showTextDocument(
  vscode.Uri.file(englishPath),
  { viewColumn: vscode.ViewColumn.One, preview: false }
);

// 오른쪽에 번역 파일
await vscode.window.showTextDocument(
  vscode.Uri.file(translationPath),
  { viewColumn: vscode.ViewColumn.Two, preview: false }
);
```

### Workspace State (영속 상태)

```typescript
// 저장
context.workspaceState.update('keyName', value);

// 로드
const value = context.workspaceState.get<boolean>('keyName', defaultValue);
```

프로젝트에서 저장하는 상태:
- `syncScrollEnabled` — 스크롤 동기화 on/off
- `kubelingoEnabled` — 전체 기능 on/off
- `kubelingoMode` — 'translation' | 'review'

## i18n 사용 규칙

사용자에게 보이는 모든 텍스트는 i18n을 통한다:

```typescript
import { i18n } from '../features/i18n';

// 메시지 표시
i18n.showInformationMessage('messages.syncScrollEnabled');
i18n.showErrorMessage('messages.failedToFetchPR', { number: '123' });

// 문자열 가져오기 (QuickPick 등에서 사용)
const text = i18n.t('ui.selectFileToReview');
```

새 메시지 키를 추가할 때는 `src/features/i18n/resources/en.ts`에 먼저 추가하고, 지원 언어(ko.ts, ja.ts)에도 번역을 추가한다.

## 공식 문서 참조

- VS Code Extension API: https://code.visualstudio.com/api
- VS Code API Reference: https://code.visualstudio.com/api/references/vscode-api
- Extension Guides: https://code.visualstudio.com/api/extension-guides/overview
- Testing Extensions: https://code.visualstudio.com/api/working-with-extensions/testing-extension
