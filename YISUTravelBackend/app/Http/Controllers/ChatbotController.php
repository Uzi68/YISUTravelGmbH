<?php

namespace App\Http\Controllers;
use App\Events\AllChatsUpdate;
use App\Events\ChatAssigned;
use App\Events\ChatAssignmentUpdated;
use App\Events\ChatEnded;
use App\Events\ChatEscalated;
use App\Events\ChatStatusChanged;
use App\Events\ChatTransferred;
use App\Events\MessagePusher;
use App\Models\ChatRequest;
use App\Models\ContactRequest;
use App\Models\Escalation;
use App\Models\EscalationPrompt;
use App\Models\Message;
use App\Models\MessageRead;
use App\Models\User;
use App\Models\Visitor;
use App\Services\PushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use App\Models\Chat;
use App\Services\OpenAiChatService;
use App\Services\EscalationNotifier;
class ChatbotController extends Controller
{
    public function __construct(
        private readonly PushNotificationService $pushNotifications,
        private readonly OpenAiChatService $aiChatService,
        private readonly EscalationNotifier $escalationNotifier
    )
    {
    }

    public function handleInput(Request $request): \Illuminate\Http\JsonResponse
    {
        // 1. Überprüfen, ob eine session_id übergeben wurde, oder eine neue generieren
        $sessionId = $request->header('X-Session-ID', (string) \Illuminate\Support\Str::uuid());

        // 2. Eingabedaten validieren
        $validated = $request->validate([
            'message' => 'required|string',
        ]);

        $originalInput = trim($validated['message']);
        $existingChat = Chat::where('session_id', $sessionId)->first();
        if ($existingChat && $existingChat->status === 'closed') {
            $sessionId = (string) \Illuminate\Support\Str::uuid();
            $existingChat = null;
        }
        // Überprüfen, ob der Benutzer authentifiziert ist
        if (!$request->user()) {
            return response()->json([
                'message' => 'Authentication required.',
            ], 401); // Falls der Benutzer nicht authentifiziert ist, eine 401-Antwort zurückgeben
        }

        $user = $request->user();

        $firstName = $user->first_name;
        $lastName = $user->last_name;

        if ((!$firstName || !$lastName) && $user->name) {
            $nameParts = preg_split('/\s+/', trim($user->name));
            if (!$firstName && !empty($nameParts)) {
                $firstName = array_shift($nameParts);
            }
            if (!$lastName && !empty($nameParts)) {
                $lastName = implode(' ', $nameParts);
            }
        }

        $visitorAttributes = [
            'channel' => 'website',
            'agb_accepted' => true,
            'agb_accepted_at' => now(),
            'agb_version' => '1.0'
        ];

        if ($firstName) {
            $visitorAttributes['first_name'] = $firstName;
        }

        if ($lastName) {
            $visitorAttributes['last_name'] = $lastName;
        }

        if ($user->email) {
            $visitorAttributes['email'] = $user->email;
        }

        if ($user->phone) {
            $visitorAttributes['phone'] = $user->phone;
        }

        // Besucherprofil mit Kundendaten synchronisieren
        $visitor = Visitor::updateOrCreate(
            ['session_id' => $sessionId],
            $visitorAttributes
        );

        // Chatverlauf für den authentifizierten Benutzer aktualisieren
        if (!$existingChat) {
            $existingChat = Chat::create([
                'session_id' => $sessionId,
                'user_id' => $user->id,
                'visitor_id' => $visitor->id,
                'visitor_session_id' => $sessionId,
                'status' => 'bot',
                'channel' => 'website'
            ]);
        } else {
            $existingChat->user_id = $user->id;
            $existingChat->visitor_id = $visitor->id;
            $existingChat->visitor_session_id = $sessionId;
            $existingChat->channel = $existingChat->channel ?: 'website';
            $existingChat->save();
        }

        // Speichern der Benutzer- und Bot-Nachricht in der Tabelle 'messages'
        $userMessage = Message::create([
            'chat_id' => $existingChat->id,
            'from' => 'user',
            'text' => $originalInput
        ]);

        $existingChat->update(['last_activity' => now()]);
        $existingChat->refresh();

        $this->dispatchStaffPushForUserMessage($existingChat, $userMessage);

        $aiResult = $this->aiChatService->generateReply($existingChat, $originalInput);
        $reply = $aiResult['reply'];
        $aiEscalate = $aiResult['needs_escalation'] ?? false;
        $aiEscalationReason = $aiResult['escalation_reason'] ?? 'none';

        $botMessage = null;
        $shouldEscalate = (bool) $aiEscalate;
        $escalationReason = (string) $aiEscalationReason;
        if ($shouldEscalate && ($escalationReason === '' || $escalationReason === 'none')) {
            $escalationReason = 'missing_knowledge';
        }

        if ($shouldEscalate) {
            $this->escalationNotifier->notify($existingChat, $originalInput, $escalationReason);
        }

        if ($shouldEscalate) {
            $reply = $this->getEscalationPromptText();
            $botMessage = Message::create([
                'chat_id' => $existingChat->id,
                'from' => 'bot',
                'text' => $reply,
                'message_type' => 'escalation_prompt',
                'metadata' => [
                    'escalation_prompt_id' => null,
                    'is_automatic' => true,
                    'options' => $this->getEscalationPromptOptions()
                ]
            ]);
        } else {
            $botMessage = Message::create([
                'chat_id' => $existingChat->id,
                'from' => 'bot',
                'text' => $reply
            ]);
        }

        // Den gesamten Chatverlauf abfragen
        $messages = Message::where('chat_id', $existingChat->id)
            ->orderBy('created_at', 'asc')  // Nachrichten in chronologischer Reihenfolge
            ->get();

        // Nachrichten in das gewünschte Format umwandeln
        $formattedMessages = $messages->map(function ($message) {
            return [
                'from' => $message->from,
                'text' => $message->text,
                'message_type' => $message->message_type,
                'metadata' => $message->metadata,
            ];
        });

        $responseMessages = [
            [
                'from' => $userMessage->from,
                'text' => $userMessage->text,
                'timestamp' => $userMessage->created_at
            ],
            [
                'from' => $botMessage->from,
                'text' => $botMessage->text,
                'timestamp' => $botMessage->created_at,
                'message_type' => $botMessage->message_type,
                'metadata' => $botMessage->metadata
            ]
        ];

        return response()->json([
            'messages' => $formattedMessages,
            'new_messages' => $responseMessages,
            'session_id' => $sessionId
        ]);
    }




    public function escalateToHuman($chatId, $message = null, $userId = null)
    {
        // Chatid kann sowohl numeric ID als auch session_id sein
        if (is_numeric($chatId)) {
            $chat = Chat::findOrFail($chatId);
        } else {
            $chat = Chat::where('session_id', $chatId)->firstOrFail();
        }

        // Chat status aktualisieren
        $chat->update(['status' => 'human']);

        // Eskalation erstellen
        $escalation = Escalation::create([
            'chat_id' => $chat->id,
            'requested_at' => now(),
            'status' => 'pending',
            'initial_message' => $message // Optional: initiale Nachricht speichern
        ]);

        // Event auslösen
        event(new ChatEscalated($chat, $escalation));

        // Verfügbaren Mitarbeiter suchen und zuweisen
        $availableAgent = User::where('is_active', true)
            ->whereHas('roles', function ($query) {
                $query->whereIn('name', ['Admin', 'Agent']);
            })
            ->withCount(['assignedChats' => function ($query) {
                $query->whereIn('status', ['human', 'in_progress']);
            }])
            ->orderBy('assigned_chats_count', 'asc')
            ->first();

        if ($availableAgent) {
            $this->assignChatToAgent($chat, $availableAgent);
        }

        return $escalation;
    }

// Hilfsmethode für Chat-Assignment
    private function assignChatToAgent($chat, $agent)
    {
        $chat->update([
            'assigned_to' => $agent->id,
            'assigned_at' => now(),
            'status' => 'in_progress',
            'last_agent_activity' => now()
        ]);

        // System-Nachricht erstellen
        $messageText = "{$agent->name} hat den Chat übernommen";
        $systemMessage = Message::create([
            'chat_id' => $chat->id,
            'from' => 'system',
            'text' => $messageText,
            'message_type' => 'assignment',
            'metadata' => [
                'assigned_agent_id' => $agent->id,
                'assigned_agent_name' => $agent->name,
                'assigned_at' => now()
            ]
        ]);

        // ✅ NEU: Sende System-Nachricht auch via WhatsApp
        $this->sendMessageViaWhatsAppIfNeeded($chat, $messageText, 'system');

        // Assignment-Daten für Broadcasting
        $assignmentData = [
            'assigned_to' => $agent->id,
            'agent_name' => $agent->name,
            'status' => 'in_progress'
        ];

        // Event und Broadcast
        broadcast(new MessagePusher($systemMessage, $chat->session_id, $assignmentData))->toOthers();
        event(new ChatAssigned($chat, $agent));

        return $chat;
    }

    // Zustandsdefinitionen
    const STATE_IDLE = 'idle';

    public function handleInputAnonymous(Request $request): \Illuminate\Http\JsonResponse
    {
        $sessionId = $request->header('X-Session-ID')
            ?? $request->cookie('chat_session_id')
            ?? (string) Str::uuid();

        // Chat laden
        $chat = Chat::where('session_id', $sessionId)->first();
        $previousVisitorId = null;

        if ($chat && $chat->status === 'closed') {
            $previousVisitorId = $chat->visitor_id;
            $sessionId = (string) Str::uuid();
            $chat = null;

            if ($previousVisitorId) {
                Visitor::where('id', $previousVisitorId)->update(['session_id' => $sessionId]);
            }
        }

        // Wenn Chat bereits eskaliert wurde (aber nicht closed), Nachricht direkt weiterleiten
        if ($chat && in_array($chat->status, ['human', 'in_progress', 'assigned'])) {
            $userMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'user',
                'text' => $request->message,
                'is_escalation_trigger' => false
            ]);

            // ✅ FIX: Aktualisiere last_activity für Website-Besucher
            $chat->update(['last_activity' => now()]);
            // ✅ WICHTIG: Chat neu laden damit last_activity im Event verfügbar ist
            $chat->refresh();

            // Assignment-Daten für Broadcasting
            $assignmentData = null;
            if ($chat->assigned_to) {
                $assignmentData = [
                    'assigned_to' => $chat->assigned_to,
                    'agent_name' => $chat->assignedTo->name ?? 'Agent',
                    'status' => $chat->status
                ];
            }

            if ($userMessage instanceof \App\Models\Message) {
                broadcast(new MessagePusher($userMessage, $sessionId, $assignmentData))->toOthers();
            }

            return response()->json([
                'status' => 'human',
                'session_id' => $sessionId,
                'message' => 'Nachricht wurde an Mitarbeiter weitergeleitet',
                'new_messages' => [
                    [
                        'from' => 'user',
                        'text' => $request->message,
                        'timestamp' => $userMessage->created_at
                    ]
                ]
            ]);
        }

        $validated = $request->validate(['message' => 'required|string']);
        $originalInput = trim($validated['message']);
        // Chat-Sitzung laden oder erstellen
        $chat = Chat::firstOrCreate(
            ['session_id' => $sessionId],
            [
                'user_id' => null,
                'visitor_id' => $previousVisitorId,
                'visitor_session_id' => $sessionId,
                'state' => self::STATE_IDLE,
                'context' => json_encode([]),
                'status' => 'bot',
                'channel' => 'website'
            ]
        );

        // Nachrichten speichern
        $userMessage = Message::create([
            'chat_id' => $chat->id,
            'from' => 'user',
            'text' => $originalInput,
        ]);

        $this->dispatchStaffPushForUserMessage($chat, $userMessage);

        // ✅ FIX: Aktualisiere last_activity für Website-Besucher beim Senden einer Nachricht
        $chat->update(['last_activity' => now()]);
        // ✅ WICHTIG: Chat neu laden damit last_activity im Event verfügbar ist
        $chat->refresh();

        $aiResult = $this->aiChatService->generateReply($chat, $originalInput);
        $reply = $aiResult['reply'];
        $aiEscalate = $aiResult['needs_escalation'] ?? false;
        $aiEscalationReason = $aiResult['escalation_reason'] ?? 'none';

        $shouldEscalate = (bool) $aiEscalate;
        $escalationReason = (string) $aiEscalationReason;
        if ($shouldEscalate && ($escalationReason === '' || $escalationReason === 'none')) {
            $escalationReason = 'missing_knowledge';
        }

        if ($shouldEscalate) {
            $this->escalationNotifier->notify($chat, $originalInput, $escalationReason);
        }

        $reply = $shouldEscalate
            ? $this->getEscalationPromptText()
            : $reply;

        /*
        $botMessage = Message::create([
            'chat_id' => $chat->id,
            'from' => 'bot',
            'text' => $reply,
        ]);


        // Response-Array für Frontend vorbereiten
        $responseMessages = [
            [
                'from' => 'user',
                'text' => $originalInput,
                'timestamp' => $userMessage->created_at
            ],
            [
                'from' => 'bot',
                'text' => $reply,
                'timestamp' => $botMessage->created_at
            ]
        ];  */

        // Automatischen Escalation Prompt als richtige Nachricht senden
        $escalationMessage = null;
        $botMessage = null;  // ✅ Initialisierung hinzugefügt

        if ($shouldEscalate && !in_array($chat->status, ['human', 'in_progress'])) {
            // Keine normale Bot-Nachricht speichern, wenn Escalation erkannt wurde
            // Nur die Escalation-Prompt-Nachricht erstellen

            $escalationMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'bot',
                'text' => $this->getEscalationPromptText(),
                'message_type' => 'escalation_prompt',
                'metadata' => [
                    'escalation_prompt_id' => null,
                    'is_automatic' => true,
                    'options' => $this->getEscalationPromptOptions()
                ]
            ]);

            // Response-Array vorbereiten - NUR mit User-Message und Escalation-Prompt
            $responseMessages = [
                [
                    'from' => 'user',
                    'text' => $originalInput,
                    'timestamp' => $userMessage->created_at
                ],
                [
                    'from' => 'bot',
                    'text' => $this->getEscalationPromptText(),
                    'timestamp' => $escalationMessage->created_at,
                    'message_type' => 'escalation_prompt',
                    'metadata' => [
                        'is_automatic' => true,
                        'escalation_prompt_id' => null,
                        'options' => $this->getEscalationPromptOptions()
                    ]
                ]
            ];

        } else {
            // Normale Bot-Antwort nur wenn KEINE Escalation
            $botMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'bot',
                'text' => $reply,
            ]);

            $responseMessages = [
                [
                    'from' => 'user',
                    'text' => $originalInput,
                    'timestamp' => $userMessage->created_at
                ],
                [
                    'from' => 'bot',
                    'text' => $reply,
                    'timestamp' => $botMessage->created_at
                ]
            ];
        }

        // Broadcasting mit korrekter Type-Prüfung - IN RICHTIGER REIHENFOLGE
        try {
            // 1. Dann User-Nachricht (nur an Admin)
            if ($userMessage && $userMessage->id) {
                broadcast(new MessagePusher($userMessage, $sessionId))->toOthers();
            }

            // 2. Dann Bot-Antwort (nur an Customer)
            if ($botMessage && $botMessage->id) {
                broadcast(new MessagePusher($botMessage, $sessionId))->toOthers();
            }

            // 3. Zuletzt Escalation-Nachricht (nur an Admin - Customer bekommt sie aus Response)
            if ($escalationMessage && $escalationMessage->id) {
                broadcast(new MessagePusher($escalationMessage, $sessionId))->toOthers();
            }
        } catch (\Exception $e) {
            \Log::error('Broadcasting error: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'session_id' => $sessionId,
            'should_escalate' => $shouldEscalate,
            'state' => $chat->state,
            'status' => $chat->status,
            'new_messages' => $responseMessages,
            'messages' => $responseMessages,
            'reply' => $reply,
        ]);
    }

    private function getEscalationPromptText(): string
    {
        return 'Wollen Sie mit einem Mitarbeiter sprechen?';
    }

    private function getEscalationPromptOptions(): array
    {
        return [
            ['text' => 'Ja, gerne', 'value' => 'accept'],
            ['text' => 'Nein, danke', 'value' => 'decline']
        ];
    }

    public function end_chatbotSession(Request $request): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Chat-Löschung ist deaktiviert.',
        ], 403);
    }

    public function requestHuman(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'message' => 'required|string'
        ]);

        // Visitor aus der Session laden
        $visitor = Visitor::where('session_id', $validated['session_id'])->first();

        if (!$visitor) {
            return response()->json([
                'status' => 'error',
                'message' => 'Visitor nicht gefunden. Bitte zuerst registrieren.'
            ], 404);
        }

        // Chat aktualisieren
        $chat = Chat::updateOrCreate(
            ['session_id' => $validated['session_id']],
            [
                'visitor_id' => $visitor->id,
                'status' => 'human',
                'user_id' => null
            ]
        );

        // ChatRequest erstellen
        $chatRequest = ChatRequest::create([
            'visitor_id' => $visitor->id,
            'chat_id' => $chat->id,
            'initial_question' => $validated['message'],
            'status' => 'pending'
        ]);

        // Nachricht speichern
        $message = Message::create([
            'chat_id' => $chat->id,
            'from' => 'user',
            'text' => $validated['message'],
            'is_escalation_trigger' => true
        ]);

        // ✅ MULTIPLE EVENTS auslösen für bessere Echtzeit-Updates

        // 1. Escalation Event
        event(new ChatEscalated($chat, $chatRequest));

        // 2. ✅ NEU: Status-Change Event
        broadcast(new ChatStatusChanged($chat, 'bot', 'human'))->toOthers();

        // 3. Message Broadcasting
        broadcast(new MessagePusher($message, $validated['session_id']))->toOthers();

        // 4. ✅ Admin-Dashboard Update mit detaillierten Daten
        event(new AllChatsUpdate([
            'type' => 'chat_escalated',
            'session_id' => $chat->session_id,
            'chat' => [
                'session_id' => $chat->session_id,
                'chat_id' => $chat->id,
                'status' => 'human',
                'channel' => $chat->channel ?? 'website',
                'whatsapp_number' => $chat->whatsapp_number ?? null,
                'customer_first_name' => $visitor->first_name,
                'customer_last_name' => $visitor->last_name,
                'customer_phone' => $visitor->phone ?? ($chat->whatsapp_number ? '+' . $chat->whatsapp_number : 'Nicht bekannt'),
                'last_message' => $validated['message'],
                'last_message_time' => now(),
                'unread_count' => 1,
                'assigned_to' => null,
                'assigned_agent' => null,
                'isNew' => true,
                'can_assign' => true, // ✅ WICHTIG: Flag für UI
                'needs_assignment' => true
            ]
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Eskalation erfolgreich',
            'chat_id' => $chat->id
        ]);
    }

    public function getActiveChats()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Agents sollen ALLE Chats sehen wie Admins
        $query = $this->buildActiveChatQuery($user);

        $chats = $query->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn ($chat) => $this->formatChatForDashboard($chat));

        return response()->json([
            'success' => true,
            'data' => $chats,
            'meta' => [
                'total_chats' => $chats->count(),
                'unassigned_chats' => Chat::where('status', 'human')
                    ->whereNull('assigned_to')
                    ->count()
            ]
        ]);
    }

    public function getChatByIdentifier(Request $request)
    {
        $validated = $request->validate([
            'identifier' => 'nullable|string',
            'session_id' => 'nullable|string',
            'chat_id' => 'nullable'
        ]);

        $identifier = $validated['identifier'] ?? null;
        $sessionId = $validated['session_id'] ?? null;
        $chatId = $validated['chat_id'] ?? null;

        if (!$identifier && !$sessionId && !$chatId) {
            return response()->json([
                'success' => false,
                'message' => 'Identifier erforderlich'
            ], 422);
        }

        /** @var \App\Models\User $user */
        $user = $request->user();
        $query = $this->buildActiveChatQuery($user);

        if ($sessionId) {
            $query->where('session_id', $sessionId);
        } elseif ($chatId) {
            $query->where('id', $chatId);
        } else {
            $query->where(function ($inner) use ($identifier) {
                $inner->where('session_id', $identifier)
                    ->orWhere('id', $identifier);
            });
        }

        $chat = $query->first();
        if (!$chat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat nicht gefunden'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatChatForDashboard($chat)
        ]);
    }

    private function buildActiveChatQuery(User $user)
    {
        return Chat::query()
            ->with([
                'messages' => function ($messageQuery) use ($user) {
                    $messageQuery->with([
                        'attachments',
                        'reads' => function ($readQuery) use ($user) {
                            $readQuery
                                ->where('user_id', $user->id)
                                ->select('id', 'message_id', 'user_id');
                        },
                    ])->orderBy('created_at');
                },
                'user:id,name,avatar',
                'assignedTo:id,name',
                'visitor:id,first_name,last_name,email,phone,whatsapp_number',
                'escalationPrompts.sentByAgent',
            ])
            ->withCount(['messages as unread_count' => function ($messageQuery) use ($user) {
                $messageQuery
                    ->where('from', '!=', 'agent')
                    ->whereDoesntHave('reads', function ($readQuery) use ($user) {
                        $readQuery->where('user_id', $user->id);
                    });
            }]);
    }

    private function formatChatForDashboard(Chat $chat): array
    {
        $lastMessage = $chat->messages->last();

        // ✅ Letzten Escalation-Prompt laden (falls vorhanden)
        $lastEscalationPrompt = $chat->escalationPrompts
            ->where('status', 'sent')
            ->sortByDesc('sent_at')
            ->first();

        // ✅ NEU: Dynamische Kundenname basierend auf Channel
        $customerFirstName = 'Anonymous';
        $customerLastName = '';

        if ($chat->visitor) {
            // Visitor existiert - prüfe ob er echte Namen hat
            if ($chat->visitor->first_name && $chat->visitor->first_name !== 'WhatsApp') {
                // Echter Name vom Visitor
                $customerFirstName = $chat->visitor->first_name;
                $customerLastName = $chat->visitor->last_name ?? '';
            } elseif ($chat->channel === 'whatsapp') {
                // WhatsApp Visitor ohne echten Namen
                $customerFirstName = 'WhatsApp';
                $customerLastName = 'Kunde';
            } else {
                // Website Visitor ohne Namen
                $customerFirstName = 'Anonymous';
                $customerLastName = '';
            }
        } elseif ($chat->channel === 'whatsapp') {
            // Kein Visitor aber WhatsApp Channel
            $customerFirstName = 'WhatsApp';
            $customerLastName = 'Kunde';
        }

        // ✅ WICHTIG: customer_name berechnen (für WhatsApp-Namen)
        $customerName = trim($customerFirstName . ' ' . $customerLastName);
        if (!$customerName || $customerName === 'Anonymous' || $customerName === 'WhatsApp Kunde') {
            // Wenn kein Name vorhanden, zeige WhatsApp-Nummer
            if ($chat->channel === 'whatsapp' && $chat->whatsapp_number) {
                $customerName = '+' . $chat->whatsapp_number;
            } else {
                $customerName = 'Anonymer Benutzer';
            }
        }

        $chatData = [
            'session_id' => $chat->session_id,
            'chat_id' => $chat->id,
            'customer_first_name' => $customerFirstName,
            'customer_last_name' => $customerLastName,
            'customer_name' => $customerName, // ✅ NEU: Vollständiger Name
            'customer_phone' => $chat->visitor ? $chat->visitor->phone : ($chat->whatsapp_number ? '+' . $chat->whatsapp_number : 'Nicht bekannt'),
            'customer_email' => $chat->visitor ? ($chat->visitor->email ?? '') : '', // ✅ FIX: Email direkt im Response für instant Anzeige
            'customer_avatar' => $chat->user ? $chat->user->avatar : asset('storage/images/user.png'),
            'last_message' => $lastMessage ? $lastMessage->text : 'No messages yet',
            'last_message_time' => $lastMessage ? $lastMessage->created_at : $chat->updated_at,
            'unread_count' => $chat->unread_count,
            'is_online' => $chat->user ? $chat->user->isOnline() : false,
            'status' => $chat->status,
            'channel' => $chat->channel ?? 'website', // ✅ WICHTIG: Channel hinzufügen
            'whatsapp_number' => $chat->whatsapp_number ?? null, // ✅ WhatsApp-Nummer falls vorhanden
            'last_activity' => $chat->last_activity ? $chat->last_activity->toIso8601String() : null, // ✅ Zuletzt-Online-Status
            'assigned_to' => $chat->assigned_to,
            'assigned_agent' => $chat->assignedTo ? $chat->assignedTo->name : null,
            'messages' => $chat->messages->sortBy('created_at')->map(function ($message) {
                $messageData = [
                    'id' => $message->id,
                    'text' => $message->text,
                    'timestamp' => $message->created_at,
                    'from' => $message->from,
                    'read' => $message->reads && $message->reads->isNotEmpty(),
                    'message_type' => $message->message_type,
                    'metadata' => $message->metadata
                ];

                // Add attachment if exists
                if ($message->attachments && $message->attachments->count() > 0) {
                    $attachment = $message->attachments->first();
                    $messageData['has_attachment'] = true;
                    $messageData['attachment'] = [
                        'id' => $attachment->id,
                        'file_name' => $attachment->file_name,
                        'file_type' => $attachment->file_type,
                        'file_size' => $attachment->file_size,
                        'download_url' => url('api/attachments/' . $attachment->id . '/download')
                    ];
                }

                return $messageData;
            })
        ];

        // ✅ Escalation-Prompt Daten hinzufügen (falls vorhanden)
        if ($lastEscalationPrompt) {
            $chatData['escalation_prompt'] = [
                'id' => $lastEscalationPrompt->id,
                'sent_at' => $lastEscalationPrompt->sent_at,
                'sent_by_agent_id' => $lastEscalationPrompt->sent_by_agent_id,
                'sent_by_agent_name' => $lastEscalationPrompt->sentByAgent ? $lastEscalationPrompt->sentByAgent->name : 'Unknown'
            ];
        }

        return $chatData;
    }


    /**
     * Send a message as an agent - KORRIGIERT MIT ATTACHMENT SUPPORT
     */
    public function sendAgentMessage(Request $request)
    {
        $validated = $request->validate([
            'chat_id' => 'required|exists:chats,id',
            'content' => 'nullable|string|max:1000',
            'isAgent' => 'required|boolean',
            'session_id' => 'required|string',
            'attachment' => 'nullable|file|max:102400' // Max 100MB
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $chat = Chat::lockForUpdate()->find($validated['chat_id']);
            $agent = Auth::user();

            // Backend-Validierung für Assignment
            if ($validated['isAgent']) {
                if (!$chat->assigned_to) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Chat ist nicht zugewiesen'
                    ], 403);
                }

                if ($chat->assigned_to !== $agent->id && !$agent->hasRole('Admin')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Chat ist einem anderen Agent zugewiesen'
                    ], 403);
                }
            }

            $messageId = \Illuminate\Support\Str::uuid();

            // ✅ WICHTIG: Bei Agent-Nachrichten den aktuellen Agent-Namen speichern
            $metadata = [];
            if ($validated['isAgent'] && Auth::check()) {
                $metadata = [
                    'agent_id' => Auth::id(),
                    'agent_name' => Auth::user()->name
                ];
            }

            $messageText = $validated['content'] ?? '';
            $hasAttachment = $request->hasFile('attachment');

            // ✅ DEBUG: Log incoming request
            \Log::info('sendAgentMessage called', [
                'chat_id' => $chat->id,
                'channel' => $chat->channel,
                'whatsapp_number' => $chat->whatsapp_number,
                'has_attachment' => $hasAttachment,
                'has_content' => !empty($messageText),
                'request_files' => $request->allFiles(),
                'request_all' => $request->all()
            ]);

            // ✅ NEU: Wenn WhatsApp-Chat mit Attachment, verarbeite Media
            if ($chat->channel === 'whatsapp' && $chat->whatsapp_number) {
                $whatsappService = app(\App\Services\WhatsAppService::class);

                if ($hasAttachment) {
                    // Verarbeite Attachment für WhatsApp
                    $file = $request->file('attachment');
                    $mimeType = $file->getMimeType();
                    $fileType = $this->determineFileType($mimeType);

                    \Log::info('Processing WhatsApp attachment', [
                        'file_name' => $file->getClientOriginalName(),
                        'mime_type' => $mimeType,
                        'file_type' => $fileType,
                        'file_size' => $file->getSize()
                    ]);

                    // Speichere Datei lokal
                    $filename = time() . '_' . $file->getClientOriginalName();
                    $path = $file->storeAs("whatsapp_uploads/{$fileType}s", $filename, 'public');
                    $fullPath = \Storage::disk('public')->path($path);

                    \Log::info('File saved locally', [
                        'path' => $path,
                        'full_path' => $fullPath,
                        'file_exists' => file_exists($fullPath)
                    ]);

                    // Upload zu WhatsApp
                    $uploadResult = $whatsappService->uploadMedia($fullPath, $mimeType);

                    \Log::info('WhatsApp upload result', [
                        'success' => $uploadResult['success'],
                        'media_id' => $uploadResult['media_id'] ?? null,
                        'error' => $uploadResult['error'] ?? null,
                        'full_result' => $uploadResult
                    ]);

                    if (!$uploadResult['success']) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Fehler beim Upload zu WhatsApp',
                            'error' => $uploadResult['error'] ?? 'Unknown error'
                        ], 500);
                    }

                    $mediaId = $uploadResult['media_id'];

                    // Sende Media über WhatsApp
                    $sendResult = $this->sendWhatsAppMedia(
                        $whatsappService,
                        $chat->whatsapp_number,
                        $fileType,
                        $mediaId,
                        $messageText,
                        $file->getClientOriginalName()
                    );

                    \Log::info('WhatsApp send media result', [
                        'success' => $sendResult['success'],
                        'message_id' => $sendResult['message_id'] ?? null,
                        'error' => $sendResult['error'] ?? null,
                        'full_result' => $sendResult
                    ]);

                    if (!$sendResult['success']) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Fehler beim Senden der WhatsApp-Nachricht',
                            'error' => $sendResult['error'] ?? 'Unknown error'
                        ], 500);
                    }

                    $metadata['whatsapp_message_id'] = $sendResult['message_id'];
                    $metadata['whatsapp_media_id'] = $mediaId;
                    $metadata['sent_via_whatsapp'] = true;

                    // Erstelle Message mit Attachment
                    $message = Message::create([
                        'id' => $messageId,
                        'chat_id' => $chat->id,
                        'from' => $validated['isAgent'] ? 'agent' : 'user',
                        'text' => $messageText ?: "[{$fileType}]",
                        'metadata' => json_encode($metadata),
                        'message_type' => "whatsapp_{$fileType}",
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                    // Erstelle Attachment-Eintrag
                    \App\Models\MessageAttachment::create([
                        'message_id' => $message->id,
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_type' => $fileType,
                        'file_size' => $file->getSize(),
                        'mime_type' => $mimeType
                    ]);

                } else {
                    // Nur Text-Nachricht
                    $sendResult = $whatsappService->sendTextMessage(
                        $chat->whatsapp_number,
                        $messageText
                    );

                    if (!$sendResult['success']) {
                        \Log::error('Failed to send WhatsApp message', [
                            'chat_id' => $chat->id,
                            'error' => $sendResult['error'] ?? 'Unknown error'
                        ]);

                        return response()->json([
                            'success' => false,
                            'message' => 'Fehler beim Senden der WhatsApp-Nachricht',
                            'error' => $sendResult['error'] ?? 'Unknown error'
                        ], 500);
                    }

                    $metadata['whatsapp_message_id'] = $sendResult['message_id'];
                    $metadata['sent_via_whatsapp'] = true;

                    $message = Message::create([
                        'id' => $messageId,
                        'chat_id' => $chat->id,
                        'from' => $validated['isAgent'] ? 'agent' : 'user',
                        'text' => $messageText,
                        'metadata' => json_encode($metadata),
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            } else {
                // Regular non-WhatsApp chat - handle normally
                $message = Message::create([
                    'id' => $messageId,
                    'chat_id' => $chat->id,
                    'from' => $validated['isAgent'] ? 'agent' : 'user',
                    'text' => $messageText,
                    'metadata' => json_encode($metadata),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Handle attachment for regular chat
                if ($hasAttachment) {
                    $file = $request->file('attachment');
                    $filename = time() . '_' . $file->getClientOriginalName();
                    $path = $file->storeAs('attachments', $filename, 'public');

                    \App\Models\MessageAttachment::create([
                        'message_id' => $message->id,
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_type' => $this->determineFileType($file->getMimeType()),
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType()
                    ]);
                }
            }

            // Chat als aktiv markieren (ohne Assignment zu ändern)
            $chat->update([
                'updated_at' => now(),
                'last_agent_activity' => $validated['isAgent'] ? now() : $chat->last_agent_activity
            ]);

            // Assignment-Daten für Broadcasting
            $assignmentData = null;
            if ($chat->assigned_to) {
                $assignmentData = [
                    'assigned_to' => $chat->assigned_to,
                    'agent_name' => $chat->assignedTo->name ?? 'Agent',
                    'status' => $chat->status
                ];
            }

            $sessionId = $validated['session_id'] ?? $chat->session_id;
            $message->session_id = $sessionId;

            // Load attachments for response
            $message->load('attachments');

            // Broadcasting
            $this->broadcastMessageWithRetry($message, $sessionId, $assignmentData);

            return response()->json([
                'success' => true,
                'message' => [
                    'id' => $message->id,
                    'text' => $message->text,
                    'from' => $message->from,
                    'created_at' => $message->created_at,
                    'session_id' => $sessionId,
                    'has_attachment' => $message->attachments->count() > 0,
                    'attachments' => $message->attachments->map(function($attachment) {
                        return [
                            'id' => $attachment->id,
                            'file_name' => $attachment->file_name,
                            'file_type' => $attachment->file_type,
                            'file_size' => $attachment->file_size,
                            'download_url' => url('api/attachments/' . $attachment->id . '/download')
                        ];
                    })
                ]
            ]);
        });
    }

    /**
     * ✅ Helper: Bestimme Dateityp basierend auf MIME-Type
     */
    private function determineFileType(string $mimeType): string
    {
        if (str_starts_with($mimeType, 'image/')) {
            return 'image';
        } elseif (str_starts_with($mimeType, 'video/')) {
            return 'video';
        } elseif (str_starts_with($mimeType, 'audio/')) {
            return 'audio';
        } elseif (str_starts_with($mimeType, 'application/pdf') ||
                  str_contains($mimeType, 'document') ||
                  str_contains($mimeType, 'msword') ||
                  str_contains($mimeType, 'spreadsheet') ||
                  str_contains($mimeType, 'presentation')) {
            return 'document';
        }
        return 'document';
    }

    /**
     * ✅ Helper: Sende Media über WhatsApp basierend auf Typ
     */
    private function sendWhatsAppMedia($whatsappService, string $phoneNumber, string $fileType, string $mediaId, ?string $caption, ?string $filename): array
    {
        switch ($fileType) {
            case 'image':
                return $whatsappService->sendImageById($phoneNumber, $mediaId, $caption);
            case 'video':
                return $whatsappService->sendVideoById($phoneNumber, $mediaId, $caption);
            case 'document':
                return $whatsappService->sendDocumentById($phoneNumber, $mediaId, $caption, $filename);
            default:
                return ['success' => false, 'error' => 'Unsupported file type'];
        }
    }

    private function broadcastMessageWithRetry($message, $sessionId, $assignmentData = null, $attempts = 3)
    {
        for ($i = 0; $i < $attempts; $i++) {
            try {
                // ✅ Kurze Verzögerung zwischen Nachrichten für Rate-Limiting
                if ($i > 0) {
                    usleep(100000); // 100ms Pause bei Retry
                }

                broadcast(new MessagePusher($message, $sessionId, $assignmentData))->toOthers();

                \Log::info('Message broadcasted successfully:', [
                    'session_id' => $sessionId,
                    'message_id' => $message->id,
                    'attempt' => $i + 1
                ]);

                return true; // Erfolgreich gesendet

            } catch (\Exception $e) {
                \Log::warning("Broadcasting attempt " . ($i + 1) . " failed:", [
                    'error' => $e->getMessage(),
                    'session_id' => $sessionId,
                    'message_id' => $message->id
                ]);

                if ($i === $attempts - 1) {
                    // Letzter Versuch fehlgeschlagen - in Queue einreihen
                    \Log::error('All broadcasting attempts failed, queuing message:', [
                        'session_id' => $sessionId,
                        'message_id' => $message->id
                    ]);

                    // ✅ WICHTIG: Message in Queue für späteren Retry
                    $this->queueFailedMessage($message, $sessionId, $assignmentData);
                }
            }
        }

        return false;
    }

    private function queueFailedMessage($message, $sessionId, $assignmentData)
    {
        // Redis oder Cache verwenden für Failed Message Queue
        $queueKey = "failed_messages:{$sessionId}";
        $messageData = [
            'message_id' => $message->id,
            'session_id' => $sessionId,
            'message_text' => $message->text,
            'from' => $message->from,
            'created_at' => $message->created_at,
            'assignment_data' => $assignmentData,
            'retry_count' => 0,
            'queued_at' => now()
        ];

        \Cache::push($queueKey, $messageData);

        // ✅ WICHTIG: Background Job für Retry starten
        \Queue::push(function($job) use ($messageData) {
            $this->retryFailedMessage($messageData);
            $job->delete();
        });
    }

    /**
     * ✅ NEUE Methode: Failed Messages erneut versuchen
     */
    private function retryFailedMessage($messageData)
    {
        $maxRetries = 5;
        $retryDelay = [1, 2, 5, 10, 30]; // Sekunden

        if ($messageData['retry_count'] >= $maxRetries) {
            \Log::error('Message permanently failed after max retries:', $messageData);
            return false;
        }

        // Exponential backoff
        sleep($retryDelay[$messageData['retry_count']]);

        try {
            // Message neu laden und broadcasten
            $message = Message::find($messageData['message_id']);
            if ($message) {
                broadcast(new MessagePusher(
                    $message,
                    $messageData['session_id'],
                    $messageData['assignment_data']
                ))->toOthers();

                \Log::info('Failed message successfully retried:', [
                    'message_id' => $messageData['message_id'],
                    'retry_count' => $messageData['retry_count'] + 1
                ]);

                return true;
            }
        } catch (\Exception $e) {
            \Log::warning('Message retry failed:', [
                'message_id' => $messageData['message_id'],
                'retry_count' => $messageData['retry_count'] + 1,
                'error' => $e->getMessage()
            ]);

            // Erneut in Queue mit erhöhtem Retry Count
            $messageData['retry_count']++;
            \Queue::later(
                now()->addSeconds($retryDelay[$messageData['retry_count'] - 1] ?? 30),
                function($job) use ($messageData) {
                    $this->retryFailedMessage($messageData);
                    $job->delete();
                }
            );
        }

        return false;
    }




    public function getUpdatedChats()
    {
        $chats = Chat::with(['messages' => function($query) {
            $query->orderBy('created_at', 'desc')->limit(1);
        }])
            ->where('status', 'human')
            ->orWhere('status', 'in_progress')
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function($chat) {
                return [
                    'session_id' => $chat->session_id,
                    'last_message' => $chat->messages->first()->text ?? '',
                    'last_message_time' => $chat->updated_at,
                    'status' => $chat->status
                ];
            });

        return response()->json(['chats' => $chats]);
    }


    public function getChatHistory(Request $request)
    {
        // Validierung
        $validated = $request->validate([
            'session_id' => 'required|string', // Session-ID ist jetzt erforderlich
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        // Chat-Verlauf anhand der Session-ID suchen
        $chat = Chat::where('session_id', $validated['session_id'])
            ->with(['messages.attachments']) // Eager Loading für bessere Performance
            ->first();

        if (!$chat) {
            return response()->json([
                'session_id' => $validated['session_id'],
                'user_id' => null,
                'messages' => [],
                'chat_exists' => false
            ]);
        }

        // Für authentifizierte Benutzer: Sicherstellen, dass sie nur ihre eigenen Chats sehen
        if ($request->user() && !$request->user()->hasRole('Admin')) {
            if ($chat->user_id && $chat->user_id !== $request->user()->id) {
                return response()->json(['error' => 'Unauthorized access to chat history'], 403);
            }
        }

        // Nachrichten formatieren
        $formattedMessages = $chat->messages->map(function ($message) {
            $messageData = [
                'from' => $message->from,
                'text' => $message->text,
                'timestamp' => $message->created_at->toDateTimeString(),
                'message_type' => $message->message_type,
                'metadata' => $message->metadata
            ];

            // Add attachment if exists
            if ($message->attachments && $message->attachments->count() > 0) {
                $attachment = $message->attachments->first();
                $messageData['has_attachment'] = true;
                $messageData['attachment'] = [
                    'id' => $attachment->id,
                    'file_name' => $attachment->file_name,
                    'file_type' => $attachment->file_type,
                    'file_size' => $attachment->file_size,
                    'download_url' => url('api/attachments/' . $attachment->id . '/download')
                ];
            }

            return $messageData;
        });

        return response()->json([
            'session_id' => $chat->session_id,
            'user_id' => $chat->user_id,
            'messages' => $formattedMessages
        ]);
    }


    public function assign(Request $request, $chatId)
    {
        $chat = Chat::where('session_id', $chatId)->firstOrFail();

        // Prüfen, ob Chat bereits zugewiesen
        if ($chat->assigned_to) {
            return response()->json(['error' => 'Chat ist bereits zugewiesen'], 403);
        }

        $chat->assigned_to = auth()->id();
        $chat->status = 'in_progress';
        $chat->save();

        return response()->json(['success' => true, 'assigned_to' => $chat->assigned_to]);
    }


    public function closeChat(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'reason' => 'nullable|string|max:255'
        ]);

        return $this->endChatByAgent($request);
    }

    public function transferChat(Request $request, Chat $chat)
    {
        $validated = $request->validate([
            'agent_id' => 'required|exists:users,id'
        ]);

        $newAgent = User::findOrFail($validated['agent_id']);

        $chat->update([
            'assigned_to' => $newAgent->id
        ]);

        // Notify both agents and customer
        broadcast(new ChatTransferred($chat, $newAgent))->toOthers();

        return response()->json([
            'success' => true,
            'message' => 'Chat transferred successfully'
        ]);
    }


    public function endChatByAgent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'reason' => 'nullable|string|max:255'
        ]);

        // ✅ DEBUG: Was kommt vom Frontend an?
        \Log::info('Close Chat Request:', [
            'raw_input' => $request->all(),
            'validated' => $validated,
            'reason_type' => gettype($validated['reason'] ?? null),
            'reason_value' => $validated['reason'] ?? 'NOT SET'
        ]);

        $sessionId = $validated['session_id'];
        $chat = Chat::where('session_id', $sessionId)->first();

        if (!$chat) {
            return response()->json([
                'success' => false,
                'status' => 'not_found',
                'chat_id' => null,
                'session_id' => $sessionId,
                'assigned_to' => null,
                'assigned_agent_name' => null,
                'can_write' => false,
                'is_escalated' => false,
                'message' => 'Chat nicht gefunden'
            ]);
        }

        $agent = Auth::user();

        if ($chat->assigned_to !== $agent->id && !$agent->hasRole('Admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Keine Berechtigung zum Beenden dieses Chats'
            ], 403);
        }

        return DB::transaction(function () use ($chat, $agent, $validated, $sessionId) {
            // ✅ EXPLIZIT: reason aus validated extrahieren
            $closeReason = isset($validated['reason']) && !empty(trim($validated['reason']))
                ? trim($validated['reason'])
                : null;

            // ✅ DEBUG: Was wird gespeichert?
            \Log::info('Saving close reason:', [
                'close_reason' => $closeReason,
                'is_null' => is_null($closeReason),
                'chat_id' => $chat->id
            ]);

            // Chat-Status aktualisieren
            $chat->update([
                'status' => 'closed',
                'closed_at' => now(),
                'closed_by_agent' => $agent->id,
                'close_reason' => $closeReason,  // ✅ Explizit setzen
                'assigned_to' => null,
                'assigned_at' => null,
                'last_agent_activity' => now()
            ]);

            // ✅ DEBUG: Wurde es gespeichert?
            $chat->refresh();
            \Log::info('Chat after save:', [
                'close_reason_saved' => $chat->close_reason,
                'closed_by_agent' => $chat->closed_by_agent
            ]);

            // System-Nachricht MIT close_reason im Text
            $endMessage = "Chat wurde von {$agent->name} beendet";
            if ($closeReason) {
                $endMessage .= " (Grund: {$closeReason})";
            }

            $systemMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'system',
                'text' => $endMessage,
                'message_type' => 'chat_ended_by_agent',
                'metadata' => [
                    'closed_by_agent' => $agent->id,
                    'closed_by_agent_name' => $agent->name,
                    'close_reason' => $closeReason,
                    'closed_at' => now()->toISOString()
                ]
            ]);

            // ✅ DEBUG: Message metadata
            \Log::info('System message created:', [
                'message_id' => $systemMessage->id,
                'metadata' => $systemMessage->metadata
            ]);

            // Freundliche Abschiedsnachricht für den Visitor (nach Agent-Chat-Ende)
            $farewellText = 'Vielen Dank für die Nutzung unseres Supports. Sie können jederzeit einen neuen Chat beginnen.';
            $farewellMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'bot',
                'text' => $farewellText,
                'message_type' => 'chat_farewell',
                'metadata' => [
                    'ended_by' => 'agent',
                    'agent_name' => $agent->name,
                    'farewell_sent_at' => now()
                ]
            ]);

            // ✅ NEU: Sende System-Nachrichten auch via WhatsApp
            $this->sendMessageViaWhatsAppIfNeeded($chat, $endMessage, 'system');
            $this->sendMessageViaWhatsAppIfNeeded($chat, $farewellText, 'system');

            // Assignment-Daten für Broadcasting
            $assignmentData = [
                'assigned_to' => null,
                'agent_name' => null,
                'status' => 'closed',
                'chat_ended' => true,
                'ended_by' => 'agent',
                'ended_by_name' => $agent->name,
                'close_reason' => $closeReason
            ];

            broadcast(new MessagePusher($systemMessage, $sessionId, $assignmentData))->toOthers();
            broadcast(new MessagePusher($farewellMessage, $sessionId, $assignmentData))->toOthers();
            broadcast(new ChatEnded($chat, 'agent', $agent->name))->toOthers();

            event(new AllChatsUpdate([
                'type' => 'chat_ended_by_agent',
                'chat' => [
                    'session_id' => $chat->session_id,
                    'chat_id' => $chat->id,
                    'status' => 'closed',
                    'channel' => $chat->channel ?? 'website',
                    'whatsapp_number' => $chat->whatsapp_number ?? null,
                    'customer_first_name' => $chat->visitor?->first_name ?? ($chat->channel === 'whatsapp' ? 'WhatsApp' : 'Anonymous'),
                    'customer_last_name' => $chat->visitor?->last_name ?? ($chat->channel === 'whatsapp' ? 'Kunde' : ''),
                    'customer_phone' => $chat->visitor?->phone ?? ($chat->whatsapp_number ? '+' . $chat->whatsapp_number : 'Nicht bekannt'),
                    'last_message' => $endMessage,
                    'last_message_time' => now(),
                    'ended_by' => 'agent',
                    'ended_by_name' => $agent->name,
                    'close_reason' => $closeReason,
                    'chat_closed' => true,
                    'remove_from_list' => true
                ]
            ]));

            broadcast(new ChatStatusChanged($chat, 'in_progress', 'closed'))->toOthers();

            return response()->json([
                'success' => true,
                'message' => 'Chat erfolgreich beendet',
                'closed_by' => $agent->name,
                'close_reason' => $closeReason  // ✅ Im Response
            ]);
        });
    }


// In ChatbotController.php - Korrigierte endChatByUser Methode
    public function endChatByUser(Request $request)
    {
        $sessionId = $request->header('X-Session-ID');

        $chat = Chat::where('session_id', $sessionId)->first();

        if (!$chat) {
            return response()->json(['error' => 'Chat session not found'], 404);
        }

        // Assigned Agent für Benachrichtigung speichern
        $assignedAgent = $chat->assignedTo;
        $wasAssigned = (bool) $chat->assigned_to;

        // Chat-Assignment vollständig zurücksetzen
        $chat->update([
            'status' => 'closed',
            'closed_at' => now(),
            'assigned_to' => null,
            'assigned_at' => null,
            'assigned_agent' => null,
            'last_agent_activity' => null
        ]);

        // System-Message für Chat-Ende
        $systemMessage = Message::create([
            'chat_id' => $chat->id,
            'from' => 'system',
            'text' => 'Chat wurde vom Benutzer beendet',
            'message_type' => 'chat_ended',
            'metadata' => [
                'ended_by' => 'visitor',
                'previous_agent_id' => $assignedAgent?->id,
                'previous_agent_name' => $assignedAgent?->name,
                'ended_at' => now()
            ]
        ]);

        // Freundliche Abschiedsnachricht für den Visitor
        $farewellMessage = Message::create([
            'chat_id' => $chat->id,
            'from' => 'bot',
            'text' => 'Vielen Dank für die Nutzung unseres Supports. Sie können jederzeit einen neuen Chat beginnen.',
            'message_type' => 'chat_farewell',
            'metadata' => [
                'ended_by' => 'visitor',
                'farewell_sent_at' => now()
            ]
        ]);

        // ✅ KORRIGIERT: Assignment-Daten für Broadcasting
        $assignmentData = [
            'assigned_to' => null,
            'agent_name' => null,
            'status' => 'closed',
            'chat_ended' => true,
            'ended_by' => 'visitor',
            'previous_agent' => $assignedAgent?->name
        ];

        // ✅ WICHTIG: Message Broadcasting für Chat-Teilnehmer
        broadcast(new MessagePusher($systemMessage, $sessionId, $assignmentData))->toOthers();
        broadcast(new MessagePusher($farewellMessage, $sessionId, $assignmentData))->toOthers();

        // ✅ NEU: Separates ChatEnded Event für bessere Kontrolle
        broadcast(new ChatEnded($chat, 'visitor', $assignedAgent?->name))->toOthers();

        // ✅ WICHTIG: AllChatsUpdate Event für Admin-Dashboard Echtzeit-Updates
        event(new AllChatsUpdate([
            'type' => 'chat_ended_by_visitor',
            'chat' => [
                'session_id' => $chat->session_id,
                'chat_id' => $chat->id,
                'status' => 'closed',
                'channel' => $chat->channel ?? 'website',
                'whatsapp_number' => $chat->whatsapp_number ?? null,
                'customer_first_name' => $chat->visitor?->first_name ?? ($chat->channel === 'whatsapp' ? 'WhatsApp' : 'Anonymous'),
                'customer_last_name' => $chat->visitor?->last_name ?? ($chat->channel === 'whatsapp' ? 'Kunde' : ''),
                'customer_phone' => $chat->visitor?->phone ?? ($chat->whatsapp_number ? '+' . $chat->whatsapp_number : 'Nicht bekannt'),
                'last_message' => 'Chat wurde vom Benutzer beendet',
                'last_message_time' => now(),
                'ended_by' => 'visitor',
                'previous_agent' => $assignedAgent?->name,
                'chat_closed' => true,
                'remove_from_list' => true // Flag für UI zum Entfernen
            ]
        ]));

        // ✅ NEU: Status-Change Event für bessere Event-Koordination
        broadcast(new ChatStatusChanged($chat, $wasAssigned ? 'in_progress' : 'human', 'closed'))->toOthers();

        return response()->json([
            'success' => true,
            'message' => 'Chat wurde erfolgreich beendet',
            'chat_status' => 'closed',
            'new_session_id' => (string) Str::uuid(),
            'assignment_reset' => true
        ]);
    }


    /**
     * Chat-Assignment für aktuelle Session zurücksetzen
     */
    /**
     * Chat-Assignment für aktuelle Session zurücksetzen
     */
    public function resetChatAssignment(Request $request): JsonResponse
    {
        $sessionId = $request->header('X-Session-ID');

        if (!$sessionId) {
            return response()->json([
                'success' => false,
                'message' => 'Session ID erforderlich'
            ], 400);
        }

        $chat = Chat::where('session_id', $sessionId)->first();

        if (!$chat) {
            return response()->json([
                'success' => true,
                'message' => 'Kein Chat gefunden - bereits zurückgesetzt'
            ]);
        }

        // Assignment-Daten zurücksetzen
        $chat->update([
            'assigned_to' => null,
            'assigned_at' => null,
            'assigned_agent' => null,
            'last_agent_activity' => null,
            'status' => $chat->status === 'closed' ? 'closed' : 'bot'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Chat-Assignment erfolgreich zurückgesetzt'
        ]);
    }

    public function getAllChatsForAdmin()
    {

        // Überprüfen, ob der Benutzer Admin-Rechte hat
        if (!Auth::user()->hasRole('Admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $chats = Chat::with(['messages.attachments', 'user', 'assignedTo', 'visitor'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($chat) {
                $lastMessage = $chat->messages->last();
                $user = Auth::user();

                // ✅ NEU: Dynamischer Kundenname basierend auf Channel
                $customerFirstName = 'Anonymous';
                $customerLastName = '';

                if ($chat->visitor) {
                    // Visitor existiert - prüfe ob er echte Namen hat
                    if ($chat->visitor->first_name && $chat->visitor->first_name !== 'WhatsApp') {
                        // Echter Name vom Visitor
                        $customerFirstName = $chat->visitor->first_name;
                        $customerLastName = $chat->visitor->last_name ?? '';
                    } elseif ($chat->channel === 'whatsapp') {
                        // WhatsApp Visitor ohne echten Namen
                        $customerFirstName = 'WhatsApp';
                        $customerLastName = 'Kunde';
                    } else {
                        // Website Visitor ohne Namen
                        $customerFirstName = 'Anonymous';
                        $customerLastName = '';
                    }
                } elseif ($chat->channel === 'whatsapp') {
                    // Kein Visitor aber WhatsApp Channel
                    $customerFirstName = 'WhatsApp';
                    $customerLastName = 'Kunde';
                }

                return [
                    'session_id' => $chat->session_id,
                    'chat_id' => $chat->id,
                    'customer_first_name' => $customerFirstName,
                    'customer_last_name' => $customerLastName,
                    'customer_phone' => $chat->visitor ? $chat->visitor->phone : ($chat->whatsapp_number ? '+' . $chat->whatsapp_number : 'Nicht bekannt'),
                    'customer_avatar' => $chat->user ? $chat->user->avatar : asset('storage/images/user.png'),
                    'last_message' => $lastMessage ? $lastMessage->text : 'No messages yet',
                    'last_message_time' => $lastMessage ? $lastMessage->created_at : $chat->updated_at,
                    'unread_count' => Message::where('chat_id', $chat->id)
                        ->where('from', '!=', 'agent')
                        ->whereDoesntHave('reads', function ($q) use ($user) {
                            $q->where('user_id', $user->id);
                        })
                        ->count(),
                    'is_online' => $chat->user ? $chat->user->isOnline() : false,
                    'status' => $chat->status,
                    'channel' => $chat->channel ?? 'website',
                    'whatsapp_number' => $chat->whatsapp_number ?? null,
                    'assigned_to' => $chat->assigned_to,
                    'assigned_agent' => $chat->assignedTo ? $chat->assignedTo->name : null,
                    'messages' => $chat->messages->map(function ($message) {
                        $messageData = [
                            'id' => $message->id,
                            'text' => $message->text,
                            'timestamp' => $message->created_at,
                            'from' => $message->from,
                            'message_type' => $message->message_type,
                            'metadata' => $message->metadata
                        ];

                        if ($message->attachments && $message->attachments->count() > 0) {
                            $attachment = $message->attachments->first();
                            $messageData['has_attachment'] = true;
                            $messageData['attachment'] = [
                                'id' => $attachment->id,
                                'file_name' => $attachment->file_name,
                                'file_type' => $attachment->file_type,
                                'file_size' => $attachment->file_size,
                                'download_url' => url('api/attachments/' . $attachment->id . '/download')
                            ];
                        }

                        return $messageData;
                    })
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $chats,
            'meta' => [
                'total_chats' => $chats->count(),
                'unassigned_chats' => Chat::where('status', 'human')
                    ->whereNull('assigned_to')
                    ->count(),
                'assigned_chats' => Chat::where('status', 'in_progress')
                    ->whereNotNull('assigned_to')
                    ->count(),
                // Optional: können Sie auch abgeschlossene Chats zählen
                'closed_chats' => Chat::where('status', 'closed')->count()
            ]
        ]);
    }

    public function markMessagesAsRead(Request $request)
    {
        $validated = $request->validate([
            'chat_id' => 'required|exists:chats,id',
            'session_id' => 'required|string'
        ]);

        $chat = Chat::where('id', $validated['chat_id'])
            ->where('session_id', $validated['session_id'])
            ->firstOrFail();

        $user = Auth::user();

        $messages = Message::where('chat_id', $chat->id)
            ->where('from', '!=', 'agent')
            ->get();

        foreach ($messages as $message) {
            MessageRead::updateOrCreate(
                ['message_id' => $message->id, 'user_id' => $user->id],
                ['read_at' => now()]
            );
        }

        return response()->json([
            'success' => true,
            'chat_id' => $chat->id,
            'marked_read' => $messages->count(),
            'unread_count' => 0
        ]);
    }




    // Besucher ganz am Anfang von Chatbot registrieren

    public function registerVisitor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'agb_accepted' => 'required|accepted'
        ]);

        // Visitor erstellen/aktualisieren
        $visitor = Visitor::updateOrCreate(
            ['session_id' => $validated['session_id']],
            [
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'agb_accepted' => true,
                'agb_accepted_at' => now(),
                'agb_version' => '1.0'
            ]
        );

        // Chat erstellen oder aktualisieren
        $chat = Chat::updateOrCreate(
            ['session_id' => $validated['session_id']],
            [
                'visitor_id' => $visitor->id,
                'status' => 'bot',
                'user_id' => null
            ]
        );

        // ✅ Willkommensnachricht erstellen und speichern
        $welcomeMessage = Message::create([
            'chat_id' => $chat->id,
            'from' => 'bot',
            'text' => "Vielen Dank für Ihre Registrierung, {$validated['first_name']}! Wie kann ich Ihnen helfen?",
            'message_type' => 'registration_welcome'
        ]);

        // ✅ Nachricht über Pusher broadcasten, damit sie im Admin-Dashboard erscheint
        broadcast(new MessagePusher($welcomeMessage, $chat->session_id));

        // ✅ Admin-Dashboard über neuen Chat informieren
        event(new AllChatsUpdate([
            'type' => 'chat_updated',
            'chat' => [
                'session_id' => $chat->session_id,
                'chat_id' => $chat->id,
                'status' => 'bot',
                'channel' => $chat->channel ?? 'website',
                'customer_first_name' => $visitor->first_name,
                'customer_last_name' => $visitor->last_name,
                'customer_phone' => $visitor->phone,
                'last_message' => $welcomeMessage->text,
                'last_message_time' => $welcomeMessage->created_at,
            ]
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Daten erfolgreich gespeichert',
            'visitor' => $visitor,
            'chat_id' => $chat->id
        ]);
    }

    public function checkVisitorRegistration($sessionId): \Illuminate\Http\JsonResponse
    {
        $visitor = Visitor::where('session_id', $sessionId)->first();

        return response()->json([
            'registered' => $visitor && $visitor->agb_accepted_at !== null,
            'visitor' => $visitor
        ]);
    }

    /**
     * Escalation-Prompt Response verarbeiten
     */
    public function handleEscalationPromptResponse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'prompt_id' => 'nullable|string',
            'response' => 'required|in:accept,decline'
        ]);

        return DB::transaction(function () use ($validated) {
            $chat = Chat::where('session_id', $validated['session_id'])->first();

            if (!$chat) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat nicht gefunden'
                ], 404);
            }

            $response = $validated['response'];
            $responseText = $response === 'accept' ? 'Ja, gerne' : 'Nein, danke';

            // ✅ KORRIGIERT: Sichere Prüfung mit isset() oder array_key_exists()
            if (isset($validated['prompt_id']) && !empty($validated['prompt_id'])) {
                $escalationPrompt = EscalationPrompt::find($validated['prompt_id']);
                if ($escalationPrompt) {
                    $escalationPrompt->update([
                        'status' => $response === 'accept' ? 'accepted' : 'declined',
                        'responded_at' => now(),
                        'visitor_response' => $responseText
                    ]);
                }
            }

            // Rest der Methode bleibt gleich...

            // User-Response als Message speichern
            $userResponseMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'user',
                'text' => $responseText,
                'message_type' => 'escalation_response'
            ]);

            // ✅ Broadcasting der User-Response damit Admin sie sieht
            broadcast(new MessagePusher($userResponseMessage, $chat->session_id));

            $botReply = '';

            if ($response === 'accept') {
                // Status auf 'human' setzen
                $chat->update(['status' => 'human']);

                $botReply = 'Vielen Dank! Ich verbinde Sie mit einem unserer Mitarbeiter. Bitte haben Sie einen Moment Geduld.';

                // Escalation durchführen
                $escalation = Escalation::create([
                    'chat_id' => $chat->id,
                    'requested_at' => now(),
                    'status' => 'pending'
                ]);

                // ChatEscalated Event mit ChatRequest
                $chatRequest = ChatRequest::create([
                    'visitor_id' => $chat->visitor_id,
                    'chat_id' => $chat->id,
                    'initial_question' => 'Möchte mit Mitarbeiter sprechen (via Escalation Prompt)',
                    'status' => 'pending'
                ]);

                event(new ChatEscalated($chat, $chatRequest));

                // Status Change Event
                broadcast(new ChatStatusChanged($chat, 'bot', 'human'))->toOthers();

                // Admin-Dashboard informieren
                event(new AllChatsUpdate([
                    'type' => 'chat_escalated',
                    'chat' => [
                        'session_id' => $chat->session_id,
                        'chat_id' => $chat->id,
                        'status' => 'human',
                        'channel' => $chat->channel ?? 'website',
                        'whatsapp_number' => $chat->whatsapp_number ?? null,
                        'customer_first_name' => $chat->visitor?->first_name ?? ($chat->channel === 'whatsapp' ? 'WhatsApp' : 'Anonymous'),
                        'customer_last_name' => $chat->visitor?->last_name ?? ($chat->channel === 'whatsapp' ? 'Kunde' : ''),
                        'customer_phone' => $chat->visitor?->phone ?? ($chat->whatsapp_number ? '+' . $chat->whatsapp_number : 'Nicht bekannt'),
                        'last_message' => $responseText,
                        'last_message_time' => now(),
                        'unread_count' => 1,
                        'isNew' => true,
                        'can_assign' => true,
                        'needs_assignment' => true,
                        'assigned_to' => null,
                        'assigned_agent' => null
                    ]
                ]));

            } else {
                $botReply = 'Kein Problem! Ich helfe Ihnen gerne weiter. Was kann ich für Sie tun?';
            }

            // Bot-Reply als Message speichern
            $replyMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'bot',
                'text' => $botReply,
                'message_type' => 'escalation_reply'
            ]);

            // ✅ Broadcasting der Antwort OHNE toOthers() - damit auch der Visitor die Message erhält
            broadcast(new MessagePusher($replyMessage, $chat->session_id));

            return response()->json([
                'success' => true,
                'response' => $response,
                'chat_status' => $chat->status,
                'message' => $botReply
            ]);
        });
    }

    /**
     * Prüfen ob User in Chat schreiben darf
     */
    public function canUserWrite(Request $request, $chatId): JsonResponse
    {
        $chat = Chat::where('session_id', $chatId)->first();

        if (!$chat) {
            return response()->json([
                'success' => false,
                'can_write' => false,
                'message' => 'Chat nicht gefunden'
            ], 404);
        }

        $user = Auth::user();
        $canWrite = $chat->canUserWrite($user->id);

        return response()->json([
            'success' => true,
            'can_write' => $canWrite,
            'chat_status' => $chat->status,
            'assigned_to' => $chat->assigned_to,
            'assigned_agent_name' => $chat->assignedTo?->name
        ]);
    }

    /**
     * CSRF-freie Nachrichtensendung für anonyme Benutzer
     */
    public function sendToHumanChat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'content' => 'required|string|max:1000',
            'isAgent' => 'boolean'
        ]);

        $sessionId = $validated['session_id'];
        $chat = Chat::where('session_id', $sessionId)->first();

        if (!$chat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat nicht gefunden'
            ], 404);
        }

        // Status-Prüfung für anonyme Benutzer
        if (!in_array($chat->status, ['human', 'in_progress', 'assigned', 'bot'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chat ist nicht aktiv'
            ], 400);
        }

        \Log::info('sendToHumanChat invoked', [
            'chat_id' => $chat->id,
            'session_id' => $sessionId,
            'is_agent' => $validated['isAgent'] ?? false,
            'chat_status' => $chat->status,
        ]);

        return DB::transaction(function () use ($chat, $validated, $sessionId) {
            // ✅ WICHTIG: Bei Agent-Nachrichten den aktuellen Agent-Namen speichern
            $isAgent = $validated['isAgent'] ?? false;
            $metadata = null;
            if ($isAgent && Auth::check()) {
                $metadata = json_encode([
                    'agent_id' => Auth::id(),
                    'agent_name' => Auth::user()->name
                ]);
            }

            // User-Nachricht erstellen
            $message = Message::create([
                'chat_id' => $chat->id,
                'from' => $isAgent ? 'agent' : 'user',
                'text' => $validated['content'],
                'metadata' => $metadata
            ]);

            // Chat als aktiv markieren (ohne Assignment zu ändern)
            // ✅ FIX: Aktualisiere last_activity wenn Benutzer eine Nachricht sendet (nicht bei Agent)
            $updateData = ['updated_at' => now()];
            if (!$isAgent) {
                $updateData['last_activity'] = now(); // ✅ Aktualisiere Zuletzt-Online-Status für Website-Besucher
            }
            $chat->update($updateData);
            // assigned_to NICHT ändern!

            // Assignment-Daten für Broadcasting - nur wenn bereits assigned
            $assignmentData = null;
            if ($chat->assigned_to) {
                $assignmentData = [
                    'assigned_to' => $chat->assigned_to,
                    'agent_name' => $chat->assignedTo->name ?? 'Agent',
                    'status' => $chat->status
                ];
            }

            // Broadcasting
            broadcast(new MessagePusher($message, $sessionId, $assignmentData))->toOthers();

            // Admin-Dashboard Update nur bei User-Nachrichten
            if ($message->from === 'user') {
                event(new AllChatsUpdate([
                    'type' => 'new_message',
                    'chat' => [
                        'session_id' => $chat->session_id,
                        'chat_id' => $chat->id,
                        'status' => $chat->status, // Aktueller Status beibehalten
                        'channel' => $chat->channel ?? 'website',
                        'whatsapp_number' => $chat->whatsapp_number ?? null,
                        'customer_first_name' => $chat->visitor?->first_name ?? ($chat->channel === 'whatsapp' ? 'WhatsApp' : 'Anonymous'),
                        'customer_last_name' => $chat->visitor?->last_name ?? ($chat->channel === 'whatsapp' ? 'Kunde' : ''),
                        'customer_phone' => $chat->visitor?->phone ?? ($chat->whatsapp_number ? '+' . $chat->whatsapp_number : 'Nicht bekannt'),
                        'last_message' => $message->text,
                        'last_message_time' => $message->created_at,
                        'last_activity' => $chat->last_activity ? $chat->last_activity->toIso8601String() : null, // ✅ FIX: last_activity im Event mitgeben
                        'unread_count' => Message::where('chat_id', $chat->id)
                            ->where('from', '!=', 'agent')
                            ->whereDoesntHave('reads')
                            ->count(),
                        'assigned_to' => $chat->assigned_to, // Aktueller Assignment-Status
                        'assigned_agent' => $chat->assignedTo?->name
                    ]
                ]));

                $chat->loadMissing('visitor');
                Log::info('ChatbotController dispatching push notification', [
                    'chat_id' => $chat->id,
                    'message_id' => $message->id ?? null,
                ]);

                $this->pushNotifications->notifyStaffAboutChatMessage($chat, $message);
            }

            return response()->json([
                'success' => true,
                'message' => [
                    'id' => $message->id,
                    'text' => $message->text,
                    'from' => $message->from,
                    'created_at' => $message->created_at
                ],
                'chat_status' => $chat->status
            ]);
        });
    }

    /**
     * Chat Status für anonyme Benutzer abrufen
     */
    public function getAnonymousChatStatus($sessionId): JsonResponse
    {
        $chat = Chat::where('session_id', $sessionId)
            ->with('assignedTo:id,name')
            ->first();

        if (!$chat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat nicht gefunden'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'status' => $chat->status,
            'chat_id' => $chat->id,
            'session_id' => $chat->session_id,
            'assigned_to' => $chat->assigned_to,
            'assigned_agent_name' => $chat->assignedTo?->name,
            'can_write' => true, // Anonyme Benutzer können immer schreiben
            'is_escalated' => in_array($chat->status, ['human', 'in_progress'])
        ]);
    }

    /**
     * Notification Permission Status speichern
     */
    public function saveNotificationStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'permission_granted' => 'required|boolean'
        ]);

        $sessionId = $validated['session_id'];
        $permissionGranted = $validated['permission_granted'];

        $chat = Chat::where('session_id', $sessionId)->first();

        if (!$chat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat nicht gefunden'
            ], 404);
        }

        // System-Nachricht nur wenn Permission NICHT gewährt wurde
        if (!$permissionGranted) {
            $notificationMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'system',
                'text' => 'ℹ️ Benachrichtigungen wurden nicht aktiviert. Sie können den Chat weiterhin normal nutzen.',
                'message_type' => 'notification_status',
                'metadata' => [
                    'permission_granted' => false,
                    'timestamp' => now()
                ]
            ]);

            // Broadcasting
            broadcast(new MessagePusher($notificationMessage, $sessionId))->toOthers();
        }

        return response()->json([
            'success' => true,
            'message' => 'Notification status saved'
        ]);
    }

    /**
     * ✅ Helper: Sende Nachricht via WhatsApp wenn es ein WhatsApp-Chat ist
     */
    private function dispatchStaffPushForUserMessage(Chat $chat, ?Message $message): void
    {
        if (!$message || $message->from !== 'user') {
            return;
        }

        try {
            $chat->loadMissing('visitor');
            $this->pushNotifications->notifyStaffAboutChatMessage($chat, $message);
        } catch (\Throwable $exception) {
            Log::warning('Failed to dispatch staff push notification', [
                'chat_id' => $chat->id,
                'message_id' => $message->id ?? null,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * ✅ Helper: Sende Nachricht via WhatsApp wenn es ein WhatsApp-Chat ist
     */
    private function sendMessageViaWhatsAppIfNeeded($chat, string $messageText, string $messageType = 'text'): ?array
    {
        if ($chat->channel !== 'whatsapp' || !$chat->whatsapp_number) {
            return null;
        }

        $whatsappService = app(\App\Services\WhatsAppService::class);

        try {
            $result = $whatsappService->sendTextMessage($chat->whatsapp_number, $messageText);

            if (!$result['success']) {
                \Log::error('Failed to send WhatsApp message', [
                    'chat_id' => $chat->id,
                    'whatsapp_number' => $chat->whatsapp_number,
                    'message_type' => $messageType,
                    'error' => $result['error'] ?? 'Unknown error'
                ]);
            }

            return $result;
        } catch (\Exception $e) {
            \Log::error('Exception sending WhatsApp message', [
                'chat_id' => $chat->id,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

}
