import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  NgZone, signal
} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatIcon} from "@angular/material/icon";
import {DatePipe, NgClass, NgForOf, NgIf} from "@angular/common";
import { TruncatePipe } from "./truncate.pipe";
import {MatFormField, MatHint, MatInput, MatLabel} from "@angular/material/input";
import {MatTooltip} from "@angular/material/tooltip";
import {animate, style, transition, trigger} from "@angular/animations";
import {firstValueFrom, of, Subscription} from "rxjs";
import {ChatbotService} from "../../../Services/chatbot-service/chatbot.service";
import {AuthService} from "../../../Services/AuthService/auth.service";
import {PusherService} from "../../../Services/Pusher/pusher.service";
import {User} from "../../../Models/User";
import {Visitor} from "../../../Models/Visitor";
import {catchError} from "rxjs/operators";
import { MessageFilterPipe } from "./message-filter.pipe";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {RouterLink} from "@angular/router";
import {NotificationSoundService} from "../../../Services/notification-service/notification-sound.service";
import {MatOption, MatSelect} from "@angular/material/select";
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';

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
    FormsModule,
    RouterLink,
    NgClass,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatHint,
    ReactiveFormsModule,
    MatInput,
    MatSnackBarModule
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
  closeDialogForm: FormGroup;
  selectedChat: Chat | null = null;
  selectedChatForEscalation: Chat | null = null;
  escalationMessage = '';
  currentAgent = {
    id: 1,
    name: 'Thomas Müller',
    avatar: '',
    status: 'online'
  };
  private sortDebounce: any;
  loadingAdminChats = false;
  // Neue Properties
  showAllChats = false;
  selectedAdminChat: any = null;

  // Assignment Status Tracking
  assignmentStatuses = new Map<string, any>();
  availableAgents: any[] = [];
  showTransferDialog = signal(false);
  selectedChatForTransfer: Chat | null = null;
  transferReason = '';

  // ✅ Neue Properties für Close-Dialog
  showCloseChatDialog = signal(false);
  closeChatReason = '';
  chatToClose: Chat | null = null;

  // Escalation Prompts
  escalationPrompts = new Map<string, any>();
  showEscalationDialog = signal(false);

  // ✅ Permission Dialog für Benachrichtigungen
  showPermissionDialog = signal(false);
  permissionDialogShown = false;



// Neue Properties für Filter
  searchQuery = '';
  filterStatus = 'all';
  filterTimeRange = 'all';
  filteredActiveChats: Chat[] = [];
  filteredAdminChats: any[] = [];
  //Alle Chats für den Admin anzeigen lassen
  allAdminChats: any[] = [];
  transferForm: FormGroup;
  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private pusherService: PusherService,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone,
    public notificationSound: NotificationSoundService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.transferForm = this.fb.group({
      selectedAgent: [''],
      transferReason: ['']
    });
    this.closeDialogForm = this.fb.group({
      closeChatReason: ['']
    });
  }


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


    this.authService.getUserRole().subscribe(role => {
      this.isAdmin = role.role.includes('Admin');
    });


    this.authService.getLoggedUser().subscribe(user => {
      this.user = {
        id: user.id,
        name: user.name,
        avatar: user.avatar ?? '',
        status: 'online'
      };

      this.currentAgent = {
        id: Number(user.id), // falls deine andere Logik `string` erwartet
        name: user.name,
        avatar: user.avatar ?? '',
        status: 'online'
      };

      // ✅ Permission Dialog nach User-Load anzeigen
      this.checkAndShowPermissionDialog();
    });


    this.loadChatRequests();

  }




  /**
   * ✅ Prüft, ob Permission-Dialog angezeigt werden soll
   */
  private checkAndShowPermissionDialog(): void {
    // Prüfe ob bereits gefragt wurde (in dieser Session)
    const askedInSession = sessionStorage.getItem('notification_permission_asked');

    // Prüfe ob User bereits eine Entscheidung getroffen hat
    const userDecision = localStorage.getItem('notification_user_decision');

    // Prüfe aktuellen Browser-Permission-Status
    const hasPermission = this.notificationSound.hasPermission;
    const isSupported = this.notificationSound.isSupported;

    console.log('Permission Dialog Check:', {
      askedInSession,
      userDecision,
      hasPermission,
      isSupported
    });

    // Dialog anzeigen wenn:
    // - Browser unterstützt Notifications
    // - Noch nicht in dieser Session gefragt
    // - User hat noch keine Entscheidung getroffen
    // - Noch keine Permission erteilt
    if (isSupported && !askedInSession && !userDecision && !hasPermission) {
      // Verzögerung für bessere UX (nach dem Dashboard-Load)
      setTimeout(() => {
        this.showPermissionDialog.set(true);
        sessionStorage.setItem('notification_permission_asked', 'true');
        console.log('✅ Zeige Permission Dialog');
      }, 1500); // 1.5 Sekunden nach Dashboard-Load
    }
  }

  /**
   * ✅ User hat Benachrichtigungen ERLAUBT
   */
  async acceptNotificationPermission(): Promise<void> {
    console.log('🔔 User clicked ALLOW button...');

    // ✅ Dialog sofort schließen (vor Permission-Request)
    this.showPermissionDialog.set(false);

    try {
      // ✅ WICHTIG: Await auf requestPermission - wartet bis User im Browser-Dialog entscheidet
      console.log('⏳ Waiting for browser permission dialog...');
      const permission = await this.notificationSound.requestPermission();

      console.log('🔍 Browser permission result:', permission);
      console.log('🔍 Notification.permission:', Notification.permission);

      if (permission === 'granted') {
        localStorage.setItem('notification_user_decision', 'granted');
        this.showToast('✅ Benachrichtigungen aktiviert! Sie werden bei neuen Nachrichten informiert', 'success', 5000);

        // ✅ Test-Benachrichtigung mit Verzögerung
        setTimeout(() => {
          console.log('📨 Sending test notification...');

          // Sound abspielen (forciert)
          this.notificationSound.playNotificationSoundForce();

          // Browser-Notification anzeigen (forciert)
          this.notificationSound.showNotification({
            title: 'Benachrichtigungen aktiviert! 🎉',
            body: 'Sie werden jetzt über neue Nachrichten informiert, wenn Sie den Tab nicht aktiv nutzen.',
            icon: '/assets/icons/chat-icon.png',
            tag: 'test-notification',
            requireInteraction: false
          }, true).then(notification => {
            if (notification) {
              console.log('✅ Test notification successfully shown');
            } else {
              console.warn('⚠️ Test notification could not be shown');
            }
          });
        }, 1000);
      } else if (permission === 'denied') {
        localStorage.setItem('notification_user_decision', 'denied');
        this.showToast('❌ Benachrichtigungen wurden abgelehnt - nur Audio-Ton verfügbar', 'warning', 6000);
      } else {
        // permission === 'default' (User hat Browser-Dialog geschlossen ohne Auswahl)
        this.showToast('ℹ️ Benachrichtigungen wurden nicht aktiviert', 'info', 4000);
      }
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      this.showToast('⚠️ Fehler beim Aktivieren der Benachrichtigungen', 'error', 4000);
    }
  }

  /**
   * ✅ User hat Benachrichtigungen ABGELEHNT
   */
  declineNotificationPermission(): void {
    console.log('User lehnt Benachrichtigungen ab');
    localStorage.setItem('notification_user_decision', 'declined');
    this.showPermissionDialog.set(false);
    this.showToast('ℹ️ Benachrichtigungen deaktiviert - Sie können dies später in den Einstellungen ändern', 'info', 4000);
  }



  public showNotificationPermissionDialog(): void {
    if (!this.notificationSound.isSupported) {
      return;
    }

    // ✅ DIREKTE Permission-Anfrage ohne zusätzlichen Dialog
    // Der Button-Click ist bereits die Benutzerinteraktion
    this.notificationSound.requestPermission().then(permission => {
      if (permission === 'granted') {
        this.showToast('✅ Benachrichtigungen aktiviert - Sie werden bei neuen Nachrichten informiert', 'success', 4000);
      } else if (permission === 'denied') {
        this.showToast('❌ Benachrichtigungen wurden abgelehnt - Sie können dies in den Browser-Einstellungen ändern', 'warning', 6000);
      } else {
        this.showToast('ℹ️ Benachrichtigungen wurden nicht aktiviert', 'info', 3000);
      }
    }).catch(error => {
      console.error('Permission request error:', error);
      this.showToast('⚠️ Fehler beim Aktivieren der Benachrichtigungen', 'error', 4000);
    });
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

    // Aktive Chats filtern (inklusive geschlossene)
    this.filteredActiveChats = this.activeChats.filter(chat => {
      const matchesSearch = chat.customerName.toLowerCase().includes(searchTerm) ||
        chat.lastMessage.toLowerCase().includes(searchTerm);

      // Filter basierend auf dem gewählten Status
      const matchesStatus = this.filterStatus === 'all' || chat.status === this.filterStatus;

      return matchesSearch && matchesStatus;
    });

    // Admin-Chats filtern (unverändert)
    if (this.isAdmin && this.showAllChats) {
      this.filteredAdminChats = this.allAdminChats.filter(chat => {
        const matchesSearch = (chat.customer_name || '').toLowerCase().includes(searchTerm) ||
          (chat.last_message || '').toLowerCase().includes(searchTerm);
        const matchesStatus = this.filterStatus === 'all' || chat.status === this.filterStatus;

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

  /**
   * Assignment Status CSS-Klasse bestimmen
   */
  getAssignmentStatusClass(chat: Chat): string {
    if (!chat.assigned_to) return 'unassigned';
    if (chat.assigned_to === this.currentAgent.id) return 'assigned-to-me';
    return 'assigned-to-other';
  }

// Zeitfilter ändern
  changeTimeFilter(range: string): void {
    this.filterTimeRange = range;
    this.filterChats();
  }

  /**
   * Status-Label für bessere UX
   */
  getStatusLabel(status: string): string {
    const statusMap: {[key: string]: string} = {
      'human': 'Wartet auf Übernahme',
      'in_progress': 'In Bearbeitung',
      'closed': 'Geschlossen',
      'bot': 'Chatbot aktiv'
    };
    return statusMap[status] || status;
  }


  private sortActiveChats(): void {
    // Debounce für Performance
    if (this.sortDebounce) {
      clearTimeout(this.sortDebounce);
    }

    this.sortDebounce = setTimeout(() => {
      this.activeChats.sort((a, b) => {
        // 1. Ungelesene Nachrichten priorisieren
        if (a.unreadCount !== b.unreadCount) {
          return b.unreadCount - a.unreadCount; // Absteigend: mehr unread zuerst
        }

        // 2. Neue Chats (isNew) priorisieren
        if (a.isNew !== b.isNew) {
          return a.isNew ? -1 : 1; // isNew=true kommt zuerst
        }

        // 3. Nach Zeit sortieren (neueste zuerst)
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      // filteredActiveChats aktualisieren
      this.filteredActiveChats = [...this.activeChats];
      this.cdRef.detectChanges();
    }, 50); // 50ms Debounce
  }

// Methode zum Auswählen eines Admin-Chats
  selectAdminChat(chat: any): void {
    this.selectedAdminChat = chat;

    // Zusammengesetzten Namen erstellen
    const customerName = chat.customer_first_name && chat.customer_last_name
      ? `${chat.customer_first_name} ${chat.customer_last_name}`
      : chat.customer_name || 'Anonymer Benutzer';

    // Erstelle ein Chat-Objekt im benötigten Format
    const selectedChat: Chat = {
      id: chat.session_id,
      chatId: chat.chat_id,
      customerName: customerName,
      customerFirstName: chat.customer_first_name || '',
      customerLastName: chat.customer_last_name || '',
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
        read: true,
        attachment: msg.has_attachment ? msg.attachment : undefined
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




// ✅ Erweiterte setupPusherListeners Methode
  private setupPusherListeners(): void {
    this.cleanupPusherSubscriptions();

    // 1. Globaler Message Listener mit erweiterten Notifications
    const globalSub = this.pusherService.listenToChannel(
      'all.active.chats',
      'message.received',
      (data: any) => {
        console.log('🎯 ADMIN DASHBOARD: Message received on all.active.chats channel:', data);
        this.ngZone.run(() => {
          console.log('🎯 Inside ngZone.run - about to call handleIncomingMessageGlobal');
          try {
            // Erweiterte Notification-Logik bereits in handleIncomingMessageGlobal implementiert
            this.handleIncomingMessageGlobal(data);
            console.log('✅ handleIncomingMessageGlobal completed successfully');
          } catch (error) {
            console.error('❌ Error in handleIncomingMessageGlobal:', error);
          }
        });
      },
    );

    // 2. Chat-Updates Listener
    const chatUpdateSub = this.pusherService.listenToChannel(
      'all.active.chats',
      'chats.updated',
      (data: any) => {
        this.ngZone.run(() => {
          this.handleChatUpdate(data);
        });
      },
    );

    // 3. Escalation-Event Listener
    const escalationSub = this.pusherService.listenToChannel(
      'all.active.chats',
      'chat.escalated',
      (data: any) => {
        this.ngZone.run(() => {
          this.handleChatEscalation(data);
        });
      },
    );

    // 4. Assignment-Event Listener
    const assignmentSub = this.pusherService.listenToChannel(
      'all.active.chats',
      'chat.assigned',
      (data: any) => {
        this.ngZone.run(() => {
          this.handleChatAssignment(data);
        });
      },
    );

    // 5. Chat Unassignment Listener
    const unassignmentSub = this.pusherService.listenToChannel(
      'all.active.chats',
      'chat.unassigned',
      (data: any) => {
        this.ngZone.run(() => {
          console.log('Chat unassignment received in real-time:', data);
          this.handleChatUnassignment(data);
        });
      },
    );

    // 6. Status-Change Listener
    const statusChangeSub = this.pusherService.listenToChannel(
      'all.active.chats',
      'chat.status.changed',
      (data: any) => {
        this.ngZone.run(() => {
          this.handleChatStatusChange(data);
        });
      },
    );

    // 7. Chat-Ende Listener
    const chatEndedSub = this.pusherService.listenToChannel(
      'all.active.chats',
      'chat.ended',
      (data: any) => {
        this.ngZone.run(() => {
          this.handleChatEnded(data);
        });
      },
    );

    // 8. AllChatsUpdate Listener (bereits erweitert)
    const allChatsUpdateSub = this.pusherService.listenToChannel(
      'all.active.chats',
      'all.chats.update',
      (data: any) => {
        this.ngZone.run(() => {
          console.log('All chats update received:', data);
          this.handleAllChatsUpdate(data); // Diese Methode ist bereits vollständig überarbeitet
        });
      },
    );

    this.pusherSubscriptions.push(
      { channel: 'all.active.chats', subscription: globalSub },
      { channel: 'all.active.chats', subscription: chatUpdateSub },
      { channel: 'all.active.chats', subscription: escalationSub },
      { channel: 'all.active.chats', subscription: assignmentSub },
      { channel: 'all.active.chats', subscription: unassignmentSub },
      { channel: 'all.active.chats', subscription: statusChangeSub },
      { channel: 'all.active.chats', subscription: chatEndedSub },
      { channel: 'all.active.chats', subscription: allChatsUpdateSub }
    );

    console.log('Pusher listeners setup complete with notification integration');
  }

// 16. Neue Methode für manuelle Notification Tests
  testNotifications(): void {
    console.log('Testing notification system...');

    // Test verschiedene Szenarien
    console.log('Current tab status:', {
      isVisible: this.notificationSound.isVisible,
      hasPermission: this.notificationSound.hasPermission
    });

    // Test 1: Force Sound (immer)
    this.notificationSound.playNotificationSoundForce();

    // Test 2: Normal Sound (nur wenn Tab inaktiv)
    setTimeout(() => {
      this.notificationSound.playNotificationSoundIfTabInactive();
    }, 1000);

    // Test 3: Browser Notification
    if (this.notificationSound.hasPermission) {
      setTimeout(() => {
        this.notificationSound.notify('message', {
          senderName: 'Test System',
          message: 'Dies ist eine Test-Benachrichtigung',
          sessionId: 'test-session'
        });
      }, 2000);
    }

    this.showToast('Notification Test durchgeführt - prüfen Sie die Konsole', 'info');
  }

  private handleAllChatsUpdate(data: any): void {
    console.log('All chats update received:', data);

    // 🔔 NOTIFICATION: Chat Transfer
    if (data.type === 'chat_transferred' && data.chat) {
      const chatData = data.chat;
      const sessionId = chatData.session_id;
      const newAgentId = chatData.assigned_to;
      const isTransferredToMe = newAgentId === this.currentAgent.id;
      const fromAgentId = chatData.from_agent_id;
      const wasMyChat = fromAgentId === this.currentAgent.id;

      console.log('Chat transfer received:', {
        sessionId,
        transferredToMe: isTransferredToMe,
        wasMyChat: wasMyChat,
        newAgent: chatData.to_agent_name,
        fromAgent: chatData.from_agent_name
      });

      let chatIndex = this.activeChats.findIndex(c => c.id === sessionId);

      if (isTransferredToMe) {
        // 🔔 WICHTIGE BENACHRICHTIGUNG: Chat wurde an mich übertragen
        const fromAgentName = chatData.from_agent_name || 'Ein Kollege';
        const customerName = `${chatData.customer_first_name || ''} ${chatData.customer_last_name || ''}`.trim() || 'Ein Kunde';

        this.notificationSound.notifyTransfer(
          fromAgentName,
          `Chat mit ${customerName}`,
          sessionId
        );

        this.showToast(`🔄 Neuer Chat von ${fromAgentName} erhalten: ${customerName}`, 'success');

        if (chatIndex === -1) {
          const newChat: Chat = {
            id: chatData.session_id,
            chatId: chatData.chat_id,
            customerName: `${chatData.customer_first_name || ''} ${chatData.customer_last_name || ''}`.trim() || 'Anonymer Benutzer',
            customerFirstName: chatData.customer_first_name || '',
            customerLastName: chatData.customer_last_name || '',
            customerAvatar: chatData.customer_avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
            lastMessage: `Chat von ${chatData.from_agent_name} übertragen`,
            lastMessageTime: new Date(chatData.last_message_time),
            unreadCount: 1,
            isOnline: true,
            messages: [],
            status: 'in_progress',
            assigned_to: newAgentId,
            assigned_agent: chatData.to_agent_name,
            isNew: true
          };

          this.activeChats = [newChat, ...this.activeChats];
          this.filteredActiveChats = [newChat, ...this.filteredActiveChats];
        } else {
          const updatedChat = {
            ...this.activeChats[chatIndex],
            assigned_to: newAgentId,
            assigned_agent: chatData.to_agent_name,
            lastMessage: `Chat von ${chatData.from_agent_name} erhalten`,
            lastMessageTime: new Date(chatData.last_message_time),
            unreadCount: 1,
            status: 'in_progress',
            isNew: true
          };

          this.activeChats[chatIndex] = updatedChat;
          const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
          if (filteredIndex !== -1) {
            this.filteredActiveChats[filteredIndex] = { ...updatedChat };
          }
        }

        this.assignmentStatuses.set(sessionId, {
          is_assigned: true,
          assigned_to: newAgentId,
          can_user_write: true,
          assigned_agent_name: chatData.to_agent_name
        });

      } else if (wasMyChat) {
        // 🔔 INFO: Mein Chat wurde übertragen
        if (chatIndex !== -1) {
          const updatedChat = {
            ...this.activeChats[chatIndex],
            assigned_to: newAgentId,
            assigned_agent: chatData.to_agent_name,
            lastMessage: `Chat an ${chatData.to_agent_name} übertragen`,
            lastMessageTime: new Date(chatData.last_message_time),
            unreadCount: 0,
            status: 'in_progress',
            isNew: false
          };

          this.activeChats[chatIndex] = updatedChat;
          const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
          if (filteredIndex !== -1) {
            this.filteredActiveChats[filteredIndex] = { ...updatedChat };
          }

          if (this.selectedChat?.id === sessionId) {
            this.selectedChat = { ...this.selectedChat, ...updatedChat };
          }
        }

        this.assignmentStatuses.delete(sessionId);
        this.showToast(`✅ Chat erfolgreich an ${chatData.to_agent_name} übertragen`, 'success');

      } else {
        // Transfer zwischen anderen Agents - nur zur Information
        if (chatIndex !== -1) {
          const updatedChat = {
            ...this.activeChats[chatIndex],
            assigned_to: newAgentId,
            assigned_agent: chatData.to_agent_name,
            lastMessage: `Chat übertragen an ${chatData.to_agent_name}`,
            lastMessageTime: new Date(chatData.last_message_time),
            status: 'in_progress'
          };

          this.activeChats[chatIndex] = updatedChat;
          const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
          if (filteredIndex !== -1) {
            this.filteredActiveChats[filteredIndex] = { ...updatedChat };
          }
        }
      }

      this.sortActiveChats();
      this.cdRef.detectChanges();
      return;
    }

    // 🔔 NOTIFICATION: Chat Ende durch Visitor
    if (data.type === 'chat_ended_by_visitor' && data.chat) {
      const chatData = data.chat;
      const sessionId = chatData.session_id;

      const chatIndex = this.activeChats.findIndex(c => c.id === sessionId);

      if (chatIndex !== -1) {
        const wasMyChat = this.activeChats[chatIndex].assigned_to === this.currentAgent.id;

        const updatedChat = {
          ...this.activeChats[chatIndex],
          status: 'closed',
          assigned_to: null,
          assigned_agent: '',
          lastMessage: chatData.last_message || 'Chat beendet',
          lastMessageTime: new Date(chatData.last_message_time),
          unreadCount: 0
        };

        this.activeChats[chatIndex] = updatedChat;

        const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
        if (filteredIndex !== -1) {
          this.filteredActiveChats[filteredIndex] = { ...updatedChat };
        }

        if (this.selectedChat?.id === sessionId) {
          this.selectedChat = { ...updatedChat };

          // 🔔 NOTIFICATION: Nur wenn es mein Chat war
          if (wasMyChat) {
            this.notificationSound.notify('message', {
              senderName: 'System',
              message: 'Der Benutzer hat Ihren Chat beendet',
              sessionId: sessionId
            });
            this.showToast('ℹ️ Der Benutzer hat den Chat beendet', 'info');
          }
        }

        this.assignmentStatuses.delete(sessionId);

        this.cdRef.detectChanges();
      }
      return;
    }

    // 🔔 NOTIFICATION: Chat Ende durch Agent
    if (data.type === 'chat_ended_by_agent' && data.chat) {
      const chatData = data.chat;
      const sessionId = chatData.session_id;
      const endedByMe = chatData.ended_by_name === this.currentAgent.name;

      const chatIndex = this.activeChats.findIndex(c => c.id === sessionId);
      const closeReason = chatData.close_reason || null;

      if (chatIndex !== -1) {
        // ✅ Vollständige Nachricht mit Grund erstellen
        let closedMessage = `Chat beendet von ${chatData.ended_by_name}`;
        if (closeReason) {
          closedMessage += ` (Grund: ${closeReason})`;
        }

        const updatedChat = {
          ...this.activeChats[chatIndex],
          status: 'closed',
          assigned_to: null,
          assigned_agent: '',
          lastMessage: closedMessage,  // ✅ Mit Grund
          lastMessageTime: new Date(chatData.last_message_time),
          unreadCount: 0
        };

        this.activeChats[chatIndex] = updatedChat;

        const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
        if (filteredIndex !== -1) {
          this.filteredActiveChats[filteredIndex] = { ...updatedChat };
        }

        if (this.selectedChat?.id === sessionId) {
          this.selectedChat = { ...updatedChat };

          if (!endedByMe) {
            this.showToast(`ℹ️ Chat wurde von ${chatData.ended_by_name} beendet`, 'info');
          }
        }

        this.assignmentStatuses.delete(sessionId);
        this.cdRef.detectChanges();
      }
      return;
    }

    // 🔔 NOTIFICATION: Chat Unassignment
    if (data.type === 'chat_unassigned' && data.chat) {
      const chatData = data.chat;
      const sessionId = chatData.session_id;

      const chatIndex = this.activeChats.findIndex(c => c.id === sessionId);

      if (chatIndex !== -1) {
        const wasMyChat = this.activeChats[chatIndex].assigned_to === this.currentAgent.id;

        const updatedChat = {
          ...this.activeChats[chatIndex],
          status: 'human',
          assigned_to: null,
          assigned_agent: '',
          lastMessage: chatData.last_message || 'Zuweisung aufgehoben',
          lastMessageTime: new Date(chatData.last_message_time),
          unreadCount: chatData.unread_count || 0,
          isNew: true
        };

        this.activeChats[chatIndex] = updatedChat;

        const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
        if (filteredIndex !== -1) {
          this.filteredActiveChats[filteredIndex] = { ...updatedChat };
        }

        if (this.selectedChat?.id === sessionId) {
          this.selectedChat = { ...updatedChat };
        }

        this.assignmentStatuses.delete(sessionId);

        // 🔔 NOTIFICATION: Nur wenn verfügbar für alle
        if (!wasMyChat || this.isAdmin) {
          this.notificationSound.notify('message', {
            senderName: 'System',
            message: 'Chat-Zuweisung aufgehoben - wartet auf Übernahme',
            sessionId: sessionId
          });
          this.showToast('ℹ️ Chat-Zuweisung aufgehoben - verfügbar für Übernahme', 'info');
        }

        this.sortActiveChats();
        this.cdRef.detectChanges();
      }
      return;
    }

    // 🔔 NOTIFICATION: Chat Escalation
    if (data.type === 'chat_escalated' && data.chat) {
      const chatData = data.chat;
      const sessionId = chatData.session_id;
      const customerName = `${chatData.customer_first_name || ''} ${chatData.customer_last_name || ''}`.trim() || 'Ein Kunde';

      const existingIndex = this.activeChats.findIndex(c => c.id === sessionId);

      if (existingIndex === -1) {
        const newChat: Chat = {
          id: chatData.session_id,
          chatId: chatData.chat_id,
          customerName: customerName,
          customerFirstName: chatData.customer_first_name || '',
          customerLastName: chatData.customer_last_name || '',
          customerAvatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
          lastMessage: chatData.last_message,
          lastMessageTime: new Date(chatData.last_message_time),
          unreadCount: chatData.unread_count || 1,
          isOnline: true,
          messages: [],
          status: chatData.status,
          assigned_to: chatData.assigned_to,
          assigned_agent: chatData.assigned_agent,
          isNew: true
        };

        this.activeChats = [newChat, ...this.activeChats];
        this.filteredActiveChats = [newChat, ...this.filteredActiveChats];
      } else {
        const updatedChat = {
          ...this.activeChats[existingIndex],
          status: chatData.status,
          lastMessage: chatData.last_message,
          lastMessageTime: new Date(chatData.last_message_time),
          unreadCount: chatData.unread_count || 1,
          assigned_to: chatData.assigned_to,
          assigned_agent: chatData.assigned_agent,
          isNew: true
        };

        this.activeChats[existingIndex] = updatedChat;

        const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
        if (filteredIndex !== -1) {
          this.filteredActiveChats[filteredIndex] = { ...updatedChat };
        }
      }

      // 🔔 WICHTIGE NOTIFICATION: Neue Chat-Anfrage
      this.notificationSound.notifyNewChatRequest(customerName, sessionId);
      this.showToast(`🆕 Neue Chat-Anfrage von ${customerName}`, 'success');

      this.sortActiveChats();
      this.cdRef.detectChanges();
      return;
    }

    // ✅ Standard: Unbekannter Event-Type
    console.warn('Unhandled chat update type:', data.type, data);
  }

  private handleChatTransfer(sessionId: string, newAgentId: number, newAgentName: string): void {
    // Assignment Status in der Map aktualisieren
    this.assignmentStatuses.set(sessionId, {
      is_assigned: true,
      assigned_to: newAgentId,
      can_user_write: newAgentId === this.currentAgent.id,
      assigned_agent_name: newAgentName
    });

    console.log('Assignment status updated after transfer:', {
      sessionId,
      newAgentId,
      canWrite: newAgentId === this.currentAgent.id
    });
  }

  private removeClosedChat(sessionId: string): void {
    this.activeChats = this.activeChats.filter(c => c.id !== sessionId);
    this.filteredActiveChats = this.filteredActiveChats.filter(c => c.id !== sessionId);

    // Admin-Chats auch filtern
    if (this.showAllChats) {
      this.allAdminChats = this.allAdminChats.filter(c => c.session_id !== sessionId);
      this.filteredAdminChats = this.filteredAdminChats.filter(c => c.session_id !== sessionId);
    }

    // Selected Chat zurücksetzen falls es der entfernte Chat war
    if (this.selectedChat?.id === sessionId) {
      this.selectedChat = null;
    }

    this.cdRef.detectChanges();
  }



// ✅ Close-Chat Dialog öffnen
  openCloseChatDialog(chat: Chat): void {
    this.chatToClose = chat;

    // ✅ Form explizit zurücksetzen
    this.closeDialogForm.reset({
      closeChatReason: ''  // Expliziter Startwert
    });

    console.log('Dialog opened:', {
      form: this.closeDialogForm.value,
      chatToClose: this.chatToClose?.id
    });

    this.showCloseChatDialog.set(true);
  }

// ✅ Chat durch Agent beenden
// ✅ Entferne die doppelte Variable
// closeChatReason = '';  // ❌ Diese Zeile LÖSCHEN

// Die korrekte Methode:
  closeChatByAgent(): void {
    if (!this.chatToClose) return;

    // ✅ Direkt aus dem FormControl holen
    const closeReasonValue = this.closeDialogForm.get('closeChatReason')?.value;

    console.log('🔍 Form debug:', {
      formValue: this.closeDialogForm.value,
      controlValue: closeReasonValue,
      formValid: this.closeDialogForm.valid
    });

    const payload = {
      session_id: this.chatToClose.id,
      reason: closeReasonValue?.trim() || null  // ✅ Explizit null wenn leer
    };

    console.log('📤 Final payload:', payload);

    this.chatbotService.closeChatByAgent(payload).subscribe({
      next: (response) => {
        console.log('✅ Response:', response);

        if (response.success) {
          this.showCloseChatDialog.set(false);
          this.chatToClose = null;
          this.closeDialogForm.reset();  // Form zurücksetzen
          this.showToast('Chat wurde erfolgreich beendet', 'success');
        }
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.showError('Chat konnte nicht beendet werden');
      }
    });
  }

// ✅ Close-Chat Dialog schließen
  closeCloseChatDialog(): void {
    this.showCloseChatDialog.set(false);
    this.chatToClose = null;
    this.closeChatReason = '';
  }


// In admin-dashboard.component.ts - showToast erweitern
  private showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration: number = 5000): void {
    console.log(`Toast (${type}):`, message);

    // CSS-Klassen basierend auf Type
    const panelClass = [`toast-${type}`, 'custom-snackbar'];

    const snackBarRef = this.snackBar.open(message, 'Schließen', {
      duration: duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: panelClass
    });

    // Optional: Action-Button Handler
    snackBarRef.onAction().subscribe(() => {
      snackBarRef.dismiss();
    });
  }

// Zusätzliche Convenience-Methoden
  private showSuccess(message: string) {
    this.showToast(message, 'success');
  }

  private showError(message: string) {
    this.showToast(message, 'error', 8000); // Längere Duration für Fehler
  }

  private showWarning(message: string) {
    this.showToast(message, 'warning');
  }

  private showInfo(message: string) {
    this.showToast(message, 'info');
  }


  private handleChatUnassignment(data: any): void {
    console.log('Handling chat unassignment:', data);

    const sessionId = data.session_id || data.chat?.session_id;
    if (!sessionId) return;

    this.assignmentStatuses.delete(sessionId);

    const chatIndex = this.activeChats.findIndex(c => c.id === sessionId);

    if (chatIndex !== -1) {
      const resetUpdates = {
        status: 'human' as const,
        assigned_to: null as number | null,
        assigned_agent: '',
        lastMessage: 'Chat-Zuweisung aufgehoben - wartet auf neue Übernahme',
        lastMessageTime: new Date(),
        unreadCount: (this.activeChats[chatIndex].unreadCount || 0) + 1,
        isNew: true
      };

      this.activeChats[chatIndex] = {
        ...this.activeChats[chatIndex],
        ...resetUpdates
      };

      const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
      if (filteredIndex !== -1) {
        this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
      }
    }

    if (this.selectedChat?.id === sessionId) {
      const currentChat = this.selectedChat;
      if (currentChat) {
        this.selectedChat = {
          id: currentChat.id,
          chatId: currentChat.chatId,
          customerName: currentChat.customerName,
          customerFirstName: currentChat.customerFirstName,
          customerLastName: currentChat.customerLastName,
          customerAvatar: currentChat.customerAvatar,
          lastMessage: 'Chat-Zuweisung aufgehoben - wartet auf neue Übernahme',
          lastMessageTime: new Date(),
          unreadCount: currentChat.unreadCount,
          isOnline: currentChat.isOnline,
          lastOnline: currentChat.lastOnline,
          messages: currentChat.messages,
          status: 'human',
          assigned_to: null,
          assigned_agent: '',
          isNew: true
        };
      }
    }

    if (this.showAllChats && this.allAdminChats.length > 0) {
      const adminChatIndex = this.allAdminChats.findIndex(c => c.session_id === sessionId);
      if (adminChatIndex !== -1) {
        this.allAdminChats[adminChatIndex] = {
          ...this.allAdminChats[adminChatIndex],
          status: 'human',
          assigned_to: null,
          assigned_agent: null,
          needs_assignment: true,
          can_assign: true
        };

        const filteredAdminIndex = this.filteredAdminChats.findIndex(c => c.session_id === sessionId);
        if (filteredAdminIndex !== -1) {
          this.filteredAdminChats[filteredAdminIndex] = { ...this.allAdminChats[adminChatIndex] };
        }
      }
    }

    this.sortActiveChats();
    this.filterChats();
    this.cdRef.detectChanges();

    // ✅ KORRIGIERT: Nur Sound wenn Tab inaktiv
    this.notificationSound.playNotificationSoundIfTabInactive();

    console.log('✅ Chat unassignment completed:', {
      sessionId,
      newStatus: 'human',
      canAssign: true,
      assignmentStatusDeleted: !this.assignmentStatuses.has(sessionId)
    });
  }

  private handleChatEscalation(data: any): void {
    console.log('Handling escalation:', data);

    const sessionId = data.session_id || data.chat?.session_id;
    if (!sessionId) return;

    const chatIndex = this.activeChats.findIndex(c => c.id === sessionId);

    if (chatIndex !== -1) {
      const updates = {
        status: 'human',
        lastMessage: 'Möchte mit Mitarbeiter sprechen',
        lastMessageTime: new Date(),
        unreadCount: (this.activeChats[chatIndex].unreadCount || 0) + 1,
        isNew: true
      };

      this.activeChats[chatIndex] = {
        ...this.activeChats[chatIndex],
        ...updates
      };

      const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
      if (filteredIndex !== -1) {
        this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
      }

      this.updateSelectedChatInRealtime(sessionId, updates);

      // ✅ NEU: Benachrichtigung bei Chat-Anfrage (Escalation)
      const chat = this.activeChats[chatIndex];
      const customerName = chat.customerName || 'Ein Kunde';
      console.log('🔔 Chat escalation notification for:', customerName);

      // ✅ Benachrichtigung mit spezifischer Nachricht
      this.notificationSound.notifyNewChatRequest(customerName, sessionId);
    } else {
      this.loadActiveChats();
    }

    this.sortActiveChats();
    this.cdRef.detectChanges();
  }


  /**
   * Chat-Status-Update Handler (erweitert)
   */
  private handleChatStatusChange(data: any): void {
    console.log('Handling status change:', data);

    const sessionId = data.session_id || data.chat?.session_id;
    const newStatus = data.status || data.new_status;

    if (!sessionId || !newStatus) return;

    const chatIndex = this.activeChats.findIndex(c => c.id === sessionId);

    if (chatIndex !== -1) {
      const updates = {
        status: newStatus,
        isNew: true
      };

      this.activeChats[chatIndex] = {
        ...this.activeChats[chatIndex],
        ...updates
      };

      const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
      if (filteredIndex !== -1) {
        this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
      }

      this.updateSelectedChatInRealtime(sessionId, updates);

      // ✅ KORRIGIERT: Nur Sound bei wichtigen Status-Änderungen UND Tab inaktiv
      if (newStatus === 'human') {
        this.notificationSound.playNotificationSoundIfTabInactive();
      }
    }
  }



  /**
   * Assignment-Info für bessere UX
   */
  getAssignmentInfo(chat: Chat): string {
    if (!chat.assigned_to) return '';

    const isMyChat = chat.assigned_to === this.currentAgent.id;
    const agentName = chat.assigned_agent || 'Unbekannt';

    return isMyChat ? 'Von mir übernommen' : `Zugewiesen an ${agentName}`;
  }

  /**
   * Echtzeit-Update für ausgewählten Chat
   */
  private updateSelectedChatInRealtime(sessionId: string, updates: Partial<Chat>): void {
    if (this.selectedChat?.id === sessionId) {
      this.selectedChat = {
        ...this.selectedChat,
        ...updates
      };

      // Change Detection für sofortige UI-Updates
      this.cdRef.detectChanges();

      console.log('Selected chat updated in real-time:', this.selectedChat);
    }
  }


  handleChatAssignment(selectedChat: Chat | null): void {
    if (!selectedChat?.id || selectedChat.assigned_to) return;

    // Type Guard: Nach der Prüfung wissen wir, dass selectedChat nicht null ist
    const chat = selectedChat as Chat;

    const isAdminChat = this.showAllChats && this.selectedAdminChat;

    if (isAdminChat && this.selectedAdminChat) {
      this.assignAdminChat(this.selectedAdminChat);
    } else {
      this.assignChat(chat); // ✅ Jetzt typsicher
    }
  }


  handleInputAssignment(): void {
    if (!this.selectedChat) return;

    // Type Guard mit expliziter Prüfung
    if (!this.canAssignChat(this.selectedChat)) {
      console.error('Cannot assign chat - conditions not met');
      return;
    }

    const isAdminChat = this.showAllChats && this.selectedAdminChat;

    if (isAdminChat && this.selectedAdminChat) {
      this.assignAdminChat(this.selectedAdminChat);
    } else {
      // Nach canAssignChat-Prüfung ist selectedChat garantiert assignable
      this.assignChat(this.selectedChat);
    }
  }




  private handleChatEnded(data: any): void {
    console.log('Chat ended event received:', data);

    const sessionId = data.session_id || data.chat?.session_id;
    if (!sessionId) return;

    const chat = this.activeChats.find(c => c.id === sessionId);
    if (!chat) return;

    this.ngZone.run(() => {
      // Chat-Status auf 'closed' setzen OHNE zu entfernen
      chat.status = 'closed';
      chat.assigned_to = null;
      chat.assigned_agent = '';

      const closeReason = data.close_reason || data.chat?.close_reason;
      let endMessage = `Chat wurde beendet (${data.ended_by === 'visitor' ? 'vom Benutzer' : 'von Mitarbeiter'})`;

      if (data.ended_by === 'agent' && closeReason) {
        endMessage = `Chat beendet von Mitarbeiter (Grund: ${closeReason})`;
      }

      chat.lastMessage = endMessage;
      chat.lastMessageTime = new Date();
      chat.unreadCount = 0; // Unread count zurücksetzen

      const chatIndex = this.activeChats.findIndex(c => c.id === sessionId);
      if (chatIndex !== -1) {
        this.activeChats[chatIndex] = { ...chat };
      }

      const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
      if (filteredIndex !== -1) {
        this.filteredActiveChats[filteredIndex] = { ...chat };
      }

      if (this.selectedChat?.id === sessionId) {
        this.selectedChat = { ...chat };
        this.showToast(endMessage, 'info');
      }

      // WICHTIG: removeClosedChat() NICHT aufrufen!
      this.cdRef.detectChanges();
    });
  }

  // Neue Methode für Escalation-Behandlung
  private handleNewEscalation(data: any): void {
    console.log('New escalation:', data);

    this.loadActiveChats();

    // ✅ KORRIGIERT: Nur Sound wenn Tab inaktiv
    this.notificationSound.playNotificationSoundIfTabInactive();

    setTimeout(() => {
      const newChatElement = document.querySelector('.chat-item.is-new');
      if (newChatElement) {
        newChatElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500);
  }


  // ✅ NEUE Methode für Chat-Updates
  private handleChatUpdate(data: any): void {
    console.log('Chat Update empfangen:', data);

    if (data.type === 'chat_escalated' && data.chat) {
      const chatData = data.chat;

      const existingIndex = this.activeChats.findIndex(c => c.id === chatData.session_id);

      if (existingIndex === -1) {
        const newChat: Chat = {
          id: chatData.session_id,
          chatId: chatData.chat_id,
          customerName: `${chatData.customer_first_name || ''} ${chatData.customer_last_name || ''}`.trim() || 'Anonymer Benutzer',
          customerFirstName: chatData.customer_first_name || '',
          customerLastName: chatData.customer_last_name || '',
          customerAvatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
          lastMessage: chatData.last_message,
          lastMessageTime: new Date(chatData.last_message_time),
          unreadCount: chatData.unread_count || 1,
          isOnline: true,
          messages: [],
          status: chatData.status,
          assigned_to: chatData.assigned_to,
          assigned_agent: chatData.assigned_agent,
          isNew: true
        };

        this.activeChats = [newChat, ...this.activeChats];
        this.filteredActiveChats = [newChat, ...this.filteredActiveChats];
      } else {
        const updatedChat = {
          ...this.activeChats[existingIndex],
          status: chatData.status,
          lastMessage: chatData.last_message,
          lastMessageTime: new Date(chatData.last_message_time),
          unreadCount: chatData.unread_count || 1,
          assigned_to: chatData.assigned_to,
          assigned_agent: chatData.assigned_agent,
          isNew: true
        };

        this.activeChats[existingIndex] = updatedChat;

        const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === chatData.session_id);
        if (filteredIndex !== -1) {
          this.filteredActiveChats[filteredIndex] = { ...updatedChat };
        }
      }

      this.sortActiveChats();
      this.cdRef.detectChanges();

      // ✅ KORRIGIERT: Nur Sound wenn Tab inaktiv
      this.notificationSound.playNotificationSoundIfTabInactive();

      setTimeout(() => {
        const newChatElement = document.querySelector('.chat-item.is-new');
        if (newChatElement) {
          newChatElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }



  private handleIncomingMessageGlobal(data: any): void {
    console.log('📥 handleIncomingMessageGlobal - Full data:', data);

    const messageData = data.message;
    const sessionId = messageData.session_id;

    if (!sessionId) return;

    // 🔔 NOTIFICATION: Neue Nachricht von Visitor/User (NICHT von Bot oder Agent!)
    if (messageData && messageData.text && messageData.from === 'user') {  // ✅ WICHTIG: Nur 'user', nicht 'bot' oder 'agent'
      const chat = this.activeChats.find(c => c.id === sessionId);
      const isSelectedChat = this.selectedChat?.id === sessionId;

      // ✅ VERBESSERT: Versuche Namen aus mehreren Quellen zu bekommen
      let senderName = 'Unbekannter Kunde';

      console.log('🔍 Searching for customer name in:', {
        chat: chat ? {
          customerName: chat.customerName,
          customerFirstName: chat.customerFirstName,
          customerLastName: chat.customerLastName
        } : null,
        data: {
          customer_name: data.customer_name,
          customer_first_name: data.customer_first_name,
          customer_last_name: data.customer_last_name
        },
        messageData: {
          customer_name: messageData.customer_name,
          customer_first_name: messageData.customer_first_name,
          customer_last_name: messageData.customer_last_name,
          from: messageData.from  // ✅ Zeige von wem die Nachricht kommt
        }
      });

      if (chat) {
        // Versuche aus Chat-Objekt
        if (chat.customerName && chat.customerName !== 'Anonymer Benutzer') {
          senderName = chat.customerName;
        } else if (chat.customerFirstName || chat.customerLastName) {
          senderName = `${chat.customerFirstName || ''} ${chat.customerLastName || ''}`.trim();
        }
      }

      // Wenn immer noch unbekannt, versuche aus Message-Data direkt
      if (senderName === 'Unbekannter Kunde') {
        if (messageData.customer_name) {
          senderName = messageData.customer_name;
        } else if (messageData.customer_first_name || messageData.customer_last_name) {
          senderName = `${messageData.customer_first_name || ''} ${messageData.customer_last_name || ''}`.trim();
        }
      }

      // Wenn immer noch unbekannt, versuche aus übergeordnetem Data-Objekt
      if (senderName === 'Unbekannter Kunde') {
        if (data.customer_name) {
          senderName = data.customer_name;
        } else if (data.customer_first_name || data.customer_last_name) {
          senderName = `${data.customer_first_name || ''} ${data.customer_last_name || ''}`.trim();
        }
      }

      console.log('📨 New USER message notification:', {
        sessionId,
        finalSenderName: senderName,
        messageText: messageData.text,
        isSelectedChat,
        chatFound: !!chat,
        messageFrom: messageData.from
      });

      // ✅ GEÄNDERT: IMMER benachrichtigen bei Visitor-Nachrichten (unabhängig vom ausgewählten Chat)
      console.log('🔔 Triggering notification for USER message (ALWAYS)');
      this.notificationSound.notifyNewMessage(
        senderName,
        messageData.text,
        sessionId
      );
    }

    // ✅ Bot-Nachrichten werden ignoriert (keine Notifications)
    if (messageData && messageData.from === 'bot') {
      console.log('🤖 Bot message received - NO notification sent');
    }

    // Rest der Logik bleibt unverändert...
    if (data.unassigned) {
      const chat = this.activeChats.find(c => c.id === sessionId);
      if (chat) {
        chat.assigned_to = null;
        chat.assigned_agent = '';
        chat.status = 'human';
        chat.lastMessage = 'Zuweisung aufgehoben - wartet auf Übernahme';
        chat.lastMessageTime = new Date();
        chat.unreadCount = (chat.unreadCount || 0) + 1;
        chat.isNew = true;

        this.assignmentStatuses.set(chat.id, {
          is_assigned: false,
          assigned_to: null,
          can_user_write: true
        });

        const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
        if (filteredIndex !== -1) {
          this.filteredActiveChats[filteredIndex] = { ...chat };
        }

        if (this.selectedChat?.id === sessionId) {
          this.selectedChat = { ...this.selectedChat, ...chat };
        }

        this.notificationSound.notify('message', {
          senderName: 'System',
          message: 'Chat-Zuweisung aufgehoben - verfügbar für Übernahme',
          sessionId: sessionId
        });

        this.sortActiveChats();
        this.cdRef.detectChanges();
        return;
      }
    }

    if (data.chat_ended && data.ended_by === 'visitor') {
      const chat = this.activeChats.find(c => c.id === sessionId);
      if (chat) {
        chat.status = 'closed';
        chat.assigned_to = null;
        chat.assigned_agent = '';

        if (chat.assigned_to === this.currentAgent.id) {
          this.notificationSound.notify('message', {
            senderName: 'System',
            message: 'Der Benutzer hat Ihren Chat beendet',
            sessionId: sessionId
          });
        }
      }
      return;
    }

    if (data.assigned_to) {
      const chat = this.activeChats.find(c => c.id === sessionId);
      if (chat) {
        chat.assigned_to = data.assigned_to;
        chat.assigned_agent = data.agent_name;
        chat.status = data.status;

        this.assignmentStatuses.set(chat.id, {
          is_assigned: true,
          assigned_to: data.assigned_to,
          can_user_write: data.assigned_to === this.currentAgent.id
        });

        const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
        if (filteredIndex !== -1) {
          this.filteredActiveChats[filteredIndex] = { ...chat };
        }
      }
    }

    if (this.isMessageDuplicate(sessionId, messageData.id)) {
      return;
    }

    const chatIndex = this.activeChats.findIndex(chat => chat.id === sessionId);

    if (chatIndex === -1) {
      this.loadActiveChats();
      return;
    }

    this.addMessageToChat(sessionId, messageData);
    this.cdRef.detectChanges();
  }

  private cleanupPusherSubscriptions() {
//    console.log('Bereinige alle Pusher-Subscriptions...');

    this.pusherSubscriptions.forEach(sub => {
      if (sub.subscription?.unsubscribe) {
        //       console.log(`Entferne Listener für Channel: ${sub.channel}`);
        sub.subscription.unsubscribe(); // Stoppt den Listener
      }
    });

    this.pusherSubscriptions = []; // Leert das Array
  }

  trackByMessageId(index: number, message: Message): string {
    return message.id;
  }



  ngOnDestroy() {
    this.cleanupPusherSubscriptions();

    if (this.authSub) {
      this.authSub.unsubscribe();
    }

    if (this.chatRequestSubscription) {
      this.chatRequestSubscription.unsubscribe();
    }
  }

  private markMessagesAsRead(chatId: string, sessionId: string): void {
    this.chatbotService.markMessagesAsRead(chatId, sessionId).subscribe({
      next: (response) => {
        this.updateLocalUnreadCount(sessionId, 0);
      },
      error: (err) => console.error('Fehler beim Markieren als gelesen:', err)
    });
  }

  private updateLocalUnreadCount(sessionId: string, unreadCount: number): void {
    this.activeChats = this.activeChats.map(chat =>
      chat.id === sessionId ? { ...chat, unreadCount } : chat
    );
    this.filteredActiveChats = this.filteredActiveChats.map(chat =>
      chat.id === sessionId ? { ...chat, unreadCount } : chat
    );
    this.cdRef.detectChanges();
  }





// ✅ Erweiterte loadActiveChats mit besserer Fehlerbehandlung
  async loadActiveChats(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.chatbotService.getActiveChats());
      const chats = Array.isArray(response) ? response : response.data;

      this.activeChats = await Promise.all(chats.map(async (chat: any) => {
        const isSelected = this.selectedChat?.id === chat.session_id;
        const isNew = chat.status === 'human' && !chat.assigned_agent;

        let customerName = chat.customer_first_name && chat.customer_last_name
          ? `${chat.customer_first_name} ${chat.customer_last_name}`
          : 'Anonymer Benutzer';

        // Nur Visitor-Daten abrufen, wenn keine Namen vorhanden sind
        if (!chat.customer_first_name && !chat.customer_last_name) {
          try {
            const visitor = await firstValueFrom(
              this.chatbotService.getVisitorDetails(chat.session_id).pipe(
                catchError(() => of(null))
              )
            );
            if (visitor) {
              customerName = visitor.first_name && visitor.last_name
                ? `${visitor.first_name} ${visitor.last_name}`
                : customerName;
            }
          } catch (error) {
            console.error('Error loading visitor name:', error);
          }
        }

        return {
          id: chat.session_id || '',
          chatId: chat.chat_id || '',
          customerName: customerName,
          customerFirstName: chat.customer_first_name || '',
          customerLastName: chat.customer_last_name || '',
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
              isBot: msg.from === 'bot',
              read: isSelected ? true : (msg.read || false),
              attachment: msg.has_attachment ? msg.attachment : undefined
            }))
            : [],
          status: chat.status || '',
          assigned_agent: chat.assigned_agent || '',
          assigned_to: chat.assigned_to,
          isNew: isNew
        };
      }));

      // ✅ Filtere und sortiere
      this.sortActiveChats();
      this.filterChats(); // Wende aktuelle Filter an

      // ✅ Setup Pusher nach erfolgreichem Laden
      const assignedSessionId = localStorage.getItem('assigned_chat_session_id');
      if (assignedSessionId && (!this.selectedChat || this.selectedChat.id !== assignedSessionId)) {
        const assignedChat = this.activeChats.find(chat => chat.id === assignedSessionId);
        if (assignedChat) {
          this.selectChat(assignedChat);
        }
      }

      this.setupPusherListeners();
      this.cdRef.detectChanges();

    } catch (error) {
      console.error('Error loading chats:', error);
      // ✅ Retry nach Fehler
      setTimeout(() => {
        this.loadActiveChats();
      }, 5000);
    }
  }



  closeChat() {
    if (!this.selectedChat) return;

    // Öffne Dialog statt direkt zu schließen
    this.openCloseChatDialog(this.selectedChat);
  }


  private updatePusherSubscriptions() {
    this.cleanupPusherSubscriptions();
    this.setupPusherListeners();
  }




  private addMessageToChat(sessionId: string, messageData: any): void {
    const chatIndex = this.activeChats.findIndex(chat => chat.id === sessionId);
    if (chatIndex === -1) return;

    const isCurrentChat = this.selectedChat?.id === sessionId;
    const isAgentMessage = messageData.from === 'agent';

    // NUR für aktuellen Chat als gelesen markieren
    const shouldMarkAsRead = isCurrentChat;

    const newMessage: Message = {
      id: messageData.id,
      content: messageData.text,
      timestamp: new Date(messageData.created_at),
      isAgent: isAgentMessage,
      isBot: messageData.from === 'bot',
      read: shouldMarkAsRead,
      attachment: messageData.has_attachment ? messageData.attachment : undefined
    };

    // Unread count Logik
    let newUnreadCount = this.activeChats[chatIndex].unreadCount || 0;
    if (!shouldMarkAsRead && !isAgentMessage) {
      newUnreadCount += 1;
    } else if (shouldMarkAsRead) {
      newUnreadCount = 0;
    }

    const updatedChat = {
      ...this.activeChats[chatIndex],
      lastMessage: newMessage.content,
      lastMessageTime: newMessage.timestamp,
      unreadCount: newUnreadCount,
      messages: [...this.activeChats[chatIndex].messages, newMessage]
    };

    this.activeChats = [
      ...this.activeChats.slice(0, chatIndex),
      updatedChat,
      ...this.activeChats.slice(chatIndex + 1)
    ];

    if (isCurrentChat) {
      this.selectedChat = {
        ...updatedChat,
        messages: updatedChat.messages.map(m => ({ ...m, read: true }))
      };
      this.scrollToBottom();

      // SOFORT als gelesen markieren im Backend
      this.markMessagesAsRead(updatedChat.chatId, sessionId);
    }

    this.sortActiveChats();
    this.cdRef.detectChanges();
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

  assignAdminChat(adminChat: any): void {
    if (!adminChat || adminChat.assigned_to) return;

    const sessionId = adminChat.session_id;
    if (!sessionId) {
      console.error('Keine Session ID für Admin-Chat gefunden');
      return;
    }

    this.chatbotService.assignChatToAgent(sessionId).subscribe({
      next: (response) => {
        if (response.success) {
          // Admin-Chat in der Liste aktualisieren
          const chatIndex = this.allAdminChats.findIndex(c => c.session_id === sessionId);
          if (chatIndex !== -1) {
            this.allAdminChats[chatIndex] = {
              ...this.allAdminChats[chatIndex],
              assigned_to: this.currentAgent.id,
              assigned_agent: this.currentAgent.name,
              status: 'in_progress'
            };

            // Auch filteredAdminChats aktualisieren
            const filteredIndex = this.filteredAdminChats.findIndex(c => c.session_id === sessionId);
            if (filteredIndex !== -1) {
              this.filteredAdminChats[filteredIndex] = { ...this.allAdminChats[chatIndex] };
            }
          }

          // ✅ KORRIGIERT: Typ-sichere selectedChat Aktualisierung
          if (this.selectedChat?.id === sessionId) {
            this.selectedChat = {
              ...this.selectedChat,
              assigned_to: this.currentAgent.id,
              assigned_agent: this.currentAgent.name,
              status: 'in_progress'
            } as Chat; // Expliziter Cast
          }

          // Assignment Status lokal speichern
          this.assignmentStatuses.set(sessionId, {
            is_assigned: true,
            assigned_to: this.currentAgent.id,
            can_user_write: true
          });

          // Aktive Chats auch neu laden für Konsistenz
          this.loadActiveChats();

          console.log('Admin chat erfolgreich zugewiesen:', sessionId);
        }
      },
      error: (err) => {
        console.error('Fehler beim Zuweisen des Admin-Chats:', err);
        this.showError('Chat konnte nicht zugewiesen werden');
      }
    });
  }



  selectChat(chat: Chat): void {
    this.ngZone.run(() => {
      // Setze unreadCount = 0 und alle Nachrichten auf read = true
      this.activeChats = this.activeChats.map(c =>
        c.id === chat.id
          ? { ...c, unreadCount: 0, messages: c.messages.map(m => ({ ...m, read: true })) }
          : c
      );

      this.filteredActiveChats = this.filteredActiveChats.map(c =>
        c.id === chat.id
          ? { ...c, unreadCount: 0, messages: c.messages.map(m => ({ ...m, read: true })) }
          : c
      );

      // Setze selectedChat
      this.selectedChat = {
        ...chat,
        messages: chat.messages.map(m => ({ ...m, read: true }))
      };

      // Scroll nach unten
      setTimeout(() => this.scrollToBottom(), 100);
      this.loadAssignmentStatus(chat.id);

      // Speichere im localStorage
      localStorage.setItem('assigned_chat_session_id', chat.id);

      // Backend-Call: als gelesen markieren
      if (chat.chatId && chat.id) {
        this.markMessagesAsRead(chat.chatId, chat.id);
      }

      // Besucher laden
      this.chatbotService.getVisitorDetails(chat.id).subscribe({
        next: (visitor) => (this.visitor = visitor),
        error: (err) => console.error('Error fetching visitor details:', err)
      });
    });
  }


// In admin-dashboard.component.ts - canWrite Methode korrigieren:
  canWrite(chat: Chat | null): boolean {
    if (!chat) return false;

    // WICHTIG: Explizite Prüfung auf null/undefined
    const isAssigned = chat.assigned_to !== null && chat.assigned_to !== undefined;
    const isAssignedToMe = isAssigned && chat.assigned_to === this.currentAgent.id;

    if (chat.status === 'human') {
      // Bei Status 'human': Nur schreiben wenn zugewiesen UND es ist mein Chat
      return isAssignedToMe;
    }

    if (chat.status === 'in_progress') {
      // Bei Status 'in_progress': Nur der zugewiesene Agent darf schreiben
      return isAssignedToMe;
    }

    // Bei anderen Status nicht schreiben
    return false;
  }
  /**
   * Assignment Status für Chat laden
   */

  private loadAssignmentStatus(chatId: string): void {
    this.chatbotService.getAssignmentStatus(chatId).subscribe({
      next: (response) => {
        if (response.success) {
          // Nur setzen wenn tatsächlich assigned
          if (response.assignment_status.is_assigned) {
            this.assignmentStatuses.set(chatId, response.assignment_status);
          } else {
            // Explizit löschen wenn nicht assigned
            this.assignmentStatuses.delete(chatId);
          }
        }
      },
      error: (err) => {
        console.error('Fehler beim Laden des Assignment Status:', err);
        // Bei Fehler auch löschen
        this.assignmentStatuses.delete(chatId);
      }
    });
  }

  /**
   * Transfer History für Chat anzeigen
   */
  showTransferHistory(chat: Chat): void {
    this.chatbotService.getTransferHistory(chat.id).subscribe({
      next: (response) => {
        if (response.success && response.transfers.length > 0) {
          // Dialog oder Tooltip mit Transfer History anzeigen
          console.log('Transfer History:', response.transfers);
        }
      },
      error: (err) => {
        console.error('Fehler beim Laden der Transfer History:', err);
      }
    });
  }



  /**
   * Kann Chat zugewiesen werden?
   */
  canAssignChat(chat: Chat | null): boolean {
    if (!chat || !chat.id) {
      return false;
    }

    const statusCheck = chat.status === 'human';
    const assignmentCheck = chat.assigned_to === null || chat.assigned_to === undefined;

    console.log('canAssignChat debug:', {
      chatId: chat.id,
      status: chat.status,
      statusCheck,
      assigned_to: chat.assigned_to,
      assignmentCheck,
      result: statusCheck && assignmentCheck
    });

    return statusCheck && assignmentCheck;
  }
  /**
   * Kann Chat übertragen werden?
   */
  canTransferChat(chat: Chat): boolean {
    if (!chat || !chat.assigned_to) {
      console.log('Cannot transfer: Chat not assigned');
      return false;
    }

    const isMyChat = chat.assigned_to === this.currentAgent.id;
    const isInProgress = chat.status === 'in_progress';

    console.log('Transfer check:', {
      chatId: chat.id,
      assigned_to: chat.assigned_to,
      currentAgentId: this.currentAgent.id,
      isMyChat: isMyChat,
      isAdmin: this.isAdmin,
      status: chat.status,
      isInProgress: isInProgress
    });

    return (isMyChat || this.isAdmin) && isInProgress;
  }


  /**
   * Kann Escalation Prompt senden?
   */
  canSendEscalationPrompt(chat: Chat): boolean {
    return chat.status === 'bot' && !this.escalationPrompts.has(chat.id);
  }

  /**
   * Fehler anzeigen (implementieren Sie entsprechend Ihrem UI-System)

  private showError(message: string, duration: number = 7000): void {
    console.error('Error:', message);
    this.showToast(message, 'error', duration);
  }
   */
  /**
   * Chat zuweisen
   */
  assignChat(chat: Chat): void {
    console.log('assignChat called:', {
      chatId: chat.id,
      canAssign: this.canAssignChat(chat),
      currentStatus: chat.status,
      currentAssignment: chat.assigned_to
    });

    if (!chat?.id) {
      console.error('No chat ID provided');
      return;
    }

    if (!this.canAssignChat(chat)) {
      console.error('Cannot assign chat - conditions not met:', {
        status: chat.status,
        assigned_to: chat.assigned_to,
        canAssign: this.canAssignChat(chat)
      });
      this.showError('Chat kann nicht zugewiesen werden');
      return;
    }

    const originalChat = { ...chat };

    this.chatbotService.assignChatToAgent(chat.id).subscribe({
      next: (response) => {
        console.log('Chat assignment successful:', response);

        if (response.success) {
          const chatIndex = this.activeChats.findIndex(c => c.id === chat.id);
          if (chatIndex !== -1) {
            this.activeChats[chatIndex] = {
              ...this.activeChats[chatIndex],
              assigned_to: this.currentAgent.id,
              assigned_agent: this.currentAgent.name,
              status: 'in_progress',
              isNew: false
            };

            const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === chat.id);
            if (filteredIndex !== -1) {
              this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
            }
          }

          if (this.selectedChat?.id === chat.id) {
            this.selectedChat = {
              ...this.selectedChat,
              assigned_to: this.currentAgent.id,
              assigned_agent: this.currentAgent.name,
              status: 'in_progress'
            };
          }

          this.assignmentStatuses.set(chat.id, {
            is_assigned: true,
            assigned_to: this.currentAgent.id,
            can_user_write: true,
            assigned_agent_name: this.currentAgent.name
          });

          // ✅ ENTFERNT: Kein Sound-Feedback beim Chat-Assignment
          this.showToast('✅ Chat erfolgreich übernommen', 'success');
          this.cdRef.detectChanges();
        }
      },
      error: (err) => {
        console.error('Chat assignment failed:', err);

        const chatIndex = this.activeChats.findIndex(c => c.id === chat.id);
        if (chatIndex !== -1) {
          this.activeChats[chatIndex] = originalChat;

          const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === chat.id);
          if (filteredIndex !== -1) {
            this.filteredActiveChats[filteredIndex] = originalChat;
          }
        }

        if (this.selectedChat?.id === chat.id) {
          this.selectedChat = originalChat;
        }

        this.cdRef.detectChanges();
        this.showError('Chat konnte nicht zugewiesen werden: ' + (err.error?.message || err.message));
      }
    });
  }


  toggleNotifications(): void {
    if (this.notificationSound.isMuted) {
      this.notificationSound.unmuteNotifications();
      this.showToast('Benachrichtigungen wieder aktiviert', 'success');
    } else {
      // 30 Minuten stumm schalten
      this.notificationSound.muteNotifications(30);
      this.showToast('Benachrichtigungen für 30 Minuten deaktiviert', 'info');
    }
  }

  /**
   * Chat übertragen
   */
// In admin-dashboard.component.ts - Korrigierte Transfer Dialog Methoden

  /**
   * Transfer Dialog öffnen - KORRIGIERT
   */
  openTransferDialog(chat: Chat): void {
    if (!this.canTransferChat(chat)) {
      console.error('Chat kann nicht übertragen werden');
      return;
    }

    this.selectedChatForTransfer = chat;

    // ✅ Form zurücksetzen
    this.transferForm.reset({
      selectedAgent: '',
      transferReason: ''
    });

    console.log('Loading available agents...');
    this.loadAvailableAgents().then(() => {
      console.log('Available agents loaded:', this.availableAgents);
      this.showTransferDialog.set(true);
    }).catch((error) => {
      console.error('Error loading agents:', error);
      this.showError('Verfügbare Agents konnten nicht geladen werden');
    });
  }

  /**
   * Verfügbare Agents laden - KORRIGIERT mit Promise
   */
  private loadAvailableAgents(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('API call: getAvailableAgents');

      this.chatbotService.getAvailableAgents().subscribe({
        next: (response: { success: boolean; agents: Agent[] }) => {
          console.log('API Response:', response);

          if (response.success && response.agents) {
            this.availableAgents = response.agents.filter((agent: Agent) => {
              // Aktueller Benutzer sollte nicht in der Liste stehen
              return agent.id !== this.currentAgent.id;
            });

            console.log('Filtered available agents:', this.availableAgents);
            resolve();
          } else {
            console.error('Invalid response format:', response);
            this.availableAgents = [];
            reject(new Error('Invalid response format'));
          }
        },
        error: (err: any) => {
          console.error('Error loading agents:', err);
          this.availableAgents = [];
          this.showError('Fehler beim Laden der verfügbaren Agents: ' + (err.error?.message || err.message));
          reject(err);
        }
      });
    });
  }

  /**
   * Chat übertragen - KORRIGIERT
   */
  transferChat(toAgentId: number): void {
    if (!this.selectedChatForTransfer || !toAgentId) {
      console.error('Transfer data incomplete:', {
        selectedChat: !!this.selectedChatForTransfer,
        toAgentId: toAgentId
      });
      return;
    }

    const selectedAgent = this.availableAgents.find(a => a.id === toAgentId);
    if (!selectedAgent) {
      console.error('Selected agent not found in available agents list');
      return;
    }

    const reasonFromForm = this.transferForm.get('transferReason')?.value;
    const finalReason = reasonFromForm?.trim().length > 0 ? reasonFromForm.trim() : undefined;

    console.log('Transferring chat:', {
      chatId: this.selectedChatForTransfer.id,
      toAgentId: toAgentId,
      toAgentName: selectedAgent.name,
      reason: finalReason
    });

    this.chatbotService.transferChatToAgent(
      this.selectedChatForTransfer.id,
      toAgentId,
      finalReason
    ).subscribe({
      next: (response) => {
        console.log('Transfer response:', response);

        if (response.success && this.selectedChatForTransfer) {
          const chatIndex = this.activeChats.findIndex(c => c.id === this.selectedChatForTransfer!.id);
          if (chatIndex !== -1) {
            this.activeChats[chatIndex] = {
              ...this.activeChats[chatIndex],
              assigned_to: toAgentId,
              assigned_agent: selectedAgent.name,
              lastMessage: `Chat übertragen an ${selectedAgent.name}`,
              lastMessageTime: new Date()
            };

            const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === this.selectedChatForTransfer!.id);
            if (filteredIndex !== -1) {
              this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
            }
          }

          if (this.selectedChat?.id === this.selectedChatForTransfer.id) {
            this.selectedChat = {
              ...this.selectedChat,
              assigned_to: toAgentId,
              assigned_agent: selectedAgent.name
            };
          }

          this.closeTransferDialog();

          // ✅ ENTFERNT: Kein Sound beim Transfer durch eigene Aktion
          this.showToast(`✅ Chat erfolgreich an ${selectedAgent.name} übertragen`, 'success');
          this.loadActiveChats();
        } else {
          this.showError('Transfer fehlgeschlagen: ' + (response.message || 'Unbekannter Fehler'));
        }
      },
      error: (err) => {
        console.error('Transfer error:', err);
        this.showError('Chat konnte nicht übertragen werden: ' + (err.error?.message || err.message));
      }
    });
  }

  /**
   * Transfer Dialog schließen
   */
  closeTransferDialog(): void {
    this.showTransferDialog.set(false);
    this.selectedChatForTransfer = null;
    this.availableAgents = [];

    // ✅ Form zurücksetzen
    this.transferForm.reset();
  }





  /**
   * Chat-Zuweisung aufheben (nur Admins)
   */
  unassignChat(chat: Chat): void {
    if (!chat.assigned_to || !this.isAdmin) return;

    this.chatbotService.unassignChat(chat.id).subscribe({
      next: (response) => {
        if (response.success) {
          chat.assigned_to = null;
          chat.assigned_agent = '';
          chat.status = 'human';

          this.assignmentStatuses.set(chat.id, {
            is_assigned: false,
            assigned_to: null,
            can_user_write: false
          });

          this.loadActiveChats();
        }
      },
      error: (err) => {
        console.error('Fehler beim Aufheben der Zuweisung:', err);
        this.showError('Zuweisung konnte nicht aufgehoben werden');
      }
    });
  }

  /**
   * Escalation Prompt senden
   */
  sendEscalationPrompt(chat: Chat): void {
    if (!this.canSendEscalationPrompt(chat)) {
      this.showError('Escalation-Prompt kann nicht gesendet werden');
      return;
    }

    const payload = {
      session_id: chat.id,
    };

    this.chatbotService.sendEscalationPrompt(chat.id, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.showToast(`✅ Escalation-Anfrage erfolgreich an ${chat.customerName} gesendet`, 'success');

          // Chat in der Liste aktualisieren
          const chatIndex = this.activeChats.findIndex(c => c.id === chat.id);
          if (chatIndex !== -1) {
            this.activeChats[chatIndex] = {
              ...this.activeChats[chatIndex],
              lastMessage: 'Escalation-Anfrage gesendet',
              lastMessageTime: new Date(),
              unreadCount: 0
            };

            const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === chat.id);
            if (filteredIndex !== -1) {
              this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
            }
          }

          // Escalation-Prompts Map aktualisieren
          this.escalationPrompts.set(chat.id, {
            prompt_id: response.prompt_id,
            sent_at: new Date(),
            sent_by: response.sent_by || this.currentAgent.name
          });

          // UI-Updates
          this.cdRef.detectChanges();
        }
      },
      error: (err) => {
        console.error('Fehler beim Senden der Escalation:', err);
        this.showError('Escalation konnte nicht gesendet werden: ' + (err.error?.message || err.message));
      }
    });
  }




// Neue Methode für Keyboard-Events hinzufügen:
  onKeyDown(event: KeyboardEvent, inputElement: HTMLTextAreaElement): void {
    if (event.key === 'Enter') {
      if (!event.shiftKey) {
        // Enter ohne Shift: Nachricht senden
        event.preventDefault();
        this.sendMessage(inputElement.value, inputElement);
      }
      // Shift+Enter: Neue Zeile (Standard-Verhalten)
    }
  }


  sendMessage(content: string, inputElement: HTMLTextAreaElement): void {
    if (!content.trim() || !this.selectedChat) return;

    if (!this.canWrite(this.selectedChat)) {
      console.error('Nicht berechtigt zu schreiben');
      this.showError('Sie sind nicht berechtigt, in diesem Chat zu schreiben');
      return;
    }

    const newMessagePayload = {
      chat_id: this.selectedChat.chatId,
      content: content.trim(),
      isAgent: true
    };

    this.chatbotService.sendAgentMessage(newMessagePayload).subscribe({
      next: () => {
        // Textfeld leeren
        inputElement.value = '';
        inputElement.focus();

      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.showError('Nachricht konnte nicht gesendet werden');
      }
    });
  }

  checkNotificationSupport(): void {
    const support = {
      browserSupport: this.notificationSound.isSupported,
      hasPermission: this.notificationSound.hasPermission,
      currentPermission: this.notificationSound.currentPermission,
      isVisible: this.notificationSound.isVisible,
      isMuted: this.notificationSound.isMuted
    };

    console.log('Notification Support Status:', support);

    if (!support.browserSupport) {
      this.showToast('Browser unterstützt keine Benachrichtigungen', 'warning');
    } else if (!support.hasPermission) {
      this.showToast('Benachrichtigungen nicht aktiviert - nur Audio verfügbar', 'info');
    } else {
      this.showToast('Benachrichtigungen sind vollständig aktiviert', 'success');
    }
  }

  trackByChatId(index: number, chat: Chat): string {
    return chat.id;
  }

  // File handling methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        this.showError('Datei ist zu groß. Maximale Größe: 10MB');
        return;
      }

      if (!this.selectedChat) {
        this.showError('Kein Chat ausgewählt');
        return;
      }

      this.uploadFile(file);
    }
  }

  uploadFile(file: File): void {
    if (!this.selectedChat) return;

    const sessionId = this.selectedChat.id;
    const chatId = this.selectedChat.chatId;

    this.showToast(`Datei wird hochgeladen: ${file.name}`, 'info');

    this.chatbotService.uploadAttachment(file, chatId, sessionId, 'agent').subscribe({
      next: (response) => {
        console.log('File uploaded successfully:', response);
        this.showToast('Datei erfolgreich gesendet', 'success');
      },
      error: (err) => {
        console.error('File upload error:', err);
        this.showError('Fehler beim Hochladen der Datei');
      }
    });
  }

  downloadFile(attachment: any): void {
    this.chatbotService.downloadAttachment(attachment.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Download error:', err);
        this.showError('Fehler beim Herunterladen der Datei');
      }
    });
  }

  getFileIcon(fileType: string): string {
    const iconMap: {[key: string]: string} = {
      'image': 'image',
      'video': 'videocam',
      'audio': 'audiotrack',
      'pdf': 'picture_as_pdf',
      'document': 'description',
      'spreadsheet': 'table_chart',
      'other': 'insert_drive_file'
    };
    return iconMap[fileType] || 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  private isMessageDuplicate(chatId: string, messageId: string): boolean {
    const chat = this.activeChats.find(c => c.id === chatId);
    if (!chat) return false;

    // Auch in selectedChat prüfen
    if (this.selectedChat?.id === chatId) {
      return this.selectedChat.messages.some(m => m.id === messageId);
    }

    return chat.messages.some(m => m.id === messageId);
  }












}

interface Chat {
  id: string;
  chatId: string;
  customerName: string;
  customerFirstName: string;
  customerLastName: string;
  customerAvatar: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
  lastOnline?: Date;
  messages: Message[];
  assigned_to?: number | null;
  status: string;
  assigned_agent?: string;
  isNew?: boolean;
}

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isAgent: boolean;
  isBot: boolean;
  read: boolean;
  from?: string;
  attachment?: {
    id: number;
    file_name: string;
    file_type: string;
    file_size: number;
    download_url: string;
  };
}

interface Agent {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  current_chats: number;
  last_activity?: string;
  workload_status: string;
}
