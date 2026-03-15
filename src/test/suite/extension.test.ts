import * as vscode from 'vscode';
import { i18n } from '../../features/i18n';

// Import all separated test suites
import './translation-utils.test';
import './link-validator-basic.test';
import './link-validator-unit.test';
import './code-action-provider.test';
import './integration.test';
import './edge-cases.test';

suite('KubeLingoAssist Extension Test Suite', () => {
  vscode.window.showInformationMessage(i18n.t('ui.test.startingTests'));

  // All individual test suites are automatically loaded via imports above
  // This main test suite serves as the entry point and orchestrator

  test('Test suite initialization', () => {
    // This test ensures the test suite loads correctly
    // Individual functionality tests are in their respective files
  });
});
