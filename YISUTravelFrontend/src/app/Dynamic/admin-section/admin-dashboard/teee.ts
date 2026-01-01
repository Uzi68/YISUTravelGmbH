import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  NgZone
} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatIcon} from "@angular/material/icon";
import {DatePipe, NgForOf, NgIf} from "@angular/common";
import { TruncatePipe } from "./truncate.pipe";
import {MatInput} from "@angular/material/input";
import {MatTooltip} from "@angular/material/tooltip";
import {animate, style, transition, trigger} from "@angular/animations";
import {firstValueFrom, fromEvent, interval, of, Subscription} from "rxjs";
import {ChatbotService} from "../../../Services/chatbot-service/chatbot.service";
import {AuthService} from "../../../Services/AuthService/auth.service";
import {PusherService} from "../../../Services/Pusher/pusher.service";
import {User} from "../../../Models/User";
import {Visitor} from "../../../Models/Visitor";
import {catchError} from "rxjs/operators";
import { MessageFilterPipe } from "./message-filter.pipe";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {FormsModule} from "@angular/forms";



interface Agent {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    MatButtonModule,
    MatSidenavModule,
    MatIcon,
    NgForOf,
    NgIf,
    DatePipe,
    TruncatePipe,
    MatTooltip,
    MessageFilterPipe,
    MatProgressSpinner,
    MatButtonToggle,
    MatButtonToggleGroup,
    FormsModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(-100%)' }))
      ])
    ]),
    trigger('messageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messageContainer!: ElementRef<HTMLElement>;
  private pusherSubscriptions: {channel: string, subscription: any}[] = [];
  shouldScrollToBottom = true;
  private refreshSub!: Subscription;
  private authSub!: Subscription;
  //private pusherSubscriptions: any[] = [];
  isAdmin = false;
  chatRequests: any[] = [];
  private chatRequestSubscription: any;
  activeChats: Chat[] = [];
  user!: User;
  visitor!: Visitor;
  selectedChat: Chat | null = null;
  currentAgent: Agent = {
    id: '',
    name: '',
    avatar: '',
    status: 'offline'
  };

  loadingAdminChats = false;
  // Neue Properties
  showAllChats = false;
  selectedAdminChat: any = null;

// Neue Properties für Filter
  searchQuery = '';
  filterStatus = 'all';
  filterTimeRange = 'all';
  filteredActiveChats: Chat[] = [];
  filteredAdminChats: any[] = [];
  //Alle Chats für den Admin anzeigen lassen
  allAdminChats: any[] = [];
  private visibilityChangeSub!: Subscription;

  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private pusherService: PusherService,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}


  ngOnInit() {
    this.loadActiveChats().then(() => {
      this.filterChats();

    });
    this.authSub = this.authService.getAuthenticated().subscribe(auth => {
      if (auth) {
        // Initiale Einrichtung der Listener
        this.updatePusherSubscriptions();
      }
    });

    //isTabHidden(), showNotification()
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        console.log('Benachrichtigung erlauben', permission);
      });
    }
    this.visibilityChangeSub = fromEvent(document, 'visibilitychange').subscribe(() => {
      this.cdRef.detectChanges();
    });

    this.authService.getUserRole().subscribe(role => {
      this.isAdmin = role.role.includes('Admin');
 //     console.log(this.isAdmin);
    });

    this.authService.getLoggedUser().subscribe(user => {
      this.user = {
        id: user.id,
        name: user.name,
        avatar: user.avatar ?? '',
        status: 'online'
      };

      this.currentAgent = {
        id: String(user.id), // falls deine andere Logik `string` erwartet
        name: user.name,
        avatar: user.avatar ?? '',
        status: 'online'
      };
    });


    this.loadChatRequests();
  /*  console.log('Aktuelle Session IDs:', {
      session_id: localStorage.getItem('session_id'),
      assigned_chat_session_id: localStorage.getItem('assigned_chat_session_id')
    });*/
  }

  setupChatRequestListener(): void {
    this.pusherService.listenToPrivate(
      'chat.',
      'message.received', // oder '.chat.escalated' bei broadcastAs()
      (data: any) => {
   //     console.log('Neue Chat-Anfrage empfangen:', data);
        this.chatRequests.push(data);
        this.showNewChatNotification(data);
      }
    );
  }

// Methode zum Umschalten der Admin-Ansicht
  toggleAllChatsView(): void {
    this.showAllChats = !this.showAllChats;
    if (this.showAllChats && this.allAdminChats.length === 0) {
      this.loadAllChatsForAdmin();
    }
  }

  // Filterfunktion für beide Chat-Listen
  filterChats(event?: Event): void {

    const searchTerm = event ? (event.target as HTMLInputElement).value.toLowerCase() : this.searchQuery.toLowerCase();

    // Aktive Chats filtern
    this.filteredActiveChats = this.activeChats.filter(chat => {
      const matchesSearch = chat.customerName.toLowerCase().includes(searchTerm) ||
        chat.lastMessage.toLowerCase().includes(searchTerm);
      return matchesSearch;
    });

    // Admin-Chats filtern
    if (this.isAdmin && this.showAllChats) {
      this.filteredAdminChats = this.allAdminChats.filter(chat => {
        const matchesSearch = (chat.customer_name || '').toLowerCase().includes(searchTerm) ||
          (chat.last_message || '').toLowerCase().includes(searchTerm);
        const matchesStatus = this.filterStatus === 'all' || chat.status === this.filterStatus;

        // Zeitfilter
        let matchesTime = true;
        if (this.filterTimeRange !== 'all' && chat.last_message_time) {
          const messageDate = new Date(chat.last_message_time);
          const now = new Date();

          switch (this.filterTimeRange) {
            case 'today':
              matchesTime = messageDate.toDateString() === now.toDateString();
              break;
            case 'week':
              const weekAgo = new Date(now);
              weekAgo.setDate(weekAgo.getDate() - 7);
              matchesTime = messageDate >= weekAgo;
              break;
            case 'month':
              const monthAgo = new Date(now);
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              matchesTime = messageDate >= monthAgo;
              break;
          }
        }

        return matchesSearch && matchesStatus && matchesTime;
      });
    }
  }

// Statusfilter ändern
  changeStatusFilter(status: string): void {
    this.filterStatus = status;
    this.filterChats();
  }

// Zeitfilter ändern
  changeTimeFilter(range: string): void {
    this.filterTimeRange = range;
    this.filterChats();
  }

// Hilfsfunktion für Status-Labels
  getStatusLabel(status: string): string {
    const statusMap: {[key: string]: string} = {
      'human': 'Offen',
      'in_progress': 'In Bearbeitung',
      'closed': 'Geschlossen',
      'assigned': 'Zugewiesen',
      //   'closed_by_user': 'Geschlossen vom Besucher',
      //   'closed_by_agent': 'Geschlossen vom Mitarbeiter'
    };
    return statusMap[status] || status;
  }

// Methode zum Auswählen eines Admin-Chats
  selectAdminChat(chat: any): void {
    this.selectedAdminChat = chat;

    // Erstelle ein Chat-Objekt im benötigten Format
    const selectedChat: Chat = {
      id: chat.session_id,
      chatId: chat.chat_id,
      customerName: chat.customer_name,
      customerAvatar: chat.customer_avatar,
      lastMessage: chat.last_message,
      lastMessageTime: new Date(chat.last_message_time),
      unreadCount: 0,
      isOnline: chat.is_online,
      messages: chat.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.text,
        timestamp: new Date(msg.timestamp),
        isAgent: msg.from === 'agent',
        read: true
      })),
      status: chat.status,
      assigned_agent: chat.assigned_agent,
      isNew: false
    };

    this.selectChat(selectedChat);
  }

// Anpassung der loadAllChatsForAdmin-Methode
  loadAllChatsForAdmin() {
    this.loadingAdminChats = true;
    this.chatbotService.getAllChatsForAdmin().subscribe({
      next: (response) => {
        this.allAdminChats = response.data || [];
        this.filteredAdminChats = [...this.allAdminChats];
        this.loadingAdminChats = false;
      },
      error: (err) => {
        console.error('Fehler beim Laden aller Admin-Chats:', err);
        this.loadingAdminChats = false;
      }
    });
  }
  loadChatRequests(): void {
    this.chatbotService.getChatRequests().subscribe({
      next: (requests) => {
        this.chatRequests = requests;
      },
      error: (err) => {
        console.error('Fehler beim Laden der Chat-Anfragen:', err);
      }
    });
  }

  acceptChatRequest(request: any): void {
    this.chatbotService.acceptChatRequest(request.chat_id).subscribe({
      next: (response) => {
        // Chat aus Requests entfernen
        this.chatRequests = this.chatRequests.filter(
          r => r.chat_id !== request.chat_id
        );

        // Chat als zugewiesen markieren
        const updatedChats = this.activeChats.map(chat => {
          if (chat.chatId === request.chat_id) {
            return {
              ...chat,
              assigned_agent: this.currentAgent.name,
              status: 'in_progress'
            };
          }
          return chat;
        });

        this.activeChats = updatedChats;

        // Pusher-Listener neu einrichten
        this.setupPusherListeners();
      },
      error: (err) => {
        console.error('Fehler beim Annehmen der Chat-Anfrage:', err);
      }
    });
  }


  showNewChatNotification(data: any): void {
    // Prüfen ob der Tab aktiv ist
    const isTabActive = document.visibilityState === 'visible';

    // Wenn der Tab nicht aktiv ist, Benachrichtigung mit Sound anzeigen
    if (!isTabActive) {
      // Modernere Browser-Benachrichtigung
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('Neuer Chat', {
          body: `Neue Nachricht von ${data.customer_name || 'einem Kunden'}`,
          icon: data.customer_avatar || '/assets/default-avatar.svg'
        });



        // Bei Klick auf die Benachrichtigung den Tab aktivieren
        notification.onclick = () => {
          window.focus();
        };
      }
    }

    // Visuellen Hinweis anzeigen
    this.ngZone.run(() => {
      this.cdRef.detectChanges();
    });
  }







  private setupPusherListeners(sessionId?: string) {
    this.cleanupPusherSubscriptions();

    const effectiveSessionId = sessionId || localStorage.getItem('assigned_chat_session_id');
    if (!effectiveSessionId) return;

    // 1. Privaten Channel für den spezifischen Chat
    const chatSub = this.pusherService.listenToPrivate(
      `chat.${effectiveSessionId}`, // WICHTIG: 'private-' prefix
      'message.received',
      (data: any) => {
        this.ngZone.run(() => {
          console.log('Chat-spezifische Nachricht:', data);
          this.handleIncomingMessage(data);
        });
      }
    );

    // 2. Globaler Update-Listener
    const globalSub = this.pusherService.listenToPrivate(
      'all.active.chats', // WICHTIG: 'private-' prefix
      'message.received',
      (data: any) => {
        this.ngZone.run(() => {
          console.log('Globale Chat-Nachricht:', data);
          this.handleAllChatsMessage(data);
        });
      }
    );

    this.pusherSubscriptions.push(
      { channel: `chat.${effectiveSessionId}`, subscription: chatSub },
      { channel: 'all.active.chats', subscription: globalSub }
    );
  }

  private cleanupPusherSubscriptions() {
    console.log('Bereinige alle Pusher-Subscriptions...');

    this.pusherSubscriptions.forEach(sub => {
      if (sub.subscription?.unsubscribe) {
        console.log(`Entferne Listener für Channel: ${sub.channel}`);
        sub.subscription.unsubscribe(); // Stoppt den Listener
      }
    });

    this.pusherSubscriptions = []; // Leert das Array
  }



  private handleChatSpecificMessage(data: any) {
    this.ngZone.run(() => {
      // Aktualisieren Sie den spezifischen Chat
      if (this.selectedChat && this.selectedChat.id === data.session_id) {
        this.selectedChat.messages.push({
          id: data.id,
          content: data.text,
          timestamp: new Date(data.created_at),
          isAgent: data.from === 'agent',
          read: true
        });
        this.scrollToBottom();
      }
      this.cdRef.detectChanges();
    });
  }

  trackByMessageId(index: number, message: Message): string {
    return message.id;
  }

// admin-dashboard.component.ts

  private handleIncomingMessage(data: { chatId: string; message: Message }) {
    console.log('[handleIncomingMessage] Empfangene Daten:', data);



    // 1. Finde den entsprechenden Chat
    const chatIndex = this.activeChats.findIndex(c => c.id === data.chatId);
    if (chatIndex === -1) {
      console.warn('Chat nicht gefunden, aktualisiere Liste');
      this.loadActiveChats();
      return;
    }
    const isCurrentChat = this.selectedChat?.id === data.chatId;
    // 2. Erstelle die neue Nachricht
    const newMessage: Message = {
      ...data.message,
      read: isCurrentChat
    };

    // 3. Aktualisiere den Chat
    const updatedChat = {
      ...this.activeChats[chatIndex],
      messages: [...this.activeChats[chatIndex].messages, newMessage],
      lastMessage: newMessage.content,
      lastMessageTime: new Date(),
      unreadCount: isCurrentChat ? 0 : (this.activeChats[chatIndex].unreadCount || 0) + 1
    };

    if (isCurrentChat) {
      this.selectedChat = {
        ...updatedChat,
        messages: updatedChat.messages.map(m => ({...m, read: true}))
      };
      this.scrollToBottom();

    }


    this.activeChats = [
      ...this.activeChats.slice(0, chatIndex),
      updatedChat,
      ...this.activeChats.slice(chatIndex + 1)
    ];

    // 4. Aktualisiere selectedChat wenn nötig
    if (this.selectedChat?.id === data.chatId) {
      this.selectedChat = {
        ...updatedChat,
        messages: updatedChat.messages.map(m => ({...m, read: true}))
      };
      this.scrollToBottom();
    }
    // Benachrichtigung nur zeigen, wenn es keine eigene Nachricht ist
    if (!data.message.isAgent) {
      this.showNewChatNotification({
        customer_name: this.activeChats[chatIndex]?.customerName,
        customer_avatar: this.activeChats[chatIndex]?.customerAvatar
      });
    }
    this.cdRef.detectChanges();
  }


  private updateLocalMessagesAsRead(chatId: string, sessionId: string): void {
    this.activeChats = this.activeChats.map(chat => {
      if (chat.id === sessionId) {
        return {
          ...chat,
          messages: chat.messages.map(msg => ({
            ...msg,
            read: true
          })),
          unreadCount: 0
        };
      }
      return chat;
    });

    if (this.selectedChat?.id === sessionId) {
      this.selectedChat = {
        ...this.selectedChat,
        messages: this.selectedChat.messages.map(msg => ({
          ...msg,
          read: true
        })),
        unreadCount: 0
      };
    }

    this.cdRef.detectChanges();
  }

  ngOnDestroy() {
    this.cleanupPusherSubscriptions();
    if (this.visibilityChangeSub) {
      this.visibilityChangeSub.unsubscribe();
    }
  }

  private markMessagesAsRead(chatId: string, sessionId: string): void {
    this.chatbotService.markMessagesAsRead(chatId, sessionId).subscribe({
      next: () => {
        console.log('Nachrichten erfolgreich als gelesen markiert');
      },
      error: (err) => {
        console.error('Fehler beim Markieren der Nachrichten als gelesen:', err);
      }
    });
  }



  private getVisitorDisplayName(visitor: Visitor | null, fallbackName: string): string {
    if (!visitor) {
      return fallbackName;
    }

    const nameParts = [visitor.first_name, visitor.last_name]
      .map(part => part?.trim())
      .filter(part => !!part) as string[];

    if (nameParts.length) {
      return nameParts.join(' ');
    }

    if (visitor.email) {
      return visitor.email;
    }

    return fallbackName;
  }


  async loadActiveChats(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.chatbotService.getActiveChats());
      const chats = Array.isArray(response) ? response : response.data;

      this.activeChats = await Promise.all(chats.map(async (chat: any) => {
        const isSelected = this.selectedChat?.id === chat.session_id;
        const isNew = chat.status === 'human' && !chat.assigned_agent;
        this.filteredActiveChats = [...this.activeChats];

        // Verwenden Sie den vorhandenen customer_name, falls vorhanden
        let customerName = chat.customer_name || 'Anonymer Benutzer';

        // Nur Visitor-Daten abrufen, wenn kein customer_name vorhanden ist
        if (!chat.customer_name) {
          try {
            const visitor = await firstValueFrom(
              this.chatbotService.getVisitorDetails(chat.session_id).pipe(
                catchError(() => of(null)) // Fehler abfangen und null zurückgeben
              )
            );
            if (visitor) {
              customerName = this.getVisitorDisplayName(visitor, customerName);
            }
          } catch (error) {
            console.error('Error loading visitor name:', error);
          }
        }



        return {
          id: chat.session_id || '',
          chatId: chat.chat_id || '',
          customerName,
          customerAvatar: chat.customer_avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
          lastMessage: chat.last_message || '',
          lastMessageTime: new Date(chat.last_message_time || Date.now()),
          unreadCount: isSelected ? 0 : (chat.unread_count || 0),
          isOnline: chat.is_online || false,
          messages: Array.isArray(chat.messages)
            ? chat.messages.map((msg: any) => ({
              id: msg.id || Date.now().toString(),
              content: msg.text || '',
              timestamp: new Date(msg.timestamp || Date.now()),
              isAgent: msg.from === 'agent',
              read: isSelected ? true : (msg.read || false)
            }))
            : [],
          status: chat.status || '',
          assigned_agent: chat.assigned_agent || '',
          isNew: isNew
        };
      }));

      this.activeChats.sort((a, b) => {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      const assignedSessionId = localStorage.getItem('assigned_chat_session_id');
      if (assignedSessionId && (!this.selectedChat || this.selectedChat.id !== assignedSessionId)) {
        const assignedChat = this.activeChats.find(chat => chat.id === assignedSessionId);
        if (assignedChat) {
          this.selectChat(assignedChat);
        }
      }

      this.cdRef.detectChanges();

    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }



  closeChat() {
    if (!this.selectedChat) return;

    this.chatbotService.closeChat(this.selectedChat.id).subscribe({
      next: () => {
        // Session ID zurücksetzen
        localStorage.removeItem('assigned_chat_session_id');

        // Pusher-Listener aktualisieren
        this.updatePusherSubscriptions();

        this.loadActiveChats();
        this.selectedChat = null;
      },
      error: (err) => console.error('Error closing chat:', err)
    });
  }

  private updatePusherSubscriptions() {
    this.cleanupPusherSubscriptions();

    // 1. Globaler Admin-Channel
    const adminSub = this.pusherService.listenToPrivate(
      'admin.dashboard',
      'message.received',
      (data: any) => this.handleAdminMessage(data)
    );

    // 2. Channel für alle Chats
    const allChatsSub = this.pusherService.listenToPrivate(
      'presence-all.chats',
      'chat.update',
      (data: any) => this.handleGlobalChatUpdate(data)
    );

    // Channel für ALLE AKTIVEN CHATS
    const allActiveChatsSub = this.pusherService.listenToPrivate(
      'all.active.chats',
      'message.received',
      (data: any) => this.handleAllChatsMessage(data)
    );

    // 3. Spezifischer Chat-Channel (nur einmal)
    const assignedSessionId = localStorage.getItem('assigned_chat_session_id');
    if (assignedSessionId) {
      const chatSub = this.pusherService.listenToPrivate(
        `chat.${assignedSessionId}`,
        'message.received',
        (data: unknown) => this.handleIncomingMessage(data as { chatId: string; message: Message; })
      );
      this.pusherSubscriptions.push({
        channel: `chat.${assignedSessionId}`,
        subscription: chatSub
      });
    }
  }



  private handleGlobalChatUpdate(data: any) {
    this.ngZone.run(() => {
      console.log('Globaler Update:', data);

      // Prüfen ob Chat bereits existiert
      const existingChat = this.activeChats.find(c => c.id === data.chat_id);

      if (!existingChat) {
        // Neuen Chat laden
        this.loadActiveChats();
      } else {
        // Bestehenden Chat aktualisieren
        this.activeChats = this.activeChats.map(chat => {
          if (chat.id === data.chat_id) {
            return {
              ...chat,
              lastMessage: data.message.text,
              lastMessageTime: new Date(),
              unreadCount: chat.id !== this.selectedChat?.id ? chat.unreadCount + 1 : 0
            };
          }
          return chat;
        });
      }

      this.showNewChatNotification(data);
      this.cdRef.detectChanges();
    });
  }

// Neue Methode für Nachrichten aller aktiven Chats
  private async handleAllChatsMessage(data: any): Promise<void> {
    const messageData = data.message;

    console.log('[handleAllChatsMessage] Eingehende Nachricht:', messageData);

    const sessionId = messageData.session_id;
    const messageId = messageData.id;

    // Abbruch bei fehlenden Daten
    if (!sessionId || !messageId) {
      console.warn('[handleAllChatsMessage] Ungültige Nachricht – fehlende session_id oder id');
      return;
    }

    // Chat anhand session_id finden (chatId wird bei dir nicht verwendet)
    let chatIndex = this.activeChats.findIndex(c => c.id === sessionId);

    // Wenn Chat nicht gefunden, lade nach und füge Nachricht ein
    if (chatIndex === -1) {
      console.warn('[handleAllChatsMessage] Chat nicht gefunden – lade nach.');

      this.loadActiveChats().then(async () => {
        console.log('[handleAllChatsMessage] Chats neu geladen.');

        await this.loadActiveChats();

        chatIndex = this.activeChats.findIndex(c => c.id === sessionId);
        if (chatIndex === -1) {
          console.warn('[handleAllChatsMessage] Chat auch nach Reload nicht gefunden.');
          return;
        }

        this.insertMessageIntoChat(chatIndex, messageData);
      });

      return;
    }

    // Chat wurde gefunden → Nachricht direkt einfügen
    this.insertMessageIntoChat(chatIndex, messageData);
  }

  private insertMessageIntoChat(chatIndex: number, messageData: any): void {
    const sessionId = messageData.session_id;
    const messageId = messageData.id;

    const chat = this.activeChats[chatIndex];

    // Duplikate verhindern
    const isDuplicate = chat.messages.some(m => m.id === messageId);
    if (isDuplicate) {
      console.log('[insertMessageIntoChat] Duplikat erkannt – ignoriert.');
      return;
    }

    const message: Message = {
      id: messageId,
      content: messageData.text || '',
      timestamp: new Date(messageData.created_at),
      isAgent: messageData.from === 'agent',
      read: this.selectedChat?.id === sessionId
    };

    const updatedChat = {
      ...chat,
      messages: [...chat.messages, message],
      lastMessage: message.content,
      lastMessageTime: message.timestamp,
      unreadCount: this.selectedChat?.id === sessionId ? 0 : (chat.unreadCount + 1 || 1),
      status: 'in_progress'
    };

    this.activeChats = [
      ...this.activeChats.slice(0, chatIndex),
      updatedChat,
      ...this.activeChats.slice(chatIndex + 1)
    ];

    if (this.selectedChat?.id === sessionId) {
      this.selectedChat = {
        ...updatedChat,
        messages: updatedChat.messages.map(m => ({ ...m, read: true }))
      };
      this.scrollToBottom();
    }

    this.cdRef.detectChanges();
  }



  /**
   * Erstellt ein neues Chat-Objekt basierend auf einer empfangenen Nachricht
   */
  private createNewChatFromMessage(messageData: any, newMessage: Message): Chat {
    return {
      id: messageData.session_id,
      chatId: messageData.chat_id || this.generateTempChatId(),
      customerName: messageData.customer_name || 'Neuer Benutzer',
      customerAvatar: messageData.customer_avatar,
      lastMessage: newMessage.content,
      lastMessageTime: newMessage.timestamp,
      unreadCount: 1,
      isOnline: true,
      messages: [newMessage],
      status: 'human',
      assigned_agent: '',
      isNew: true
    };
  }

  /**
   * Generiert eine temporäre Chat-ID falls nicht vorhanden
   */
  private generateTempChatId(): string {
    return 'temp-' + Math.random().toString(36).substring(2, 9);
  }
  assignChat() {
    if (!this.selectedChat) {
      console.warn('Kein Chat ausgewählt zum Zuweisen');
      return;
    }

    // Sicherstellen, dass alle erforderlichen Felder vorhanden sind
    const currentChat: Chat = {
      id: this.selectedChat.id,
      chatId: this.selectedChat.chatId,
      customerName: this.selectedChat.customerName || 'Unbekannter Benutzer',
      customerAvatar: this.selectedChat.customerAvatar,
      lastMessage: this.selectedChat.lastMessage || '',
      lastMessageTime: this.selectedChat.lastMessageTime || new Date(),
      unreadCount: this.selectedChat.unreadCount || 0,
      isOnline: this.selectedChat.isOnline || false,
      messages: [...this.selectedChat.messages],
      status: this.selectedChat.status || 'human',
      assigned_agent: this.selectedChat.assigned_agent || '',
      isNew: this.selectedChat.isNew || false
    };

    console.log('Starte Chat-Zuweisung für Chat ID:', currentChat.chatId);

    const agentId = Number(this.currentAgent.id);
    if (!agentId) {
      console.warn('Kein gültiger Agent für die Zuweisung gefunden');
      return;
    }

    this.chatbotService.assignChat(currentChat.chatId, agentId).subscribe({
      next: (response) => {
        console.log('Chat erfolgreich zugewiesen:', response);

        this.cleanupPusherSubscriptions();

        const assignedSessionId = response.chat_session_id;
        localStorage.setItem('assigned_chat_session_id', assignedSessionId);

        // Neues Chat-Objekt mit allen erforderlichen Feldern
        const updatedChat: Chat = {
          ...currentChat,
          id: assignedSessionId,
          status: 'in_progress',
          assigned_agent: this.currentAgent.name,
          isNew: false
        };

        this.selectedChat = updatedChat;
        this.setupPusherListeners(assignedSessionId);
        this.loadActiveChats();

        // Sicherstellen, dass updatedChat nicht null ist
        this.selectChat(updatedChat);
      },
      error: (err) => {
        console.error('Fehler beim Zuweisen des Chats:', err);
        this.updatePusherSubscriptions();
      }
    });
  }

// Hilfsfunktion zum Loggen der aktiven Subscriptions
  private logActiveSubscriptions() {
    console.log('--- Aktive Pusher Subscriptions ---');
    if (this.pusherSubscriptions.length === 0) {
      console.log('Keine aktiven Subscriptions');
    } else {
      this.pusherSubscriptions.forEach(sub => {
        console.log(`Channel: ${sub.channel}`,
          `Active: ${!!sub.subscription}`,
          `Unsubscribe: ${!!sub.subscription?.unsubscribe}`);
      });
    }
    console.log('----------------------------------');
  }


// Neue Methode für Admin-Nachrichten
  private handleAdminMessage(data: any) {
    this.ngZone.run(() => {
      console.log('Admin-Nachricht empfangen:', data);
      // Hier kannst du auf Admin-spezifische Nachrichten reagieren
    });
  }

  transferChat() {
    if (!this.selectedChat) return;

    const agentId = prompt('Bitte geben Sie die ID des neuen Agents ein:');
    if (!agentId) return;

    this.chatbotService.transferChat(this.selectedChat.id, agentId).subscribe({
      next: () => {
        this.loadActiveChats();
      },
      error: (err) => console.error('Error transferring chat:', err)
    });
  }


  @HostListener('scroll', ['$event'])
  onScroll(event: Event) {
    const container = this.messageContainer?.nativeElement;
    if (!container) return;

    const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    this.shouldScrollToBottom = atBottom;
  }



  scrollToBottom() {
    const container = this.messageContainer?.nativeElement;
    if (!container || !this.shouldScrollToBottom) return;

    requestAnimationFrame(() => {
      try {
        container.scroll({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } catch (e) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }



  selectChat(chat: Chat): void {
    console.log('Selecting chat:', chat.id);

    this.ngZone.run(() => {
      // 1. Neues Array mit aktualisiertem Chat erstellen
      this.activeChats = this.activeChats.map(c =>
        c.id === chat.id
          ? { ...c, unreadCount: 0, messages: c.messages.map(m => ({ ...m, read: true })) }
          : c
      );

      // 2. Falls filteredActiveChats separat gespeichert ist → auch updaten
      this.filteredActiveChats = this.filteredActiveChats.map(c =>
        c.id === chat.id
          ? { ...c, unreadCount: 0, messages: c.messages.map(m => ({ ...m, read: true })) }
          : c
      );

      // 3. Ausgewählten Chat setzen
      const updatedChat = this.activeChats.find(c => c.id === chat.id)!;
      this.selectedChat = {
        ...updatedChat,
        messages: updatedChat.messages.map(message => ({
          ...message,
          timestamp: new Date(message.timestamp),
          read: true
        })),
        lastMessageTime: new Date(updatedChat.lastMessageTime)
      };

      // 4. Speichern & Backend-Call
      localStorage.setItem('assigned_chat_session_id', this.selectedChat.id);
      //this.ensureChatSubscription(this.selectedChat.id);
      this.setupPusherListeners(chat.id);
      this.updatePusherSubscriptions();

      if (chat.chatId && chat.id) {
        this.markMessagesAsRead(chat.chatId, chat.id);
      }

      // 5. Besucherdetails laden
      this.chatbotService.getVisitorDetails(chat.id).subscribe({
        next: (visitor) => (this.visitor = visitor),
        error: (err) => console.error('Error fetching visitor details:', err)
      });

      // 6. Scroll
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }


  private ensureChatSubscription(chatId: string) {
    const channelName = `chat.${chatId}`;
    /**/
    // Vorherige Subscriptions für diesen Channel entfernen
    this.pusherSubscriptions = this.pusherSubscriptions.filter(sub => {
      if (sub.channel === channelName) {
        if (sub.subscription?.unsubscribe) sub.subscription.unsubscribe();
        if (sub.subscription?.stop) sub.subscription.stop();
        return false;
      }
      return true;
    });

    const chatSub = this.pusherService.listenToPrivate(
      channelName,
      'message.received',
      (data: unknown) => this.handleIncomingMessage(data as { chatId: string; message: Message; })
    );

    this.pusherSubscriptions.push({channel: channelName, subscription: chatSub});
  }



  sendMessage(content: string, inputElement: HTMLTextAreaElement): void {
    if (!content.trim() || !this.selectedChat) return;

    const newMessagePayload = {
      chat_id: this.selectedChat.chatId,
      content: content.trim(),
      isAgent: true
    };

    this.chatbotService.sendAgentMessage(newMessagePayload).subscribe({
      next: () => {
        console.log('Nachricht gesendet. Warte auf Pusher-Update.');

        // Textfeld leeren
        inputElement.value = '';

        // Fokus behalten, damit direkt weitergeschrieben werden kann
        inputElement.focus();

        // **NICHT** blur() aufrufen, sonst geht der Fokus wieder weg!
      },
      error: (err) => console.error('Error sending message:', err)
    });
  }






  private isMessageDuplicate(chatId: string, messageId: string): boolean {
    const chat = this.activeChats.find(c => c.id === chatId || c.chatId === chatId);
    if (!chat) return false;

    return chat.messages.some(m => m.id === messageId);
  }






}

interface Chat {
  id: string; // Nicht optional (kein ?)
  chatId: string; // Nicht optional
  customerName: string; // Nicht optional
  customerAvatar: string; // Nicht optional
  lastMessage: string; // Nicht optional
  lastMessageTime: Date; // Nicht optional
  unreadCount: number; // Nicht optional
  isOnline: boolean; // Nicht optional
  lastOnline?: Date; // Optional
  messages: Message[]; // Nicht optional
  status?: string; // Optional hinzugefügt
  assigned_agent?: string; // Optional hinzugefügt
  isNew?: boolean;
}
interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isAgent: boolean;
  read: boolean;
  from?: string;
}
