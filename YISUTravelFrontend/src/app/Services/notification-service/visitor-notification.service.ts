import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface VisitorNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class VisitorNotificationService {
  private notificationPermission: NotificationPermission = 'default';
  private isTabVisible = true;
  private isWindowFocused = true;
  private notificationSound!: HTMLAudioElement;
  private userInteracted = false;
  private permissionRequested = false;
  private notificationsEnabled = false; // ✅ NEU: Nur aktivieren wenn explizit gewünscht

  // Öffentliche Observable für Permission Status
  private permissionStatus$ = new BehaviorSubject({
    granted: false,
    denied: false,
    default: true
  });

  public permissionStatus = this.permissionStatus$.asObservable();

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    this.setupAudioSource();
    this.setupVisibilityTracking();
    this.setupFocusTracking();
    this.setupUserInteractionListener();
    this.initializePermissions();
  }

  private setupAudioSource(): void {
    try {
      this.notificationSound = new Audio('http://localhost:8000/storage/sounds/notification.mp3');
      this.notificationSound.preload = 'auto';
      this.notificationSound.volume = 0.6;
    } catch (error) {
      console.error('Error initializing notification sound:', error);
      this.notificationSound = new Audio();
    }
  }

  private setupVisibilityTracking(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
        console.log('Visitor tab visibility changed:', this.isTabVisible ? 'visible' : 'hidden');
      });
    }
  }

  private setupFocusTracking(): void {
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
    if (typeof document !== 'undefined') {
      const enableInteraction = () => {
        this.userInteracted = true;
        console.log('Visitor interaction detected - audio enabled');
        // ✅ ENTFERNT: Keine automatische Permission-Anfrage mehr
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
    }
  }

  private updatePermissionStatus(): void {
    this.permissionStatus$.next({
      granted: this.notificationPermission === 'granted',
      denied: this.notificationPermission === 'denied',
      default: this.notificationPermission === 'default'
    });
  }

  // ✅ NEU: Explizite Aktivierung der Notifications
  async enableNotifications(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (!this.userInteracted) {
      console.warn('Cannot request notifications without user interaction');
      return false;
    }

    this.permissionRequested = true;

    try {
      this.notificationPermission = await Notification.requestPermission();
      this.updatePermissionStatus();

      if (this.notificationPermission === 'granted') {
        this.notificationsEnabled = true;
        console.log('✅ Visitor notifications enabled');
        return true;
      } else {
        console.log('❌ Visitor notifications denied');
        return false;
      }
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }

  // ✅ KORRIGIERT: Sound nur wenn Tab inaktiv UND Notifications aktiviert
  private playNotificationSoundIfTabInactive(): void {
    if (!this.userInteracted) {
      console.log('Visitor sound skipped - no user interaction yet');
      return;
    }

    if (!this.notificationsEnabled) {
      console.log('Visitor sound skipped - notifications not enabled');
      return;
    }

    if (!this.isVisible) {
      this.playNotificationSound();
    } else {
      console.log('Visitor sound skipped - tab is active');
    }
  }

  private playNotificationSound(): void {
    try {
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch(e => {
        console.log('Could not play visitor notification sound:', e);
      });
      console.log('Visitor notification sound played');
    } catch (error) {
      console.error('Error playing visitor notification sound:', error);
    }
  }

  // ✅ KORRIGIERT: Browser Notification nur wenn Tab inaktiv UND aktiviert
  private async showNotification(options: VisitorNotificationOptions): Promise<Notification | null> {
    if (!this.isSupported || this.notificationPermission !== 'granted') {
      return null;
    }

    if (!this.notificationsEnabled) {
      console.log('Browser notification skipped - not enabled');
      return null;
    }

    // ✅ WICHTIG: Nur anzeigen wenn Tab nicht sichtbar
    if (this.isVisible) {
      console.log('Browser notification skipped - visitor tab is active');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/assets/icons/chat-icon.png',
        tag: options.tag || 'visitor-chat-notification',
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
      };

      setTimeout(() => {
        notification.close();
      }, 5000);

      console.log('Visitor browser notification shown');
      return notification;
    } catch (error) {
      console.error('Error showing visitor notification:', error);
      return null;
    }
  }

  // ✅ KORRIGIERT: Hauptmethode für Agent-Nachrichten
  async notifyAgentMessage(agentName: string, message: string): Promise<void> {
    // Nur wenn Notifications explizit aktiviert wurden
    if (!this.notificationsEnabled) {
      console.log('Agent message notification skipped - not enabled');
      return;
    }

    console.log('Processing agent message notification:', {
      agentName,
      message: message.substring(0, 30) + '...',
      isVisible: this.isVisible,
      notificationsEnabled: this.notificationsEnabled
    });

    // Sound abspielen (nur wenn Tab inaktiv)
    this.playNotificationSoundIfTabInactive();

    // Browser Notification (nur wenn Tab inaktiv)
    await this.showNotification({
      title: `Neue Nachricht von ${agentName}`,
      body: message.length > 60 ? message.substring(0, 60) + '...' : message,
      icon: '/assets/icons/agent-icon.png',
      tag: 'agent-message',
      requireInteraction: false,
      data: {
        type: 'agent_message',
        agentName: agentName
      }
    });
  }

  // ✅ KORRIGIERT: System-Nachrichten
  async notifySystemMessage(title: string, message: string): Promise<void> {
    if (!this.notificationsEnabled) {
      return;
    }

    // Nur Sound, keine Browser-Notification für System-Messages
    this.playNotificationSoundIfTabInactive();
  }

  // ✅ KORRIGIERT: Chat-Assignment Notification
  async notifyAgentAssigned(agentName: string): Promise<void> {
    if (!this.notificationsEnabled) {
      return;
    }

    console.log('Agent assigned notification:', agentName);

    this.playNotificationSoundIfTabInactive();

    await this.showNotification({
      title: 'Mit Mitarbeiter verbunden',
      body: `${agentName} ist jetzt für Sie da`,
      icon: '/assets/icons/agent-connected-icon.png',
      tag: 'agent-assigned',
      requireInteraction: false,
      data: {
        type: 'agent_assigned',
        agentName: agentName
      }
    });
  }

  // Getter für externe Komponenten
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

  // ✅ NEU: Status ob Notifications aktiviert sind
  get areNotificationsEnabled(): boolean {
    return this.notificationsEnabled;
  }

  // ✅ KORRIGIERT: Test-Methode
  testNotification(): void {
    console.log('Testing visitor notifications...', {
      isVisible: this.isVisible,
      hasPermission: this.hasPermission,
      userInteracted: this.userInteracted,
      notificationsEnabled: this.notificationsEnabled
    });

    if (!this.notificationsEnabled) {
      console.log('❌ Test skipped - notifications not enabled. Call enableNotifications() first.');
      return;
    }

    this.notifyAgentMessage('Test Agent', 'Dies ist eine Test-Nachricht');
  }

  // ✅ NEU: Notifications deaktivieren
  disableNotifications(): void {
    this.notificationsEnabled = false;
    console.log('Visitor notifications disabled');
  }
}
