import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  NgZone, signal, Inject
} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatIcon} from "@angular/material/icon";
import {DatePipe, NgClass, NgForOf, NgIf, isPlatformBrowser} from "@angular/common";
import {PLATFORM_ID} from "@angular/core";
import { TruncatePipe } from "./truncate.pipe";
import {MatFormField, MatHint, MatInput, MatLabel} from "@angular/material/input";
import {MatTooltip} from "@angular/material/tooltip";
import {animate, style, transition, trigger} from "@angular/animations";
import {firstValueFrom, forkJoin, interval, of, Subject, Subscription} from "rxjs";
import {ChatbotService} from "../../../Services/chatbot-service/chatbot.service";
import {AuthService} from "../../../Services/AuthService/auth.service";
import {PusherService} from "../../../Services/Pusher/pusher.service";
import {WhatsappService, WhatsAppChat} from "../../../Services/whatsapp/whatsapp.service";
import {UserManagementService} from "../../../Services/user-management-service.service";
import {OfferManagementComponent} from "../offer-management/offer-management.component";
import {User} from "../../../Models/User";
import {Visitor} from "../../../Models/Visitor";
import {catchError, tap, timeout, finalize, debounceTime, takeUntil} from "rxjs/operators";
import { MessageFilterPipe } from "./message-filter.pipe";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ActivatedRoute, RouterLink} from "@angular/router";
import {NotificationSoundService} from "../../../Services/notification-service/notification-sound.service";
import {MatOption, MatSelect} from "@angular/material/select";
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { StaffManagementComponent } from '../staff-management/staff-management.component';
import { AppointmentManagementComponent } from '../appointment-management/appointment-management.component';
import { Router } from '@angular/router';
import {ThemeService} from '../../../Services/theme-service/theme.service';
import { StaffPushNotificationService } from '../../../Services/push-notification/staff-push-notification.service';

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
    MatSnackBarModule,
    MatSlideToggleModule,
    StaffManagementComponent,
    OfferManagementComponent,
    AppointmentManagementComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  @ViewChild('darkModeSwitch', {read: ElementRef}) element: ElementRef | undefined;

  // SVG Icons für Dark Mode Toggle - übernommen aus Navbar
  sun = 'M12 15.5q1.45 0 2.475-1.025Q15.5 13.45 15.5 12q0-1.45-1.025-2.475Q13.45 8.5 12 8.5q-1.45 0-2.475 1.025Q8.5 10.55 8.5 12q0 1.45 1.025 2.475Q10.55 15.5 12 15.5Zm0 1.5q-2.075 0-3.537-1.463T7 12q0-2.075 1.463-3.537T12 7q2.075 0 3.537 1.463T17 12q0 2.075-1.463 3.537T12 17ZM1.75 12.75q-.325 0-.538-.213Q1 12.325 1 12q0-.325.212-.537Q1.425 11.25 1.75 11.25h2.5q.325 0 .537.213Q5 11.675 5 12q0 .325-.213.537-.213.213-.537.213Zm18 0q-.325 0-.538-.213Q19 12.325 19 12q0-.325.212-.537.212-.213.538-.213h2.5q.325 0 .538.213Q23 11.675 23 12q0 .325-.212.537-.212.213-.538.213ZM12 5q-.325 0-.537-.213Q11.25 4.575 11.25 4.25v-2.5q0-.325.213-.538Q11.675 1 12 1q.325 0 .537.212 .213.212 .213.538v2.5q0 .325-.213.537Q12.325 5 12 5Zm0 18q-.325 0-.537-.212-.213-.212-.213-.538v-2.5q0-.325.213-.538Q11.675 19 12 19q.325 0 .537.212 .213.212 .213.538v2.5q0 .325-.213.538Q12.325 23 12 23ZM6 7.05l-1.425-1.4q-.225-.225-.213-.537.013-.312.213-.537.225-.225.537-.225t.537.225L7.05 6q.2.225 .2.525 0 .3-.2.5-.2.225-.513.225-.312 0-.537-.2Zm12.35 12.375L16.95 18q-.2-.225-.2-.538t.225-.512q.2-.225.5-.225t.525.225l1.425 1.4q.225.225 .212.538-.012.313-.212.538-.225.225-.538.225t-.538-.225ZM16.95 7.05q-.225-.225-.225-.525 0-.3.225-.525l1.4-1.425q.225-.225.538-.213.313 .013.538 .213.225 .225.225 .537t-.225.537L18 7.05q-.2.2-.512.2-.312 0-.538-.2ZM4.575 19.425q-.225-.225-.225-.538t.225-.538L6 16.95q.225-.225.525-.225.3 0 .525.225 .225.225 .225.525 0 .3-.225.525l-1.4 1.425q-.225.225-.537.212-.312-.012-.537-.212ZM12 12Z';
  moon = 'M12 21q-3.75 0-6.375-2.625T3 12q0-3.75 2.625-6.375T12 3q.2 0 .425.013 .225.013 .575.038-.9.8-1.4 1.975-.5 1.175-.5 2.475 0 2.25 1.575 3.825Q14.25 12.9 16.5 12.9q1.3 0 2.475-.463T20.95 11.15q.025.3 .038.488Q21 11.825 21 12q0 3.75-2.625 6.375T12 21Zm0-1.5q2.725 0 4.75-1.687t2.525-3.963q-.625.275-1.337.412Q17.225 14.4 16.5 14.4q-2.875 0-4.887-2.013T9.6 7.5q0-.6.125-1.287.125-.687.45-1.562-2.45.675-4.062 2.738Q4.5 9.45 4.5 12q0 3.125 2.188 5.313T12 19.5Zm-.1-7.425Z';
  private pusherSubscriptions: {channel: string, subscription: any}[] = [];
  shouldScrollToBottom = true;
  private refreshSub!: Subscription;
  private authSub!: Subscription;
  private readonly destroy$ = new Subject<void>();
  private readonly filterChange$ = new Subject<void>();
  private chatReloadPromise: Promise<void> | null = null;
  private cooldownUpdateSub?: Subscription;
  private chatReloadRetryHandle: any;
  //private pusherSubscriptions: any[] = [];
  isAdmin = false;
  chatRequests: any[] = [];
  private chatRequestSubscription: any;
  private routeSubscription?: Subscription;
  private pendingChatId: string | null = null;
  isDeepLinkOpening = false;
  private deepLinkFetchInFlight = false;
  private popStateHandler?: (event: PopStateEvent) => void;
  private chatHistoryStatePushed = false;
  activeChats: Chat[] = [];
  user!: User;
  visitor!: Visitor;
  // ✅ FIX: Track welche Chat-ID aktuell für Visitor-Details geladen wird (verhindert Race Conditions)
  private currentVisitorChatId: string | null = null;
  // ✅ FIX: Cache für Visitor-Emails (verhindert Verzögerung beim Chat-Wechsel)
  private visitorEmailCache = new Map<string, string>();
  closeDialogForm: FormGroup;
  selectedChat: Chat | null = null;
  selectedChatForEscalation: Chat | null = null;
  escalationMessage = '';
  currentAgent = {
    id: 0,
    name: '',
    avatar: '',
    profile_image_url: '',
    status: 'online'
  };
  private sortDebounce: any;
  loadingAdminChats = false;
  isReloadingChats = false; // ✅ Verhindert zu häufige Chat-Reloads
  // Neue Properties
  showAllChats = false;
  selectedAdminChat: any = null;

  // Assignment Status Tracking
  assignmentStatuses = new Map<string, any>();
  availableAgents: any[] = [];
  showTransferDialog = signal(false);
  selectedChatForTransfer: Chat | null = null;
  
  // Staff Management
  showStaffManagement = false;
  
  // Offer Management
  showOfferManagement = false;
  
  // Appointment Management
  showAppointmentManagement = false;
  transferReason = '';
  
  // Dark Mode - übernommen aus Navbar
  darkMode: boolean = false;
  private themeSubscription?: Subscription;

  // ✅ Neue Properties für Close-Dialog
  showCloseChatDialog = signal(false);
  closeChatReason = '';
  chatToClose: Chat | null = null;

  // Escalation Prompts
  showEscalationDialog = signal(false);

  // ✅ Permission Dialog für Benachrichtigungen
  showPermissionDialog = signal(false);
  permissionDialogShown = false;

  // ✅ NEU: Tab-Titel Management
  private isTabVisible = true;
  private isWindowFocused = true;
  private totalUnreadCount = 0;

  // ✅ Cooldown Timer für Live-Update

  // ✅ Audio Player Management
  private audioElements = new Map<string, HTMLAudioElement>();
  private currentPlayingAudio: string | null = null;
  private audioProgress = new Map<string, number>();
  private audioDurations = new Map<string, string>();
  private audioCurrentTimes = new Map<string, string>();

  // ✅ Loading state für Chat-Wechsel
  isLoadingChat = false;
  isLoggingOut = false;

// Neue Properties für Filter
  searchQuery = '';
  filterStatus = 'all';
  filterTimeRange = 'all';
  filteredActiveChats: Chat[] = [];
  filteredAdminChats: any[] = [];
  //Alle Chats für den Admin anzeigen lassen
  allAdminChats: any[] = [];

  // Archivierte Chats
  archivedChats: Chat[] = [];
  showArchivedChats = false;
  archivedChatsCount = 0;
  loadingArchivedChats = false;
  transferForm: FormGroup;

  // ✅ WhatsApp Integration Properties
  whatsappChats: WhatsAppChat[] = [];
  selectedChannelFilter: 'all' | 'website' | 'whatsapp' = 'all';
  showWhatsAppFileUpload = signal(false);
  selectedFileType: 'image' | 'document' | null = null;
  fileCaption = '';
  isMobileView = false;
  isChatListLoading = false;
  hasLoadedChatsOnce = false;
  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private pusherService: PusherService,
    private whatsappService: WhatsappService,
    private userManagementService: UserManagementService,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone,
    public notificationSound: NotificationSoundService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private themeService: ThemeService,
    private staffPushNotifications: StaffPushNotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.darkMode = this.themeService.getDarkMode();
    
    this.transferForm = this.fb.group({
      selectedAgent: [''],
      transferReason: ['']
    });
    this.closeDialogForm = this.fb.group({
      closeChatReason: ['']
    });
  }

  private updateViewportState(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobileView = window.innerWidth <= 1024;
    } else {
      this.isMobileView = false;
    }
  }


  ngAfterViewInit() {
    // Setze SVG Icons für Dark Mode Toggle - übernommen aus Navbar
    if (this.element) {
      this.element.nativeElement.querySelector('.mdc-switch__icon--on').firstChild.setAttribute('d', this.moon);
      this.element.nativeElement.querySelector('.mdc-switch__icon--off').firstChild.setAttribute('d', this.sun);
    }
  }

  ngOnInit() {
    this.initializeFilterPipeline();
    // ✅ Tab-Titel initialisieren
    this.updateTabTitle();
    this.setupTabVisibilityTracking();
    this.updateViewportState();
    this.setupBackButtonHandler();
    this.setupDeepLinkListener();
    const pendingPushChatId = this.staffPushNotifications.consumePendingChatIdentifier();
    if (pendingPushChatId) {
      this.handleDeepLinkChat(pendingPushChatId);
    }

    if (isPlatformBrowser(this.platformId)) {
      this.themeSubscription = this.themeService.darkModeChanges().subscribe(enabled => {
        this.darkMode = enabled;
        this.cdRef.markForCheck();
      });
      this.ngZone.runOutsideAngular(() => {
        this.cooldownUpdateSub = interval(1000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.ngZone.run(() => this.cdRef.markForCheck());
          });
      });
    }

    this.loadActiveChats(true);

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
        profile_image_url: '',
        status: 'online'
      };

      // ✅ Permission Dialog nach User-Load anzeigen
      this.checkAndShowPermissionDialog();
      
      // ✅ Profilbild laden
      this.loadProfileImage();
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
    this.filterChats();
  }

  // Filterfunktion für beide Chat-Listen
  filterChats(event?: Event): void {
    if (event) {
      const value = (event.target as HTMLInputElement).value;
      this.searchQuery = value;
    }
    this.requestFilterUpdate();
  }

  private initializeFilterPipeline(): void {
    this.filterChange$
      .pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe(() => this.applyChatFilters());
    this.requestFilterUpdate();
  }

  private requestFilterUpdate(): void {
    this.filterChange$.next();
  }

  private applyChatFilters(): void {
    const searchTerm = this.searchQuery.trim().toLowerCase();

    this.filteredActiveChats = this.activeChats.filter(chat => {
      const matchesSearch = !searchTerm ||
        chat.customerName?.toLowerCase().includes(searchTerm) ||
        chat.lastMessage?.toLowerCase().includes(searchTerm) ||
        chat.whatsapp_number?.includes(searchTerm);

      const matchesStatus = this.filterStatus === 'all' || chat.status === this.filterStatus;
      const matchesChannel = this.matchesSelectedChannel(chat.channel);

      const isNotArchived = !chat.archived_at;
      return matchesSearch && matchesStatus && matchesChannel && isNotArchived;
    });

    if (this.isAdmin && this.showAllChats) {
      this.filteredAdminChats = this.allAdminChats.filter(chat => {
        const matchesSearch = !searchTerm ||
          (chat.customer_name || '').toLowerCase().includes(searchTerm) ||
          (chat.last_message || '').toLowerCase().includes(searchTerm);
        const matchesStatus = this.filterStatus === 'all' || chat.status === this.filterStatus;
        const matchesTime = this.matchesSelectedTimeRange(chat.last_message_time);
        const matchesChannel = this.matchesSelectedChannel(chat.channel);
        const isNotArchived = !chat.archived_at;

        return matchesSearch && matchesStatus && matchesTime && matchesChannel && isNotArchived;
      });
    }

    this.cdRef.markForCheck();
  }

  private matchesSelectedChannel(channel?: string): boolean {
    if (this.selectedChannelFilter === 'all') {
      return true;
    }

    if (this.selectedChannelFilter === 'whatsapp') {
      return channel === 'whatsapp';
    }

    return channel !== 'whatsapp';
  }

  private matchesSelectedTimeRange(dateValue?: string | Date): boolean {
    if (!dateValue || this.filterTimeRange === 'all') {
      return true;
    }

    const messageDate = new Date(dateValue);
    if (isNaN(messageDate.getTime())) {
      return false;
    }

    const now = new Date();

    switch (this.filterTimeRange) {
      case 'today':
        return messageDate.toDateString() === now.toDateString();
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return messageDate >= weekAgo;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        return messageDate >= monthAgo;
      }
      default:
        return true;
    }
  }

// Statusfilter ändern
  changeStatusFilter(status: string): void {
    this.filterStatus = status;
    this.requestFilterUpdate();
  }

  /**
   * Assignment Status CSS-Klasse bestimmen
   */
  getAssignmentStatusClass(chat: Chat): string {
    const assignedId = chat.assigned_to;
    if (assignedId === null || assignedId === undefined) {
      return 'unassigned';
    }

    const currentAgentId = Number(this.currentAgent.id);
    return Number(assignedId) === currentAgentId ? 'assigned-to-me' : 'assigned-to-other';
  }

  getAssignmentStatusIcon(chat: Chat): string {
    const assignedId = chat.assigned_to;
    if (assignedId === null || assignedId === undefined) {
      if (chat.status === 'bot') {
        return 'smart_toy';
      }
      if (chat.status === 'human') {
        return 'hourglass_empty';
      }
      return '';
    }

    const currentAgentId = Number(this.currentAgent.id);
    return Number(assignedId) === currentAgentId ? 'person' : 'groups';
  }

  shouldShowAssignmentStatus(chat: Chat): boolean {
    if (!chat) {
      return false;
    }

    const assignedId = chat.assigned_to;

    if (chat.status === 'bot') {
      return false;
    }

    if (assignedId === null || assignedId === undefined) {
      return false;
    }

    const currentAgentId = Number(this.currentAgent.id);
    return Number(assignedId) !== currentAgentId;
  }

// Zeitfilter ändern
  changeTimeFilter(range: string): void {
    this.filterTimeRange = range;
    this.requestFilterUpdate();
  }

  /**
   * Status-Label für bessere UX
   */
  getStatusLabel(status: string): string {
    const statusMap: {[key: string]: string} = {
      'human': 'Wartet auf Übernahme',
      'in_progress': 'In Bearbeitung',
      'closed': 'Geschlossen',
      'bot': 'KI-Chatbot aktiv'
    };
    return statusMap[status] || status;
  }


  private sortActiveChats(): void {
    // ✅ OPTIMIERT: Keine Debounce, sofortige immutable Sortierung
    // Sortiere IMMUTABLE (erstelle neues Array statt in-place zu sortieren)
    const sortedChats = [...this.activeChats].sort((a, b) => {
      // ✅ VERBESSERTE SORTIERUNG: WhatsApp-Style mit Prioritäten

      // 1. HÖCHSTE PRIORITÄT: Chat-Anfragen (status: 'human' & nicht zugewiesen)
      const aIsRequest = a.status === 'human' && !a.assigned_to;
      const bIsRequest = b.status === 'human' && !b.assigned_to;

      if (aIsRequest && !bIsRequest) return -1; // a ist Anfrage, kommt zuerst
      if (!aIsRequest && bIsRequest) return 1;  // b ist Anfrage, kommt zuerst

      // Beide sind Anfragen → nach Zeit sortieren (älteste Anfrage zuerst = FIFO)
      if (aIsRequest && bIsRequest) {
        return new Date(a.lastMessageTime).getTime() - new Date(b.lastMessageTime).getTime();
      }

      // 2. ALLE ANDEREN CHATS: Nach letzter Nachrichtenzeit sortieren (neueste zuerst)
      // ✅ WICHTIG: Geschlossene Chats werden auch nach Zeit sortiert, nicht separiert
      // Das bedeutet: Ein gerade geschlossener Chat bleibt oben, rutscht nur mit der Zeit nach unten
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    // ✅ Setze sortierte Arrays
    this.activeChats = sortedChats;
    this.filteredActiveChats = [...sortedChats];

    // ✅ DetectChanges nur einmal am Ende
    this.cdRef.markForCheck();
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
      messages: chat.messages
        .map((msg: any) => ({
          id: msg.id,
          content: msg.text,
          timestamp: new Date(msg.timestamp),
          isAgent: msg.from === 'agent',
          isBot: msg.from === 'bot',
          read: true,
          from: msg.from,
          message_type: msg.message_type,
          metadata: msg.metadata, // ✅ WICHTIG: Metadata speichern (enthält agent_name)
          attachment: this.resolveAttachment(msg)
        }))
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), // ✅ Sortiere nach Timestamp (chronologisch)
      status: chat.status,
      assigned_agent: chat.assigned_agent,
      isNew: false,
      archived_at: chat.archived_at || null
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
        this.filterChats();
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

    // ✅ FIX: Höre auf spezifische Chat-Channels für jeden aktiven Chat
    this.activeChats.forEach(chat => {
      const chatSub = this.pusherService.listenToChannel(
        `chat.${chat.id}`,
        'message.received',
        (data: any) => {
          console.log(`🎯 ADMIN DASHBOARD: Message received on chat.${chat.id} channel:`, data);
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
      this.pusherSubscriptions.push({ channel: `chat.${chat.id}`, subscription: chatSub });
    });

    // 1. Globaler Message Listener für NEUE Website-Chats (die noch nicht in activeChats sind)
    const globalSub = this.pusherService.listenToChannel(
      'all.active.chats',
      'message.received',
      (data: any) => {
        console.log('🎯 ADMIN DASHBOARD: Message received on all.active.chats channel:', data);
        
        // ✅ FIX: Prüfe ob dieser Chat bereits in activeChats existiert
        const sessionId = data.message?.session_id;
        const isWhatsAppMessage = data.channel === 'whatsapp' ||
          data.message?.message_type?.startsWith('whatsapp') ||
          data.message?.metadata?.whatsapp_message_id;

        if (sessionId) {
          const existingChat = this.activeChats.find(chat => chat.id === sessionId);
          
          if (!existingChat) {
            // ✅ NEUER CHAT: Lade die Chats neu, um den neuen Chat zu bekommen
            console.log('🆕 New website chat detected, reloading chats...');
            
            // ✅ Verhindere zu häufige Reloads mit einem kleinen Delay
            if (!this.isReloadingChats) {
              this.isReloadingChats = true;
              setTimeout(() => {
                this.loadActiveChats();
                this.isReloadingChats = false;
              }, 100);
            }
          } else {
            // ✅ BEKANNTER CHAT: Ignoriere, da er bereits über spezifischen Channel behandelt wird
            console.log('ℹ️ Known chat message on global channel, ignoring (handled by specific channel)');
          }
        }
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

    // ✅ HINWEIS: allChatsUpdateSub wurde entfernt, da chats.updated bereits alle Events verarbeitet
    // Der chatUpdateSub leitet jetzt alle Events an handleAllChatsUpdate weiter

    this.pusherSubscriptions.push(
      { channel: 'all.active.chats', subscription: globalSub },
      { channel: 'all.active.chats', subscription: chatUpdateSub }, // ✅ Verarbeitet jetzt ALLE AllChatsUpdate Events
      { channel: 'all.active.chats', subscription: escalationSub },
      { channel: 'all.active.chats', subscription: assignmentSub },
      { channel: 'all.active.chats', subscription: unassignmentSub },
      { channel: 'all.active.chats', subscription: statusChangeSub },
      { channel: 'all.active.chats', subscription: chatEndedSub }
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
    console.log('🔔 All chats update received:', data);
    console.log('🔔 Event type:', data.type);

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
        // ✅ WICHTIG: Nutze customer_name vom Backend (für WhatsApp-Namen)
        const customerName = chatData.customer_name ||
                            `${chatData.customer_first_name || ''} ${chatData.customer_last_name || ''}`.trim() ||
                            'Ein Kunde';
        const isCurrentlySelected = this.selectedChat?.id === sessionId;

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
            unreadCount: isCurrentlySelected ? 0 : 1, // ✅ WICHTIG: 0 wenn bereits ausgewählt
            isOnline: true,
            messages: [],
            status: 'in_progress',
            assigned_to: newAgentId,
            assigned_agent: chatData.to_agent_name,
            isNew: true,
            archived_at: null
          };

          this.activeChats = [newChat, ...this.activeChats];
          this.filteredActiveChats = [newChat, ...this.filteredActiveChats];
        } else {
          // ✅ WICHTIG: Behalte den höheren unreadCount (Transfer fügt keine neue Nachricht hinzu)
          const currentUnread = this.activeChats[chatIndex].unreadCount || 0;
          const newUnread = isCurrentlySelected ? 0 : Math.max(currentUnread, 1);

          // ✅ Verwende zentrale Update-Methode statt direkter Mutation
          this.updateChatEverywhere(sessionId, {
            assigned_to: newAgentId,
            assigned_agent: chatData.to_agent_name,
            lastMessage: `Chat von ${chatData.from_agent_name} erhalten`,
            lastMessageTime: new Date(chatData.last_message_time),
            unreadCount: newUnread, // ✅ Behalte existierende ungelesene Nachrichten
            status: 'in_progress',
            isNew: true
          });
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
          // ✅ Verwende zentrale Update-Methode
          this.updateChatEverywhere(sessionId, {
            assigned_to: newAgentId,
            assigned_agent: chatData.to_agent_name,
            lastMessage: `Chat an ${chatData.to_agent_name} übertragen`,
            lastMessageTime: new Date(chatData.last_message_time),
            status: 'in_progress',
            isNew: false
          });
        }

        this.assignmentStatuses.delete(sessionId);
        this.showToast(`✅ Chat erfolgreich an ${chatData.to_agent_name} übertragen`, 'success');

      } else {
        // Transfer zwischen anderen Agents - nur zur Information
        if (chatIndex !== -1) {
          // ✅ Verwende zentrale Update-Methode
          this.updateChatEverywhere(sessionId, {
            assigned_to: newAgentId,
            assigned_agent: chatData.to_agent_name,
            lastMessage: `Chat übertragen an ${chatData.to_agent_name}`,
            lastMessageTime: new Date(chatData.last_message_time),
            status: 'in_progress'
          });
        }
      }

      this.sortActiveChats();
      this.cdRef.markForCheck();
      return;
    }

    // 🔔 NOTIFICATION: Chat Ende durch Visitor
    if (data.type === 'chat_ended_by_visitor' && data.chat) {
      const chatData = data.chat;
      const sessionId = chatData.session_id;

      const chatIndex = this.activeChats.findIndex(c => c.id === sessionId);

      if (chatIndex !== -1) {
        const wasMyChat = this.activeChats[chatIndex].assigned_to === this.currentAgent.id;
        const isSelectedChat = this.selectedChat?.id === sessionId;

        // ✅ Verwende zentrale Update-Methode - OHNE unreadCount Erhöhung
        // unreadCount wird von der System-Nachricht erhöht (via handleIncomingMessageGlobal)
        this.updateChatEverywhere(sessionId, {
          status: 'closed',
          assigned_to: null,
          assigned_agent: '',
          lastMessage: chatData.last_message || 'Chat beendet',
          lastMessageTime: new Date(chatData.last_message_time)
        });

        // 🔔 NOTIFICATION: Nur wenn es mein Chat war
        if (wasMyChat && isSelectedChat) {
          this.notificationSound.notify('message', {
            senderName: 'System',
            message: 'Der Benutzer hat Ihren Chat beendet',
            sessionId: sessionId
          });
          this.showToast('ℹ️ Der Benutzer hat den Chat beendet', 'info');
        }

        this.assignmentStatuses.delete(sessionId);
        this.sortActiveChats();
        this.cdRef.markForCheck();
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

        const isSelectedChat = this.selectedChat?.id === sessionId;

        // ✅ Verwende zentrale Update-Methode
        this.updateChatEverywhere(sessionId, {
          status: 'closed',
          assigned_to: null,
          assigned_agent: '',
          lastMessage: closedMessage,
          lastMessageTime: new Date(chatData.last_message_time),
          unreadCount: isSelectedChat ? this.activeChats[chatIndex].unreadCount : (this.activeChats[chatIndex].unreadCount || 0) + 1
        });

        if (isSelectedChat && !endedByMe) {
          this.showToast(`ℹ️ Chat wurde von ${chatData.ended_by_name} beendet`, 'info');
        }

        this.assignmentStatuses.delete(sessionId);
        this.sortActiveChats();
        this.cdRef.markForCheck();
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

        // ✅ WICHTIG: Behalte den höheren unreadCount
        const currentUnread = this.activeChats[chatIndex].unreadCount || 0;
        const backendUnread = chatData.unread_count || 0;

        // ✅ Verwende zentrale Update-Methode
        this.updateChatEverywhere(sessionId, {
          status: 'human',
          assigned_to: null,
          assigned_agent: '',
          lastMessage: chatData.last_message || 'Zuweisung aufgehoben',
          lastMessageTime: new Date(chatData.last_message_time),
          unreadCount: Math.max(currentUnread, backendUnread),
          isNew: true
        });

        this.assignmentStatuses.delete(sessionId);

        // 🔔 NOTIFICATION: Nur wenn verfügbar für alle (Toast entfernt - wird nicht mehr angezeigt)
        if (!wasMyChat || this.isAdmin) {
          this.notificationSound.notify('message', {
            senderName: 'System',
            message: 'Chat-Zuweisung aufgehoben - wartet auf Übernahme',
            sessionId: sessionId
          });
          // ✅ Toast entfernt: Keine Benachrichtigung mehr beim Aufheben
        }

        this.sortActiveChats();
        this.cdRef.markForCheck();
      }
      return;
    }

    // 🔔 NOTIFICATION: Chat Escalation
    if (data.type === 'chat_escalated' && data.chat) {
      const chatData = data.chat;
      const sessionId = chatData.session_id;
      // ✅ WICHTIG: Nutze customer_name vom Backend (für WhatsApp-Namen)
      const customerName = chatData.customer_name ||
                          `${chatData.customer_first_name || ''} ${chatData.customer_last_name || ''}`.trim() ||
                          'Ein Kunde';

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
          isNew: true,
          archived_at: null
        };

        this.activeChats = [newChat, ...this.activeChats];
        this.filteredActiveChats = [newChat, ...this.filteredActiveChats];
      } else {
        // ✅ WICHTIG: Behalte den höheren unreadCount (lokal vs. Backend)
        // Frontend zählt in Echtzeit, Backend könnte verzögert sein
        const currentUnread = this.activeChats[existingIndex].unreadCount || 0;
        const backendUnread = chatData.unread_count || 0;

        const updatedChat = {
          ...this.activeChats[existingIndex],
          status: chatData.status,
          lastMessage: chatData.last_message,
          lastMessageTime: new Date(chatData.last_message_time),
          unreadCount: Math.max(currentUnread, backendUnread), // ✅ Nehme den höheren Wert
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

      // 🔔 NOTIFICATION entfernt - wird bereits durch message.received Event gesendet
      // Die message.received Benachrichtigung hat die korrekten Kundendaten und wird
      // VOR diesem chat_escalated Event empfangen
      // this.notificationSound.notifyNewChatRequest(customerName, sessionId);
      this.showToast(`🆕 Neue Chat-Anfrage von ${customerName}`, 'success');

      this.sortActiveChats();
      this.cdRef.markForCheck();
      return;
    }

    // ✅ NEU: Chat Assignment (wenn ein Agent einen Chat übernimmt)
    if (data.type === 'chat_assigned' && data.chat) {
      const chatData = data.chat;
      const sessionId = chatData.session_id;
      const assignedToId = chatData.assigned_to;
      const assignedAgentName = chatData.assigned_agent || chatData.agent_name;
      const wasAssignedToMe = assignedToId === this.currentAgent.id;

      console.log('🔔 Chat Assignment received:', {
        sessionId,
        assignedTo: assignedToId,
        assignedAgent: assignedAgentName,
        wasAssignedToMe,
        currentUserId: this.currentAgent.id
      });

      const chatIndex = this.activeChats.findIndex(c => c.id === sessionId);

      if (chatIndex !== -1) {
        // ✅ Chat existiert bereits - verwende zentrale Update-Methode
        this.updateChatEverywhere(sessionId, {
          status: 'in_progress',
          assigned_to: assignedToId,
          assigned_agent: assignedAgentName,
          lastMessage: wasAssignedToMe
            ? 'Chat übernommen'
            : `Chat übernommen von ${assignedAgentName}`,
          lastMessageTime: new Date(chatData.last_message_time || Date.now()),
          isNew: wasAssignedToMe,
          unreadCount: wasAssignedToMe ? 0 : (this.activeChats[chatIndex].unreadCount || 0)
        });
      } else if (wasAssignedToMe) {
        // ✅ Chat existiert nicht in meiner Liste aber wurde mir zugewiesen - hinzufügen
        const newChat: Chat = {
          id: chatData.session_id,
          chatId: chatData.chat_id,
          customerName: chatData.customer_name || `${chatData.customer_first_name || ''} ${chatData.customer_last_name || ''}`.trim() || 'Anonymer Benutzer',
          customerFirstName: chatData.customer_first_name || '',
          customerLastName: chatData.customer_last_name || '',
          customerAvatar: chatData.customer_avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
          lastMessage: 'Chat übernommen',
          lastMessageTime: new Date(chatData.last_message_time || Date.now()),
          unreadCount: 0,
          isOnline: true,
          messages: [],
          status: 'in_progress',
          assigned_to: assignedToId,
          assigned_agent: assignedAgentName,
          isNew: true,
          archived_at: null
        };

        this.activeChats = [newChat, ...this.activeChats];
        this.filteredActiveChats = [newChat, ...this.filteredActiveChats];
      }

      // ✅ Assignment Status aktualisieren
      this.assignmentStatuses.set(sessionId, {
        is_assigned: true,
        assigned_to: assignedToId,
        can_user_write: wasAssignedToMe,
        assigned_agent_name: assignedAgentName
      });

      // ✅ UI-Benachrichtigung (nur für andere Agents, nicht für den der übernommen hat)
      if (!wasAssignedToMe) {
        this.showToast(`ℹ️ Chat wurde von ${assignedAgentName} übernommen`, 'info', 3000);
      }

      this.sortActiveChats();
      this.cdRef.markForCheck();
      return;
    }

    // 🔄 Chat Reaktivierung (von closed zu bot)
    if (data.type === 'chat_reactivated' && data.chat) {
      const chatData = data.chat;
      const sessionId = chatData.session_id;

      console.log('🔄 Chat Reactivation received:', {
        sessionId,
        newStatus: 'bot',
        previousStatus: this.activeChats.find(c => c.id === sessionId)?.status
      });

      const chatIndex = this.activeChats.findIndex(c => c.id === sessionId);

      if (chatIndex !== -1) {
        // ✅ Chat existiert - verwende zentrale Update-Methode
        this.updateChatEverywhere(sessionId, {
          status: 'bot',
          assigned_to: null,
          assigned_agent: '',
          lastMessage: 'Chat reaktiviert - Chatbot aktiv',
          lastMessageTime: new Date(chatData.last_message_time || Date.now()),
          isNew: false
        });

        console.log('✅ Chat reaktiviert - Status aktualisiert zu "bot"');

        // ✅ Assignment Status zurücksetzen
        this.assignmentStatuses.delete(sessionId);

        this.sortActiveChats();
        this.cdRef.markForCheck();
      } else {
        // ✅ Chat existiert nicht mehr in Liste (wurde vielleicht entfernt) - neu laden
        console.log('⚠️ Chat nicht in activeChats gefunden - lade Chats neu');
        this.loadActiveChats();
      }

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

  /**
   * ✅ NEU: Zentrale Methode zum Aktualisieren eines Chats überall
   * Stellt sicher dass activeChats, filteredActiveChats UND selectedChat synchron bleiben
   */
  private updateChatEverywhere(sessionId: string, updates: Partial<Chat>): void {
    console.log('🔄 updateChatEverywhere called:', { sessionId, updates });

    // Archivierte Chats nicht in aktiver Liste anfassen
    const isArchived = this.archivedChats.some(c => c.id === sessionId);
    if (isArchived) {
      console.log('⏭️ Chat is archived, skipping active list update:', sessionId);
      return;
    }

    // 1. activeChats aktualisieren
    const activeChatIndex = this.activeChats.findIndex(c => c.id === sessionId);
    if (activeChatIndex !== -1) {
      this.activeChats[activeChatIndex] = {
        ...this.activeChats[activeChatIndex],
        ...updates
      };
      console.log('✅ Updated activeChats[' + activeChatIndex + ']', this.activeChats[activeChatIndex]);
    }

    // 2. filteredActiveChats aktualisieren
    const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
    if (filteredIndex !== -1) {
      this.filteredActiveChats[filteredIndex] = {
        ...this.filteredActiveChats[filteredIndex],
        ...updates
      };
      console.log('✅ Updated filteredActiveChats[' + filteredIndex + ']');
    }

    // 3. ✅ KRITISCH: selectedChat aktualisieren falls dieser Chat ausgewählt ist
    // WICHTIG: Verwende die aktualisierten Daten aus activeChats als Basis!
    if (this.selectedChat?.id === sessionId && activeChatIndex !== -1) {
      // ✅ KORREKTUR: Hole die frisch aktualisierten Daten aus activeChats
      const updatedChatFromActive = this.activeChats[activeChatIndex];

      // ✅ Erstelle ein NEUES Objekt mit allen aktualisierten Werten
      this.selectedChat = {
        ...updatedChatFromActive,
        // ✅ WICHTIG: Behalte die Messages vom selectedChat bei (diese sind vollständig)
        messages: this.selectedChat.messages
      };

      console.log('✅✅✅ CRITICAL UPDATE - selectedChat synchronized with activeChats:', {
        sessionId,
        status: this.selectedChat.status,
        assigned_to: this.selectedChat.assigned_to,
        assigned_agent: this.selectedChat.assigned_agent,
        oldStatus: updatedChatFromActive.status
      });

      // ✅ Change Detection EXPLIZIT triggern
      this.cdRef.markForCheck();
      this.cdRef.markForCheck();
    }
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

    this.cdRef.markForCheck();
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
      session_id: this.chatToClose.id.toString(),
      reason: closeReasonValue?.trim() || null  // ✅ Explizit null wenn leer
    };

    console.log('📤 Final payload:', payload);

    // ✅ OPTIMISTIC UPDATE: Sofort UI aktualisieren
    const chatToCloseId = this.chatToClose.id.toString();
    const originalChatState = this.getChatStateForRevert(chatToCloseId);

    // ✅ Dialog sofort schließen
    this.showCloseChatDialog.set(false);
    const chatToCloseCopy = this.chatToClose;
    this.chatToClose = null;
    this.closeDialogForm.reset();

    // ✅ Chat-Status sofort auf "closed" setzen und archivieren
    const chatIndex = this.activeChats.findIndex(c => c.id.toString() === chatToCloseId);
    if (chatIndex !== -1) {
      const closedChat = {
        ...this.activeChats[chatIndex],
        status: 'closed',
        assigned_to: null,
        assigned_agent: '',
        lastMessage: 'Chat beendet',
        lastMessageTime: new Date(),
        archived_at: new Date().toISOString()
      };

      // Aus aktiver Liste entfernen und in Archiv verschieben
      this.activeChats = this.activeChats.filter(c => c.id.toString() !== chatToCloseId);
      this.filteredActiveChats = this.filteredActiveChats.filter(c => c.id.toString() !== chatToCloseId);
      this.archivedChats = [closedChat, ...this.archivedChats];
      this.archivedChatsCount = this.archivedChats.length;
    }

    // ✅ Wenn aktueller Chat geschlossen wird, auswählen aufheben
    if (this.selectedChat?.id.toString() === chatToCloseId) {
      this.selectedChat = null;
    }

    // ✅ OPTIMISTIC TOAST: Sofort anzeigen
    this.showToast('Chat wurde erfolgreich beendet', 'success');
    this.cdRef.markForCheck(); // ✅ Sofort UI aktualisieren

    this.chatbotService.closeChatByAgent(payload).subscribe({
      next: (response) => {
        console.log('✅ Response:', response);

        if (!response.success) {
          // ✅ Bei Fehler: Änderungen rückgängig machen
          this.revertChatClose(chatToCloseId, originalChatState, chatToCloseCopy);
          this.showError('Chat konnte nicht beendet werden');
        }
        // ✅ Bei Erfolg: Toast bereits angezeigt, Pusher-Event kommt zur Bestätigung
      },
      error: (err) => {
        console.error('❌ Error:', err);
        // ✅ Bei Fehler: Änderungen rückgängig machen
        this.revertChatClose(chatToCloseId, originalChatState, chatToCloseCopy);
        this.showError('Chat konnte nicht beendet werden');
      }
    });
  }

  // ✅ Helper-Methode um Chat-State für Revert zu speichern
  private getChatStateForRevert(chatId: string): { chat: Chat | null, selectedChat: Chat | null } {
    const chat = this.activeChats.find(c => c.id.toString() === chatId);
    const selectedChat = this.selectedChat?.id.toString() === chatId ? this.selectedChat : null;
    return {
      chat: chat ? { ...chat } : null,
      selectedChat: selectedChat ? { ...selectedChat } : null
    };
  }

  // ✅ Helper-Methode um Chat-Close-Änderungen rückgängig zu machen
  private revertChatClose(chatId: string, originalState: { chat: Chat | null, selectedChat: Chat | null }, originalChatToClose: Chat): void {
    // ✅ Dialog wieder öffnen
    this.chatToClose = originalChatToClose;
    this.showCloseChatDialog.set(true);

    // ✅ Chat-Status wiederherstellen
    if (originalState.chat) {
      const chatIndex = this.activeChats.findIndex(c => c.id.toString() === chatId);
      if (chatIndex !== -1) {
        this.activeChats[chatIndex] = originalState.chat;

        const filteredIndex = this.filteredActiveChats.findIndex(c => c.id.toString() === chatId);
        if (filteredIndex !== -1) {
          this.filteredActiveChats[filteredIndex] = originalState.chat;
        }
      }
    }

    // ✅ Selected Chat wiederherstellen
    if (originalState.selectedChat) {
      this.selectedChat = originalState.selectedChat;
    }

    this.cdRef.markForCheck();
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
    this.cdRef.markForCheck();

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
    this.cdRef.markForCheck();
    this.tryOpenPendingChat();
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
    const assignedId = chat.assigned_to;
    if (assignedId === null || assignedId === undefined) {
      if (chat.status === 'bot') {
        return 'Chatbot aktiv';
      }
      if (chat.status === 'human') {
        return 'Wartet auf Übernahme';
      }
      return '';
    }

    const currentAgentId = Number(this.currentAgent.id);
    if (Number(assignedId) === currentAgentId) {
      return 'Von mir übernommen';
    }

    const agentName = (chat.assigned_agent || '').trim();
    return agentName ? `Zugewiesen an ${agentName}` : 'Zugewiesen an Team';
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
      this.cdRef.markForCheck();

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
      const closeReason = data.close_reason || data.chat?.close_reason;
      let endMessage = `Chat wurde beendet (${data.ended_by === 'visitor' ? 'vom Benutzer' : 'von Mitarbeiter'})`;

      if (data.ended_by === 'agent' && closeReason) {
        endMessage = `Chat beendet von Mitarbeiter (Grund: ${closeReason})`;
      }

      // Chat archivieren: aus aktiver Liste entfernen, in Archiv verschieben
      const closedChat = {
        ...chat,
        status: 'closed',
        assigned_to: null,
        assigned_agent: '',
        lastMessage: endMessage,
        lastMessageTime: new Date(),
        archived_at: new Date().toISOString()
      };

      this.activeChats = this.activeChats.filter(c => c.id !== sessionId);
      this.filteredActiveChats = this.filteredActiveChats.filter(c => c.id !== sessionId);

      // Nur hinzufügen wenn nicht schon im Archiv (verhindert Duplikate bei optimistic update)
      if (!this.archivedChats.find(c => c.id === sessionId)) {
        this.archivedChats = [closedChat, ...this.archivedChats];
        this.archivedChatsCount = this.archivedChats.length;
      }

      if (this.selectedChat?.id === sessionId) {
        this.selectedChat = null;
        this.showToast(endMessage, 'info');
      }

      this.cdRef.markForCheck();

      // ✅ NEU: Tab-Titel aktualisieren (unreadCount bleibt erhalten)
      this.updateTabTitle();
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
    console.log('Chat Update empfangen (chats.updated):', data);

    // ✅ Leite ALLE Event-Typen an handleAllChatsUpdate weiter
    // Dies ist der korrekte Handler für AllChatsUpdate Events vom Backend
    if (data.type) {
      console.log('🔄 Forwarding to handleAllChatsUpdate, type:', data.type);
      this.handleAllChatsUpdate(data);
      return;
    }

    // ✅ Fallback für Events ohne type (sollte nicht vorkommen)
    console.warn('⚠️ Chat update received without type:', data);
    // Alle Events mit type werden durch handleAllChatsUpdate verarbeitet
  }



  private handleIncomingMessageGlobal(data: any): void {
    console.log('📥 handleIncomingMessageGlobal - Full data:', data);
    console.log('📥 CALLED FROM STACK:', new Error().stack?.split('\n')[2]?.trim()); // Zeigt wo die Methode aufgerufen wurde

    // ✅ DEBUG: WhatsApp-spezifisches Logging
    if (data.channel === 'whatsapp') {
      console.log('📱 WhatsApp Message Broadcast received:', {
        customer_first_name: data.customer_first_name,
        customer_last_name: data.customer_last_name,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        whatsapp_number: data.whatsapp_number,
        last_activity: data.last_activity
      });
    }

    const messageData = data.message;
    const sessionId = messageData.session_id;

    // ✅ DEBUG: Log escalation messages
    if (messageData?.message_type === 'escalation_prompt') {
      console.log('🚨 ESCALATION PROMPT RECEIVED:', {
        text: messageData.text,
        from: messageData.from,
        sessionId: sessionId,
        metadata: messageData.metadata
      });
    }

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

    // ✅ WICHTIG: Nachricht zu allen relevanten Chats hinzufügen (für alle Message-Types)
    if (messageData && messageData.text) {
      console.log('💬 Processing message:', {
        from: messageData.from,
        text: messageData.text.substring(0, 50),
        message_type: messageData.message_type,
        sessionId: sessionId
      });

      const newMessage: Message = {
        id: messageData.id || Date.now().toString(),
        content: messageData.text,
        from: messageData.from,
        timestamp: new Date(messageData.created_at || Date.now()),
        read: messageData.from === 'user' ? false : true,
        isAgent: messageData.from === 'agent',
        isBot: messageData.from === 'bot',
        message_type: messageData.message_type,
        metadata: messageData.metadata,
        attachment: this.resolveAttachment(messageData)
      };

      // ✅ OPTIMIERT: Immutable Update für smooth UI ohne Flicker
      const activeChatIndex = this.activeChats.findIndex(c => c.id === sessionId);
      if (activeChatIndex !== -1) {
        // ✅ WICHTIG: Prüfe ob optimistische Nachricht ersetzt werden muss
        const existingMessages = this.activeChats[activeChatIndex].messages;
        const optimisticMessageIndex = existingMessages.findIndex(
          m => m.isOptimistic && 
               m.content.trim() === newMessage.content.trim() && 
               m.from === newMessage.from &&
               Math.abs(m.timestamp.getTime() - newMessage.timestamp.getTime()) < 5000 // Innerhalb von 5 Sekunden
        );

        // ✅ Prüfe ob Nachricht bereits existiert (duplikat)
        const isDuplicate = existingMessages.some(m => m.id === newMessage.id && !m.isOptimistic);
        if (isDuplicate) {
          console.log('✅ Message already exists, skipping');
          return;
        }

        // ✅ Wenn optimistische Nachricht gefunden, ersetze sie statt neue hinzuzufügen
        let updatedMessages: Message[];
        if (optimisticMessageIndex !== -1) {
          const optimisticMessage = existingMessages[optimisticMessageIndex];
          console.log('✅ Replacing optimistic message with real message:', {
            optimisticId: optimisticMessage.id,
            realId: newMessage.id,
            content: newMessage.content.substring(0, 30)
          });
          const mergedMessage: Message = {
            ...optimisticMessage,
            ...newMessage,
            clientMessageId: optimisticMessage.clientMessageId ?? optimisticMessage.id,
            isOptimistic: false
          };
          updatedMessages = [
            ...existingMessages.slice(0, optimisticMessageIndex),
            mergedMessage,
            ...existingMessages.slice(optimisticMessageIndex + 1)
          ];
        } else {
          // ✅ Normale Nachricht hinzufügen (keine optimistische vorhanden)
          updatedMessages = [...existingMessages, newMessage];
        }
        const isCurrentChat = this.selectedChat?.id === sessionId;

        // ✅ UnreadCount berechnen
        let newUnreadCount = this.activeChats[activeChatIndex].unreadCount || 0;
        // ✅ WICHTIG: Counter erhöhen für user, bot UND agent (wenn Chat nicht ausgewählt ist)
        // ⚠️ ABER NICHT für System-Nachrichten - diese sind Meta-Informationen!
        if ((messageData.from === 'user' || messageData.from === 'bot' || messageData.from === 'agent') && !isCurrentChat) {
          newUnreadCount += 1;
        } else if (isCurrentChat) {
          newUnreadCount = 0;
        }
        // System-Nachrichten (from === 'system') ändern den Counter NICHT

        // ✅ IMMUTABLE UPDATE: Neues Chat-Objekt erstellen statt zu mutieren
        // ✅ WICHTIG: Aktualisiere Kundendaten aus Broadcast (WhatsApp-Namen!)
        const newFirstName = data.customer_first_name || this.activeChats[activeChatIndex].customerFirstName;
        const newLastName = data.customer_last_name || this.activeChats[activeChatIndex].customerLastName;

        // ✅ KRITISCH: customerName MUSS aus den aktuellen Namen neu berechnet werden!
        let newCustomerName = data.customer_name;
        if (!newCustomerName || newCustomerName === 'Anonymer Benutzer') {
          // Wenn kein customer_name gebroadcastet wurde oder es "Anonymer Benutzer" ist,
          // berechne ihn aus first_name und last_name
          if (newFirstName && newFirstName !== 'WhatsApp' && newFirstName !== 'Anonymous') {
            newCustomerName = `${newFirstName} ${newLastName}`.trim();
          } else if (data.whatsapp_number) {
            // Fallback: Zeige WhatsApp-Nummer wenn kein Name vorhanden
            newCustomerName = '+' + data.whatsapp_number;
          } else {
            // Letzter Fallback
            newCustomerName = this.activeChats[activeChatIndex].customerName;
          }
        }

        const updatedStatus = data.status || this.activeChats[activeChatIndex].status;
        const updatedAssignedTo = data.assigned_to !== undefined
          ? data.assigned_to
          : this.activeChats[activeChatIndex].assigned_to;
        const updatedAssignedAgent = data.assigned_agent !== undefined
          ? data.assigned_agent
          : this.activeChats[activeChatIndex].assigned_agent;

        const updatedChat = {
          ...this.activeChats[activeChatIndex],
          messages: updatedMessages,
          lastMessage: newMessage.content,
          lastMessageTime: newMessage.timestamp,
          unreadCount: newUnreadCount,
          customerFirstName: newFirstName,
          customerLastName: newLastName,
          customerName: newCustomerName,
          customerPhone: data.customer_phone || this.activeChats[activeChatIndex].customerPhone,
          status: updatedStatus,
          assigned_to: updatedAssignedTo,
          assigned_agent: updatedAssignedAgent,
          // ✅ WhatsApp-spezifische Daten
          channel: data.channel || this.activeChats[activeChatIndex].channel,
          whatsapp_number: data.whatsapp_number || this.activeChats[activeChatIndex].whatsapp_number,
          // ✅ Last Activity für Zuletzt-Online-Status
          last_activity: data.last_activity || this.activeChats[activeChatIndex].last_activity,
          lastOnline: (data.last_activity ? new Date(data.last_activity) : this.activeChats[activeChatIndex].last_activity ? new Date(this.activeChats[activeChatIndex].last_activity) : undefined) // ✅ FIX: lastOnline auch bei Updates aktualisieren
        };

        console.log('✅ Chat updated with new customer data:', {
          customerName: updatedChat.customerName,
          customerFirstName: updatedChat.customerFirstName,
          customerLastName: updatedChat.customerLastName,
          whatsapp_number: updatedChat.whatsapp_number
        });

        // ✅ Array immutable updaten
        this.activeChats = [
          ...this.activeChats.slice(0, activeChatIndex),
          updatedChat,
          ...this.activeChats.slice(activeChatIndex + 1)
        ];

        // ✅ filteredActiveChats synchron halten
        const filteredChatIndex = this.filteredActiveChats.findIndex(c => c.id === sessionId);
        if (filteredChatIndex !== -1) {
          this.filteredActiveChats = [
            ...this.filteredActiveChats.slice(0, filteredChatIndex),
            updatedChat,
            ...this.filteredActiveChats.slice(filteredChatIndex + 1)
          ];
        }

        // ✅ selectedChat updaten falls ausgewählt
        if (this.selectedChat && this.selectedChat.id === sessionId) {
          // ✅ Auch im selectedChat optimistische Nachricht ersetzen
          const selectedOptimisticIndex = this.selectedChat.messages.findIndex(
            m => m.isOptimistic && 
                 m.content.trim() === newMessage.content.trim() && 
                 m.from === newMessage.from
          );
          
          const isDuplicate = this.selectedChat.messages.some(m => m.id === newMessage.id && !m.isOptimistic);
          if (!isDuplicate) {
            let selectedMessages: Message[];
            if (selectedOptimisticIndex !== -1) {
              const optimisticMessage = this.selectedChat.messages[selectedOptimisticIndex];
              const mergedMessage: Message = {
                ...optimisticMessage,
                ...newMessage,
                clientMessageId: optimisticMessage.clientMessageId ?? optimisticMessage.id,
                isOptimistic: false
              };
              selectedMessages = [
                ...this.selectedChat.messages.slice(0, selectedOptimisticIndex),
                mergedMessage,
                ...this.selectedChat.messages.slice(selectedOptimisticIndex + 1)
              ];
            } else {
              selectedMessages = [...this.selectedChat.messages, newMessage];
            }
            
            this.selectedChat = {
              ...updatedChat,
              messages: selectedMessages.map(m => ({ ...m, read: true }))
            };

            // ✅ FIX: Setze shouldScrollToBottom=true für garantiertes Auto-Scroll
            this.shouldScrollToBottom = true;

            // ✅ FIX: Trigger Change Detection BEVOR Scroll
            this.cdRef.markForCheck();

            // ✅ Scroll nach Change Detection
            this.scrollToBottom(false);

            // ✅ NEU: Backend-Call um Nachrichten als gelesen zu markieren wenn Chat aktiv betrachtet wird
            // Dies verhindert, dass beim Reload ungelesene Nachrichten angezeigt werden
            const chatId = this.activeChats[activeChatIndex].chatId;
            if (chatId && sessionId) {
              this.markMessagesAsRead(chatId, sessionId);
            }
          }
        }

        // ✅ WICHTIG: Nur sortieren wenn Chat NICHT bereits ganz oben ist
        const needsSort = activeChatIndex !== 0;
        if (needsSort) {
          console.log('🔄 Sorting - message not in top chat');
          this.sortActiveChats();
        } else {
          console.log('✅ Smooth update - no sort needed');
        }

        // ✅ Tab-Titel aktualisieren
        this.updateTabTitle();

        console.log('✅ Message processing complete (immutable)');
        return;
      }
    }

    // ✅ Bot-Nachrichten werden ignoriert (keine Notifications)
    if (messageData && messageData.from === 'bot') {
      console.log('🤖 Bot message received - NO notification sent');
    }

    // Rest der Logik bleibt unverändert...
    if (data.unassigned) {
      const chat = this.activeChats.find(c => c.id === sessionId);
      if (chat) {
        // ✅ Verwende zentrale Update-Methode
        this.updateChatEverywhere(sessionId, {
          assigned_to: null,
          assigned_agent: '',
          status: 'human',
          lastMessage: 'Zuweisung aufgehoben - wartet auf Übernahme',
          lastMessageTime: new Date(),
          unreadCount: (chat.unreadCount || 0) + 1,
          isNew: true
        });

        this.assignmentStatuses.set(sessionId, {
          is_assigned: false,
          assigned_to: null,
          can_user_write: true
        });

        // ✅ Toast entfernt: Keine Benachrichtigung mehr beim Aufheben
        this.notificationSound.notify('message', {
          senderName: 'System',
          message: 'Chat-Zuweisung aufgehoben - verfügbar für Übernahme',
          sessionId: sessionId
        });

        this.sortActiveChats();
        this.cdRef.markForCheck();

        console.log('✅ Chat unassigned - updated everywhere');
        return;
      }
    }

    if (data.chat_ended && data.ended_by === 'visitor') {
      const chat = this.activeChats.find(c => c.id === sessionId);
      const wasMyChat = chat?.assigned_to === this.currentAgent.id;

      // ✅ Verwende zentrale Update-Methode
      this.updateChatEverywhere(sessionId, {
        status: 'closed',
        assigned_to: null,
        assigned_agent: ''
      });

      if (wasMyChat) {
        this.notificationSound.notify('message', {
          senderName: 'System',
          message: 'Der Benutzer hat Ihren Chat beendet',
          sessionId: sessionId
        });
      }

      console.log('✅ Chat ended by visitor - updated everywhere');
      return;
    }

    if (data.assigned_to) {
      // ✅ WICHTIG: Verwende die zentrale Update-Methode statt direkter Mutation
      this.updateChatEverywhere(sessionId, {
        assigned_to: data.assigned_to,
        assigned_agent: data.agent_name,
        status: data.status
      });

      this.assignmentStatuses.set(sessionId, {
        is_assigned: true,
        assigned_to: data.assigned_to,
        can_user_write: data.assigned_to === this.currentAgent.id
      });

      console.log('✅ Assignment updated via handleIncomingMessageGlobal');
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
    this.cdRef.markForCheck();

    // ✅ NEU: Tab-Titel aktualisieren nach neuer Nachricht
    this.updateTabTitle();
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
    return message.clientMessageId ?? message.id;
  }



  // ✅ Audio Player Functions
  toggleAudioPlay(attachment: any): void {
    const audioKey = attachment.id || attachment.file_path;

    // Stop currently playing audio if different
    if (this.currentPlayingAudio && this.currentPlayingAudio !== audioKey) {
      const currentAudio = this.audioElements.get(this.currentPlayingAudio);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }

    let audio = this.audioElements.get(audioKey);

    if (!audio) {
      audio = new Audio(attachment.download_url);
      this.audioElements.set(audioKey, audio);

      // Update progress and current time
      audio.addEventListener('timeupdate', () => {
        const progress = (audio!.currentTime / audio!.duration) * 100;
        this.audioProgress.set(audioKey, progress);
        const currentTime = this.formatDuration(audio!.currentTime);
        this.audioCurrentTimes.set(audioKey, currentTime);
        this.cdRef.markForCheck();
      });

      // Load metadata for duration
      audio.addEventListener('loadedmetadata', () => {
        const duration = this.formatDuration(audio!.duration);
        this.audioDurations.set(audioKey, duration);
        this.audioCurrentTimes.set(audioKey, '0:00');
        this.cdRef.markForCheck();
      });

      // Reset on end
      audio.addEventListener('ended', () => {
        this.currentPlayingAudio = null;
        this.audioProgress.set(audioKey, 0);
        this.audioCurrentTimes.set(audioKey, '0:00');
        this.cdRef.markForCheck();
      });
    }

    if (this.currentPlayingAudio === audioKey) {
      audio.pause();
      this.currentPlayingAudio = null;
    } else {
      audio.play();
      this.currentPlayingAudio = audioKey;
    }
  }

  seekAudio(attachment: any, event: MouseEvent): void {
    const audioKey = attachment.id || attachment.file_path;
    const audio = this.audioElements.get(audioKey);

    if (!audio) {
      // If audio hasn't been loaded yet, load it first
      this.toggleAudioPlay(attachment);
      // Wait a bit for metadata to load, then seek
      setTimeout(() => {
        this.performSeek(attachment, event);
      }, 100);
      return;
    }

    this.performSeek(attachment, event);
  }

  private performSeek(attachment: any, event: MouseEvent): void {
    const audioKey = attachment.id || attachment.file_path;
    const audio = this.audioElements.get(audioKey);

    if (!audio || !audio.duration) return;

    const waveformElement = event.currentTarget as HTMLElement;
    const rect = waveformElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * audio.duration;

    audio.currentTime = newTime;

    // Update UI immediately
    this.audioProgress.set(audioKey, percentage * 100);
    this.audioCurrentTimes.set(audioKey, this.formatDuration(newTime));
    this.cdRef.markForCheck();

    // Auto-play if not already playing
    if (this.currentPlayingAudio !== audioKey) {
      audio.play();
      this.currentPlayingAudio = audioKey;
    }
  }

  isAudioPlaying(attachment: any): boolean {
    const audioKey = attachment.id || attachment.file_path;
    return this.currentPlayingAudio === audioKey;
  }

  getAudioProgress(attachment: any): number {
    const audioKey = attachment.id || attachment.file_path;
    return this.audioProgress.get(audioKey) || 0;
  }

  getAudioDuration(attachment: any): string {
    const audioKey = attachment.id || attachment.file_path;
    return this.audioDurations.get(audioKey) || '0:00';
  }

  getAudioCurrentTime(attachment: any): string {
    const audioKey = attachment.id || attachment.file_path;
    return this.audioCurrentTimes.get(audioKey) || '0:00';
  }

  private formatDuration(seconds: number): string {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  ngOnDestroy() {
    if (this.popStateHandler) {
      window.removeEventListener('popstate', this.popStateHandler);
      this.popStateHandler = undefined;
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupPusherSubscriptions();

    if (this.authSub) {
      this.authSub.unsubscribe();
    }

    this.themeSubscription?.unsubscribe();

    if (this.chatRequestSubscription) {
      this.chatRequestSubscription.unsubscribe();
    }

    this.routeSubscription?.unsubscribe();
    this.cooldownUpdateSub?.unsubscribe();

    if (this.chatReloadRetryHandle) {
      clearTimeout(this.chatReloadRetryHandle);
    }

    // ✅ Audio cleanup
    this.audioElements.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.audioElements.clear();
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
    this.cdRef.markForCheck();
  }





// ✅ Erweiterte loadActiveChats mit besserer Fehlerbehandlung

  private setupDeepLinkListener(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      const chatParam = params.get('chatId');
      if (chatParam) {
        this.handleDeepLinkChat(chatParam);
      }
    });
  }

  private setupBackButtonHandler(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.popStateHandler = () => {
      if (!this.selectedChat && !this.isDeepLinkOpening) {
        return;
      }

      this.ngZone.run(() => {
        this.selectedChat = null;
        this.pendingChatId = null;
        this.isDeepLinkOpening = false;
        this.chatHistoryStatePushed = false;
        this.cdRef.markForCheck();
      });
    };

    window.addEventListener('popstate', this.popStateHandler);
  }

  private pushChatHistoryState(): void {
    if (!isPlatformBrowser(this.platformId) || this.chatHistoryStatePushed) {
      return;
    }

    window.history.pushState({ chatOpen: true }, '');
    this.chatHistoryStatePushed = true;
  }

  private handleDeepLinkChat(chatIdentifier: string): void {
    this.pendingChatId = chatIdentifier;
    this.isDeepLinkOpening = true;
    this.fetchChatForDeepLink(chatIdentifier);
    this.tryOpenPendingChat();
  }

  private fetchChatForDeepLink(chatIdentifier: string): void {
    if (this.deepLinkFetchInFlight) {
      return;
    }

    this.deepLinkFetchInFlight = true;

    this.chatbotService.getChatByIdentifier(chatIdentifier)
      .pipe(finalize(() => {
        this.deepLinkFetchInFlight = false;
      }))
      .subscribe({
        next: (response) => {
          const chatData = response?.data ?? response;
          if (!chatData) {
            return;
          }

          if (!this.pendingChatId || this.pendingChatId !== chatIdentifier) {
            return;
          }

          const chat = this.buildChatFromResponse(chatData);
          this.upsertChatForDeepLink(chat);

          if (this.selectedChat?.id?.toString() !== chat.id?.toString()) {
            this.selectChat(chat);
          } else {
            this.selectedChat = {
              ...this.selectedChat,
              ...chat,
              messages: this.selectedChat.messages
            };
            this.cdRef.markForCheck();
          }

          this.pendingChatId = null;
          this.isDeepLinkOpening = false;
          this.clearChatIdQueryParam();
        },
        error: (error) => {
          console.warn('Deep link chat fetch failed', error);
          if (this.hasLoadedChatsOnce) {
            this.isDeepLinkOpening = false;
          }
        }
      });
  }

  private upsertChatForDeepLink(chat: Chat): void {
    const chatId = chat.id?.toString();
    const existingIndex = this.activeChats.findIndex(existing => existing.id?.toString() === chatId);

    if (existingIndex === -1) {
      this.activeChats = [chat, ...this.activeChats];
    } else {
      this.activeChats[existingIndex] = {
        ...this.activeChats[existingIndex],
        ...chat,
        messages: chat.messages
      };
    }

    this.sortActiveChats();
  }

  private tryOpenPendingChat(): void {
    if (!this.pendingChatId) {
      this.isDeepLinkOpening = false;
      return;
    }

    const pendingChat = this.findChatByIdentifier(this.pendingChatId);
    if (!pendingChat) {
      if (this.hasLoadedChatsOnce) {
        this.isDeepLinkOpening = false;
      }
      return;
    }

    this.selectChat(pendingChat);
    this.pendingChatId = null;
    this.isDeepLinkOpening = false;
    this.clearChatIdQueryParam();
  }

  private findChatByIdentifier(identifier: string): Chat | undefined {
    const normalized = identifier.toString();
    return this.activeChats.find(chat =>
      chat.id?.toString() === normalized ||
      chat.chatId?.toString() === normalized
    );
  }

  private clearChatIdQueryParam(): void {
    this.router.navigate([], {
      queryParams: { chatId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  async loadActiveChats(includeWhatsApp: boolean = true): Promise<void> {
    if (this.chatReloadPromise) {
      return this.chatReloadPromise;
    }

    if (!this.chatReloadPromise) {
      this.isChatListLoading = true;
      this.cdRef.markForCheck();
    }

    this.chatReloadPromise = (async () => {
      try {
        await this.performActiveChatLoad();
        this.hasLoadedChatsOnce = true;
      } catch (error) {
        console.error('Error loading chats:', error);
        this.scheduleChatReloadRetry();
      } finally {
        this.chatReloadPromise = null;
        this.isChatListLoading = false;
        this.cdRef.markForCheck();
      }
    })();

    return this.chatReloadPromise;
  }

  private async performActiveChatLoad(): Promise<void> {
    const [activeChatsResponse, whatsappResponse] = await Promise.all([
      firstValueFrom(this.chatbotService.getActiveChats()),
      this.fetchWhatsAppChatsSafe()
    ]);

    const response = activeChatsResponse;
    this.whatsappChats = whatsappResponse;
    const whatsappChats = whatsappResponse;

    const chats = Array.isArray(response) ? response : response?.data ?? [];

    const mappedChats = chats.map((chat: any) => this.buildChatFromResponse(chat));
    const whatsappMapped = whatsappChats.length
      ? whatsappChats.map(chat => this.mapWhatsAppChatToChat(chat))
      : [];
    const combinedChats = whatsappMapped.length
      ? this.mergeWebsiteAndWhatsAppChats(mappedChats, whatsappMapped)
      : mappedChats;

    this.activeChats = combinedChats;
    this.filteredActiveChats = [...combinedChats];

    this.sortActiveChats();
    this.requestFilterUpdate();

    const assignedSessionId = localStorage.getItem('assigned_chat_session_id');
    if (!this.isMobileView && assignedSessionId && (!this.selectedChat || this.selectedChat.id !== assignedSessionId)) {
      const assignedChat = this.activeChats.find(chat => chat.id === assignedSessionId);
      if (assignedChat) {
        this.selectChat(assignedChat);
      }
    }

    this.setupPusherListeners();
    this.updateTabTitle();
    this.cdRef.markForCheck();

    this.hydrateVisitorDetails(chats);
    this.tryOpenPendingChat();
    this.loadArchivedChats();
  }

  private scheduleChatReloadRetry(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.chatReloadRetryHandle) {
      return;
    }

    this.chatReloadRetryHandle = setTimeout(() => {
      this.chatReloadRetryHandle = null;
      this.loadActiveChats();
    }, 5000);
  }

  private mergeWebsiteAndWhatsAppChats(websiteChats: Chat[], whatsappChats: Chat[]): Chat[] {
    const websiteOnly = websiteChats.filter(chat => chat.channel !== 'whatsapp');
    return [...websiteOnly, ...whatsappChats];
  }

  private async fetchWhatsAppChatsSafe(): Promise<WhatsAppChat[]> {
    try {
      const response = await firstValueFrom(this.whatsappService.getWhatsAppChats());
      return response.success ? response.chats : [];
    } catch (error) {
      console.error('Fehler beim Laden der WhatsApp-Chats:', error);
      return [];
    }
  }

  private mapWhatsAppChatToChat(wc: WhatsAppChat): Chat {
    const lastMessage = wc.messages?.[wc.messages.length - 1];
    const visitorFirstName = wc.visitor?.first_name || 'WhatsApp';
    const visitorLastName = wc.visitor?.last_name || 'Kunde';

    const assignedAgentName = (wc.assigned_agent || '').trim();

    return {
      id: wc.session_id,
      chatId: wc.id.toString(),
      customerName: wc.visitor
        ? `${(wc.visitor.first_name || '').trim()} ${(wc.visitor.last_name || '').trim()}`.trim() || 'WhatsApp Kunde'
        : 'WhatsApp Kunde',
      customerFirstName: visitorFirstName,
      customerLastName: visitorLastName,
      customerPhone: wc.whatsapp_number,
      customerAvatar: 'assets/whatsapp-avatar.svg',
      lastMessage: lastMessage?.text || '',
      lastMessageTime: lastMessage?.created_at ? new Date(lastMessage.created_at) : new Date(wc.created_at),
      unreadCount: 0,
      isOnline: false,
      last_activity: wc.updated_at,
      messages: wc.messages?.map(msg => ({
        id: msg.id.toString(),
        content: msg.text,
        timestamp: new Date(msg.created_at),
        isAgent: msg.from === 'agent',
        isBot: msg.from === 'bot',
        read: true,
        from: msg.from,
        message_type: msg.message_type,
        metadata: msg.metadata,
        attachment: this.resolveAttachment(msg)
      })) || [],
      assigned_to: wc.assigned_to ?? undefined,
      status: wc.status,
      assigned_agent: assignedAgentName || (wc.assigned_to ? `Agent ${wc.assigned_to}` : undefined),
      isNew: false,
      channel: 'whatsapp',
      whatsapp_number: wc.whatsapp_number,
      visitor: wc.visitor,
      updated_at: wc.updated_at,
      created_at: wc.created_at,
      archived_at: (wc as any).archived_at || null
    };
  }

  closeChat() {
    if (!this.selectedChat) return;

    // Öffne Dialog statt direkt zu schließen
    this.openCloseChatDialog(this.selectedChat);
  }

  // ========== Archivierung ==========

  closeArchivedView(): void {
    this.showArchivedChats = false;
    this.selectedChat = null;
    this.cdRef.markForCheck();
  }

  loadArchivedChats(): void {
    this.loadingArchivedChats = true;
    this.chatbotService.getArchivedChats().subscribe({
      next: (response: any) => {
        const chats = response?.chats || [];
        this.archivedChats = chats.map((chat: any) => this.buildChatFromResponse(chat));
        this.archivedChatsCount = this.archivedChats.length;
        this.loadingArchivedChats = false;
        this.cdRef.markForCheck();
      },
      error: (err: any) => {
        console.error('Fehler beim Laden der archivierten Chats:', err);
        this.loadingArchivedChats = false;
        this.cdRef.markForCheck();
      }
    });
  }

  archiveChatAction(chat: Chat): void {
    this.chatbotService.archiveChat(chat.chatId).subscribe({
      next: (response: any) => {
        if (response.success) {
          chat.archived_at = response.archived_at;

          // Aus aktiver Liste entfernen
          this.activeChats = this.activeChats.filter(c => c.id !== chat.id);

          // Zu archivierten hinzufuegen
          this.archivedChats = [chat, ...this.archivedChats];
          this.archivedChatsCount = this.archivedChats.length;

          // Selection zuruecksetzen wenn archivierter Chat ausgewaehlt war
          if (this.selectedChat?.id === chat.id) {
            this.selectedChat = null;
          }

          this.applyChatFilters();
          this.cdRef.markForCheck();
          this.showToast('Chat wurde archiviert', 'success');
        }
      },
      error: (err: any) => {
        console.error('Fehler beim Archivieren:', err);
        this.showToast('Fehler beim Archivieren des Chats', 'error');
      }
    });
  }

  unarchiveChatAction(chat: Chat): void {
    this.chatbotService.unarchiveChat(chat.chatId).subscribe({
      next: (response: any) => {
        if (response.success) {
          chat.archived_at = null;

          // Aus archivierter Liste entfernen
          this.archivedChats = this.archivedChats.filter(c => c.id !== chat.id);
          this.archivedChatsCount = this.archivedChats.length;

          // Zurueck in aktive Liste
          this.activeChats = [chat, ...this.activeChats];
          this.sortActiveChats();
          this.applyChatFilters();
          this.cdRef.markForCheck();
          this.showToast('Chat aus Archiv entfernt', 'success');
        }
      },
      error: (err: any) => {
        console.error('Fehler beim Entarchivieren:', err);
        this.showToast('Fehler beim Entfernen aus dem Archiv', 'error');
      }
    });
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
      attachment: this.resolveAttachment(messageData)
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

    // ✅ FIX: filteredActiveChats AUCH aktualisieren
    const filteredIndex = this.filteredActiveChats.findIndex(chat => chat.id === sessionId);
    if (filteredIndex !== -1) {
      this.filteredActiveChats = [
        ...this.filteredActiveChats.slice(0, filteredIndex),
        updatedChat,
        ...this.filteredActiveChats.slice(filteredIndex + 1)
      ];
    }

    if (isCurrentChat) {
      this.selectedChat = {
        ...updatedChat,
        messages: updatedChat.messages.map(m => ({ ...m, read: true }))
      };

      // ✅ FIX: Setze shouldScrollToBottom=true um Auto-Scroll zu garantieren
      // Dies stellt sicher, dass neue Nachrichten (auch System-Nachrichten) immer scrollen
      this.shouldScrollToBottom = true;

      // ✅ FIX: Trigger Change Detection BEVOR Scroll
      this.cdRef.markForCheck();

      // ✅ Scroll mit smooth behavior (nach Change Detection!)
      this.scrollToBottom(false);

      // SOFORT als gelesen markieren im Backend
      this.markMessagesAsRead(updatedChat.chatId, sessionId);
    }

    this.sortActiveChats();
    this.cdRef.markForCheck();
  }


  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  @HostListener('scroll', ['$event'])
  onScroll(event: Event) {
    const container = this.messageContainer?.nativeElement;
    if (!container) return;

    const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    this.shouldScrollToBottom = atBottom;
  }



  scrollToBottom(immediate: boolean = false) {
    const container = this.messageContainer?.nativeElement;
    if (!container) return;

    // ✅ Wenn immediate=true, scrolle SOFORT ohne Animation (für Chat-Wechsel)
    // ✅ Wenn immediate=false, nur scrollen wenn User bereits unten war
    if (immediate) {
      // Doppeltes requestAnimationFrame für sicheres Rendering
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      });
    } else if (this.shouldScrollToBottom) {
      // ✅ FIX: Warte 2 Frames bis DOM vollständig gerendert ist
      requestAnimationFrame(() => {
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
      });
    }
  }

  assignAdminChat(adminChat: any): void {
    if (!adminChat || adminChat.assigned_to) return;

    const sessionId = adminChat.session_id;
    if (!sessionId) {
      console.error('Keine Session ID für Admin-Chat gefunden');
      return;
    }

    // ✅ OPTIMISTIC UPDATE: Sofort UI aktualisieren
    const originalAdminChat = { ...adminChat };
    const originalAssignmentStatus = this.assignmentStatuses.get(sessionId);

    // ✅ Admin-Chat in der Liste sofort aktualisieren
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

    // ✅ Assignment Status lokal sofort speichern
    this.assignmentStatuses.set(sessionId, {
      is_assigned: true,
      assigned_to: this.currentAgent.id,
      can_user_write: true
    });

    // ✅ OPTIMISTIC TOAST: Sofort anzeigen
    this.showToast('✅ Admin-Chat erfolgreich übernommen', 'success');
    this.cdRef.markForCheck();

    this.chatbotService.assignChatToAgent(sessionId).subscribe({
      next: (response) => {
        if (response.success) {
          // ✅ Bestätigung via Pusher wird kommen - UI ist bereits aktualisiert
          console.log('Admin chat erfolgreich zugewiesen:', sessionId);
          // Aktive Chats auch neu laden für Konsistenz
          this.loadActiveChats();
        } else {
          // ✅ Bei Fehler: Änderungen rückgängig machen
          if (chatIndex !== -1) {
            this.allAdminChats[chatIndex] = originalAdminChat;
            const filteredIndex = this.filteredAdminChats.findIndex(c => c.session_id === sessionId);
            if (filteredIndex !== -1) {
              this.filteredAdminChats[filteredIndex] = originalAdminChat;
            }
          }
          if (originalAssignmentStatus) {
            this.assignmentStatuses.set(sessionId, originalAssignmentStatus);
          } else {
            this.assignmentStatuses.delete(sessionId);
          }
          this.showError('Admin-Chat konnte nicht zugewiesen werden');
        }
      },
      error: (err) => {
        console.error('Fehler beim Zuweisen des Admin-Chats:', err);
        // ✅ Bei Fehler: Änderungen rückgängig machen
        if (chatIndex !== -1) {
          this.allAdminChats[chatIndex] = originalAdminChat;
          const filteredIndex = this.filteredAdminChats.findIndex(c => c.session_id === sessionId);
          if (filteredIndex !== -1) {
            this.filteredAdminChats[filteredIndex] = originalAdminChat;
          }
        }
        if (originalAssignmentStatus) {
          this.assignmentStatuses.set(sessionId, originalAssignmentStatus);
        } else {
          this.assignmentStatuses.delete(sessionId);
        }
        this.showError('Admin-Chat konnte nicht zugewiesen werden: ' + (err.error?.message || err.message));
      }
    });
  }



  selectChat(chat: Chat): void {
    this.ngZone.run(() => {
      this.pushChatHistoryState();
      // ✅ FIX: Setze Loading-State um Flickern zu vermeiden
      this.isLoadingChat = true;

      // ✅ BUGFIX: Visitor-Info SOFORT aktualisieren (optimistisch) - verhindert dass alter WhatsApp-Name stehen bleibt
      if (this.isWhatsAppChat(chat)) {
        // Für WhatsApp-Chats: Visitor-Info aus Chat-Daten erstellen
        this.visitor = {
          first_name: chat.customerFirstName || 'WhatsApp',
          last_name: chat.customerLastName || 'Kunde',
          phone: chat.customerPhone || '',
          email: '', // Email wird vom Backend geladen (WhatsApp hat keine Email)
          agb_accepted: false
        };
      } else {
        // ✅ OPTIMISTIC UPDATE: Sofort Visitor-Info aus Chat-Daten setzen (bevor API-Call kommt)
        // ✅ FIX: Email direkt aus Chat-Objekt verwenden (Backend sendet sie jetzt direkt mit!)
        const chatIdStr = chat.id.toString();
        const cachedEmail = this.visitorEmailCache.get(chatIdStr) || '';
        const emailFromChat = chat.customerEmail || '';
        const emailFromVisitor = chat.visitor?.email || '';
        // ✅ Priorität: 1. customerEmail (direkt im Chat vom Backend), 2. visitor.email, 3. Cache
        const emailToUse = emailFromChat || emailFromVisitor || cachedEmail;
        
        // ✅ Email im Cache speichern falls sie im Chat-Objekt vorhanden ist (für zukünftige Wechsel)
        if (emailToUse && !cachedEmail) {
          this.visitorEmailCache.set(chatIdStr, emailToUse);
        }
        
        // ✅ DEBUG: Log für Troubleshooting
        if (!emailToUse) {
          console.log('⚠️ Keine Email gefunden für Chat', chatIdStr, {
            hasVisitor: !!chat.visitor,
            customerEmail: chat.customerEmail,
            visitorEmail: chat.visitor?.email,
            cachedEmail: cachedEmail,
            customerName: chat.customerName
          });
        }
        
        this.visitor = {
          first_name: chat.customerFirstName || '',
          last_name: chat.customerLastName || '',
          phone: chat.customerPhone || '',
          email: emailToUse, // ✅ Email sofort verfügbar (direkt vom Backend im Chat-Objekt!)
          agb_accepted: false
        };
      }
      
      // ✅ SOFORT UI aktualisieren damit Name/Email/Phone sofort angezeigt werden
      this.cdRef.markForCheck();

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

      // ✅ FIX: Setze shouldScrollToBottom=true damit Auto-Scroll funktioniert
      this.shouldScrollToBottom = true;

      // ✅ FIX: Warte auf nächsten Frame, dann scrolle UND zeige Chat
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.scrollToBottom(true);
          this.isLoadingChat = false;
          this.cdRef.markForCheck();
        });
      });

      this.loadAssignmentStatus(chat.id.toString());

      // Speichere im localStorage
      localStorage.setItem('assigned_chat_session_id', chat.id.toString());

      // Backend-Call: als gelesen markieren
      if (chat.chatId && chat.id) {
        this.markMessagesAsRead(chat.chatId, chat.id.toString());
      }

      // ✅ Besucher-Details vom Backend nachladen (nur für Website-Chats)
      // Dies aktualisiert die Visitor-Info mit vollständigen/aktuellen Daten
      if (!this.isWhatsAppChat(chat)) {
        // ✅ FIX: Track welche Chat-ID aktuell geladen wird
        const requestedChatId = chat.id.toString();
        this.currentVisitorChatId = requestedChatId;

        this.chatbotService.getVisitorDetails(requestedChatId).subscribe({
          next: (visitor) => {
            // ✅ WICHTIG: Prüfe ob diese API-Antwort noch für den aktuell ausgewählten Chat ist
            // Verhindert dass alte API-Antworten die Visitor-Info überschreiben wenn User schnell zwischen Chats wechselt
            if (this.currentVisitorChatId !== requestedChatId) {
              console.log('⚠️ Ignoriere Visitor-Details für Chat', requestedChatId, '- aktueller Chat:', this.currentVisitorChatId);
              return; // Diese Antwort ist veraltet, ignoriere sie
            }

            // ✅ Überschreibe nur wenn Backend-Daten vorhanden sind UND noch der richtige Chat ausgewählt ist
            if (visitor && (visitor.first_name || visitor.last_name || visitor.email || visitor.phone)) {
              // ✅ Doppelte Prüfung: Ist der zurückgekommene Chat noch der aktuell ausgewählte?
              if (this.selectedChat?.id.toString() === requestedChatId) {
                this.visitor = visitor;
                // ✅ FIX: Email im Cache speichern für zukünftige Chat-Wechsel (instant Updates)
                if (visitor.email) {
                  this.visitorEmailCache.set(requestedChatId, visitor.email);
                  // ✅ FIX: Email auch im selectedChat-Objekt aktualisieren für instant Anzeige
                  this.selectedChat = {
                    ...this.selectedChat,
                    customerEmail: visitor.email
                  };
                  // ✅ FIX: Email auch im activeChats Array aktualisieren für Konsistenz
                  const chatIndex = this.activeChats.findIndex(c => c.id.toString() === requestedChatId);
                  if (chatIndex !== -1) {
                    this.activeChats[chatIndex] = {
                      ...this.activeChats[chatIndex],
                      customerEmail: visitor.email
                    };
                  }
                  const filteredIndex = this.filteredActiveChats.findIndex(c => c.id.toString() === requestedChatId);
                  if (filteredIndex !== -1) {
                    this.filteredActiveChats[filteredIndex] = {
                      ...this.filteredActiveChats[filteredIndex],
                      customerEmail: visitor.email
                    };
                  }
                }
                this.cdRef.markForCheck();
              } else {
                console.log('⚠️ Chat wurde gewechselt während API-Call lief - ignoriere Visitor-Details');
                // ✅ Email trotzdem im Cache speichern (könnte später nützlich sein)
                if (visitor.email) {
                  this.visitorEmailCache.set(requestedChatId, visitor.email);
                }
              }
            }
          },
          error: (err) => {
            console.error('Error fetching visitor details:', err);
            // ✅ Bei Fehler: Visitor-Info bleibt aus Chat-Daten (optimistisch gesetzt)
          }
        });
      } else {
        // ✅ Für WhatsApp-Chats: Keine API-Call notwendig, Visitor-Info bereits gesetzt
        this.currentVisitorChatId = chat.id.toString();
      }

      // ✅ NEU: Tab-Titel aktualisieren nach Chat-Auswahl
      this.updateTabTitle();
    });
  }


// In admin-dashboard.component.ts - canWrite Methode korrigieren:
  canWrite(chat: Chat | null): boolean {
    if (!chat) return false;

    // WICHTIG: Explizite Prüfung auf null/undefined
    const isAssigned = chat.assigned_to !== null && chat.assigned_to !== undefined;
    const isAssignedToMe = isAssigned && chat.assigned_to === this.currentAgent.id;

    if (chat.status === 'human') {
      return isAssignedToMe;
    }
    if (chat.status === 'in_progress') {
      return isAssignedToMe;
    }
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
    this.chatbotService.getTransferHistory(chat.id.toString()).subscribe({
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

    const assignmentCheck = chat.assigned_to === null || chat.assigned_to === undefined;
    const statusCheck = chat.status === 'human' || chat.status === 'bot';

    return statusCheck && assignmentCheck;
  }
  /**
   * Kann Chat übertragen werden?
   */
  canTransferChat(chat: Chat): boolean {
    if (!chat || !chat.assigned_to) {
      return false;
    }

    const isMyChat = chat.assigned_to === this.currentAgent.id;
    const isInProgress = chat.status === 'in_progress';

    return (isMyChat || this.isAdmin) && isInProgress;
  }

  canCloseChat(chat: Chat | null): boolean {
    if (!chat) {
      return false;
    }

    if (chat.status === 'closed' || chat.status === 'bot') {
      return false;
    }

    if (chat.assigned_to && chat.assigned_to !== this.currentAgent.id && !this.isAdmin) {
      return false;
    }

    return true;
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

    // ✅ OPTIMISTIC UPDATE: Sofort UI aktualisieren
    const originalChat = { ...chat };
    const originalSelectedChat = this.selectedChat ? { ...this.selectedChat } : null;
    const originalAssignmentStatus = this.assignmentStatuses.get(chat.id.toString());

    // ✅ Sofort im UI anzeigen
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

    this.assignmentStatuses.set(chat.id.toString(), {
      is_assigned: true,
      assigned_to: this.currentAgent.id,
      can_user_write: true,
      assigned_agent_name: this.currentAgent.name
    });

    // ✅ OPTIMISTIC TOAST: Sofort anzeigen (nicht warten auf API-Response)
    this.showToast('✅ Chat erfolgreich übernommen', 'success');
    this.cdRef.markForCheck(); // ✅ Sofort UI aktualisieren

    // ✅ FIX: Chat direkt nach Übernahme öffnen
    const updatedChat = this.activeChats.find(c => c.id === chat.id);
    if (updatedChat) {
      // ✅ Chat direkt auswählen und öffnen
      this.selectChat(updatedChat);
    }

    this.chatbotService.assignChatToAgent(chat.id.toString()).subscribe({
      next: (response) => {
        console.log('Chat assignment successful:', response);

        if (!response.success) {
          // ✅ Bei Fehler: Änderungen rückgängig machen
          this.revertChatAssignment(chat.id.toString(), originalChat, originalSelectedChat, originalAssignmentStatus);
          this.showError('Chat konnte nicht zugewiesen werden');
        }
        // ✅ Bei Erfolg: Toast bereits angezeigt, Pusher-Event kommt zur Bestätigung
        // Chat ist bereits geöffnet durch selectChat oben
      },
      error: (err) => {
        console.error('Chat assignment failed:', err);

        // ✅ Bei Fehler: Änderungen rückgängig machen
        this.revertChatAssignment(chat.id.toString(), originalChat, originalSelectedChat, originalAssignmentStatus);

        this.showError('Chat konnte nicht zugewiesen werden: ' + (err.error?.message || err.message));
      }
    });
  }

  // ✅ Helper-Methode um Assignment-Änderungen rückgängig zu machen
  private revertChatAssignment(
    chatId: string | number,
    originalChat: Chat,
    originalSelectedChat: Chat | null,
    originalAssignmentStatus: any
  ): void {
    const chatIndex = this.activeChats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      this.activeChats[chatIndex] = originalChat;

      const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === chatId);
      if (filteredIndex !== -1) {
        this.filteredActiveChats[filteredIndex] = originalChat;
      }
    }

    if (originalSelectedChat && this.selectedChat?.id === chatId) {
      this.selectedChat = originalSelectedChat;
    }

    if (originalAssignmentStatus !== undefined) {
      const chatIdStr = chatId.toString();
      if (originalAssignmentStatus === null) {
        this.assignmentStatuses.delete(chatIdStr);
      } else {
        this.assignmentStatuses.set(chatIdStr, originalAssignmentStatus);
      }
    }

    this.cdRef.markForCheck();
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

    // ✅ OPTIMISTIC UPDATE: Sofort UI aktualisieren
    const chatToTransfer = this.selectedChatForTransfer;
    const originalChat = { ...chatToTransfer };
    const originalSelectedChat = this.selectedChat ? { ...this.selectedChat } : null;
    const originalAssignmentStatus = this.assignmentStatuses.get(chatToTransfer.id.toString());

    // ✅ Sofort im UI aktualisieren
    const chatIndex = this.activeChats.findIndex(c => c.id === chatToTransfer.id);
    if (chatIndex !== -1) {
      this.activeChats[chatIndex] = {
        ...this.activeChats[chatIndex],
        assigned_to: toAgentId,
        assigned_agent: selectedAgent.name,
        lastMessage: `Chat übertragen an ${selectedAgent.name}`,
        lastMessageTime: new Date()
      };

      const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === chatToTransfer.id);
      if (filteredIndex !== -1) {
        this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
      }
    }

    if (this.selectedChat?.id === chatToTransfer.id) {
      this.selectedChat = {
        ...this.selectedChat,
        assigned_to: toAgentId,
        assigned_agent: selectedAgent.name
      };
    }

    this.assignmentStatuses.set(chatToTransfer.id.toString(), {
      is_assigned: true,
      assigned_to: toAgentId,
      can_user_write: true,
      assigned_agent_name: selectedAgent.name
    });

    // ✅ Dialog sofort schließen
    this.closeTransferDialog();

    // ✅ OPTIMISTIC TOAST: Sofort anzeigen
    this.showToast(`✅ Chat erfolgreich an ${selectedAgent.name} übertragen`, 'success');
    this.cdRef.markForCheck(); // ✅ Sofort UI aktualisieren

    this.chatbotService.transferChatToAgent(
      chatToTransfer.id.toString(),
      toAgentId,
      finalReason
    ).subscribe({
      next: (response) => {
        console.log('Transfer response:', response);

        if (response.success) {
          // ✅ Toast bereits angezeigt, Liste aktualisieren
          this.loadActiveChats();
        } else {
          // ✅ Bei Fehler: Änderungen rückgängig machen
          this.revertChatTransfer(chatToTransfer.id, originalChat, originalSelectedChat, originalAssignmentStatus);
          this.showError('Transfer fehlgeschlagen: ' + (response.message || 'Unbekannter Fehler'));
        }
      },
      error: (err) => {
        console.error('Transfer error:', err);
        // ✅ Bei Fehler: Änderungen rückgängig machen
        this.revertChatTransfer(chatToTransfer.id, originalChat, originalSelectedChat, originalAssignmentStatus);
        this.showError('Chat konnte nicht übertragen werden: ' + (err.error?.message || err.message));
      }
    });
  }

  // ✅ Helper-Methode um Transfer-Änderungen rückgängig zu machen
  private revertChatTransfer(
    chatId: string | number,
    originalChat: Chat,
    originalSelectedChat: Chat | null,
    originalAssignmentStatus: any
  ): void {
    const chatIndex = this.activeChats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      this.activeChats[chatIndex] = originalChat;

      const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === chatId);
      if (filteredIndex !== -1) {
        this.filteredActiveChats[filteredIndex] = originalChat;
      }
    }

    if (originalSelectedChat && this.selectedChat?.id === chatId) {
      this.selectedChat = originalSelectedChat;
    }

    const chatIdStr = chatId.toString();
    if (originalAssignmentStatus !== undefined) {
      if (originalAssignmentStatus === null) {
        this.assignmentStatuses.delete(chatIdStr);
      } else {
        this.assignmentStatuses.set(chatIdStr, originalAssignmentStatus);
      }
    }

    this.cdRef.markForCheck();
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

    // ✅ OPTIMISTIC UPDATE: Sofort UI aktualisieren
    const originalChat = { ...chat };
    const originalAssignmentStatus = this.assignmentStatuses.get(chat.id.toString());

    // ✅ Sofort im UI aktualisieren
    const chatIndex = this.activeChats.findIndex(c => c.id === chat.id);
    if (chatIndex !== -1) {
      this.activeChats[chatIndex] = {
        ...this.activeChats[chatIndex],
        assigned_to: null,
        assigned_agent: '',
        status: 'human'
      };

      const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === chat.id);
      if (filteredIndex !== -1) {
        this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
      }
    }

    if (this.selectedChat?.id === chat.id) {
      this.selectedChat = {
        ...this.selectedChat,
        assigned_to: null,
        assigned_agent: '',
        status: 'human'
      };
    }

    this.assignmentStatuses.set(chat.id.toString(), {
      is_assigned: false,
      assigned_to: null,
      can_user_write: false
    });

    // ✅ OPTIMISTIC TOAST: Sofort anzeigen
    this.showToast('✅ Zuweisung erfolgreich aufgehoben', 'success');
    this.cdRef.markForCheck(); // ✅ Sofort UI aktualisieren

    this.chatbotService.unassignChat(chat.id.toString()).subscribe({
      next: (response) => {
        if (response.success) {
          // ✅ Toast bereits angezeigt, Liste aktualisieren
          this.loadActiveChats();
        } else {
          // ✅ Bei Fehler: Änderungen rückgängig machen
          this.revertChatUnassignment(chat.id, originalChat, originalAssignmentStatus);
          this.showError('Zuweisung konnte nicht aufgehoben werden');
        }
      },
      error: (err) => {
        console.error('Fehler beim Aufheben der Zuweisung:', err);
        // ✅ Bei Fehler: Änderungen rückgängig machen
        this.revertChatUnassignment(chat.id, originalChat, originalAssignmentStatus);
        this.showError('Zuweisung konnte nicht aufgehoben werden');
      }
    });
  }

  // ✅ Helper-Methode um Unassignment-Änderungen rückgängig zu machen
  private revertChatUnassignment(
    chatId: string | number,
    originalChat: Chat,
    originalAssignmentStatus: any
  ): void {
    const chatIndex = this.activeChats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      this.activeChats[chatIndex] = originalChat;

      const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === chatId);
      if (filteredIndex !== -1) {
        this.filteredActiveChats[filteredIndex] = originalChat;
      }
    }

    if (this.selectedChat?.id === chatId) {
      this.selectedChat = {
        ...this.selectedChat,
        assigned_to: originalChat.assigned_to,
        assigned_agent: originalChat.assigned_agent,
        status: originalChat.status
      };
    }

    const chatIdStr = chatId.toString();
    if (originalAssignmentStatus !== undefined) {
      if (originalAssignmentStatus === null) {
        this.assignmentStatuses.delete(chatIdStr);
      } else {
        this.assignmentStatuses.set(chatIdStr, originalAssignmentStatus);
      }
    }

    this.cdRef.markForCheck();
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

    // ✅ OPTIMISTIC UPDATE: Nachricht sofort hinzufügen für sofortiges Feedback
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const trimmedContent = content.trim();
    
    const optimisticMessage: Message = {
      id: tempId,
      clientMessageId: tempId,
      content: trimmedContent,
      timestamp: new Date(),
      isAgent: true,
      isBot: false,
      read: true,
      from: 'agent',
      isOptimistic: true // Markiere als optimistische Nachricht
    };

    // ✅ Sofort im UI anzeigen
    if (this.selectedChat) {
      this.selectedChat = {
        ...this.selectedChat,
        messages: [...this.selectedChat.messages, optimisticMessage],
        lastMessage: trimmedContent,
        lastMessageTime: new Date()
      };

      // ✅ Auch in activeChats aktualisieren
      const chatIndex = this.activeChats.findIndex(c => c.id === this.selectedChat!.id);
      if (chatIndex !== -1) {
        this.activeChats[chatIndex] = {
          ...this.activeChats[chatIndex],
          messages: [...this.activeChats[chatIndex].messages, optimisticMessage],
          lastMessage: trimmedContent,
          lastMessageTime: new Date()
        };

        const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === this.selectedChat!.id);
        if (filteredIndex !== -1) {
          this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
        }
      }

      // ✅ Textfeld sofort leeren
      inputElement.value = '';
      inputElement.focus();

      // ✅ Sofort scrollen
      this.shouldScrollToBottom = true;
      this.cdRef.markForCheck();
      this.scrollToBottom(false);
    }

    // ✅ API-Call im Hintergrund
    const newMessagePayload = {
      chat_id: this.selectedChat.chatId,
      content: trimmedContent,
      isAgent: true
    };

    this.chatbotService.sendAgentMessage(newMessagePayload).subscribe({
      next: (response) => {
        // ✅ Nachricht wird durch Pusher-Event aktualisiert (mit echter ID)
        // Optimistische Nachricht wird durch echte ersetzt wenn Pusher-Event kommt
        console.log('Message sent successfully, will be updated via Pusher');
      },
      error: (err) => {
        console.error('Error sending message:', err);
        
        // ✅ Bei Fehler: Optimistische Nachricht entfernen oder als fehlgeschlagen markieren
        if (this.selectedChat) {
          const chatIndex = this.activeChats.findIndex(c => c.id === this.selectedChat!.id);
          if (chatIndex !== -1) {
            this.activeChats[chatIndex] = {
              ...this.activeChats[chatIndex],
              messages: this.activeChats[chatIndex].messages.filter(m => m.id !== tempId)
            };

            const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === this.selectedChat!.id);
            if (filteredIndex !== -1) {
              this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
            }
          }

          this.selectedChat = {
            ...this.selectedChat,
            messages: this.selectedChat.messages.filter(m => m.id !== tempId)
          };

          // ✅ Text wieder ins Input-Feld setzen
          inputElement.value = trimmedContent;
          inputElement.focus();
        }

        this.showError('Nachricht konnte nicht gesendet werden');
        this.cdRef.markForCheck();
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

  trackByChatId(index: number, chat: Chat): string | number {
    return chat.id;
  }

  trackByAdminChatId(index: number, chat: any): string {
    return chat.session_id || chat.chat_id || index.toString();
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

    // ✅ OPTIMISTIC TOAST: Sofort anzeigen (Datei wird via Pusher angezeigt)
    this.showToast(`📤 Datei wird hochgeladen: ${file.name}`, 'info', 3000);
    // ✅ Success-Toast wird erst nach erfolgreichem Upload angezeigt (oder via Pusher)

    this.chatbotService.uploadAttachment(file, chatId, sessionId.toString(), 'agent').subscribe({
      next: (response) => {
        console.log('File uploaded successfully:', response);
        // ✅ Toast wird via Pusher-Event angezeigt wenn Datei empfangen wird
        // Zusätzlicher Success-Toast ist optional (kann zu viele Toasts geben)
      },
      error: (err) => {
        console.error('File upload error:', err);
        this.showError('Fehler beim Hochladen der Datei: ' + (err.error?.message || err.message));
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

  /**
   * ✅ NEU: Holt den Agent-Namen aus der Nachricht-Metadata
   * Löst das Problem dass nach Transfer alle Nachrichten den neuen Agent-Namen zeigen
   */
  getAgentNameForMessage(message: Message): string {
    // 1. Prüfe ob metadata vorhanden ist und agent_name enthält
    if (message.metadata) {
      try {
        const metadata = typeof message.metadata === 'string'
          ? JSON.parse(message.metadata)
          : message.metadata;

        if (metadata.agent_name) {
          return metadata.agent_name;
        }
      } catch (e) {
        console.error('Error parsing message metadata:', e);
      }
    }

    // 2. Fallback: Verwende den aktuellen assigned_agent vom Chat
    return this.selectedChat?.assigned_agent || 'Agent';
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












  /**
   * ✅ NEU: Tab-Visibility-Tracking einrichten
   */
  private setupTabVisibilityTracking(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
        // Tab visibility changed silently

        // Tab-Titel aktualisieren wenn Tab wieder sichtbar wird
        if (this.isTabVisible) {
          this.updateTabTitle();
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.isWindowFocused = true;
        console.log('Admin Dashboard window focused');
        this.updateTabTitle();
      });

      window.addEventListener('blur', () => {
        this.isWindowFocused = false;
        console.log('Admin Dashboard window blurred');
      });
    }
  }

  /**
   * ✅ NEU: Gesamtzahl ungelesener Nachrichten berechnen
   */
  private calculateTotalUnreadCount(): number {
    return this.activeChats.reduce((total, chat) => {
      return total + (chat.unreadCount || 0);
    }, 0);
  }

  /**
   * ✅ NEU: Tab-Titel aktualisieren
   */
  private updateTabTitle(): void {
    if (typeof document === 'undefined') return;

    this.totalUnreadCount = this.calculateTotalUnreadCount();

    // ✅ KORRIGIERT: Zeige Unread-Counter auch wenn Tab sichtbar ist
    if (this.totalUnreadCount > 0) {
      // Ungelesene Nachrichten vorhanden
      document.title = `(${this.totalUnreadCount}) Livechat Dashboard`;
    } else {
      // Keine ungelesenen Nachrichten
      document.title = 'Livechat Dashboard';
    }

    console.log('Tab title updated:', document.title, '(unread:', this.totalUnreadCount, ')');
    this.staffPushNotifications.updateBadgeCount(this.totalUnreadCount);
  }

  // ========================================
  // ✅ WHATSAPP INTEGRATION METHODS
  // ========================================

  /**
   * Sende WhatsApp Text-Nachricht
   */
  sendWhatsAppMessage(message: string, textarea: HTMLTextAreaElement): void {
    if (!this.selectedChat) return;

    // ✅ OPTIMISTIC UPDATE: Nachricht sofort hinzufügen für sofortiges Feedback
    const tempId = `temp-whatsapp-${Date.now()}-${Math.random()}`;
    const trimmedContent = message.trim();
    
    const optimisticMessage: Message = {
      id: tempId,
      clientMessageId: tempId,
      content: trimmedContent,
      timestamp: new Date(),
      isAgent: true,
      isBot: false,
      read: true,
      from: 'agent',
      isOptimistic: true // Markiere als optimistische Nachricht
    };

    // ✅ Sofort im UI anzeigen
    if (this.selectedChat) {
      this.selectedChat = {
        ...this.selectedChat,
        messages: [...this.selectedChat.messages, optimisticMessage],
        lastMessage: trimmedContent,
        lastMessageTime: new Date()
      };

      // ✅ Auch in activeChats aktualisieren
      const chatIndex = this.activeChats.findIndex(c => c.id === this.selectedChat!.id);
      if (chatIndex !== -1) {
        this.activeChats[chatIndex] = {
          ...this.activeChats[chatIndex],
          messages: [...this.activeChats[chatIndex].messages, optimisticMessage],
          lastMessage: trimmedContent,
          lastMessageTime: new Date()
        };

        const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === this.selectedChat!.id);
        if (filteredIndex !== -1) {
          this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
        }
      }

      // ✅ Textfeld sofort leeren
      textarea.value = '';
      textarea.focus();

      // ✅ Sofort scrollen
      this.shouldScrollToBottom = true;
      this.cdRef.markForCheck();
      this.scrollToBottom(false);
    }

    // ✅ FIX: Verwende chatId für WhatsApp API Calls, nicht id (session_id)
    const chatId = this.isWhatsAppChat(this.selectedChat) ? Number(this.selectedChat.chatId) : Number(this.selectedChat.id);
    this.whatsappService.sendTextMessage(chatId, trimmedContent).subscribe({
      next: (response) => {
        if (response.success) {
          // ✅ Nachricht wird durch Pusher-Event aktualisiert (mit echter ID)
          // Optimistische Nachricht wird durch echte ersetzt wenn Pusher-Event kommt
          console.log('WhatsApp message sent successfully, will be updated via Pusher');
        }
      },
      error: (error) => {
        console.error('Fehler beim Senden der WhatsApp-Nachricht:', error);
        this.snackBar.open('❌ Fehler beim Senden der Nachricht', 'OK', { duration: 5000 });
        
        // ✅ Bei Fehler: Optimistische Nachricht entfernen
        if (this.selectedChat) {
          const chatIndex = this.activeChats.findIndex(c => c.id === this.selectedChat!.id);
          if (chatIndex !== -1) {
            this.activeChats[chatIndex] = {
              ...this.activeChats[chatIndex],
              messages: this.activeChats[chatIndex].messages.filter(m => m.id !== tempId)
            };

            const filteredIndex = this.filteredActiveChats.findIndex(c => c.id === this.selectedChat!.id);
            if (filteredIndex !== -1) {
              this.filteredActiveChats[filteredIndex] = { ...this.activeChats[chatIndex] };
            }
          }

          this.selectedChat = {
            ...this.selectedChat,
            messages: this.selectedChat.messages.filter(m => m.id !== tempId)
          };

          // ✅ Text wieder ins Input-Feld setzen
          textarea.value = trimmedContent;
          textarea.focus();
        }
      }
    });
  }

  /**
   * ✅ Unified File-Upload Handler für WhatsApp (automatische Typ-Erkennung)
   */
  onWhatsAppFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file || !this.selectedChat) return;

    // Validiere Datei
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      this.snackBar.open('❌ Datei ist zu groß (max. 100MB)', 'OK', { duration: 5000 });
      event.target.value = '';
      return;
    }

    // ✅ Automatische Typ-Erkennung basierend auf MIME-Type
    const fileType = file.type;
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');
    const isDocument = !isImage && !isVideo; // Alles andere ist ein Dokument

    // ✅ Keine Caption-Abfrage - verwende einfach den Dateinamen
    const caption = file.name;

    // ✅ OPTIMISTIC TOAST: Sofort anzeigen
    const fileTypeLabel = isImage ? 'Bild' : (isVideo ? 'Video' : 'Dokument');
    this.showToast(`📤 ${fileTypeLabel} wird hochgeladen: ${file.name}`, 'info', 3000);

    // ✅ Sende basierend auf automatisch erkanntem Typ
    if (isImage) {
      // ✅ FIX: Verwende chatId für WhatsApp API Calls, nicht id (session_id)
      const chatId = this.isWhatsAppChat(this.selectedChat) ? Number(this.selectedChat.chatId) : Number(this.selectedChat.id);
      
      // ✅ DEBUG: Log die Werte um das Problem zu identifizieren
      console.log('🔍 DEBUG WhatsApp Image Send:', {
        selectedChat: this.selectedChat,
        isWhatsAppChat: this.isWhatsAppChat(this.selectedChat),
        selectedChatId: this.selectedChat.id,
        selectedChatChatId: this.selectedChat.chatId,
        finalChatId: chatId,
        chatIdType: typeof chatId,
        isNaN: isNaN(chatId)
      });
      
      this.whatsappService.sendImage(chatId, file, caption || undefined).subscribe({
        next: (response) => {
          if (response.success) {
            // ✅ Success-Toast - Datei wird via Pusher angezeigt
            this.showToast('✅ Bild erfolgreich gesendet', 'success', 3000);
          } else {
            this.showError('Bild konnte nicht gesendet werden');
          }
        },
        error: (error) => {
          console.error('Fehler beim Senden des Bildes:', error);
          this.showError('Fehler beim Senden des Bildes: ' + (error.error?.message || error.message));
        }
      });
    } else if (isVideo) {
      // Video-Support (falls WhatsApp-Service sendVideo hat, ansonsten als Dokument)
      // ✅ FIX: Verwende chatId für WhatsApp API Calls, nicht id (session_id)
      const chatId = this.isWhatsAppChat(this.selectedChat) ? Number(this.selectedChat.chatId) : Number(this.selectedChat.id);
      this.whatsappService.sendDocument(chatId, file, caption || undefined).subscribe({
        next: (response) => {
          if (response.success) {
            this.showToast('✅ Video erfolgreich gesendet', 'success', 3000);
          } else {
            this.showError('Video konnte nicht gesendet werden');
          }
        },
        error: (error) => {
          console.error('Fehler beim Senden des Videos:', error);
          this.showError('Fehler beim Senden des Videos: ' + (error.error?.message || error.message));
        }
      });
    } else {
      // Dokument
      // ✅ FIX: Verwende chatId für WhatsApp API Calls, nicht id (session_id)
      const chatId = this.isWhatsAppChat(this.selectedChat) ? Number(this.selectedChat.chatId) : Number(this.selectedChat.id);
      this.whatsappService.sendDocument(chatId, file, caption || undefined).subscribe({
        next: (response) => {
          if (response.success) {
            this.showToast('✅ Dokument erfolgreich gesendet', 'success', 3000);
          } else {
            this.showError('Dokument konnte nicht gesendet werden');
          }
        },
        error: (error) => {
          console.error('Fehler beim Senden des Dokuments:', error);
          this.showError('Fehler beim Senden des Dokuments: ' + (error.error?.message || error.message));
        }
      });
    }

    // Reset file input
    event.target.value = '';
  }

  /**
   * Filter Chats nach Channel
   */
  filterByChannel(channel: 'all' | 'website' | 'whatsapp'): void {
    this.selectedChannelFilter = channel;
    this.filterChats();
  }

  /**
   * Prüfe ob Chat WhatsApp ist
   */
  isWhatsAppChat(chat: any): boolean {
    return chat?.channel === 'whatsapp';
  }

  /**
   * Formatiere WhatsApp-Nummer
   */
  formatWhatsAppNumber(number: string): string {
    if (!number) return '';
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      const countryCode = cleaned.substring(0, cleaned.length - 10);
      const rest = cleaned.substring(cleaned.length - 10);
      const part1 = rest.substring(0, 3);
      const part2 = rest.substring(3, 7);
      const part3 = rest.substring(7);
      return `+${countryCode} ${part1} ${part2} ${part3}`;
    }
    return `+${cleaned}`;
  }

  /**
   * Hole Channel Icon
   */
  getChannelIcon(chat: any): string {
    return this.isWhatsAppChat(chat) ? '💬' : '📱';
  }

  /**
   * Hole Channel Name
   */
  getChannelName(chat: any): string {
    return this.isWhatsAppChat(chat) ? 'WhatsApp' : 'Website';
  }

  /**
   * Prüfe ob File-Upload erlaubt ist
   */
  canUploadFiles(chat: any): boolean {
    return this.isWhatsAppChat(chat);
  }

  /**
   * Hole Icon für WhatsApp Message Type
   */
  getMessageTypeIcon(messageType: string): string {
    const typeMap: { [key: string]: string } = {
      'whatsapp_text': 'message',
      'whatsapp_image': 'image',
      'whatsapp_document': 'description',
      'whatsapp_video': 'videocam',
      'whatsapp_audio': 'mic',
      'whatsapp_voice': 'record_voice_over',
      'whatsapp_location': 'location_on',
      'whatsapp_contacts': 'contacts',
      'whatsapp_sticker': 'emoji_emotions',
      'whatsapp_button': 'smart_button',
      'whatsapp_list': 'list',
      'whatsapp_template': 'article'
    };
    return typeMap[messageType] || 'chat';
  }

  logout() {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    this.cdRef.markForCheck();

    this.authService.logout().pipe(
      finalize(() => {
        this.isLoggingOut = false;
        this.cdRef.markForCheck();
      })
    ).subscribe({
      next: () => {
        // Navigation wird bereits im AuthService durchgeführt
      },
      error: (error: any) => {
        console.error('Error logging out:', error);
        this.snackBar.open('Abmelden fehlgeschlagen. Bitte erneut versuchen.', 'Schließen', {
          duration: 3000
        });
      }
    });
  }

  // Dark Mode Toggle - übernommen aus Navbar
  toggleDarkMode() {
    this.themeService.toggleDarkMode();
  }

  // Staff Management Methods
  toggleStaffManagement(): void {
    this.showStaffManagement = !this.showStaffManagement;
  }

  closeStaffManagement(): void {
    this.showStaffManagement = false;
  }

  toggleOfferManagement(): void {
    this.showOfferManagement = !this.showOfferManagement;
  }

  closeOfferManagement(): void {
    this.showOfferManagement = false;
  }

  toggleAppointmentManagement(): void {
    this.showAppointmentManagement = !this.showAppointmentManagement;
  }

  closeAppointmentManagement(): void {
    this.showAppointmentManagement = false;
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  getFullProfileImageUrl(imageUrl: string | null | undefined): string | null {
    if (!imageUrl) {
      return null;
    }
    
    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it's a relative path or starts with /storage, prepend the backend URL
    if (imageUrl.startsWith('/storage') || !imageUrl.startsWith('/')) {
      return `http://localhost:8000${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }
    
    return imageUrl;
  }

  private loadProfileImage(): void {
    this.userManagementService.getProfile().subscribe({
      next: (profile) => {
        this.currentAgent.profile_image_url = profile.profile_image_url || '';
      },
      error: (error) => {
        console.warn('Could not load profile image:', error);
        // Fallback to default avatar if profile loading fails
        this.currentAgent.profile_image_url = '';
      }
    });
  }

  private buildChatFromResponse(chat: any): Chat {
    const sessionId: string = (chat.session_id ?? chat.id ?? '').toString();
    const isSelected = this.selectedChat?.id === sessionId;
    const { name, firstName, lastName } = this.resolveCustomerName(chat);
    const emailFromChat = chat.customer_email || chat.visitor?.email || this.visitorEmailCache.get(sessionId) || '';

    if (sessionId && emailFromChat) {
      this.visitorEmailCache.set(sessionId, emailFromChat);
    }

    const messages: Message[] = Array.isArray(chat.messages)
      ? chat.messages.map((msg: any) => ({
          id: msg.id || `${Date.now()}-${Math.random()}`,
          content: msg.text || '',
          timestamp: new Date(msg.timestamp || Date.now()),
          isAgent: msg.from === 'agent',
          isBot: msg.from === 'bot',
          read: isSelected ? true : (msg.read || false),
          from: msg.from,
          message_type: msg.message_type,
          metadata: msg.metadata,
          attachment: this.resolveAttachment(msg)
        }))
      : [];

    const defaultAvatar = chat.channel === 'whatsapp'
      ? 'assets/whatsapp-avatar.svg'
      : 'assets/default-avatar.svg';

    return {
      id: sessionId,
      chatId: chat.chat_id || '',
      customerName: name,
      customerFirstName: firstName,
      customerLastName: lastName,
      customerPhone: chat.customer_phone || '',
      customerEmail: emailFromChat,
      customerAvatar: chat.customer_avatar || defaultAvatar,
      lastMessage: chat.last_message || '',
      lastMessageTime: new Date(chat.last_message_time || Date.now()),
      unreadCount: isSelected ? 0 : (chat.unread_count || 0),
      isOnline: chat.is_online || false,
      last_activity: chat.last_activity || null,
      lastOnline: chat.last_activity ? new Date(chat.last_activity) : undefined,
      messages,
      status: chat.status || '',
      assigned_agent: chat.assigned_agent || '',
      assigned_to: chat.assigned_to,
      channel: chat.channel || 'website',
      whatsapp_number: chat.whatsapp_number || null,
      isNew: chat.status === 'human' && !chat.assigned_agent,
      visitor: chat.visitor ? {
        first_name: chat.visitor.first_name,
        last_name: chat.visitor.last_name,
        email: chat.visitor.email || '',
        phone: chat.visitor.phone || ''
      } : undefined,
      archived_at: chat.archived_at || null
    };
  }

  private resolveCustomerName(chat: any): { name: string; firstName: string; lastName: string } {
    const firstName = chat.customer_first_name || chat.visitor?.first_name || '';
    const lastName = chat.customer_last_name || chat.visitor?.last_name || '';
    let name = chat.customer_name;

    if (!name || name === 'Anonymer Benutzer') {
      const combined = `${firstName} ${lastName}`.trim();
      name = combined || 'Anonymer Benutzer';
    }

    return {
      name,
      firstName: firstName || '',
      lastName: lastName || ''
    };
  }

  private resolveAttachment(messageData: any): any | undefined {
    if (!messageData) {
      return undefined;
    }
    return messageData.attachment || messageData.attachments?.[0];
  }

  private hydrateVisitorDetails(rawChats: any[]): void {
    const sessionIds = Array.from(new Set(
      rawChats
        .filter(chat => chat?.session_id && chat.channel !== 'whatsapp')
        .filter(chat => {
          const sessionIdStr = String(chat.session_id);
          const hasCachedEmail = this.visitorEmailCache.has(sessionIdStr);
          const hasEmail = Boolean(chat.customer_email || chat.visitor?.email || hasCachedEmail);
          const hasName = Boolean(chat.customer_first_name || chat.customer_last_name || chat.customer_name) ||
                          Boolean(chat.visitor?.first_name || chat.visitor?.last_name);
          return !hasEmail || !hasName;
        })
        .map(chat => String(chat.session_id))
    ));

    if (!sessionIds.length) {
      return;
    }

    const requests = sessionIds.map(sessionIdStr =>
      this.chatbotService.getVisitorDetails(sessionIdStr).pipe(
        catchError(() => of(null)),
        tap(visitor => {
          if (visitor) {
            const fallbackName = this.activeChats.find(chat => chat.id === sessionIdStr)?.customerName ?? 'Anonymer Benutzer';
            const displayName = this.resolveVisitorDisplayName(visitor, fallbackName);

            if (visitor.email) {
              this.visitorEmailCache.set(sessionIdStr, visitor.email);
            }

            this.activeChats = this.activeChats.map(chat =>
              chat.id === sessionIdStr
                ? {
                    ...chat,
                    customerName: displayName,
                    customerFirstName: visitor.first_name || chat.customerFirstName,
                    customerLastName: visitor.last_name || chat.customerLastName,
                    customerEmail: visitor.email || chat.customerEmail,
                    visitor: {
                      first_name: visitor.first_name,
                      last_name: visitor.last_name,
                      email: visitor.email,
                      phone: visitor.phone
                    }
                  }
                : chat
            );

            const updatedChat = this.activeChats.find(chat => chat.id === sessionIdStr);
            if (updatedChat) {
              this.filteredActiveChats = this.filteredActiveChats.map(chat =>
                chat.id === sessionIdStr ? updatedChat : chat
              );
            }
          }
        })
      )
    );

    if (!requests.length) {
      return;
    }

    forkJoin(requests).subscribe({
      next: () => {
        this.filterChats();
        this.cdRef.markForCheck();
      }
    });
  }

  private resolveVisitorDisplayName(visitor: any, fallback: string): string {
    const first = visitor?.first_name ?? '';
    const last = visitor?.last_name ?? '';
    const full = `${first} ${last}`.trim();
    return full || fallback || 'Anonymer Benutzer';
  }
}

interface Chat {
  id: string | number;  // ✅ Allow both string (session_id) and number (WhatsApp chat id)
  chatId: string;
  customerName: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone?: string;
  customerEmail?: string;  // ✅ FIX: Email direkt im Chat-Objekt für instant Anzeige
  customerAvatar: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
  lastOnline?: Date;
  last_activity?: string;  // ✅ ISO 8601 Timestamp für Zuletzt-Online-Status
  messages: Message[];
  assigned_to?: number | null;
  status: string;
  assigned_agent?: string;
  isNew?: boolean;
  channel?: string;
  whatsapp_number?: string;
  visitor?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  updated_at?: string;
  created_at?: string;
  archived_at?: string | null;
}

interface Message {
  id: string;
  clientMessageId?: string;
  content: string;
  timestamp: Date;
  isAgent: boolean;
  isBot: boolean;
  read: boolean;
  from?: string;
  message_type?: string;
  metadata?: any;
  attachment?: {
    id: number;
    file_name: string;
    file_type: string;
    file_size: number;
    download_url: string;
  };
  isOptimistic?: boolean; // ✅ Markierung für optimistische Nachrichten
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
