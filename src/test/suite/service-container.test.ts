import * as assert from 'assert';
import { ServiceContainer } from '../../core/ServiceContainer';
import { I18n } from '../../features/i18n/i18n';
import { NotificationManager } from '../../features/notifications/NotificationManager';

suite('ServiceContainer Tests', () => {
    let container: ServiceContainer;

    setup(() => {
        ServiceContainer.resetInstance();
        container = ServiceContainer.getInstance();
    });

    teardown(() => {
        ServiceContainer.resetInstance();
    });

    test('should return singleton instance', () => {
        const instance1 = ServiceContainer.getInstance();
        const instance2 = ServiceContainer.getInstance();
        assert.strictEqual(instance1, instance2, 'Should return same instance');
    });

    test('should throw error when getting service before initialization', () => {
        assert.throws(
            () => container.getI18n(),
            /Service "i18n" not initialized/,
            'Should throw error for uninitialized service'
        );
    });

    test('should initialize services correctly', () => {
        container.initialize();

        const i18n = container.getI18n();
        const notificationManager = container.getNotificationManager();

        assert.ok(i18n instanceof I18n, 'Should return I18n instance');
        assert.ok(notificationManager instanceof NotificationManager, 'Should return NotificationManager instance');
    });

    test('should allow setting custom service instances', () => {
        const customI18n = new I18n();
        container.set('i18n', customI18n);

        const retrieved = container.getI18n();
        assert.strictEqual(retrieved, customI18n, 'Should return custom instance');
    });

    test('should reset instance correctly', () => {
        container.initialize();
        const beforeReset = ServiceContainer.getInstance();

        ServiceContainer.resetInstance();
        const afterReset = ServiceContainer.getInstance();

        assert.notStrictEqual(beforeReset, afterReset, 'Should create new instance after reset');
    });

    test('should use generic get method correctly', () => {
        container.initialize();

        const i18n = container.get('i18n');
        const notificationManager = container.get('notificationManager');

        assert.ok(i18n instanceof I18n, 'Generic get should work for i18n');
        assert.ok(notificationManager instanceof NotificationManager, 'Generic get should work for notificationManager');
    });
});
