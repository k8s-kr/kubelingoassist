import { I18n } from '../features/i18n/i18n';
import { NotificationManager } from '../features/notifications/NotificationManager';

export interface Services {
    i18n: I18n;
    notificationManager: NotificationManager;
}

export class ServiceContainer {
    private static instance: ServiceContainer | null = null;
    private services: Partial<Services> = {};

    private constructor() {}

    public static getInstance(): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }

    public static resetInstance(): void {
        ServiceContainer.instance = null;
    }

    public initialize(): void {
        const i18n = new I18n();
        const notificationManager = new NotificationManager(i18n);

        this.services.i18n = i18n;
        this.services.notificationManager = notificationManager;
    }

    public get<K extends keyof Services>(key: K): Services[K] {
        const service = this.services[key];
        if (!service) {
            throw new Error(`Service "${key}" not initialized. Call initialize() first.`);
        }
        return service as Services[K];
    }

    public set<K extends keyof Services>(key: K, service: Services[K]): void {
        this.services[key] = service;
    }

    public getI18n(): I18n {
        return this.get('i18n');
    }

    public getNotificationManager(): NotificationManager {
        return this.get('notificationManager');
    }
}

export const container = ServiceContainer.getInstance();
