import {Injectable, NgZone} from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import {NotificationSoundService} from "../notification-service/notification-sound.service";

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo<any>;
  }
}

@Injectable({
  providedIn: 'root'
})
export class PusherService {
  private echo: any;
  private activeSubscriptions: Map<string, { channel: any; subscription: { stop: () => void } }> = new Map();
  private subscribedTo: Set<string> = new Set();
  private activeListeners = new Map<string, () => void>();
  private isTabActive = true;
  private visibilityChangeHandler: () => void = () => {};


  constructor(private ngZone: NgZone, private notificationSound: NotificationSoundService) {
    this.initializePusher();
    this.setupTabVisibilityListener();
  }


  private setupTabVisibilityListener(): void {
    this.visibilityChangeHandler = () => {
      this.isTabActive = !document.hidden;
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }



  private initializePusher() {
    if (typeof window !== 'undefined') {
      window.Pusher = Pusher;

      this.echo = new Echo({
        broadcaster: 'pusher',
        key: '1d031260d5bf381a1f39',
        cluster: 'eu',
        forceTLS: true,
        encrypted: true,
        authEndpoint: '/broadcasting/auth',
        withCredentials: true,
      });
      // Verbindungsüberwachung

      this.echo.connector.pusher.connection.bind('connecting', () => {
     //   console.log('Pusher: Verbindung wird hergestellt...');
      });

      this.echo.connector.pusher.connection.bind('connected', () => {
    //    console.log('Pusher: Erfolgreich verbunden!');
    //    console.log('Socket ID:', this.echo.socketId());
      });

      this.echo.connector.pusher.connection.bind('failed', (err: any) => {
    //    console.error('Pusher Verbindungsfehler:', err);
      });

      window.Echo = this.echo;
    }
  }


// pusher.service.ts
  listenToChannel<T>(
    channelName: string,
    event: string,
    callback: (data: T) => void,
    options: { notify: boolean } = { notify: true }
  ): { stop: () => void } {
    const eventKey = `${channelName}:${event}`;

    // Bestehenden Listener stoppen
    if (this.activeListeners.has(eventKey)) {
      this.activeListeners.get(eventKey)!();
      this.activeListeners.delete(eventKey);
    }

    const wrappedCallback = (data: T) => {
      this.ngZone.run(() => {
        // ✅ DEAKTIVIERT: Alte Notification-Logik (wird jetzt von NotificationSoundService übernommen)
        // Die Benachrichtigungen werden jetzt zentral über den NotificationSoundService
        // im admin-dashboard.component.ts handleIncomingMessageGlobal() verwaltet
        // if (options.notify && this.shouldNotify()) {
        //   this.handleNotification(data);
        // }
        callback(data);
      });
    };

    const channel = this.echo.channel(channelName);

    // Event-Name mit Punkt prefixen für Laravel Echo
    const formattedEvent = event.startsWith('.') ? event : `.${event}`;

    channel.listen(formattedEvent, wrappedCallback);

    // Stop-Funktion definieren
    const stop = () => {
      try {
        channel.stopListening(formattedEvent, wrappedCallback);
      } catch (err) {
        console.error(`Fehler beim Stoppen des Listeners ${eventKey}:`, err);
      }
    };

    this.activeListeners.set(eventKey, stop);
    return { stop };
  }

  private shouldNotify(): boolean {
    return !this.isTabActive;
  }

  // Neue Methode hinzufügen
  listenToAssignmentUpdates<T>(
    channelName: string,
    callback: (data: T) => void
  ): { stop: () => void } {

    // Listener für Assignment-Updates
    const assignmentSub = this.listenToChannel(
      channelName,
      'chat.assigned',
      callback,
      { notify: false }
    );

    // Listener für Transfer-Updates
    const transferSub = this.listenToChannel(
      channelName,
      'chat.transferred',
      callback,
      { notify: false }
    );

    return {
      stop: () => {
        assignmentSub.stop();
        transferSub.stop();
      }
    };
  }

  private handleNotification(data: any): void {
    // Sound abspielen
    this.notificationSound.playNotificationSound();

    // Browser-Benachrichtigung anzeigen
    this.showBrowserNotification(data);
  }

  private async showBrowserNotification(data: any): Promise<void> {
    const permission = await this.requestNotificationPermission();

    if (permission !== 'granted') return;

    const messageInfo = this.extractMessageInfo(data);

    new Notification(messageInfo.title, {
      body: messageInfo.body,
      icon: messageInfo.icon,
      tag: 'chat-notification'
    });
  }

  private extractMessageInfo(data: any): { title: string; body: string; icon: string } {
    return {
      title: 'Neue Nachricht',
      body: data.message?.text || 'Sie haben eine neue Nachricht erhalten',
      icon: '/assets/icons/notification-icon.png'
    };
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    this.cleanupPusherSubscriptions();
  }


  private cleanupPusherSubscriptions(): void {
    // Bereinige alle aktiven Listener
    this.activeListeners.forEach((stop) => stop());
    this.activeListeners.clear();
  }

  requestNotificationPermission(): Promise<NotificationPermission> {
    return new Promise((resolve) => {
      if (!('Notification' in window)) {
        resolve('denied');
        return;
      }

      if (Notification.permission !== 'default') {
        resolve(Notification.permission);
        return;
      }

      Notification.requestPermission().then(permission => {
        resolve(permission);
      });
    });
  }


}




/*
*     this.notificationSound = new Audio('http://localhost:8000/storage/sounds/notification.mp3');
   // this.notificationSound = new Audio('https://backend.yisu-travel.de/storage/sounds/notification.mp3');
* */
