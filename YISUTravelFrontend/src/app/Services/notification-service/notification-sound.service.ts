import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  private notificationSound!: HTMLAudioElement;
  private transferSound!: HTMLAudioElement;
  private userInteracted = false;
  private permissionStatus$ = new BehaviorSubject<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    default: true
  });
  private mutedUntil: number | null = null;

  // Öffentliche Observable für Komponenten
  public permissionStatus = this.permissionStatus$.asObservable();

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    this.setupAudioSources();
    this.setupVisibilityTracking();
    this.setupFocusTracking();
    this.initializePermissions();
    this.setupUserInteractionListener();
  }

  private setupAudioSources(): void {
    try {
      this.notificationSound = new Audio('http://localhost:8000/storage/sounds/notification.mp3');
      this.notificationSound.preload = 'auto';
      this.notificationSound.volume = 0.7;

      this.transferSound = new Audio('http://localhost:8000/storage/sounds/transfer.mp3');
      this.transferSound.preload = 'auto';
      this.transferSound.volume = 0.8;

      this.transferSound.addEventListener('error', () => {
        console.log('Transfer sound not available, using notification sound as fallback');
        this.transferSound = this.notificationSound;
      });

    } catch (error) {
      console.error('Error initializing audio sources:', error);
      this.notificationSound = new Audio();
      this.transferSound = new Audio();
    }
  }

  private setupVisibilityTracking(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
        console.log('Tab visibility changed:', this.isTabVisible ? 'visible' : 'hidden');
      });
    }
  }

  private setupFocusTracking(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.isWindowFocused = true;
        console.log('Window focused');
      });

      window.addEventListener('blur', () => {
        this.isWindowFocused = false;
        console.log('Window blurred');
      });
    }
  }

  private setupUserInteractionListener(): void {
    if (typeof document !== 'undefined') {
      const enableInteraction = () => {
        this.userInteracted = true;
        console.log('User interaction detected - audio enabled');
      };

      document.addEventListener('click', enableInteraction, { once: true });
      document.addEventListener('keydown', enableInteraction, { once: true });
      document.addEventListener('touchstart', enableInteraction, { once: true });
    }
  }

  private async initializePermissions(): Promise<void> {
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
      console.warn('Browser unterstützt keine Benachrichtigungen');
      return 'denied';
    }

    // ✅ WICHTIG: userInteracted auf true setzen falls noch nicht geschehen
    this.userInteracted = true;

    try {
      console.log('🔔 Requesting notification permission...');
      console.log('📊 Current permission before request:', Notification.permission);

      // ✅ WICHTIG: Warte auf Browser-Dialog
      const permission = await Notification.requestPermission();

      console.log('📊 Permission after user decision:', permission);
      console.log('📊 Notification.permission from browser:', Notification.permission);

      // ✅ Verwende immer den aktuellen Browser-Wert
      this.notificationPermission = Notification.permission;

      // ✅ WICHTIG: Permission Status sofort aktualisieren
      this.updatePermissionStatus();

      console.log('✅ Final permission status:', {
        servicePermission: this.notificationPermission,
        browserPermission: Notification.permission,
        hasPermission: this.hasPermission,
        granted: this.notificationPermission === 'granted'
      });

      return this.notificationPermission;
    } catch (error) {
      console.error('❌ Fehler beim Anfordern der Berechtigung:', error);
      this.notificationPermission = 'denied';
      this.updatePermissionStatus();
      return 'denied';
    }
  }

  // ✅ KORRIGIERTE Sound-Methoden - jetzt mit expliziter Kontrolle
  playNotificationSound(): void {
    this.playAudioNotification(this.notificationSound, 'notification', false);
  }

  playTransferSound(): void {
    this.playAudioNotification(this.transferSound, 'transfer', true); // Transfer immer abspielen
  }

  playNotificationSoundForce(): void {
    this.playAudioNotification(this.notificationSound, 'forced-notification', true);
  }

  // ✅ NEUE Methoden für kontextabhängige Sounds
  playNotificationSoundIfTabInactive(): void {
    if (!this.isTabVisible || !this.isWindowFocused) {
      console.log('🔔 Tab inaktiv - spiele Sound ab');
      this.playAudioNotification(this.notificationSound, 'notification-tab-inactive', true);
    } else {
      console.log('Tab ist aktiv - Sound übersprungen');
    }
  }

  // ✅ KORRIGIERTE playAudioNotification mit expliziter forcePlay Option
  private playAudioNotification(audio: HTMLAudioElement, type: string, forcePlay: boolean = false): void {
    if (!this.userInteracted) {
      console.warn(`${type} sound nicht abgespielt - keine Benutzerinteraktion`);
      return;
    }

    if (this.isCurrentlyMuted()) {
      console.log(`${type} sound übersprungen - stummgeschaltet`);
      return;
    }

    // ✅ Nur prüfen wenn nicht forciert
    if (!forcePlay && this.isTabVisible && this.isWindowFocused) {
      console.log(`${type} sound übersprungen - Tab ist aktiv und fokussiert`);
      return;
    }

    try {
      audio.currentTime = 0;
      audio.play().catch(e => {
        console.warn(`${type} sound konnte nicht abgespielt werden:`, e);
        if (type === 'transfer' && this.notificationSound !== audio) {
          this.playAudioNotification(this.notificationSound, 'fallback', forcePlay);
        }
      });
      console.log(`${type} sound abgespielt (force: ${forcePlay}, tabActive: ${this.isVisible})`);
    } catch (error) {
      console.error(`Fehler beim Abspielen des ${type} sounds:`, error);
    }
  }

  // ✅ KORRIGIERTE showNotification - explizite Kontrolle (PUBLIC für externe Aufrufe)
  public async showNotification(options: NotificationOptions, forceShow: boolean = false): Promise<Notification | null> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Browser unterstützt keine Benachrichtigungen');
      return null;
    }

    // ✅ WICHTIG: Permission Status nochmal checken (könnte sich geändert haben)
    if (Notification.permission !== 'granted') {
      console.warn('Keine Berechtigung für Browser-Benachrichtigungen:', Notification.permission);
      return null;
    }

    if (this.isCurrentlyMuted()) {
      console.log('Benachrichtigung übersprungen - stummgeschaltet');
      return null;
    }

    // ✅ GEÄNDERT: Wenn forceShow = true, IMMER anzeigen (auch bei aktivem Tab)
    if (!forceShow && this.isTabVisible && this.isWindowFocused) {
      console.log('Tab ist sichtbar und fokussiert - Browser-Benachrichtigung übersprungen (nicht forciert)');
      return null;
    }

    try {
      console.log('🔔 Creating notification:', options.title, '(force:', forceShow, ')');

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
          console.log('Navigate to:', options.data.route);
        }
      };

      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      console.log(`✅ Browser notification erfolgreich angezeigt (force: ${forceShow}, tabActive: ${this.isVisible})`);
      return notification;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Benachrichtigung:', error);
      return null;
    }
  }

  // ✅ KORRIGIERTE spezifische Notify-Methoden
  async notifyNewMessage(senderName: string, message: string, sessionId?: string): Promise<void> {
    if (this.isCurrentlyMuted()) return;

    // ✅ GEÄNDERT: Sound IMMER abspielen (auch wenn Tab aktiv ist)
    this.playNotificationSoundForce();

    // ✅ GEÄNDERT: Browser-Notification IMMER anzeigen (auch wenn Tab aktiv ist)
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
    }, true); // ✅ GEÄNDERT: forceShow = true (immer anzeigen)
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

    // ✅ GEÄNDERT: Sound IMMER abspielen (auch wenn Tab aktiv ist)
    this.playNotificationSoundForce();

    // ✅ GEÄNDERT: Eindeutiger Tag mit Timestamp
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
    }, true); // ✅ GEÄNDERT: forceShow = true (immer anzeigen)
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
        console.warn('Unbekannter Benachrichtigungstyp:', type);
    }
  }

  closeNotificationsByTag(tag: string): void {
    console.log('Closing notifications with tag:', tag);
  }

  muteNotifications(durationInMinutes: number): void {
    this.mutedUntil = Date.now() + (durationInMinutes * 60 * 1000);
    console.log(`Benachrichtigungen stumm für ${durationInMinutes} Minuten`);
  }

  unmuteNotifications(): void {
    this.mutedUntil = null;
    console.log('Benachrichtigungen wieder aktiv');
  }

  private isCurrentlyMuted(): boolean {
    return this.mutedUntil !== null && Date.now() < this.mutedUntil;
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
