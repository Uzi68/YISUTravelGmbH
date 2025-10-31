import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationSoundService {
  private notificationPermission: NotificationPermission = 'default';
  private isTabVisible = true;
  private isWindowFocused = true;
  private notificationSound?: HTMLAudioElement;
  private transferSound?: HTMLAudioElement;
  private userInteracted = false;
  private permissionStatus$ = new BehaviorSubject<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    default: true
  });
  private mutedUntil: number | null = null;

  // ✅ NEU: Deduplizierungs-Cache für Benachrichtigungen
  // Verhindert doppelte Benachrichtigungen für dieselbe Nachricht innerhalb kurzer Zeit
  private recentNotifications = new Map<string, number>();
  private readonly NOTIFICATION_DEDUP_WINDOW_MS = 3000; // 3 Sekunden Fenster

  // Öffentliche Observable für Komponenten
  public permissionStatus = this.permissionStatus$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeService();
    }
  }

  private initializeService(): void {
    this.setupAudioSources();
    this.setupVisibilityTracking();
    this.setupFocusTracking();
    this.initializePermissions();
    this.setupUserInteractionListener();
  }

  private setupAudioSources(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.notificationSound = new Audio(`${environment.backendUrl}/storage/sounds/notification.mp3`);
      this.notificationSound.preload = 'auto';
      this.notificationSound.volume = 0.7;

      // Transfer sound wird nicht mehr geladen - nur bei Bedarf
      this.transferSound = this.notificationSound; // Fallback auf notification sound

    } catch (error) {
      this.notificationSound = new Audio();
      this.transferSound = new Audio();
    }
  }

  private setupVisibilityTracking(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
      });
    }
  }

  private setupFocusTracking(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.isWindowFocused = true;
      });

      window.addEventListener('blur', () => {
        this.isWindowFocused = false;
      });
    }
  }

  private setupUserInteractionListener(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (typeof document !== 'undefined') {
      const enableInteraction = () => {
        this.userInteracted = true;
        // User interaction detected - audio enabled
      };

      document.addEventListener('click', enableInteraction, { once: true });
      document.addEventListener('keydown', enableInteraction, { once: true });
      document.addEventListener('touchstart', enableInteraction, { once: true });
    }
  }

  private async initializePermissions(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationPermission = Notification.permission;
      this.updatePermissionStatus();
      // ✅ KEINE automatische Permission-Anfrage mehr
      // Wird nur manuell über requestPermission() aufgerufen
    }
  }

  private updatePermissionStatus(): void {
    this.permissionStatus$.next({
      granted: this.notificationPermission === 'granted',
      denied: this.notificationPermission === 'denied',
      default: this.notificationPermission === 'default'
    });
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      // Browser unterstützt keine Benachrichtigungen
      return 'denied';
    }

    // ✅ WICHTIG: userInteracted auf true setzen falls noch nicht geschehen
    this.userInteracted = true;

    try {
      // Requesting notification permission
      // Current permission before request

      // ✅ WICHTIG: Warte auf Browser-Dialog
      const permission = await Notification.requestPermission();

      // Permission after user decision
      // Notification.permission from browser

      // ✅ Verwende immer den aktuellen Browser-Wert
      this.notificationPermission = Notification.permission;

      // ✅ WICHTIG: Permission Status sofort aktualisieren
      this.updatePermissionStatus();

      // Final permission status

      return this.notificationPermission;
    } catch (error) {
      this.notificationPermission = 'denied';
      this.updatePermissionStatus();
      return 'denied';
    }
  }

  // ✅ KORRIGIERTE Sound-Methoden - jetzt mit expliziter Kontrolle
  playNotificationSound(): void {
    if (!this.notificationSound) {
      this.setupAudioSources();
    }
    if (this.notificationSound) {
      this.playAudioNotification(this.notificationSound, 'notification', false);
    }
  }

  playTransferSound(): void {
    if (!this.transferSound) {
      this.setupAudioSources();
    }
    if (this.transferSound) {
      this.playAudioNotification(this.transferSound, 'transfer', true); // Transfer immer abspielen
    }
  }

  playNotificationSoundForce(): void {
    if (!this.notificationSound) {
      this.setupAudioSources();
    }
    if (this.notificationSound) {
      this.playAudioNotification(this.notificationSound, 'forced-notification', true);
    }
  }

  // ✅ NEUE Methoden für kontextabhängige Sounds
  playNotificationSoundIfTabInactive(): void {
    if (!this.notificationSound) {
      this.setupAudioSources();
    }
    if (!this.isTabVisible || !this.isWindowFocused) {
      // Tab inaktiv - spiele Sound ab
      if (this.notificationSound) {
        this.playAudioNotification(this.notificationSound, 'notification-tab-inactive', true);
      }
    } else {
      // Tab ist aktiv - Sound übersprungen
    }
  }

  // ✅ KORRIGIERTE playAudioNotification mit expliziter forcePlay Option
  private playAudioNotification(audio: HTMLAudioElement, type: string, forcePlay: boolean = false): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.userInteracted) {
      return;
    }

    if (this.isCurrentlyMuted()) {
      return;
    }

    // ✅ Nur prüfen wenn nicht forciert
    if (!forcePlay && this.isTabVisible && this.isWindowFocused) {
      return;
    }

    try {
      audio.currentTime = 0;
      audio.play().catch(e => {
        if (type === 'transfer' && this.notificationSound && this.notificationSound !== audio) {
          this.playAudioNotification(this.notificationSound, 'fallback', forcePlay);
        }
      });
    } catch (error) {
      // Fehler beim Abspielen des sounds
    }
  }

  // ✅ KORRIGIERTE showNotification - explizite Kontrolle (PUBLIC für externe Aufrufe)
  public async showNotification(options: NotificationOptions, forceShow: boolean = false): Promise<Notification | null> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      // Browser unterstützt keine Benachrichtigungen
      return null;
    }

    // ✅ WICHTIG: Permission Status nochmal checken (könnte sich geändert haben)
    if (Notification.permission !== 'granted') {
      return null;
    }

    if (this.isCurrentlyMuted()) {
      return null;
    }

    // ✅ GEÄNDERT: Wenn forceShow = true, IMMER anzeigen (auch bei aktivem Tab)
    if (!forceShow && this.isTabVisible && this.isWindowFocused) {
      return null;
    }

    try {
      // Creating notification

      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/assets/icons/chat-icon.png',
        tag: options.tag || 'chat-notification',
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data
      });

      notification.onclick = (event) => {
        event.preventDefault();
        if (typeof window !== 'undefined') {
          window.focus();
        }
        notification.close();

        if (options.data?.route) {
          // Navigate to route
        }
      };

      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Browser notification erfolgreich angezeigt
      return notification;
    } catch (error) {
      return null;
    }
  }

  // ✅ KORRIGIERTE spezifische Notify-Methoden
  async notifyNewMessage(senderName: string, message: string, sessionId?: string): Promise<void> {
    // Processing new message notification

    if (this.isCurrentlyMuted()) return;

    // ✅ NEU: Deduplizierung - verhindert doppelte Benachrichtigungen für dieselbe Nachricht
    const dedupKey = `msg-${sessionId}-${message.substring(0, 50)}`;
    const now = Date.now();
    const lastNotificationTime = this.recentNotifications.get(dedupKey);

    if (lastNotificationTime && (now - lastNotificationTime) < this.NOTIFICATION_DEDUP_WINDOW_MS) {
      // Duplicate notification BLOCKED
      return; // Blockiere doppelte Benachrichtigung
    }

    // ✅ Merke diese Benachrichtigung
    this.recentNotifications.set(dedupKey, now);

    // ✅ Cleanup: Entferne alte Einträge aus dem Cache (älter als Dedup-Fenster)
    this.cleanupNotificationCache();

    // Sending notification (NOT blocked)

    // ✅ Sound nur wenn Tab inaktiv
    this.playNotificationSoundIfTabInactive();

    // ✅ Browser-Notification nur wenn Tab inaktiv
    // ✅ WICHTIG: Eindeutiger Tag mit Timestamp, damit mehrere Notifications angezeigt werden
    const uniqueTag = `message-${sessionId || 'unknown'}-${Date.now()}`;
    await this.showNotification({
      title: `Neue Nachricht von ${senderName}`,
      body: message.length > 50 ? message.substring(0, 50) + '...' : message,
      icon: '/assets/icons/message-icon.png',
      tag: uniqueTag,
      requireInteraction: false,
      data: {
        type: 'new_message',
        sessionId: sessionId,
        route: '/admin/dashboard'
      }
    }, false); // forceShow = false (nur wenn Tab inaktiv)
  }

  async notifyTransfer(fromAgent: string, chatInfo: string, sessionId: string): Promise<void> {
    if (this.isCurrentlyMuted()) return;

    // Transfer ist immer wichtig - immer Sound + Notification
    this.playTransferSound(); // Transfer wird immer abgespielt
    await this.showNotification({
      title: 'Chat übertragen',
      body: `${fromAgent} hat Ihnen einen Chat übertragen: ${chatInfo}`,
      icon: '/assets/icons/transfer-icon.png',
      tag: `transfer-${sessionId}`,
      requireInteraction: true,
      data: {
        type: 'chat_transfer',
        sessionId: sessionId,
        fromAgent: fromAgent,
        route: '/admin/dashboard'
      }
    }, true); // forceShow = true für Transfer
  }

  async notifyNewChatRequest(customerName: string, sessionId: string): Promise<void> {
    if (this.isCurrentlyMuted()) return;

    // ✅ Sound nur wenn Tab inaktiv
    this.playNotificationSoundIfTabInactive();

    // ✅ Eindeutiger Tag mit Timestamp
    const uniqueTag = `chat-request-${sessionId}-${Date.now()}`;
    await this.showNotification({
      title: '🔔 Neue Chat-Anfrage',
      body: `${customerName} wartet auf Chat-Übernahme`,
      icon: '/assets/icons/chat-request-icon.png',
      tag: uniqueTag,
      requireInteraction: false,
      data: {
        type: 'chat_request',
        sessionId: sessionId,
        customerName: customerName,
        route: '/admin/dashboard'
      }
    }, false); // forceShow = false (nur wenn Tab inaktiv)
  }

  // ✅ KOMPLETT ÜBERARBEITETE notify-Methode
  async notify(type: 'message' | 'transfer' | 'request' | 'escalation', data: any): Promise<void> {
    if (this.isCurrentlyMuted()) return;

    switch (type) {
      case 'message':
        await this.notifyNewMessage(data.senderName, data.message, data.sessionId);
        break;

      case 'transfer':
        await this.notifyTransfer(data.fromAgent, data.chatInfo, data.sessionId);
        break;

      case 'request':
      case 'escalation':
        await this.notifyNewChatRequest(data.customerName || 'Ein Kunde', data.sessionId);
        break;

      default:
        // Unbekannter Benachrichtigungstyp
    }
  }

  closeNotificationsByTag(tag: string): void {
    // Closing notifications with tag
  }

  muteNotifications(durationInMinutes: number): void {
    this.mutedUntil = Date.now() + (durationInMinutes * 60 * 1000);
  }

  unmuteNotifications(): void {
    this.mutedUntil = null;
  }

  private isCurrentlyMuted(): boolean {
    return this.mutedUntil !== null && Date.now() < this.mutedUntil;
  }

  /**
   * ✅ Cleanup-Methode: Entfernt alte Benachrichtigungs-Einträge aus dem Cache
   * Wird bei jeder neuen Benachrichtigung aufgerufen um Memory-Leaks zu vermeiden
   */
  private cleanupNotificationCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Finde alle Einträge die älter sind als das Dedup-Fenster
    this.recentNotifications.forEach((timestamp, key) => {
      if (now - timestamp > this.NOTIFICATION_DEDUP_WINDOW_MS) {
        keysToDelete.push(key);
      }
    });

    // Entferne alte Einträge
    keysToDelete.forEach(key => this.recentNotifications.delete(key));

    if (keysToDelete.length > 0) {
      // Cleaned up old notification cache entries
    }
  }

  // Getter-Methoden für externe Komponenten
  get isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  get hasPermission(): boolean {
    return this.notificationPermission === 'granted';
  }

  get currentPermission(): NotificationPermission {
    return this.notificationPermission;
  }

  get isVisible(): boolean {
    return this.isTabVisible && this.isWindowFocused;
  }

  get isMuted(): boolean {
    return this.isCurrentlyMuted();
  }
}
