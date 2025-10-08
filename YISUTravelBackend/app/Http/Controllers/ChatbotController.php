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
use App\Models\Booking;
use App\Models\ChatRequest;
use App\Models\ContactRequest;
use App\Models\Escalation;
use App\Models\EscalationPrompt;
use App\Models\Message;
use App\Models\MessageRead;
use App\Models\Visitor;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use App\Models\ChatbotResponse;
use App\Models\Chat;
use Illuminate\Support\Facades\Cookie;
class ChatbotController extends Controller
{
    public function handleInput(Request $request): \Illuminate\Http\JsonResponse
    {
        // 1. Überprüfen, ob eine session_id übergeben wurde, oder eine neue generieren
        $sessionId = $request->header('X-Session-ID', (string) \Illuminate\Support\Str::uuid());

        // 2. Eingabedaten validieren
        $validated = $request->validate([
            'message' => 'required|string',
        ]);

        $input = strtolower(trim($validated['message']));

        // Alle gespeicherten Antworten holen
        $responses = ChatbotResponse::all();
        $bestMatch = null;
        $lowestDistance = null;
        $matchedKeywords = null;

        foreach ($responses as $response) {
            $distance = levenshtein($input, strtolower($response->input));
            $keywords = is_array($response->keywords) ? $response->keywords : json_decode($response->keywords, true);

            foreach ($keywords as $keyword) {
                if (strpos($input, strtolower($keyword)) !== false) {
                    $bestMatch = $response;
                    $matchedKeywords = $keyword;
                    break 2;
                }
            }

            if (is_null($lowestDistance) || $distance < $lowestDistance) {
                $lowestDistance = $distance;
                $bestMatch = $response;
            }
        }

        $reply = $matchedKeywords
            ? $bestMatch->response
            : (($lowestDistance !== null && $lowestDistance <= 3)
                ? $bestMatch->response
                : $this->generateFallbackReply($input));

        // Überprüfen, ob der Benutzer authentifiziert ist
        if (!$request->user()) {
            return response()->json([
                'message' => 'Authentication required.',
            ], 401); // Falls der Benutzer nicht authentifiziert ist, eine 401-Antwort zurückgeben
        }

        // Chatverlauf für den authentifizierten Benutzer aktualisieren
        $existingChat = Chat::where('session_id', $sessionId)
            ->where('user_id', $request->user()->id) // Chat für den authentifizierten Benutzer abrufen
            ->first();

        // Falls kein Chatverlauf existiert, einen neuen erstellen
        if (!$existingChat) {
            $existingChat = Chat::create([
                'session_id' => $sessionId,
                'user_id' => $request->user()->id,  // Setze die user_id aus dem authentifizierten Benutzer
            ]);
        }

        // Speichern der Benutzer- und Bot-Nachricht in der Tabelle 'messages'
        Message::create([
            'chat_id' => $existingChat->id,
            'from' => 'user',
            'text' => $input
        ]);

        Message::create([
            'chat_id' => $existingChat->id,
            'from' => 'bot',
            'text' => $reply
        ]);

        // Den gesamten Chatverlauf abfragen
        $messages = Message::where('chat_id', $existingChat->id)
            ->orderBy('created_at', 'asc')  // Nachrichten in chronologischer Reihenfolge
            ->get();

        // Nachrichten in das gewünschte Format umwandeln
        $formattedMessages = $messages->map(function ($message) {
            return [
                'from' => $message->from,
                'text' => $message->text,
            ];
        });



        return response()->json([
            'messages' => $formattedMessages,
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
        $systemMessage = Message::create([
            'chat_id' => $chat->id,
            'from' => 'system',
            'text' => "{$agent->name} hat den Chat übernommen",
            'message_type' => 'assignment',
            'metadata' => [
                'assigned_agent_id' => $agent->id,
                'assigned_agent_name' => $agent->name,
                'assigned_at' => now()
            ]
        ]);

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

    public function detectEscalationRequest(string $message): bool
    {
        $escalationKeywords = [
            'mitarbeiter', 'mitarbeiterin', 'berater', 'support', 'agent',
            'person', 'human', 'team', 'kundenservice', 'service', 'sprechen',
            'chef', 'manager', 'leitung', 'betreuer', 'assistenz', 'helfen',
            'hilfe', 'unterstützung', 'mensch', 'mitarbeiter sprechen',
            'mit mitarbeiter', 'echte person', 'echter mensch'
        ];

        $message = strtolower(trim($message));

        foreach ($escalationKeywords as $keyword) {
            // Direkter Treffer
            if (str_contains($message, $keyword)) {
                \Log::info('Escalation keyword detected: ' . $keyword);
                return true;
            }

            // ✅ VERBESSERT: Tippfehler-Toleranz mit prozentualer Ähnlichkeit
            // Längere Wörter bekommen mehr Toleranz für Tippfehler
            $words = explode(' ', $message);
            foreach ($words as $word) {
                // Nur Wörter mit mindestens 5 Zeichen prüfen (verhindert false positives bei kurzen Wörtern)
                if (strlen($word) < 5) continue;

                $distance = levenshtein($keyword, $word);
                $maxLength = max(strlen($keyword), strlen($word));
                $similarity = 1 - ($distance / $maxLength);

                // ✅ WICHTIG: Verschiedene Toleranz-Levels je nach Wortlänge
                // Kurze Wörter (5-7 Zeichen): 80% Ähnlichkeit ODER max. 2 Fehler
                // Lange Wörter (8+ Zeichen): 75% Ähnlichkeit ODER max. 3 Fehler
                $isShortWord = strlen($word) <= 7;
                $matchThreshold = $isShortWord ? 0.80 : 0.75;
                $maxDistance = $isShortWord ? 2 : 3;

                if ($similarity >= $matchThreshold || ($distance <= $maxDistance && strlen($word) >= 8)) {
                    \Log::info('Escalation detected via typo tolerance: ' . $word . ' -> ' . $keyword . ' (similarity: ' . round($similarity * 100) . '%, distance: ' . $distance . ')');
                    return true;
                }
            }
        }

        return false;
    }



    /*
    public function handleInputAnonymous(Request $request): \Illuminate\Http\JsonResponse
    {
        $sessionId = $request->header('X-Session-ID') ?? (string) \Illuminate\Support\Str::uuid();
        $chat = Chat::where('session_id', $sessionId)->first();

        // Wenn Chat bereits eskaliert wurde, Nachricht direkt speichern
        if ($chat && in_array($chat->status, ['human', 'in_progress', 'assigned'])) {
            Message::create([
                'chat_id' => $chat->id,
                'from' => 'user',
                'text' => $request->message,
                'is_escalation_trigger' => false
            ]);

            return response()->json([
                'status' => 'human',
                'session_id' => $sessionId,
                'message' => 'Nachricht wurde an Mitarbeiter weitergeleitet'
            ]);
        }

        $validated = $request->validate([
            'message' => 'required|string',
        ]);



        // Originale Benutzereingabe (für Speicherung)
        $originalInput = trim($validated['message']);

        // Normalisierte Eingabe (nur für Vergleich)
        $normalizedInput = mb_strtolower($originalInput);

        $responses = ChatbotResponse::all();
        $bestMatch = null;
        $lowestDistance = null;
        $matchedKeywords = null;
        $shouldEscalate = $this->detectEscalationRequest($normalizedInput);

        foreach ($responses as $response) {
            $distance = levenshtein($normalizedInput, mb_strtolower($response->input));
            $keywords = is_array($response->keywords)
                ? $response->keywords
                : json_decode($response->keywords, true);

            foreach ($keywords as $keyword) {
                if (strpos($normalizedInput, mb_strtolower($keyword)) !== false) {
                    $bestMatch = $response;
                    $matchedKeywords = $keyword;
                    break 2;
                }
            }

            if (is_null($lowestDistance) || $distance < $lowestDistance) {
                $lowestDistance = $distance;
                $bestMatch = $response;
            }
        }

        $reply = $matchedKeywords
            ? $bestMatch->response
            : (($lowestDistance !== null && $lowestDistance <= 3)
                ? $bestMatch->response
                : $this->generateFallbackReply($normalizedInput));

        // Chat-Sitzung prüfen oder erstellen
        $chat = Chat::firstOrCreate(
            ['session_id' => $sessionId],
            ['user_id' => null]
        );

        // ✅ Originale Eingabe speichern (nicht lowercased!)
        Message::create([
            'chat_id' => $chat->id,
            'from' => 'user',
            'text' => $originalInput,
        ]);

        Message::create([
            'chat_id' => $chat->id,
            'from' => 'bot',
            'text' => $reply,
        ]);

        $messages = Message::where('chat_id', $chat->id)
            ->orderBy('created_at', 'asc')
            ->get();

        $formattedMessages = $messages->map(function ($message) {
            return [
                'from' => $message->from,
                'text' => $message->text,
            ];
        });

        return response()->json([
            'messages' => $formattedMessages,
            'session_id' => $sessionId,
            'should_escalate' => $shouldEscalate
        ]);
    }
    */


    // Zustandsdefinitionen
    const STATE_IDLE = 'idle';
    const STATE_BOOKING_DESTINATION = 'booking_destination';
    const STATE_BOOKING_DATE = 'booking_date';
    const STATE_BOOKING_PERSONS = 'booking_persons';
    const STATE_BOOKING_CONTACT_INFO = 'booking_contact_info';
    const STATE_BOOKING_CONFIRMATION = 'booking_confirmation';

    public function handleInputAnonymous(Request $request): \Illuminate\Http\JsonResponse
    {
        $sessionId = $request->header('X-Session-ID')
            ?? $request->cookie('chat_session_id')
            ?? (string) Str::uuid();

        // Chat laden
        $chat = Chat::where('session_id', $sessionId)->first();

        // ✅ NEUE LOGIK: Wenn Chat "closed" ist, reaktivieren als Bot-Chat
        $reactivationMessage = null;
        if ($chat && $chat->status === 'closed') {
            $chat->update([
                'status' => 'bot',
                'assigned_to' => null,
                'assigned_at' => null,
                'assigned_agent' => null,
                'last_agent_activity' => null,
                'closed_at' => null,
                'closed_by_agent' => null,
                'close_reason' => null,
                'state' => self::STATE_IDLE,
                'context' => json_encode([])
            ]);

            // System-Nachricht für Reaktivierung (ERST ERSTELLEN, SPÄTER BROADCASTEN)
            $reactivationMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'system',
                'text' => 'Sie sprechen jetzt wieder mit unserem YISU Travel-Assistenten',
                'message_type' => 'chat_reactivated',
                'metadata' => [
                    'previous_status' => 'closed',
                    'new_status' => 'bot',
                    'reactivated_at' => now()
                ]
            ]);

            // Admin-Dashboard über Reaktivierung informieren
            event(new AllChatsUpdate([
                'type' => 'chat_reactivated',
                'chat' => [
                    'session_id' => $chat->session_id,
                    'chat_id' => $chat->id,
                    'status' => 'bot',
                    'customer_first_name' => $chat->visitor?->first_name ?? 'Anonymous',
                    'customer_last_name' => $chat->visitor?->last_name ?? '',
                    'last_message' => 'Chat reaktiviert - Chatbot aktiv',
                    'last_message_time' => now(),
                    'assigned_to' => null,
                    'assigned_agent' => null,
                    'chat_reactivated' => true
                ]
            ]));

            // Broadcasting wird später zusammen mit User-Nachricht gemacht (siehe unten)
        }

        // Wenn Chat bereits eskaliert wurde (aber nicht closed), Nachricht direkt weiterleiten
        if ($chat && in_array($chat->status, ['human', 'in_progress', 'assigned'])) {
            $userMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'user',
                'text' => $request->message,
                'is_escalation_trigger' => false
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
        $normalizedInput = mb_strtolower($originalInput);

        // Chat-Sitzung laden oder erstellen
        $chat = Chat::firstOrCreate(
            ['session_id' => $sessionId],
            [
                'user_id' => null,
                'state' => self::STATE_IDLE,
                'context' => json_encode([]),
                'status' => 'bot'
            ]
        );

        // Zustandsbehaftete Verarbeitung
        $replyData = $this->processWithState($chat, $normalizedInput, $originalInput);
        $reply = $replyData['reply'];
        $shouldEscalate = $replyData['should_escalate'] ?? $this->detectEscalationRequest($normalizedInput);

        // Nachrichten speichern
        $userMessage = Message::create([
            'chat_id' => $chat->id,
            'from' => 'user',
            'text' => $originalInput,
        ]);

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
                'text' => 'Möchten Sie mit einem unserer Mitarbeiter sprechen?',
                'message_type' => 'escalation_prompt',
                'metadata' => [
                    'escalation_prompt_id' => null,
                    'is_automatic' => true,
                    'options' => [
                        ['text' => 'Ja, gerne', 'value' => 'accept'],
                        ['text' => 'Nein, danke', 'value' => 'decline']
                    ]
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
                    'text' => 'Möchten Sie mit einem unserer Mitarbeiter sprechen?',
                    'timestamp' => $escalationMessage->created_at,
                    'message_type' => 'escalation_prompt',
                    'metadata' => [
                        'is_automatic' => true,
                        'escalation_prompt_id' => null,
                        'options' => [
                            ['text' => 'Ja, gerne', 'value' => 'accept'],
                            ['text' => 'Nein, danke', 'value' => 'decline']
                        ]
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
            // 1. Reaktivierungsnachricht NUR an Admin (Customer bekommt sie aus Response)
            if ($reactivationMessage && $reactivationMessage->id) {
                broadcast(new MessagePusher($reactivationMessage, $sessionId, [
                    'assigned_to' => null,
                    'agent_name' => null,
                    'status' => 'bot',
                    'chat_reactivated' => true
                ]))->toOthers(); // toOthers() = nur Admin, nicht Customer
            }

            // 2. Dann User-Nachricht (nur an Admin)
            if ($userMessage && $userMessage->id) {
                broadcast(new MessagePusher($userMessage, $sessionId))->toOthers();
            }

            // 3. Dann Bot-Antwort (nur an Customer)
            if ($botMessage && $botMessage->id) {
                broadcast(new MessagePusher($botMessage, $sessionId))->toOthers();
            }

            // 4. Zuletzt Escalation-Nachricht (nur an Admin - Customer bekommt sie aus Response)
            if ($escalationMessage && $escalationMessage->id) {
                broadcast(new MessagePusher($escalationMessage, $sessionId))->toOthers();
            }
        } catch (\Exception $e) {
            \Log::error('Broadcasting error: ' . $e->getMessage());
        }

        // ✅ Reaktivierungsnachricht VOR alle anderen Nachrichten einfügen
        if ($reactivationMessage) {
            array_unshift($responseMessages, [
                'from' => 'system',
                'text' => $reactivationMessage->text,
                'timestamp' => $reactivationMessage->created_at,
                'message_type' => 'chat_reactivated'
            ]);
        }

        return response()->json([
            'success' => true,
            'session_id' => $sessionId,
            'should_escalate' => false,
            'is_in_booking_process' => $replyData['is_in_booking_process'] ?? false,
            'state' => $chat->state,
            'status' => $chat->status,
            'new_messages' => $responseMessages,
            'messages' => $responseMessages,
            'reply' => $reply,
            'chat_reactivated' => $reactivationMessage !== null
        ]);
    }

    protected function processWithState(Chat $chat, string $input, string $originalInput): array
    {
        $context = json_decode($chat->context, true) ?? [];
        $currentState = $chat->state ?? self::STATE_IDLE;
        $reply = '';
        $shouldEscalate = false;
        $isInBookingProcess = $currentState !== self::STATE_IDLE;
        switch ($currentState) {
            case self::STATE_IDLE:
                if ($this->isBookingIntent($input)) {
                    $reply = "Alles klar! Wohin soll die Reise gehen?";
                    $chat->state = self::STATE_BOOKING_DESTINATION;
                    $chat->context = json_encode(['intent' => 'booking']);
                    $isInBookingProcess = true; // Immer noch im Prozess
                } else {
                    $reply = $this->getStandardResponse($input);
                    $isInBookingProcess = false;
                }
                break;

            case self::STATE_BOOKING_DESTINATION:
                // ✅ Ziel aus dem Text extrahieren
                $destination = $this->extractDestination($originalInput);

                if ($destination === 'unbekannt') {
                    $reply = "Entschuldigung, ich habe das Ziel nicht verstanden. " .
                        "Bitte gib das Reiseziel noch einmal an (z.B. 'Antalya', 'Berlin', etc.)";
                    // Zustand bleibt gleich - wir fragen nochmal nach der Destination
                    $isInBookingProcess = true; // Immer noch im Prozess
                } else {
                    $context['destination'] = $destination;
                    $reply = "Notiert. Für welches Datum soll nach {$destination} gebucht werden? (Format: TT.MM.JJJJ)";
                    $chat->state = self::STATE_BOOKING_DATE;
                    $chat->context = json_encode($context);
                    $isInBookingProcess = true; // Immer noch im Prozess
                }
                break;

            case self::STATE_BOOKING_DATE:
                if ($this->isValidDate($input)) {
                    $context['date'] = $input;
                    $reply = "Danke! Für wie viele Personen soll gebucht werden?";
                    $chat->state = self::STATE_BOOKING_PERSONS;
                    $chat->context = json_encode($context);
                    $isInBookingProcess = true; // Immer noch im Prozess
                } else {
                    $reply = "Bitte gib ein gültiges Datum im Format TT.MM.JJJJ ein.";
                }
                break;

            case self::STATE_BOOKING_PERSONS:
                if (is_numeric($input) && $input > 0) {
                    $context['persons'] = (int)$input;
                    $reply = "Danke! Nun benötige ich noch deine Kontaktdaten.\nBitte gib deinen vollständigen Namen ein:";
                    $chat->state = self::STATE_BOOKING_CONTACT_INFO;
                    $chat->context = json_encode($context);
                    $isInBookingProcess = true;
                } else {
                    $reply = "Bitte gib eine gültige Anzahl Personen an (Zahl größer 0).";
                }
                break;

            case self::STATE_BOOKING_CONTACT_INFO:
                // Schritt-für-Schritt Kontaktdaten erfassen
                if (!isset($context['contact_step'])) {
                    // Namen in Vor- und Nachname aufteilen
                    $nameParts = explode(' ', $originalInput, 2);
                    $context['first_name'] = $nameParts[0];
                    $context['last_name'] = count($nameParts) > 1 ? $nameParts[1] : '';
                    $context['contact_step'] = 'email';

                    $reply = "Vielen Dank, " . $context['first_name'] . "!\nBitte gib nun deine E-Mail-Adresse ein:";
                    $chat->context = json_encode($context);
                }
                elseif ($context['contact_step'] === 'email') {
                    // E-Mail validieren
                    if (filter_var($input, FILTER_VALIDATE_EMAIL)) {
                        $context['email'] = $input;
                        $context['contact_step'] = 'phone';
                        $reply = "Perfekt! Nun benötige ich noch deine Telefonnummer:";
                        $chat->context = json_encode($context);
                    } else {
                        $reply = "Das scheint keine gültige E-Mail-Adresse zu sein. Bitte gib eine gültige E-Mail-Adresse ein:";
                    }
                }
                elseif ($context['contact_step'] === 'phone') {
                    // Telefonnummer validieren (einfache Validierung)
                    if (preg_match('/^[0-9+\s\(\)\-]{6,20}$/', $input)) {
                        $context['phone'] = $input;

                        // Zusammenfassung anzeigen
                        $destination = $context['destination'] ?? 'unbekannt';
                        $date = $context['date'] ?? 'unbekannt';
                        $persons = $context['persons'] ?? 'unbekannt';
                        $name = trim(($context['first_name'] ?? '') . ' ' . ($context['last_name'] ?? ''));

                        $reply = "✅ Zusammenfassung deiner Buchung:\n" .
                            "📍 Ziel: $destination\n" .
                            "📅 Datum: $date\n" .
                            "👥 Personen: $persons\n" .
                            "👤 Name: $name\n" .
                            "📧 E-Mail: " . $context['email'] . "\n" .
                            "📞 Telefon: " . $context['phone'] . "\n\n" .
                            "Möchtest du die Buchung bestätigen? (Ja/Nein)";

                        $chat->state = self::STATE_BOOKING_CONFIRMATION;
                        $chat->context = json_encode($context);
                        $isInBookingProcess = true;
                    } else {
                        $reply = "Bitte gib eine gültige Telefonnummer ein:";
                    }
                }
                break;

            case self::STATE_BOOKING_CONFIRMATION:
                if ($this->isConfirmation($input)) {
                    // Visitor erstellen/speichern
                    $visitor = Visitor::updateOrCreate(
                        ['session_id' => $chat->session_id],
                        [
                            'first_name' => $context['first_name'],
                            'last_name' => $context['last_name'],
                            'email' => $context['email'],
                            'phone' => $context['phone']
                        ]
                    );

                    // Booking mit Visitor-ID speichern
                    $booking = $this->saveBooking($chat, $context, $visitor->id);

                    $reply = "✅ Buchung erfolgreich bestätigt! Vielen Dank für deine Buchung, " . ($context['first_name'] ?? '') . ".\n" .
                        "Wir haben eine Bestätigung an " . $context['email'] . " gesendet.";
                    $chat->state = self::STATE_IDLE;
                    $chat->context = json_encode([]);
                    $isInBookingProcess = false;
                }
                elseif ($this->isRejection($input)) {
                    $reply = "Buchung abgebrochen. Kann ich dir anderweitig helfen?";
                    $chat->state = self::STATE_IDLE;
                    $chat->context = json_encode([]);
                    $isInBookingProcess = false;
                }
                else {
                    $reply = "Bitte antworte mit 'Ja' zur Bestätigung oder 'Nein' zum Abbruch.";
                    $isInBookingProcess = true;
                }
                break;

            default:
                $reply = $this->getStandardResponse($input);
                $chat->state = self::STATE_IDLE;
                $chat->context = json_encode([]);
        }

        $chat->save();
        $shouldEscalate = $this->detectEscalationRequest($input);
        return [
            'reply' => $reply,
            'should_escalate' => $shouldEscalate,
            'is_in_booking_process' => $isInBookingProcess,
            'state' => $chat->state
        ];
    }

    protected function isBookingIntent(string $input): bool
    {
        $bookingKeywords = [
            'reise buchen', 'urlaub buchen', 'flug buchen', 'hotel buchen',
            'buchung', 'reise', 'urlaub', 'reiseplanung', 'reise buchen'
        ];

        foreach ($bookingKeywords as $keyword) {
            if (str_contains($input, $keyword)) {
                return true;
            }
        }

        return false;
    }

    protected function extractDestination(string $text): string
    {
        $originalText = $text; // Originaltext speichern
        $lowerText = mb_strtolower($text); // Nur für Vergleiche

        // Erweiterte Liste mit verschiedenen Schreibweisen
        $destinationPatterns = [
            'Antalya' => ['antalya', 'antalia', 'antalja'],
            'Konya' => ['konya', 'conya'],
            'Istanbul' => ['istanbul', 'constantinople', 'stambul'],
            'Berlin' => ['berlin', 'berlín'],
            'Paris' => ['paris'],
            'London' => ['london', 'londra'],
            'Frankreich' => ['frankreich', 'france', 'französisch'],
            'Spanien' => ['spanien', 'spain', 'españa'],
            'Italien' => ['italien', 'italy', 'italia'],
            'Österreich' => ['österreich'],
            // ... weitere Destinationen
        ];

        foreach ($destinationPatterns as $mainDestination => $variations) {
            foreach ($variations as $variation) {
                if (str_contains($lowerText, $variation)) {
                    return $mainDestination; // Gib den Haupt-Destinationsnamen zurück
                }
            }
        }

        // Versuche, die Destination mit Keywords zu finden (mit Originaltext)
        if (preg_match('/nach\s+(\w+)/i', $originalText, $matches)) {
            return ucfirst($matches[1]); // Ersten Buchstaben groß machen
        }

        if (preg_match('/nach\s+([\w\s]+)/i', $originalText, $matches)) {
            return ucfirst(trim($matches[1]));
        }

        if (preg_match('/\b(?:reise|urlaub|flug)\s+(?:nach|to)\s+([\w\s]+)/i', $originalText, $matches)) {
            return ucfirst(trim($matches[1]));
        }

        return 'unbekannt';
    }

    protected function isValidDate(string $date): bool
    {
        // Einfache Validierung für Datum im Format TT.MM.JJJJ
        $pattern = '/^\d{2}\.\d{2}\.\d{4}$/';
        return preg_match($pattern, $date) === 1;
    }

    protected function isConfirmation(string $input): bool
    {
        $confirmations = ['ja', 'yes', 'j', 'y', 'ok', 'bestätigen', 'confirm'];
        return in_array($input, $confirmations);
    }

    protected function isRejection(string $input): bool
    {
        $rejections = ['nein', 'no', 'n', 'abbrechen', 'cancel', 'stop'];
        return in_array($input, $rejections);
    }

    protected function getStandardResponse(string $input): string
    {
        // Deine bestehende Logik für Standardantworten
        $responses = ChatbotResponse::all();
        $bestMatch = null;
        $lowestDistance = null;
        $matchedKeywords = null;

        foreach ($responses as $response) {
            $distance = levenshtein($input, mb_strtolower($response->input));
            $keywords = is_array($response->keywords)
                ? $response->keywords
                : json_decode($response->keywords, true);

            foreach ($keywords as $keyword) {
                if (str_contains($input, mb_strtolower($keyword))) {
                    return $response->response;
                }
            }

            if (is_null($lowestDistance) || $distance < $lowestDistance) {
                $lowestDistance = $distance;
                $bestMatch = $response;
            }
        }

        return $matchedKeywords ? $bestMatch->response :
            (($lowestDistance !== null && $lowestDistance <= 3)
                ? $bestMatch->response
                : $this->generateFallbackReply($input));
    }



    protected function saveBooking(Chat $chat, array $context): Booking
    {
        // Visitor finden oder erstellen
        $visitor = Visitor::updateOrCreate(
            ['session_id' => $chat->session_id],
            [
           //     'name' => $context['name'],
                'first_name' => $context['first_name'],
                'last_name' => $context['last_name'] ?? '',
                'email' => $context['email'],
                'phone' => $context['phone']
            ]
        );

        // Datum konvertieren
        $travelDate = \Carbon\Carbon::createFromFormat('d.m.Y', $context['date']);

        // Booking erstellen
        $booking = Booking::create([
            'booking_number' => Booking::generateBookingNumber(),
            'session_id' => $chat->session_id,
            'chat_id' => $chat->id,
            'visitor_id' => $visitor->id, // Direkte Relation
            'destination' => $context['destination'],
            'travel_date' => $travelDate,
            'persons' => $context['persons'],
            'status' => 'confirmed',
            'metadata' => [
                'created_via' => 'chatbot',
                'original_context' => $context,
                'chat_session' => $chat->session_id
            ]
        ]);

        return $booking;
    }
    protected function generateFallbackReply(string $input): string
    {
        // Optional: Ähnliche Eingaben suchen
        $similar = ChatbotResponse::where('input', 'LIKE', "%$input%")->pluck('input');

        // Standardantwort zurückgeben
        return $similar->isEmpty()
            ? "Entschuldigung, ich habe das nicht verstanden. Bitte versuchen Sie es mit einer anderen Frage."
            : "Meinten Sie: " . $similar->join(', ');
    }






    public function end_chatbotSession(Request $request): \Illuminate\Http\JsonResponse
    {
        $sessionId = $request->header('X-Session-ID');
        if ($sessionId) {
            // Entferne den Chatverlauf aus der Datenbank basierend auf der session_id
            Chat::where('session_id', $sessionId)->delete();
        }

        // Generiere eine neue Session-ID für die nächste Sitzung
        $newSessionId = (string) \Illuminate\Support\Str::uuid();

        return response()->json([
            'message' => 'Sitzung wurde zurückgesetzt',
            'new_session_id' => $newSessionId,
        ]);
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
                'customer_first_name' => $visitor->first_name,
                'customer_last_name' => $visitor->last_name,
                'customer_phone' => $visitor->phone,
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
        $query = Chat::with(['messages.reads', 'messages.attachments', 'user', 'assignedTo', 'visitor', 'escalationPrompts.sentByAgent']);

        $chats = $query->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($chat) use ($user) {
                $lastMessage = $chat->messages->last();

                // ✅ Letzten Escalation-Prompt laden (falls vorhanden)
                $lastEscalationPrompt = $chat->escalationPrompts
                    ->where('status', 'sent')
                    ->sortByDesc('sent_at')
                    ->first();

                $chatData = [
                    'session_id' => $chat->session_id,
                    'chat_id' => $chat->id,
                    'customer_first_name' => $chat->visitor ? $chat->visitor->first_name : 'Anonymous',
                    'customer_last_name' => $chat->visitor ? $chat->visitor->last_name : 'Anonymous',
                    'customer_phone' => $chat->visitor ? $chat->visitor->phone : 'Nicht bekannt',
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
                    'assigned_to' => $chat->assigned_to,
                    'assigned_agent' => $chat->assignedTo ? $chat->assignedTo->name : null,
                    'messages' => $chat->messages->map(function ($message) use ($user) {
                        $messageData = [
                            'id' => $message->id,
                            'text' => $message->text,
                            'timestamp' => $message->created_at,
                            'from' => $message->from,
                            'read' => $message->reads()->where('user_id', $user->id)->exists(),
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
            });

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


    /**
     * Send a message as an agent - KORRIGIERT
     */
    public function sendAgentMessage(Request $request)
    {
        $validated = $request->validate([
            'chat_id' => 'required|exists:chats,id',
            'content' => 'required|string|max:1000',
            'isAgent' => 'required|boolean',
            'session_id' => 'required|string'
        ]);

        return DB::transaction(function () use ($validated) {
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
            $metadata = null;
            if ($validated['isAgent'] && Auth::check()) {
                $metadata = json_encode([
                    'agent_id' => Auth::id(),
                    'agent_name' => Auth::user()->name
                ]);
            }

            $message = Message::create([
                'id' => $messageId,
                'chat_id' => $chat->id,
                'from' => $validated['isAgent'] ? 'agent' : 'user',
                'text' => $validated['content'],
                'metadata' => $metadata,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // ❌ ENTFERNT: Automatische Zuweisung komplett entfernen
            // Keine automatische Assignment-Logik mehr

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

            // Broadcasting
            $this->broadcastMessageWithRetry($message, $sessionId, $assignmentData);

            return response()->json([
                'success' => true,
                'message' => [
                    'id' => $message->id,
                    'text' => $message->text,
                    'from' => $message->from,
                    'created_at' => $message->created_at,
                    'session_id' => $sessionId
                ]
            ]);
        });
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
            return response()->json(['error' => 'Chat session not found'], 404);
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
                'message' => 'Chat nicht gefunden'
            ], 404);
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
            $farewellMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'bot',
                'text' => 'Vielen Dank für die Nutzung unseres Supports. Sie können jederzeit einen neuen Chat beginnen.',
                'message_type' => 'chat_farewell',
                'metadata' => [
                    'ended_by' => 'agent',
                    'agent_name' => $agent->name,
                    'farewell_sent_at' => now()
                ]
            ]);

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
                    'customer_first_name' => $chat->visitor?->first_name ?? 'Anonymous',
                    'customer_last_name' => $chat->visitor?->last_name ?? '',
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
                'customer_first_name' => $chat->visitor?->first_name ?? 'Anonymous',
                'customer_last_name' => $chat->visitor?->last_name ?? '',
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

        $chats = Chat::with(['messages', 'user', 'assignedTo', 'visitor'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($chat) {
                $lastMessage = $chat->messages->last();
                $user = Auth::user();
                return [
                    'session_id' => $chat->session_id,
                    'chat_id' => $chat->id,
                   // 'customer_name' => $chat->visitor ? $chat->visitor->name : 'Anonymous',
                    'customer_first_name' => $chat->visitor ? $chat->visitor->first_name : 'Anonymous',
                    'customer_last_name' => $chat->visitor ? $chat->visitor->last_name : 'Anonymous',
                    'customer_phone' => $chat->visitor ? $chat->visitor->phone : 'Nicht bekannt',
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
                    'assigned_to' => $chat->assigned_to,
                    'assigned_agent' => $chat->assignedTo ? $chat->assignedTo->name : null,
                    'messages' => $chat->messages->map(function ($message) use ($user) {
                        return [
                            'id' => $message->id,
                            'text' => $message->text,
                            'timestamp' => $message->created_at,
                            'from' => $message->from,
                        ];
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
                        'customer_first_name' => $chat->visitor?->first_name ?? 'Anonymous',
                        'customer_last_name' => $chat->visitor?->last_name ?? '',
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
            $chat->update([
                'updated_at' => now()
                // assigned_to NICHT ändern!
            ]);

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
                        'customer_first_name' => $chat->visitor?->first_name ?? 'Anonymous',
                        'customer_last_name' => $chat->visitor?->last_name ?? '',
                        'last_message' => $message->text,
                        'last_message_time' => $message->created_at,
                        'unread_count' => Message::where('chat_id', $chat->id)
                            ->where('from', '!=', 'agent')
                            ->whereDoesntHave('reads')
                            ->count(),
                        'assigned_to' => $chat->assigned_to, // Aktueller Assignment-Status
                        'assigned_agent' => $chat->assignedTo?->name
                    ]
                ]));
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

}
