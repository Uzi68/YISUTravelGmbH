import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import {
  ActionPerformed,
  Channel,
  PushNotificationSchema,
  PushNotifications,
  Token
} from '@capacitor/push-notifications';
import { Badge } from '@capawesome/capacitor-badge';
import { environment } from '../../../environments/environment';
import { AuthService } from '../AuthService/auth.service';
import { firstValueFrom } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StaffPushNotificationService {
  private readonly deviceIdStorageKey = 'yisu_push_device_id';
  private readonly pushSubscriptionUrl = `${environment.apiUrl}/push-subscriptions`;
  private readonly pendingChatStorageKey = 'yisu_pending_push_chat';
  private readonly badgeStorageKey = 'yisu_push_badge_count';
  private readonly isNativePlatform = Capacitor.getPlatform() !== 'web';
  private readonly notificationChannelId = 'chat-messages';
  private initialized = false;
  private isRegistering = false;
  private currentToken?: string;
  private badgeSupportAvailable?: boolean;
  private lastBadgeCount = 0;
  private notificationChannelCreated = false;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly zone: NgZone,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    this.authService.getAuthenticated()
      .pipe(distinctUntilChanged())
      .subscribe((isAuthenticated) => {
        if (isAuthenticated) {
          this.registerForPushes();
        } else {
          this.unregisterFromBackend();
        }
      });
  }

  initialize(): void {
    if (!this.canUsePush() || this.initialized) {
      return;
    }

    this.initialized = true;

    this.restoreBadgeCount();

    void this.ensureAndroidNotificationChannel();

    PushNotifications.addListener('registration', (token: Token) => {
      this.currentToken = token.value;
      this.syncTokenWithBackend(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (_notification: PushNotificationSchema) => {
      // Optional: handle foreground display later if needed
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (event: ActionPerformed) => {
      const payload = event.notification?.data as Record<string, unknown> | undefined;
      const identifier = payload?.['session_id'] ?? payload?.['chat_id'];
      const chatId = identifier ? String(identifier) : null;

      if (chatId) {
        this.storePendingChatIdentifier(chatId);
      }

      this.zone.run(() => {
        this.router.navigate(['/admin-dashboard'], chatId ? {
          queryParams: { chatId }
        } : undefined);
      });
    });
  }

  private async ensureAndroidNotificationChannel(): Promise<void> {
    if (!this.isNativePlatform || this.notificationChannelCreated) {
      return;
    }

    try {
      const channel: Channel = {
        id: this.notificationChannelId,
        name: 'Chat Nachrichten',
        description: 'Benachrichtigungen für neue Besucher-Nachrichten',
        importance: 5,
        sound: 'default',
        vibration: true,
        lights: true
      };
      await PushNotifications.createChannel(channel);
      this.notificationChannelCreated = true;
    } catch (error) {
      console.warn('Failed to create Android notification channel', error);
    }
  }

  private async registerForPushes(): Promise<void> {
    if (!this.canUsePush() || this.isRegistering) {
      return;
    }

    this.initialize();

    const isStaff = await this.userIsStaff();
    if (!isStaff) {
      return;
    }

    this.isRegistering = true;
    try {
      const permissionStatus = await PushNotifications.checkPermissions();
      if (permissionStatus.receive !== 'granted') {
        const requestStatus = await PushNotifications.requestPermissions();
        if (requestStatus.receive !== 'granted') {
          return;
        }
      }
      await PushNotifications.register();
    } catch (error) {
      console.error('Push registration failed', error);
    } finally {
      this.isRegistering = false;
    }
  }

  private async userIsStaff(): Promise<boolean> {
    try {
      const { role } = await firstValueFrom(this.authService.getUserRole());
      return Array.isArray(role) && (role.includes('Admin') || role.includes('Agent'));
    } catch (error) {
      return false;
    }
  }

  private syncTokenWithBackend(token: string): void {
    const payload = {
      token,
      device_id: this.ensureDeviceId(),
      device_name: this.getDeviceName(),
      platform: Capacitor.getPlatform(),
      app_version: environment.appVersion
    };

    this.http.post(this.pushSubscriptionUrl, payload, {
      withCredentials: true
    }).subscribe({
      error: (error) => {
        console.error('Failed to sync push token', error);
      }
    });
  }

  private unregisterFromBackend(): void {
    if (!this.canUsePush()) {
      return;
    }

    const deviceId = this.getStoredDeviceId();
    if (!deviceId) {
      return;
    }

    this.http.delete(`${this.pushSubscriptionUrl}/device/${deviceId}`, {
      withCredentials: true
    }).subscribe({
      next: () => {
        this.currentToken = undefined;
        this.clearBadgeCount();
      },
      error: (error) => {
        console.error('Failed to remove push token', error);
      }
    });
  }

  private ensureDeviceId(): string {
    if (!this.isBrowser()) {
      return 'server';
    }

    const existingId = this.getStoredDeviceId();
    if (existingId) {
      return existingId;
    }

    const newId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15);

    localStorage.setItem(this.deviceIdStorageKey, newId);
    return newId;
  }

  private getStoredDeviceId(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return localStorage.getItem(this.deviceIdStorageKey);
  }

  private getDeviceName(): string {
    if (this.isBrowser() && typeof navigator !== 'undefined') {
      return navigator.userAgent.substring(0, 180);
    }

    return Capacitor.getPlatform();
  }

  private canUsePush(): boolean {
    return this.isNativePlatform && this.isBrowser();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  public consumePendingChatIdentifier(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    const identifier = localStorage.getItem(this.pendingChatStorageKey);
    if (identifier) {
      localStorage.removeItem(this.pendingChatStorageKey);
    }
    return identifier;
  }

  public updateBadgeCount(unreadCount: number): void {
    if (!this.isNativePlatform) {
      return;
    }

    const normalized = Math.max(0, Math.min(9999, unreadCount || 0));

    if (normalized === this.lastBadgeCount) {
      return;
    }

    if (this.isBrowser()) {
      localStorage.setItem(this.badgeStorageKey, String(normalized));
    }

    void this.applyBadgeCount(normalized);
  }

  public clearBadgeCount(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.badgeStorageKey);
    }
    void this.applyBadgeCount(0);
  }

  private async applyBadgeCount(count: number): Promise<void> {
    if (!this.canUsePush()) {
      return;
    }

    const isSupported = await this.ensureBadgeSupport();
    if (!isSupported) {
      return;
    }

    const hasPermission = await this.ensureBadgePermission();
    if (!hasPermission) {
      return;
    }

    try {
      if (count === 0) {
        await Badge.clear();
      } else {
        await Badge.set({ count });
      }
      this.lastBadgeCount = count;
    } catch (error) {
      console.warn('Failed to update badge count', error);
    }
  }

  private async ensureBadgeSupport(): Promise<boolean> {
    if (this.badgeSupportAvailable !== undefined) {
      return this.badgeSupportAvailable;
    }

    try {
      const { isSupported } = await Badge.isSupported();
      this.badgeSupportAvailable = isSupported;
      return isSupported;
    } catch (error) {
      console.warn('Badge support check failed', error);
      this.badgeSupportAvailable = false;
      return false;
    }
  }

  private async ensureBadgePermission(): Promise<boolean> {
    try {
      const status = await Badge.checkPermissions();
      if (status.display === 'granted') {
        return true;
      }

      if (status.display === 'denied') {
        return false;
      }

      const requested = await Badge.requestPermissions();
      return requested.display === 'granted';
    } catch (error) {
      console.warn('Badge permission check failed', error);
      return false;
    }
  }

  private storePendingChatIdentifier(identifier: string): void {
    if (!this.isBrowser()) {
      return;
    }

    try {
      localStorage.setItem(this.pendingChatStorageKey, identifier);
    } catch (error) {
      console.warn('Failed to store pending chat identifier', error);
    }
  }

  private restoreBadgeCount(): void {
    if (!this.isBrowser()) {
      return;
    }

    const stored = Number(localStorage.getItem(this.badgeStorageKey) ?? 0);
    if (stored > 0) {
      void this.applyBadgeCount(stored);
    }
  }
}
