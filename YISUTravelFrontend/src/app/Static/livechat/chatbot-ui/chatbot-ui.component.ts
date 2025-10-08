import {
  AfterViewInit, ChangeDetectorRef,
  Component,
  effect,
  ElementRef,
  Inject, NgZone,
  PLATFORM_ID,
  signal,
  viewChild
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { animate, style, transition, trigger } from "@angular/animations";
import { MatButton, MatIconButton } from "@angular/material/button";
import {DatePipe, isPlatformBrowser, NgSwitch} from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatInput } from "@angular/material/input";
import {ChatbotService} from "../../../Services/chatbot-service/chatbot.service";
import {AuthService} from "../../../Services/AuthService/auth.service";
import {interval, Subscription} from "rxjs";
import {PusherService} from "../../../Services/Pusher/pusher.service";
import {MatCheckbox} from "@angular/material/checkbox";
import {RouterLink} from "@angular/router";
import {VisitorNotificationService} from "../../../Services/notification-service/visitor-notification.service";

@Component({
  selector: 'app-chatbot-ui',
  standalone: true,
  imports: [MatIconModule, MatButton, DatePipe, FormsModule, MatIconButton, MatInput, MatCheckbox, RouterLink, NgSwitch],
  templateUrl: './chatbot-ui.component.html',
  styleUrl: './chatbot-ui.component.css',
  animations: [
    trigger('windowAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(20px)', opacity: 0 }))
      ])
    ])
  ]
})
export class ChatUiComponent implements AfterViewInit {
  // State signals
  isOpen = signal(false);
  unreadMessages = signal(0);
  isTyping = signal(false);
  inputMessage = signal('');
  showScrollButton = signal(false);

  //Prüfe, ob Nutzer gerade im Buchungsprozess ist
  isInBookingProcess = signal(false);


  // ✅ Neue Properties für Escalation Prompt Features
  showEscalationOptions = signal(false);
  currentEscalationPrompt = signal<any>(null);



  // ✅ Assignment Status Tracking
  chatAssignmentStatus = signal<any>(null);
  assignedAgentName = signal<string>('');


  private pusherSubscription?: { stop: () => void };
  private messageQueue: {content: string, resolve: Function, reject: Function}[] = [];
  private isProcessing = false;
  isAuthenticated = false;
  private authSub!: Subscription;
  private refreshSub!: Subscription;
  //private pusherSubscription: any;
  isEscalated = signal(false);
  chatStatus = signal<'bot' | 'waiting' | 'human' | 'in_progress'>('bot');
  // Template references
  showQuickQuestions = signal(false);
  messageContainer = viewChild<ElementRef>('messageContainer');
  inputField = viewChild<ElementRef>('inputField');
  sessionId: string | null = null;
  showEscalationPrompt = signal(false);
 // messageCountForEscalation = 0;
  // Data
  messages = signal<any[]>([]);
  quickQuestions = signal([
    'Was sind Ihre Öffnungszeiten?',
    'Ich möchte eine Reise buchen',
    'Wie kann ich Sie kontaktieren?'
  ]);
  showCloseConfirmationInChat  = signal(false);
  currentChatId = signal<string | null>(null);
  cachedAgentName = signal<string>('');

  // Neue Signale für den Kontaktinformationsfluss
  contactFlowActive = signal(false);
  currentContactStep = signal<'first_name' | 'last_name' | 'email' | 'phone' | null>(null);
  contactInfo = signal({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  showAgentConnection = signal(false);
  // Besucher registrieren
  isRegistered = signal(false);
  showRegistrationForm = signal(false);
  registrationForm = signal({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    agb_accepted: false
  });
  registrationError = signal('');

  // SSR browser check
  isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private pusherService: PusherService,
    private ngZone: NgZone,
    private cdRef: ChangeDetectorRef,
    public visitorNotification: VisitorNotificationService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      effect(() => {
        const messages = this.messages();
        const isTyping = this.isTyping();
        const isOpen = this.isOpen();

        if (isOpen && (messages.length > 0 || !isTyping)) {
          queueMicrotask(() => {
            this.scrollToBottom();
            this.checkScrollPosition();
          });
        }

        // ✅ Verbesserte Tab-Title Logik mit Null-Checks und Original-Titel
        if (!isOpen && messages && messages.length > 0) {
          const unreadCount = this.unreadMessages();
          if (unreadCount > 0 && document) {
            // ✅ Zeige Unread-Counter im Tab-Titel wenn Chat geschlossen
            document.title = `(${unreadCount}) YISU Travel GmbH`;
          } else if (document) {
            // ✅ Kein Unread-Counter, zurück zum Original-Titel
            document.title = 'YISU Travel GmbH';
          }
        } else if (isOpen && document) {
          // ✅ Chat ist offen: Zeige "Chat - Yisu Travel" und reset Counter
          document.title = 'Chat - Yisu Travel';
          this.unreadMessages.set(0);
        } else if (!isOpen && document) {
          // ✅ Chat geschlossen, keine Nachrichten: Original-Titel
          document.title = 'YISU Travel GmbH';
        }
      });
    }
  }

  handleEscalationResponse(response: 'accept' | 'decline', metadata: any): void {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      console.error('No session ID found for escalation response');
      this.messages.update(m => [...m, {
        from: 'bot',
        text: 'Sitzungsfehler. Bitte starten Sie den Chat neu.',
        timestamp: new Date()
      }]);
      return;
    }

    console.log('Handling escalation response:', {
      response,
      metadata,
      sessionId
    });

    // UI sofort aktualisieren
    this.showEscalationOptions.set(false);
    this.currentEscalationPrompt.set(null);

    // User-Response als Nachricht hinzufügen
    const responseText = response === 'accept' ? 'Ja, gerne' : 'Nein, danke';
    this.messages.update(m => [...m, {
      from: 'user',
      text: responseText,
      timestamp: new Date()
    }]);

    this.isTyping.set(true);

    // Payload für Backend vorbereiten - Korrigierte Struktur
    const payload: any = {
      session_id: sessionId,
      response: response
    };

    const promptId = metadata?.escalation_prompt_id || metadata?.prompt_id;
    if (promptId) {
      payload.prompt_id = String(promptId);
    }


    console.log('Sending escalation response to backend:', payload);

    // Backend-Call mit korrigiertem Payload
    this.chatbotService.handleEscalationPromptResponse(payload).subscribe({
      next: (result) => {
        console.log('Escalation response processed successfully:', result);
        this.isTyping.set(false);

        if (response === 'accept') {
          // Status auf 'human' setzen für sofortiges Feedback
          this.chatStatus.set('human');
          this.isEscalated.set(true);

          // Pusher Listener neu einrichten für Echtzeit-Kommunikation
          this.setupPusherListener();

          // ✅ NEU: Benachrichtigungen aktivieren wenn Kunde auf "Ja" klickt
          this.requestNotificationPermission();
        }

        /*
        // Bot-Response hinzufügen
        if (result.message) {
          this.messages.update(m => [...m, {
            from: 'bot',
            text: result.message,
            timestamp: new Date()
          }]);
        }*/

        // Bei Akzeptierung: Chat-Status überwachen für Agent-Zuweisung
        // ✅ "Bitte warten"-Nachricht wird jetzt vom Backend gesendet
        if (response === 'accept') {
          this.monitorChatStatus();
        }

        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Error handling escalation response:', err);
        this.isTyping.set(false);

        // Fehlermeldung basierend auf Fehlertyp
        let errorMessage = 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.';

        if (err.status === 422) {
          errorMessage = 'Validierungsfehler. Bitte starten Sie den Chat neu.';
        } else if (err.status === 404) {
          errorMessage = 'Chat nicht gefunden. Bitte starten Sie eine neue Unterhaltung.';
        } else if (err.status >= 500) {
          errorMessage = 'Serverfehler. Bitte versuchen Sie es später erneut.';
        }

        this.messages.update(m => [...m, {
          from: 'bot',
          text: errorMessage,
          timestamp: new Date()
        }]);

        // Optionen wieder anzeigen bei Fehler
        this.showEscalationOptions.set(true);
        this.currentEscalationPrompt.set(metadata);

        this.scrollToBottom();
      }
    });
  }

  ngOnInit() {
    // ✅ Tab-Titel auf Original setzen beim Laden
    if (this.isBrowser && document) {
      document.title = 'YISU Travel GmbH';
    }

    // Session ID initialisieren oder laden
    this.sessionId = localStorage.getItem('session_id');
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
      localStorage.setItem('session_id', this.sessionId);
    }

    // ✅ WICHTIG: Pusher Listener sofort einrichten (vor Auth-Check)
    console.log('Initializing Pusher listeners on component init...');
    this.setupPusherListener();

    this.authSub = this.authService.getAuthenticated().subscribe(auth => {
      this.isAuthenticated = auth;

      if (!this.isAuthenticated) {
        this.checkRegistrationStatus();
      } else {
        this.loadChatHistory();
      }

      const storedChatId = localStorage.getItem('current_chat_id');
      if (storedChatId) {
        this.currentChatId.set(storedChatId);
      }
    });

    // Notification Permission Status überwachen
    this.visitorNotification.permissionStatus.subscribe(status => {
      if (status.granted) {
        console.log('✅ Visitor notifications enabled');
      }
    });
  }

  private handleChatAssigned(agentName: string) {
    this.assignedAgentName.set(agentName);
    this.showAgentConnection.set(true);
    // Nicht bei jeder Nachricht neu setzen
  }
  private checkRegistrationStatus(): void {
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
      localStorage.setItem('session_id', this.sessionId);
      this.showRegistrationForm.set(true);
      this.showQuickQuestions.set(false);
      return;
    }

    this.chatbotService.checkVisitorRegistration(this.sessionId).subscribe({
      next: (response) => {
        if (response.registered) {
          this.isRegistered.set(true);
          this.loadChatHistory();
        } else {
          this.showRegistrationForm.set(true);
          this.showQuickQuestions.set(false);
        }
      },
      error: (err) => {
        console.error('Error checking registration:', err);
        this.showRegistrationForm.set(true);
        this.showQuickQuestions.set(false);
      }
    });
  }


  private resetRegistration(): void {
    this.registrationForm.set({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      agb_accepted: false
    })
  }

  submitRegistration(): void {
    if (!this.registrationForm().agb_accepted) {
      this.registrationError.set('Bitte akzeptieren Sie die AGB');
      return;
    }

    // Validierung der Eingabefelder
    const form = this.registrationForm();
    if (!form.first_name || !form.last_name || !form.email || !form.phone) {
      this.registrationError.set('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    // E-Mail-Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      this.registrationError.set('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    // Telefonnummer-Validierung (einfache Prüfung)
    const phoneRegex = /^[0-9+\s\(\)\-]{6,20}$/;
    if (!phoneRegex.test(form.phone)) {
      this.registrationError.set('Bitte geben Sie eine gültige Telefonnummer ein');
      return;
    }

    this.registrationError.set('');
    this.isTyping.set(true);

    // Session ID sicherstellen
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
      localStorage.setItem('session_id', this.sessionId);
    }

    this.chatbotService.registerVisitor({
      session_id: this.sessionId!,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      agb_accepted: form.agb_accepted
    }).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);

        this.isTyping.set(false);
        this.isRegistered.set(true);
        this.showRegistrationForm.set(false);

        // ✅ WICHTIG: Pusher Listener nach erfolgreicher Registrierung einrichten
        if (this.sessionId) {
          console.log('Setting up Pusher listeners after registration...');
          this.setupPusherListener();
        }

        // Chat-Historie laden falls vorhanden
        this.loadChatHistory();

        // Willkommensnachricht anzeigen
        this.messages.set([{
          from: 'bot',
          text: `Vielen Dank für Ihre Registrierung, ${form.first_name}! Wie kann ich Ihnen helfen?`,
          timestamp: new Date()
        }]);

        // Quick Questions anzeigen
        this.showQuickQuestions.set(true);

        // Scroll to bottom nach kurzer Verzögerung
        setTimeout(() => {
          this.scrollToBottom();

          // Focus auf Input-Feld setzen
          const inputField = this.inputField();
          if (inputField) {
            inputField.nativeElement.focus();
          }
        }, 100);

        // Optional: Visitor-Daten für spätere Verwendung speichern
        this.contactInfo.set({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone
        });

      },
      error: (err) => {
        console.error('Registration error:', err);
        this.isTyping.set(false);

        // Spezifische Fehlermeldungen basierend auf dem Fehlercode
        if (err.status === 422) {
          // Validierungsfehler vom Backend
          const errors = err.error.errors;
          if (errors) {
            const firstError = Object.values(errors)[0];
            this.registrationError.set(Array.isArray(firstError) ? firstError[0] : 'Validierungsfehler');
          } else {
            this.registrationError.set('Die eingegebenen Daten sind ungültig. Bitte überprüfen Sie Ihre Eingaben.');
          }
        } else if (err.status === 409) {
          // Konflikt - möglicherweise bereits registriert
          this.registrationError.set('Diese E-Mail-Adresse oder Telefonnummer ist bereits registriert.');
        } else if (err.status === 0) {
          // Netzwerkfehler
          this.registrationError.set('Keine Verbindung zum Server. Bitte überprüfen Sie Ihre Internetverbindung.');
        } else {
          // Allgemeiner Fehler
          this.registrationError.set('Fehler bei der Registrierung. Bitte versuchen Sie es später erneut.');
        }

        // Fehler-Log für Debugging
        console.error('Registration failed:', {
          status: err.status,
          error: err.error,
          message: err.message
        });
      }
    });
  }

  setupPusherListener() {
    if (this.pusherSubscription) {
      this.pusherSubscription.stop();
    }

    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      console.error('No session ID found for Pusher listener');
      return;
    }

    console.log('Setting up Pusher listener for session:', sessionId);

    // ✅ WICHTIG: Escalation Listener ZUERST einrichten
    this.pusherService.listenToChannel(
      `chat.${sessionId}`,
      'escalation.prompt.sent',
      (data: any) => {
        console.log('📢 Escalation prompt received from agent:', data);
        this.ngZone.run(() => {
          if (data.message && data.escalation_prompt) {
            // Escalation Options anzeigen
            this.showEscalationOptions.set(true);
            this.currentEscalationPrompt.set({
              prompt_id: data.message.metadata?.escalation_prompt_id || null,
              is_manual: true,
              is_automatic: false,
              options: data.message.metadata?.options || [
                { text: 'Ja, gerne', value: 'accept' },
                { text: 'Nein, danke', value: 'decline' }
              ]
            });

            // Nachricht zum Chat hinzufügen
            const messageTimestamp = new Date(data.message.created_at || new Date());
            if (!this.isMessageDuplicate(data.message.text, 'bot', messageTimestamp)) {
              this.messages.update(m => [...m, {
                from: 'bot',
                text: data.message.text,
                timestamp: messageTimestamp,
                message_type: 'escalation_prompt',
                metadata: data.message.metadata
              }]);
            }

            // Optional: Benachrichtigung
            if (this.visitorNotification.areNotificationsEnabled) {
              this.visitorNotification.notifySystemMessage(
                'Anfrage vom Support',
                'Ein Mitarbeiter möchte wissen, ob Sie Hilfe benötigen'
              );
            }

            this.scrollToBottom();
            this.cdRef.detectChanges();
          }
        });
      }
    );

    // Message Received Listener
    this.pusherSubscription = this.pusherService.listenToChannel(
      `chat.${sessionId}`,
      'message.received',
      (data: any) => {
        console.log('🔄 Raw Pusher data received:', {
          channel: `chat.${sessionId}`,
          data: data,
          messageFrom: data.message?.from,
          messageText: data.message?.text
        });

        this.ngZone.run(() => {
          if (data.message?.session_id === sessionId) {
            console.log('✅ Processing message for correct session');
            this.handleIncomingMessage(data);
          } else {
            console.warn('❌ Message for different session, ignoring');
          }
        });
      }
    );

    // Assignment-Event Listener
    this.pusherService.listenToChannel(
      `chat.${sessionId}`,
      'chat.assigned',
      (data: any) => {
        console.log('🎯 Chat assigned event:', data);
        this.ngZone.run(() => {
          this.chatAssignmentStatus.set({
            is_assigned: true,
            assigned_to: data.assigned_to,
            assigned_agent_name: data.agent_name
          });
          this.assignedAgentName.set(data.agent_name || '');
          this.showAgentConnection.set(true);

          // ✅ Set chat ID from assignment
          if (data.chat_id) {
            console.log('Setting chat ID from chat.assigned event:', data.chat_id);
            this.currentChatId.set(data.chat_id);
            localStorage.setItem('current_chat_id', data.chat_id);
          }

          // ✅ IMPORTANT: Update chat status to allow file uploads
          if (data.status) {
            console.log('Setting chat status from chat.assigned event:', data.status);
            this.chatStatus.set(data.status);
            if (data.status === 'human' || data.status === 'in_progress') {
              this.isEscalated.set(true);
            }
          } else {
            // Fallback: If no status provided, set to in_progress when agent is assigned
            console.log('No status in chat.assigned, defaulting to in_progress');
            this.chatStatus.set('in_progress');
            this.isEscalated.set(true);
          }

          console.log('✅ Chat assigned complete:', {
            agent: data.agent_name,
            chat_id: this.currentChatId(),
            status: this.chatStatus(),
            can_upload: this.chatStatus() === 'human' || this.chatStatus() === 'in_progress'
          });

          // ✅ NOTIFICATION: Nur wenn explizit aktiviert
          if (data.agent_name && this.visitorNotification.areNotificationsEnabled) {
            console.log('Sending agent assigned notification...');
            this.visitorNotification.notifyAgentAssigned(data.agent_name);
          } else {
            console.log('Agent assigned notification skipped - not enabled');
          }
        });
      }
    );

    // ✅ Transfer-Event Listener
    this.pusherService.listenToChannel(
      `chat.${sessionId}`,
      'chat.transferred',
      (data: any) => {
        console.log('🔄 Chat transferred event:', data);
        this.ngZone.run(() => {
          this.assignedAgentName.set(data.to_agent_name || '');
          // ✅ ENTFERNT: Lokale Transfer-Nachricht nicht mehr hinzufügen
          // Das Backend sendet bereits eine vollständige Transfer-Nachricht via Pusher

          // ✅ NOTIFICATION: Nur wenn explizit aktiviert
          if (data.to_agent_name && this.visitorNotification.areNotificationsEnabled) {
            console.log('Sending agent transfer notification...');
            this.visitorNotification.notifyAgentAssigned(data.to_agent_name);
          } else {
            console.log('Agent transfer notification skipped - not enabled');
          }
        });
      }
    );

    // Chat Status Changed Listener
    this.pusherService.listenToChannel(
      `chat.${sessionId}`,
      'chat.status.changed',
      (data: any) => {
        console.log('📊 Chat status changed:', data);
        this.ngZone.run(() => {
          if (data.new_status) {
            this.chatStatus.set(data.new_status);
            if (data.new_status === 'human') {
              this.isEscalated.set(true);
            }
          }
        });
      }
    );

    // Chat Ended Listener
    this.pusherService.listenToChannel(
      `chat.${sessionId}`,
      'chat.ended',
      (data: any) => {
        console.log('🔚 Chat ended event:', data);
        this.ngZone.run(() => {
          this.chatStatus.set('bot');
          this.isEscalated.set(false);
          this.showAgentConnection.set(false);
          this.assignedAgentName.set('');
          this.chatAssignmentStatus.set(null);

          if (data.ended_by === 'agent') {
            this.messages.update(m => [...m, {
              from: 'system',
              text: 'Der Mitarbeiter hat den Chat beendet.',
              timestamp: new Date(),
              isSystemMessage: true
            }]);
          }
        });
      }
    );

    console.log('✅ All Pusher listeners set up successfully for session:', sessionId);
  }




  private checkChatStatus() {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) return;

    this.chatbotService.getChatStatus(sessionId).subscribe({
      next: (response) => {
        if (response.status === 'human' && this.chatStatus() !== 'human') {
          this.chatStatus.set('human');
          this.isEscalated.set(true);
          this.setupPusherListener(); // Listener neu einrichten
        }
      },
      error: (err) => console.error('Error checking chat status:', err)
    });
  }



  ngOnDestroy() {
    if (this.pusherSubscription) {
      this.pusherSubscription.stop();
    }

    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }




  ngAfterViewInit() {
    if (this.isBrowser) {
      const container = this.messageContainer()?.nativeElement;
      if (container) {
        container.addEventListener('scroll', () => this.checkScrollPosition());
      }
    }
  }

  private initializeChatState() {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) return;

    this.chatbotService.getChatStatus(sessionId).subscribe({
      next: (status) => {
        this.ngZone.run(() => {
          this.chatStatus.set(status.status);
          this.isEscalated.set(status.status === 'human');

          if (status.status === 'human') {
            this.currentChatId.set(status.chat_id);
            localStorage.setItem('current_chat_id', status.chat_id);
            this.setupPusherListener();
          }
        });
      },
      error: (err) => console.error('Statusabfrage fehlgeschlagen:', err)
    });
  }

  confirmCloseChat() {
    this.showRegistrationForm.set(true);
    this.showCloseConfirmationInChat.set(false);
    this.showQuickQuestions.set(false);
    this.endChat()
  }

  cancelCloseChat() {
    this.showCloseConfirmationInChat.set(false);
  }

  onCloseClicked() {
    this.showCloseConfirmationInChat.set(true);
    this.scrollToBottom();
  }



  loadChatHistory() {
    const sessionId = localStorage.getItem('session_id');
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
      localStorage.setItem('session_id', this.sessionId);
      return;
    }
    if (sessionId) {
      this.chatbotService.getChatHistory(sessionId).subscribe({
        next: (response) => {
          console.log('📚 Chat history loaded:', response);
          if (response.messages) {
            this.messages.set(response.messages.map((msg: any) => ({
              from: msg.from,
              text: msg.text,
              timestamp: new Date(msg.timestamp || Date.now()),
              message_type: msg.message_type,
              metadata: msg.metadata,
              attachment: msg.has_attachment ? msg.attachment : undefined
            })));
            console.log('Messages with attachments:', this.messages().filter(m => m.attachment));

            // ✅ WICHTIG: Escalation-Prompt erkennen und Buttons anzeigen
            const escalationPrompt = response.messages.find((msg: any) =>
              msg.message_type === 'escalation_prompt' && msg.metadata?.is_automatic
            );

            if (escalationPrompt) {
              console.log('🚨 Escalation prompt found in history, showing buttons');
              this.showEscalationOptions.set(true);
              this.currentEscalationPrompt.set({
                prompt_id: escalationPrompt.metadata?.escalation_prompt_id || null,
                is_automatic: true,
                is_manual: false,
                options: escalationPrompt.metadata?.options || [
                  { text: 'Ja, gerne', value: 'accept' },
                  { text: 'Nein, danke', value: 'decline' }
                ]
              });
            }
          }
        },
        error: (err) => console.error('Error loading chat history:', err)
      });
    }
  }


  // In chatbot-ui.component.ts
  endChat() {
    this.showEscalationPrompt.set(false);
    this.isInBookingProcess.set(false);

    this.chatbotService.endChatByUser().subscribe({
      next: (response) => {
        // ✅ WICHTIG: Notifications deaktivieren
        this.visitorNotification.disableNotifications();

        this.messages.set([]);
        localStorage.setItem('session_id', response.new_session_id);
        this.sessionId = response.new_session_id;
        this.chatStatus.set('bot');
        this.showQuickQuestions.set(true);
        this.resetRegistration();
        this.showRegistrationForm.set(true);
        this.isEscalated.set(false);
        this.isRegistered.set(false);
        this.currentChatId.set(null);
        localStorage.removeItem('current_chat_id');
        this.chatAssignmentStatus.set(null);
        this.assignedAgentName.set('');
        this.unreadMessages.set(0);
        document.title = 'Chat - YISU Travel';
        this.scrollToBottom();

        console.log('✅ Chat ended, notifications disabled');
      },
      error: (err) => {
        console.error('Fehler:', err);
        this.messages.update(m => [...m, {
          from: 'bot',
          text: 'Momentan haben Sie keine aktive Sitzung.',
          timestamp: new Date()
        }]);
      }
    });
  }

  private generateSessionId(): string {
    // UUID v4 Generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  toggleChat() {
    this.isOpen.update(v => !v);
    this.chatbotService.setChatOpenState(this.isOpen());

    if (this.isOpen()) {
      // ✅ Chat öffnen
      this.unreadMessages.set(0);
      document.title = 'Chat - Yisu Travel';
      this.loadChatHistory();
    } else {
      // ✅ Chat schließen - Titel zurücksetzen
      if (this.unreadMessages() > 0) {
        // Mit Unread-Counter
        document.title = `(${this.unreadMessages()}) YISU Travel GmbH`;
      } else {
        // Ohne Unread-Counter
        document.title = 'YISU Travel GmbH';
      }
    }
  }
  testVisitorNotifications(): void {
    console.log('Testing visitor notifications...');
    console.log('Current notification status:', {
      areEnabled: this.visitorNotification.areNotificationsEnabled,
      hasPermission: this.visitorNotification.hasPermission,
      isVisible: this.visitorNotification.isVisible
    });

    if (!this.visitorNotification.areNotificationsEnabled) {
      console.log('❌ Notifications not enabled. Please request human support first.');
      alert('Benachrichtigungen sind nicht aktiviert. Bitte drücken Sie erst "Mit Mitarbeiter sprechen".');
      return;
    }

    this.visitorNotification.testNotification();
  }

  onAnimationDone() {
    this.scrollToBottom();
    this.inputField()?.nativeElement.focus();
  }


  async sendMessage(message?: string) {
    if (!this.isAuthenticated && !this.isRegistered()) {
      this.showRegistrationForm.set(true);
      return;
    }

    this.showQuickQuestions.set(false);
    const msg = message || this.inputMessage().trim();
    if (!msg) return;

    if (!message) this.inputMessage.set('');

    // ✅ Human-Chat: Wie bisher
    if (this.chatStatus() === 'human') {
      this.messages.update(m => [...m, {
        from: 'user',
        text: msg,
        timestamp: new Date()
      }]);

      await this.sendToAgent(msg);
      return;
    }

    if (this.contactFlowActive()) {
      this.handleContactFlow(msg);
      return;
    }

    // ✅ Bot-Chat: Lokale Nachrichten hinzufügen
    this.isTyping.set(true);

    const userMessage = {
      from: 'user',
      text: msg,
      timestamp: new Date()
    };

    const sendMethod = this.isAuthenticated ?
        this.chatbotService.sendMessage(msg) :
        this.chatbotService.sendMessageAnonymous(msg);

    sendMethod.subscribe({
      next: (response) => {
        this.isTyping.set(false);

        if (response.is_in_booking_process !== undefined) {
          this.isInBookingProcess.set(response.is_in_booking_process);
        }

        // ✅ Wenn Chat reaktiviert wurde, ALLE Nachrichten aus Response verwenden (inkl. User-Nachricht)
        if (response.chat_reactivated && response.new_messages) {
          response.new_messages.forEach((msg: any) => {
            const timestamp = new Date(msg.timestamp || Date.now());
            this.messages.update(m => [...m, {
              from: msg.from,
              text: msg.text,
              timestamp: timestamp,
              message_type: msg.message_type
            }]);
          });
        } else {
          // Normal: User-Nachricht hinzufügen
          this.messages.update(m => [...m, userMessage]);
        }

        if (response.status === 'human') {
          this.chatStatus.set('human');
          this.isEscalated.set(true);
          this.setupPusherListener();
          this.monitorChatStatus();

          if (response.new_messages) {
            response.new_messages.forEach((msg: any) => {
              const timestamp = new Date(msg.timestamp || Date.now());

              if (!this.isMessageDuplicate(msg.text, msg.from, timestamp)) {
                this.messages.update(m => [...m, {
                  from: msg.from,
                  text: msg.text,
                  timestamp: timestamp
                }]);
              }
            });
          }
          this.scrollToBottom();
          return;
        }

        // ✅ WICHTIG: Bot-Nachrichten direkt hinzufügen (nur wenn NICHT reaktiviert)
        // Bei Reaktivierung wurden alle Nachrichten bereits oben hinzugefügt
        if (!response.chat_reactivated && response.new_messages && response.new_messages.length > 0) {
          response.new_messages.forEach((msg: any) => {
            const timestamp = new Date(msg.timestamp || Date.now());

            // Skip User-Message (bereits hinzugefügt)
            if (msg.from === 'user') return;

            // ✅ WICHTIG: Escalation Prompt korrekt verarbeiten
            if (msg.message_type === 'escalation_prompt' || msg.metadata?.is_automatic) {
              this.showEscalationOptions.set(true);
              this.currentEscalationPrompt.set({
                prompt_id: msg.metadata?.escalation_prompt_id || null,
                is_automatic: true,
                is_manual: false,
                options: msg.metadata?.options || [
                  { text: 'Ja, gerne', value: 'accept' },
                  { text: 'Nein, danke', value: 'decline' }
                ]
              });

              // Nur einmal die Nachricht hinzufügen
              if (!this.isMessageDuplicate(msg.text, msg.from, timestamp)) {
                this.messages.update(m => [...m, {
                  from: msg.from,
                  text: msg.text,
                  timestamp: timestamp,
                  message_type: msg.message_type,
                  metadata: msg.metadata
                }]);
              }
            } else {
              // Normale Bot/Agent-Nachricht
              if (!this.isMessageDuplicate(msg.text, msg.from, timestamp)) {
                this.messages.update(m => [...m, {
                  from: msg.from,
                  text: msg.text,
                  timestamp: timestamp,
                  message_type: msg.message_type,
                  metadata: msg.metadata // ✅ WICHTIG: Metadata speichern (enthält agent_name)
                }]);
              }
            }
          });
        }

        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.isTyping.set(false);

        this.messages.update(m => [
          ...m,
          {
            from: 'bot',
            text: 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
            timestamp: new Date()
          }
        ]);

        this.scrollToBottom();
      }
    });
  }



  private handleIncomingMessage(data: any): void {
    this.ngZone.run(() => {
      const currentSessionId = localStorage.getItem('session_id');

      // Prüfe session_id nur wenn eine Message vorhanden ist
      // Assignment-Updates haben möglicherweise keine Message
      if (data.message && data.message.session_id !== currentSessionId) {
        return;
      }

      console.log('📨 Processing incoming message:', {
        from: data.message?.from,
        text: data.message?.text?.substring(0, 30) + '...',
        hasAttachment: data.message?.has_attachment,
        attachment: data.message?.attachment,
        hasAssignment: data.assigned_to !== undefined,
        assignedTo: data.assigned_to,
        agentName: data.agent_name,
        chatOpen: this.isOpen(),
        notificationsEnabled: this.visitorNotification.areNotificationsEnabled,
        chatStatus: this.chatStatus()
      });

      // ✅ WICHTIG: Bot-Nachrichten über Pusher nur in bestimmten Fällen verarbeiten
      // Normale Bot-Nachrichten kommen über HTTP-Response
      // ABER: escalation_reply und chat_farewell müssen über Pusher verarbeitet werden
      if (data.message?.from === 'bot') {
        const messageType = data.message?.message_type;

        // Diese Bot-Message-Types MÜSSEN über Pusher verarbeitet werden
        const allowedTypes = ['escalation_reply', 'chat_farewell', 'escalation_prompt'];

        if (!allowedTypes.includes(messageType)) {
          console.log('⚠️ Bot message received via Pusher - IGNORING (should come via HTTP only)');
          return; // Nur normale Bot-Nachrichten ignorieren
        }

        console.log('✅ Bot message with type', messageType, '- Processing via Pusher');
      }

      // Chat-Ende durch Agent (unverändert)
      if (data.message?.from === 'system') {
        const timestamp = new Date(data.message.created_at);

        // Prüfe ob es eine Chat-Ende Nachricht ist
        if (data.message.message_type === 'chat_ended_by_agent') {
          console.log('Chat ended by agent (system message):', data.message);

          // Status Updates
          this.chatStatus.set('bot');
          this.isEscalated.set(false);
          this.showAgentConnection.set(false);
          this.assignedAgentName.set('');
          this.chatAssignmentStatus.set(null);

          // Nachricht ist bereits vollständig mit Grund
          if (!this.isMessageDuplicate(data.message.text, 'system', timestamp)) {
            this.messages.update(currentMessages => [
              ...currentMessages,
              {
                from: 'system',
                text: data.message.text,  // Enthält bereits den Grund
                timestamp: timestamp,
                isSystemMessage: true,
                message_type: data.message.message_type,
                attachment: data.message.has_attachment ? data.message.attachment : undefined
              }
            ]);
          }

          // Notification mit Grund aus Metadata
          const closeReason = data.message.metadata?.close_reason;
          const agentName = data.message.metadata?.closed_by_agent_name || 'Der Mitarbeiter';
          const notificationMessage = closeReason
            ? `Chat beendet - ${closeReason}`
            : 'Der Mitarbeiter hat den Chat beendet';

          this.visitorNotification.notifySystemMessage(
            'Chat beendet',
            notificationMessage
          );

          // ✅ "Vielen Dank"-Nachricht wird jetzt vom Backend gesendet
          this.scrollToBottom();
          return; // Wichtig: Beende hier
        }

        // Andere System-Nachrichten normal verarbeiten
        // ABER: chat_reactivated ignorieren (kommt aus HTTP Response)
        if (data.message.message_type === 'chat_reactivated') {
          return;
        }

        if (!this.isMessageDuplicate(data.message.text, 'system', timestamp)) {
          this.messages.update(currentMessages => [
            ...currentMessages,
            {
              from: 'system',
              text: data.message.text,
              timestamp: timestamp,
              isSystemMessage: true,
              message_type: data.message.message_type
            }
          ]);
        }

        this.scrollToBottom();
        return;
      }

      // Chat-Ende durch Visitor
      if (data.chat_ended && data.ended_by === 'visitor') {
        console.log('Chat ended by visitor');
        this.chatStatus.set('bot');
        this.isEscalated.set(false);
        this.showAgentConnection.set(false);
        this.assignedAgentName.set('');
        this.chatAssignmentStatus.set(null);
        return;
      }

      // Unassignment Updates
      if (data.unassigned === true ||
          (data.assigned_to === null && data.agent_name === null && data.previous_agent)) {

        console.log('Processing chat unassignment:', {
          previous_agent: data.previous_agent,
          unassigned_by: data.unassigned_by
        });

        this.chatAssignmentStatus.set({
          is_assigned: false,
          assigned_to: null,
          assigned_agent_name: null
        });

        this.assignedAgentName.set('');
        this.showAgentConnection.set(false);
        this.chatStatus.set('human');

        if (data.previous_agent) {
          this.messages.update(currentMessages => [
            ...currentMessages,
            {
              from: 'system',
              text: `Die Verbindung zu ${data.previous_agent} wurde beendet. Sie können weiterhin schreiben.`,
              timestamp: new Date(),
              isSystemMessage: true
            }
          ]);

          this.visitorNotification.notifySystemMessage(
              'Verbindung getrennt',
              `Die Verbindung zu ${data.previous_agent} wurde beendet`
          );
        }

        this.scrollToBottom();
        return;
      }

      // Escalation Prompts
      if (data.message?.message_type === 'escalation_prompt' ||
          data.message?.metadata?.is_automatic === true) {

        this.showEscalationOptions.set(true);
        this.currentEscalationPrompt.set({
          prompt_id: data.message.metadata?.escalation_prompt_id || null,
          is_automatic: data.message.metadata?.is_automatic || false,
          options: data.message.metadata?.options || [
            { text: 'Ja, gerne', value: 'accept' },
            { text: 'Nein, danke', value: 'decline' }
          ]
        });

        setTimeout(() => this.scrollToBottom(), 100);
      }

      // Assignment Updates
      if (data.assigned_to !== undefined) {
        const currentStatus = this.chatAssignmentStatus();
        const assignmentChanged = !currentStatus || currentStatus.assigned_to !== data.assigned_to;

        if (assignmentChanged) {
          console.log('Processing assignment change:', {
            from: currentStatus?.assigned_to,
            to: data.assigned_to,
            agent_name: data.agent_name,
            chat_id: data.chat_id,
            status: data.status
          });

          this.chatAssignmentStatus.set({
            is_assigned: data.assigned_to !== null,
            assigned_to: data.assigned_to,
            assigned_agent_name: data.agent_name
          });

          if (data.assigned_to && data.agent_name) {
            this.assignedAgentName.set(data.agent_name);
            this.showAgentConnection.set(true);

            // ✅ IMPORTANT: Set chat ID from assignment
            if (data.chat_id) {
              console.log('Setting chat ID from assignment:', data.chat_id);
              this.currentChatId.set(data.chat_id);
              localStorage.setItem('current_chat_id', data.chat_id);
            }

            // ✅ IMPORTANT: Update chat status to 'in_progress' when agent is assigned
            if (data.status) {
              console.log('Updating chat status from assignment:', data.status);
              this.chatStatus.set(data.status);
              if (data.status === 'human' || data.status === 'in_progress') {
                this.isEscalated.set(true);
              }
            } else if (this.chatStatus() !== 'in_progress' && this.chatStatus() !== 'human') {
              // Fallback: If no status provided but agent assigned, set to in_progress
              console.log('No status in assignment data, setting to in_progress');
              this.chatStatus.set('in_progress');
              this.isEscalated.set(true);
            }

            // ✅ NOTIFICATION: Agent zugewiesen
            if (this.visitorNotification.areNotificationsEnabled) {
              this.visitorNotification.notifyAgentAssigned(data.agent_name);
            }

            console.log('✅ New agent assigned:', {
              agent: data.agent_name,
              chat_id: this.currentChatId(),
              status: this.chatStatus(),
              can_upload: this.chatStatus() === 'human' || this.chatStatus() === 'in_progress'
            });
          } else if (data.assigned_to === null) {
            this.assignedAgentName.set('');
            this.showAgentConnection.set(false);
            console.log('Assignment removed');
          }
        }
      }

      // System-Nachrichten
      if (data.message?.from === 'system') {
        const timestamp = new Date(data.message.created_at);

        if (!this.isMessageDuplicate(data.message.text, 'system', timestamp)) {
          this.messages.update(currentMessages => [
            ...currentMessages,
            {
              from: 'system',
              text: data.message.text,
              timestamp: timestamp,
              isSystemMessage: true,
              message_type: data.message.message_type,
              attachment: data.message.has_attachment ? data.message.attachment : undefined
            }
          ]);
        }

        this.scrollToBottom();
      }

      // Status Updates
      if (data.status && data.status !== this.chatStatus()) {
        console.log('Status update:', data.status);
        this.chatStatus.set(data.status);

        if (data.status === 'human' && !this.isEscalated()) {
          this.isEscalated.set(true);
        }
      }

      // ✅ WICHTIG: NUR Agent-Nachrichten mit Notifications
      if (data.message && data.message.text && data.message.from === 'agent') {
        const messageTimestamp = new Date(data.message.created_at);

        if (!this.isMessageDuplicate(data.message.text, data.message.from, messageTimestamp)) {
          console.log('💬 Agent message:', {
            text: data.message.text,
            has_attachment: data.message.has_attachment,
            attachment: data.message.attachment
          });

          // Nachricht zur UI hinzufügen
          this.messages.update(currentMessages => [
            ...currentMessages,
            {
              from: data.message.from,
              text: data.message.text,
              timestamp: messageTimestamp,
              message_type: data.message.message_type,
              metadata: data.message.metadata,
              attachment: data.message.has_attachment ? data.message.attachment : undefined
            }
          ]);

          const agentName = this.assignedAgentName() || 'Mitarbeiter';

          // Unread Counter NUR wenn Chat nicht offen
          if (!this.isOpen()) {
            this.unreadMessages.update(count => count + 1);
            console.log('Unread count increased:', this.unreadMessages());
          }

          // ✅ NOTIFICATION: Nur wenn Notifications aktiviert sind
          if (this.visitorNotification.areNotificationsEnabled) {
            console.log('Sending agent message notification...');
            this.visitorNotification.notifyAgentMessage(agentName, data.message.text);
          } else {
            console.log('Agent message notification skipped - not enabled');
          }

          console.log('Agent message processed:', data.message.from, data.message.text.substring(0, 30));
        }
      }

      // ✅ User-Nachrichten (ohne Notifications) - für Vollständigkeit
      else if (data.message && data.message.text && data.message.from === 'user') {
        // User sollte seine EIGENEN Nachrichten NICHT via Pusher empfangen - sie kommen aus der HTTP Response
        return;
      }

      // ✅ Bot-Nachrichten (nur erlaubte Types: escalation_reply, chat_farewell)
      // WICHTIG: escalation_prompt wird NICHT via Pusher verarbeitet, nur aus Response!
      else if (data.message && data.message.text && data.message.from === 'bot') {
        const messageTimestamp = new Date(data.message.created_at);

        // ✅ Escalation-Prompts IGNORIEREN - kommen aus Response
        if (data.message.message_type === 'escalation_prompt') {
          console.log('⏭️ Skipping escalation_prompt from Pusher (comes from Response)');
          return;
        }

        if (!this.isMessageDuplicate(data.message.text, data.message.from, messageTimestamp)) {
          console.log('🤖 Bot message:', {
            text: data.message.text,
            message_type: data.message.message_type,
            metadata: data.message.metadata
          });

          this.messages.update(currentMessages => [
            ...currentMessages,
            {
              from: data.message.from,
              text: data.message.text,
              timestamp: messageTimestamp,
              message_type: data.message.message_type,
              metadata: data.message.metadata,
              showRestartOptions: data.message.message_type === 'chat_farewell' // Für "Vielen Dank" Nachricht
            }
          ]);

          console.log('Bot message added via Pusher:', data.message.message_type);
        }
      }

      this.cdRef.detectChanges();
      this.scrollToBottom();
    });
  }


  /**
   * Chat Status überwachen - angepasst für anonyme Benutzer
   */
  private monitorChatStatus(): void {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) return;

    if (this.chatStatus() === 'human') {
      setTimeout(() => {
        this.chatbotService.getAnonymousAssignmentStatus(sessionId).subscribe({
          next: (response) => {
            if (response.success) {
              this.chatAssignmentStatus.set({
                is_assigned: response.assigned_to !== null,
                assigned_to: response.assigned_to,
                assigned_agent_name: response.assigned_agent_name,
                can_user_write: response.can_write,
                status: response.status
              });

              if (response.assigned_agent_name) {
                this.assignedAgentName.set(response.assigned_agent_name);
              }
            }
          },
          error: (err) => {
            console.error('Error checking assignment status:', err);
          }
        });

        if (this.chatStatus() === 'human') {
          this.monitorChatStatus();
        }
      }, 30000);
    }
  }



  private async sendToAgent(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        reject(new Error('Keine Session ID gefunden'));
        return;
      }

      const payload = {
        session_id: sessionId,
        content: message,
        isAgent: false
      };

      this.chatbotService.sendMessageToHumanChat(payload).subscribe({
        next: (response) => {
          resolve();
          this.isTyping.set(false);

          if (response.chat_status) {
            this.chatStatus.set(response.chat_status);
          }
        },
        error: (err) => {
          console.error('Fehler beim Senden an Agent:', err);
          this.isTyping.set(false);

          let errorMessage = 'Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut.';

          if (err.status === 419) {
            errorMessage = 'Sicherheitsfehler. Bitte aktualisieren Sie die Seite und versuchen es erneut.';
          } else if (err.status === 401) {
            errorMessage = 'Sie sind nicht berechtigt, diese Nachricht zu senden.';
          }

          this.messages.update(m => [...m, {
            from: 'bot',
            text: errorMessage,
            timestamp: new Date()
          }]);

          reject(err);
        }
      });
    });
  }

  private storePendingMessage(message: string) {
 //   console.log('Storing pending message:', message);
    // Implementieren Sie Ihre eigene Logik zum Speichern ausstehender Nachrichten
  }


  private isMessageDuplicate(messageText: string, fromType: string, timestamp: Date): boolean {
    const currentMessages = this.messages();

    if (fromType === 'agent') {
      return false;
    }

    const timeThreshold = 2000;

    const isDuplicate = currentMessages.some(msg => {
      const textMatch = msg.text === messageText;
      const fromMatch = msg.from === fromType;
      const timeDiff = Math.abs(new Date(msg.timestamp).getTime() - timestamp.getTime());
      const timeMatch = timeDiff < timeThreshold;

      return textMatch && fromMatch && timeMatch;
    });

    return isDuplicate;
  }


  private handleContactFlow(message: string) {

    const currentStep = this.currentContactStep();

    switch(currentStep) {
      case 'first_name': // Geändert
        this.contactInfo.update(info => ({...info, first_name: message}));
        this.messages.update(m => [...m, {
          from: 'user',
          text: message,
          timestamp: new Date()
        }, {
          from: 'bot',
          text: 'Vielen Dank. Wie ist Ihr Nachname?',
          timestamp: new Date()
        }]);
        this.currentContactStep.set('last_name');
        break;

      case 'last_name': // Neu hinzugefügt
        this.contactInfo.update(info => ({...info, last_name: message}));
        this.messages.update(m => [...m, {
          from: 'user',
          text: message,
          timestamp: new Date()
        }, {
          from: 'bot',
          text: 'Vielen Dank. Wie lautet Ihre E-Mail-Adresse?',
          timestamp: new Date()
        }]);
        this.currentContactStep.set('email');
        break;

      case 'email':
        this.contactInfo.update(info => ({...info, email: message}));
        this.messages.update(m => [...m, {
          from: 'user',
          text: message,
          timestamp: new Date()
        }, {
          from: 'bot',
          text: 'Und Ihre Telefonnummer?',
          timestamp: new Date()
        }]);
        this.currentContactStep.set('phone');
        break;

      case 'phone':
        this.contactInfo.update(info => ({...info, phone: message}));
        this.messages.update(m => [...m, {
          from: 'user',
          text: message,
          timestamp: new Date()
        }, {
          from: 'bot',
          text: 'Vielen Dank! Ein Mitarbeiter wird sich bald bei Ihnen melden.',
          timestamp: new Date()
        }]);

        // Jetzt die Eskalation durchführen
        this.performEscalation();
        this.contactFlowActive.set(false);
        this.currentContactStep.set(null);
        break;
    }
    this.inputMessage.set('');
    this.scrollToBottom();
  }


  private performEscalation() {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) return;

    this.chatStatus.set('waiting');
    this.isTyping.set(true);

    this.chatbotService.requestHuman(
        sessionId,
        'Ich möchte mit einem Mitarbeiter sprechen'
    ).subscribe({
      next: (response) => {
        this.isTyping.set(false);
        this.isEscalated.set(true);
        this.chatStatus.set('human');

        if (response.chat_id) {
          this.currentChatId.set(response.chat_id);
          localStorage.setItem('current_chat_id', response.chat_id);
        }

        this.setupPusherListener();

        if (response.assigned_agent) {
          this.assignedAgentName.set(response.assigned_agent);
          this.showAgentConnection.set(true);
        }

        this.messages.update(m => [...m, {
          from: 'bot',
          text: 'Wir danken Ihnen für Ihre Anfrage. Ein Mitarbeiter wird sich in Kürze bei Ihnen melden, um Ihr Anliegen zu klären.',
          timestamp: new Date()
        }]);
      },
      error: (err) => {
        console.error('Escalation failed:', err);
        this.isTyping.set(false);

        this.messages.update(m => [...m, {
          from: 'bot',
          text: 'Entschuldigung, die Verbindung ist fehlgeschlagen. Bitte versuchen Sie es später erneut.',
          timestamp: new Date()
        }]);
      }
    });
  }



  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private getChatId(): string {
    // Zuerst versuchen, die ID vom Signal zu bekommen
    const chatId = this.currentChatId();

    // Falls nicht vorhanden, aus dem LocalStorage laden
    if (!chatId) {
      const storedId = localStorage.getItem('current_chat_id');
      if (storedId) {
        this.currentChatId.set(storedId);
        return storedId;
      }
    }

    if (!chatId) {
      console.error('Chat ID nicht verfügbar');
      throw new Error('Chat ID nicht verfügbar');
    }

    return chatId;
  }

  escalateToHuman() {
    const contactInfo = {
      first_name: prompt('Bitte geben Sie Ihren Vornamen ein:'),
      last_name: prompt('Bitte geben Sie Ihren Nachnamen ein:'),
      email: prompt('Bitte geben Sie Ihre E-Mail-Adresse ein:'),
      phone: prompt('Bitte geben Sie Ihre Telefonnummer ein:')
    };

    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) return;

    this.chatStatus.set('waiting');
    this.isTyping.set(true);

    this.chatbotService.requestHuman(sessionId, this.inputMessage()).subscribe({
      next: (response) => {
        this.messages.update(m => [...m, {
          from: 'bot',
          text: 'Ein Mitarbeiter wurde benachrichtigt. Bitte warten Sie...',
          timestamp: new Date()
        }]);
        this.isEscalated.set(true);
        this.chatStatus.set('human');
        this.isTyping.set(false);

        // Setup listener for agent messages
        this.setupAgentListener(sessionId);
      },
      error: (err) => {
        console.error('Error escalating to human:', err);
        this.messages.update(m => [...m, {
          from: 'bot',
          text: 'Entschuldigung, die Übergabe ist fehlgeschlagen. Bitte versuchen Sie es später erneut.',
          timestamp: new Date()
        }]);
        this.chatStatus.set('bot');
        this.isTyping.set(false);
      }
    });
  }

  /*
    private shouldShowEscalationPrompt(): boolean {
      // Mindestens 3 Nachrichtenaustausche (User + Bot) und nicht im Buchungsprozess
      return this.messageCountForEscalation >= 3 &&
        !this.isEscalated() &&
        this.chatStatus() === 'bot' &&
        !this.isInBookingProcess();
    }
  */

  continueWithBot() {
    this.showEscalationPrompt.set(false);
    this.currentEscalationPrompt.set(null);
    const continueMessage = 'Ich möchte mit dem Bot fortfahren';

    this.messages.update(m => [...m, {
      from: 'user',
      text: continueMessage,
      timestamp: new Date()
    }]);

    this.isTyping.set(true);
    this.chatbotService.sendMessageAnonymous(continueMessage).subscribe({
      next: (response) => {
        this.isTyping.set(false);
        // Handle response as usual
        if (response.messages) {
          this.messages.set(response.messages.map((msg: any) => ({
            from: msg.from,
            text: msg.text,
            timestamp: new Date(msg.timestamp || Date.now())
          })));
        }
      },
      error: (err) => {
        this.isTyping.set(false);
        console.error('Fehler beim Senden der Nachricht:', err);
      }
    });

   // this.messageCountForEscalation = 0;
  }


  requestHumanSupport() {
    this.showEscalationPrompt.set(false);
    this.currentEscalationPrompt.set(null);

    const visitorData = this.registrationForm();
    this.contactInfo.set({
      first_name: visitorData.first_name,
      last_name: visitorData.last_name,
      email: visitorData.email,
      phone: visitorData.phone
    });

    // ✅ WICHTIG: Notifications erst HIER aktivieren, nicht beim ersten Klick!
    this.enableVisitorNotifications();

    this.performEscalation();

    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      this.setupPusherListener();
    }
  }

  private async enableVisitorNotifications(): Promise<void> {
    if (this.visitorNotification.areNotificationsEnabled) {
      console.log('Notifications already enabled');
      return;
    }

    console.log('Enabling visitor notifications...');

    const success = await this.visitorNotification.enableNotifications();
    if (success) {
      console.log('✅ Visitor notifications successfully enabled');

      // Optional: Bestätigungsnachricht für den User
      this.messages.update(m => [...m, {
        from: 'system',
        text: 'Benachrichtigungen aktiviert! Sie werden informiert, wenn ein Mitarbeiter antwortet.',
        timestamp: new Date(),
        isSystemMessage: true
      }]);
    } else {
      console.log('❌ Failed to enable visitor notifications');

      // Freundliche Nachricht an den User
      this.messages.update(m => [...m, {
        from: 'system',
        text: 'Nur Audio-Benachrichtigungen verfügbar. Browser-Benachrichtigungen wurden nicht aktiviert.',
        timestamp: new Date(),
        isSystemMessage: true
      }]);
    }
  }

  private setupAgentListener(sessionId: string) {
    if (this.pusherSubscription) {
      this.pusherSubscription.stop();
    }

    this.pusherSubscription = this.pusherService.listenToChannel(
      `chat.${sessionId}`,
      'message.received',
      (data: any) => {
        const message = data.message;
        // Nachricht hinzufügen, unabhängig vom aktuellen Status
        this.messages.update(m => [...m, {
          from: message.from,
          text: message.text,
          timestamp: new Date(message.created_at)
        }]);

        // Wenn es eine Agentennachricht ist, Status aktualisieren
        if (message.from === 'agent' && this.chatStatus() !== 'human') {
          this.chatStatus.set('human');
          this.isEscalated.set(true);
        }
      }
    );
  }



  public scrollToBottom() {
    if (!this.isBrowser) return;

    const containerRef = this.messageContainer();
    if (!containerRef) return;

    const container = containerRef.nativeElement;
    if (container) {
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }

  private checkScrollPosition() {
    if (!this.isBrowser) return;

    const container = this.messageContainer()?.nativeElement;
    if (container) {
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      this.showScrollButton.set(!isAtBottom);
    }
  }

  // File handling methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        this.messages.update(m => [...m, {
          from: 'system',
          text: 'Datei ist zu groß. Maximale Größe: 10MB',
          timestamp: new Date(),
          isSystemMessage: true
        }]);
        return;
      }

      // Prüfe ob Chat mit Agent verbunden ist (human oder in_progress)
      const chatStatus = this.chatStatus();
      const hasAgent = chatStatus === 'human' || chatStatus === 'in_progress';
      const chatId = this.currentChatId();

      console.log('🔍 File upload validation:', {
        chatStatus,
        hasAgent,
        chatId,
        assignedAgent: this.assignedAgentName()
      });

      if (!hasAgent || !chatId) {
        console.warn('❌ File upload blocked - no agent or no chat ID');
        this.messages.update(m => [...m, {
          from: 'system',
          text: 'Sie können nur Dateien senden wenn Sie mit einem Mitarbeiter verbunden sind',
          timestamp: new Date(),
          isSystemMessage: true
        }]);
        return;
      }

      console.log('✅ File upload allowed, proceeding...');

      this.uploadFile(file);
    }
  }

  uploadFile(file: File): void {
    const sessionId = localStorage.getItem('session_id');
    const chatId = this.currentChatId();

    if (!sessionId || !chatId) {
      console.error('Missing session or chat ID');
      return;
    }

    // Show upload message
    this.messages.update(m => [...m, {
      from: 'user',
      text: `Datei wird hochgeladen: ${file.name}`,
      timestamp: new Date()
    }]);

    this.chatbotService.uploadAttachment(file, chatId, sessionId, 'user').subscribe({
      next: (response) => {
        console.log('File uploaded successfully:', response);
        // File message will be received via Pusher
      },
      error: (err) => {
        console.error('File upload error:', err);
        this.messages.update(m => [...m, {
          from: 'system',
          text: 'Fehler beim Hochladen der Datei',
          timestamp: new Date(),
          isSystemMessage: true
        }]);
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
        this.messages.update(m => [...m, {
          from: 'system',
          text: 'Fehler beim Herunterladen der Datei',
          timestamp: new Date(),
          isSystemMessage: true
        }]);
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
  getAgentNameForMessage(message: any): string {
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

    // 2. Fallback: Verwende den aktuellen assignedAgentName
    return this.assignedAgentName() || 'Agent';
  }

  /**
   * ✅ NEU: Benachrichtigungs-Erlaubnis anfordern
   * Wird aufgerufen wenn Kunde auf "Ja" bei Escalation klickt
   */
  private async requestNotificationPermission(): Promise<void> {
    if (!this.visitorNotification.isSupported) {
      console.log('Browser unterstützt keine Benachrichtigungen');
      return;
    }

    console.log('🔔 Requesting notification permission for visitor...');

    try {
      const enabled = await this.visitorNotification.enableNotifications();

      // ✅ Backend-Call für persistente Speicherung
      if (this.sessionId) {
        this.chatbotService.saveNotificationStatus(this.sessionId, enabled).subscribe({
          next: (response) => {
            console.log('Notification status saved to backend:', response);
          },
          error: (err) => {
            console.error('Error saving notification status:', err);
          }
        });
      }

      if (enabled) {
        console.log('✅ Visitor notifications enabled');
        // Backend sendet jetzt die Bestätigungsnachricht
      } else {
        console.log('❌ Visitor notifications denied or not granted');
        // Backend sendet jetzt die Info-Nachricht
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }
}

interface MessageEvent {
  message: ChatMessage;
}
interface ChatMessage {
  from: string;
  text: string;
  created_at: string;
  isSystemMessage?: boolean;
}

