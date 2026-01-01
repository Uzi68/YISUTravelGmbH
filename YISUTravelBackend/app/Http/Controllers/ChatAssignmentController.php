<?php

namespace App\Http\Controllers;

use App\Events\AllChatsUpdate;
use App\Events\ChatAssigned;
use App\Events\ChatAssignmentUpdated;
use App\Events\ChatStatusChanged;
use App\Events\ChatTransferred;
use App\Events\MessagePusher;
use App\Models\Chat;
use App\Models\ChatTransfer;
use App\Models\EscalationPrompt;
use App\Models\Message;
use App\Models\User;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ChatAssignmentController extends Controller
{
    /**
     * Chat zu einem Agent zuweisen
     */
    public function assignChat(Request $request, $chatId): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string'
        ]);

        return DB::transaction(function () use ($chatId, $validated) {
            $chat = Chat::where('session_id', $chatId)
                ->whereIn('status', ['human', 'bot'])
                ->lockForUpdate()
                ->first();

            if (!$chat) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat nicht gefunden oder nicht verfügbar für Assignment'
                ], 404);
            }

            if ($chat->assigned_to) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat ist bereits einem anderen Agent zugewiesen'
                ], 409);
            }

            $agent = Auth::user();

            // Chat zuweisen
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

            if ($chat->channel === 'whatsapp' && $chat->whatsapp_number) {
                try {
                    $whatsappService = app(WhatsAppService::class);
                    $waResult = $whatsappService->sendTextMessage(
                        $chat->whatsapp_number,
                        $systemMessage->text
                    );
                    if (empty($waResult['success'])) {
                        Log::warning('WhatsApp assignment message failed', [
                            'chat_id' => $chat->id,
                            'whatsapp_number' => $chat->whatsapp_number,
                            'error' => $waResult['error'] ?? 'Unknown error'
                        ]);
                    }
                } catch (\Throwable $e) {
                    Log::warning('WhatsApp assignment message exception', [
                        'chat_id' => $chat->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // ✅ WICHTIG: Assignment-Daten mit broadcasten UND session_id setzen
            $assignmentData = [
                'assigned_to' => $agent->id,
                'agent_name' => $agent->name,
                'status' => 'in_progress',
                'chat_id' => $chat->id // ✅ CRITICAL: chat_id für File-Upload-Validierung
            ];

            // ✅ KORREKTUR: Explizit session_id für Message setzen
            $systemMessage->session_id = $chat->session_id;

            // Events auslösen mit Assignment-Daten
            broadcast(new MessagePusher($systemMessage, $chat->session_id, $assignmentData));
            event(new ChatAssigned($chat, $agent));

            // ✅ NEU: AllChatsUpdate Event für Echtzeit-Synchronisation ALLER Agents
            event(new AllChatsUpdate([
                'type' => 'chat_assigned',
                'chat' => [
                    'session_id' => $chat->session_id,
                    'chat_id' => $chat->id,
                    'status' => 'in_progress',
                    'customer_first_name' => $chat->visitor?->first_name ?? 'Anonymous',
                    'customer_last_name' => $chat->visitor?->last_name ?? '',
                    'customer_phone' => $chat->visitor?->phone,
                    'customer_avatar' => $chat->visitor?->avatar ?? null,
                    'last_message' => "{$agent->name} hat den Chat übernommen",
                    'last_message_time' => now(),
                    'unread_count' => 0,
                    'assigned_to' => $agent->id,
                    'assigned_agent' => $agent->name,
                    'agent_name' => $agent->name,
                    'assigned_at' => $chat->assigned_at,
                    'isNew' => false
                ]
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Chat erfolgreich zugewiesen',
                'chat' => [
                    'id' => $chat->id,
                    'session_id' => $chat->session_id,
                    'assigned_to' => $agent->id,
                    'agent_name' => $agent->name,
                    'status' => $chat->status,
                    'assigned_at' => $chat->assigned_at
                ]
            ]);
        });
    }
    /**
     * Chat zu einem anderen Agent übertragen
     */
// In ChatAssignmentController.php - transferChat Methode erweitern
    public function transferChat(Request $request, $chatId): JsonResponse
    {
        $validated = $request->validate([
            'to_agent_id' => 'required|exists:users,id',
            'reason' => 'nullable|string|max:500',
            'session_id' => 'required|string'
        ]);

        return DB::transaction(function () use ($chatId, $validated) {
            $chat = Chat::where('session_id', $chatId)->lockForUpdate()->first();

            if (!$chat) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat nicht gefunden'
                ], 404);
            }

            $currentAgent = Auth::user();
            $newAgent = User::findOrFail($validated['to_agent_id']);

            // Nur der aktuell zugewiesene Agent oder Admin kann übertragen
            if ($chat->assigned_to !== $currentAgent->id && !$currentAgent->hasRole('Admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Keine Berechtigung für diese Aktion'
                ], 403);
            }

            // Transfer-Record erstellen
            $transfer = ChatTransfer::create([
                'chat_id' => $chat->id,
                'from_agent_id' => $currentAgent->id,
                'to_agent_id' => $newAgent->id,
                'reason' => $validated['reason'],
                'transferred_at' => now()
            ]);

            // Chat aktualisieren
            $chat->update([
                'assigned_to' => $newAgent->id,
                'assigned_at' => now(),
                'last_agent_activity' => now(),
                'transfer_count' => $chat->transfer_count + 1
            ]);

            // System-Nachricht erstellen
            $systemMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'system',
                'text' => "Chat wurde von {$currentAgent->name} an {$newAgent->name} übertragen" .
                    ($validated['reason'] ? " (Grund: {$validated['reason']})" : ""),
                'message_type' => 'transfer',
                'metadata' => [
                    'transfer_id' => $transfer->id,
                    'from_agent_id' => $currentAgent->id,
                    'from_agent_name' => $currentAgent->name,
                    'to_agent_id' => $newAgent->id,
                    'to_agent_name' => $newAgent->name,
                    'reason' => $validated['reason']
                ]
            ]);

            if ($chat->channel === 'whatsapp' && $chat->whatsapp_number) {
                try {
                    $whatsappService = app(WhatsAppService::class);
                    $waResult = $whatsappService->sendTextMessage(
                        $chat->whatsapp_number,
                        $systemMessage->text
                    );
                    if (empty($waResult['success'])) {
                        Log::warning('WhatsApp transfer message failed', [
                            'chat_id' => $chat->id,
                            'whatsapp_number' => $chat->whatsapp_number,
                            'error' => $waResult['error'] ?? 'Unknown error'
                        ]);
                    }
                } catch (\Throwable $e) {
                    Log::warning('WhatsApp transfer message exception', [
                        'chat_id' => $chat->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // ✅ WICHTIG: Assignment-Daten für Broadcasting
            $assignmentData = [
                'assigned_to' => $newAgent->id,
                'agent_name' => $newAgent->name,
                'status' => 'in_progress',
                'chat_id' => $chat->id, // ✅ CRITICAL: chat_id für File-Upload-Validierung
                'chat_transferred' => true,
                'from_agent' => $currentAgent->name,
                'to_agent' => $newAgent->name,
                'transfer_reason' => $validated['reason']
            ];

            // ✅ NEU: Spezifische Events für alle betroffenen Agents

            // 1. Message Broadcasting (für Chat-Teilnehmer)
            broadcast(new MessagePusher($systemMessage, $chat->session_id, $assignmentData))->toOthers();

            // 2. Transfer Event (für alle Agents)
            event(new ChatTransferred($chat, $currentAgent, $newAgent));

            // 3. ✅ NEU: Admin-Dashboard Update (für alle Agents)
            event(new AllChatsUpdate([
                'type' => 'chat_transferred',
                'chat' => [
                    'session_id' => $chat->session_id,
                    'chat_id' => $chat->id,
                    'status' => 'in_progress',
                    'customer_first_name' => $chat->visitor?->first_name ?? 'Anonymous',
                    'customer_last_name' => $chat->visitor?->last_name ?? '',
                    'customer_phone' => $chat->visitor?->phone,
                    'last_message' => "Chat übertragen an {$newAgent->name}",
                    'last_message_time' => now(),
                    'unread_count' => 1, // Als ungelesen für neuen Agent markieren
                    'assigned_to' => $newAgent->id,
                    'assigned_agent' => $newAgent->name,
                    'from_agent_id' => $currentAgent->id,
                    'from_agent_name' => $currentAgent->name,
                    'to_agent_id' => $newAgent->id,
                    'to_agent_name' => $newAgent->name,
                    'transfer_reason' => $validated['reason'],
                    'chat_transferred' => true,
                    'isNew' => true, // Für neuen Agent als neu markieren
                    'needs_attention' => true
                ]
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Chat erfolgreich übertragen',
                'transfer' => [
                    'id' => $transfer->id,
                    'from_agent' => $currentAgent->name,
                    'to_agent' => $newAgent->name,
                    'reason' => $validated['reason'],
                    'transferred_at' => $transfer->transferred_at
                ]
            ]);
        });
    }

    /**
     * Chat-Assignment aufheben (nur für Admins)
     */
// In ChatAssignmentController.php - unassignChat Methode
    public function unassignChat(Request $request, $chatId): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string'
        ]);

        $currentUser = Auth::user();

        if (!$currentUser->hasRole('Admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Keine Berechtigung für diese Aktion'
            ], 403);
        }

        return DB::transaction(function () use ($chatId, $validated, $currentUser) {
            $chat = Chat::where('session_id', $chatId)->lockForUpdate()->first();

            if (!$chat) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat nicht gefunden'
                ], 404);
            }

            $previousAgent = $chat->assignedTo;
            $previousAgentName = $previousAgent ? $previousAgent->name : '';

            // ✅ WICHTIG: Alle Assignment-Felder vollständig zurücksetzen
            $chat->update([
                'assigned_to' => null,
                'assigned_at' => null,
                'assigned_agent' => null, // Falls dieses Feld existiert
                'last_agent_activity' => null,
                'status' => 'human', // Explizit auf 'human' setzen
                'transfer_count' => 0, // Transfer Count zurücksetzen
                'updated_at' => now() // Timestamp aktualisieren
            ]);

            // ✅ WICHTIG: Alle Escalation-Prompts für diesen Chat deaktivieren
            EscalationPrompt::where('chat_id', $chat->id)
                ->where('status', 'sent')
                ->update(['status' => 'cancelled']);

            // System-Nachricht erstellen
            $systemMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'system',
                'text' => "Bitte einen Moment Geduld – gleich ist ein Mitarbeiter für Sie da.",
                'message_type' => 'unassignment',
                'metadata' => [
                    'unassigned_by' => $currentUser->id,
                    'unassigned_by_name' => $currentUser->name,
                    'previous_agent_id' => $previousAgent?->id,
                    'previous_agent_name' => $previousAgentName,
                    'chat_reopened' => true
                ]
            ]);

            if ($chat->channel === 'whatsapp' && $chat->whatsapp_number) {
                try {
                    $whatsappService = app(WhatsAppService::class);
                    $waResult = $whatsappService->sendTextMessage(
                        $chat->whatsapp_number,
                        $systemMessage->text
                    );
                    if (empty($waResult['success'])) {
                        Log::warning('WhatsApp unassignment message failed', [
                            'chat_id' => $chat->id,
                            'whatsapp_number' => $chat->whatsapp_number,
                            'error' => $waResult['error'] ?? 'Unknown error'
                        ]);
                    }
                } catch (\Throwable $e) {
                    Log::warning('WhatsApp unassignment message exception', [
                        'chat_id' => $chat->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // ✅ Assignment-Daten für Broadcasting mit expliziten null-Werten
            $assignmentData = [
                'assigned_to' => null,
                'agent_name' => null,
                'status' => 'human',
                'chat_id' => $chat->id, // ✅ IMPORTANT: Behalte chat_id auch bei Unassignment
                'unassigned' => true,
                'previous_agent' => $previousAgentName,
                'unassigned_by' => $currentUser->name,
                'chat_available_for_assignment' => true // Explizites Flag
            ];

            // Broadcasting
            broadcast(new MessagePusher($systemMessage, $chat->session_id, $assignmentData))->toOthers();

            // ✅ Separates Unassignment Event
            broadcast(new \App\Events\ChatUnassigned($chat, $previousAgent, $currentUser))
                ->toOthers();

            // ✅ Admin-Dashboard Update mit korrekten Flags
            event(new AllChatsUpdate([
                'type' => 'chat_unassigned',
                'chat' => [
                    'session_id' => $chat->session_id,
                    'chat_id' => $chat->id,
                    'status' => 'human', // Explizit human
                    'customer_first_name' => $chat->visitor?->first_name ?? 'Anonymous',
                    'customer_last_name' => $chat->visitor?->last_name ?? '',
                    'last_message' => 'Zuweisung aufgehoben - wartet auf neue Übernahme',
                    'last_message_time' => now(),
                    'unread_count' => 1, // Als ungelesen markieren
                    'assigned_to' => null, // Explizit null
                    'assigned_agent' => null, // Explizit null
                    'previous_agent' => $previousAgentName,
                    'unassigned_by' => $currentUser->name,
                    'needs_assignment' => true, // Explizites Flag
                    'can_assign' => true, // Explizites Flag
                    'isNew' => true, // UI-Highlighting
                    'available_for_assignment' => true // Zusätzliches Flag
                ]
            ]));

            // Status-Change Event
            broadcast(new ChatStatusChanged($chat, 'in_progress', 'human'))->toOthers();

            return response()->json([
                'success' => true,
                'message' => 'Chat-Zuweisung erfolgreich aufgehoben',
                'chat_status' => 'human',
                'available_for_assignment' => true
            ]);
        });
    }
    /**
     * Verfügbare Agents für Transfer abrufen
     */
    public function getAvailableAgents(): JsonResponse
    {
        try {
            $currentUser = Auth::user();

            if (!$currentUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nicht authentifiziert',
                    'agents' => []
                ], 401);
            }

            // ✅ KORRIGIERT: Bessere Rollenprüfung und Filterung
            $agents = User::whereHas('roles', function ($query) {
                $query->whereIn('name', ['Admin', 'Agent']);
            })
                ->where('id', '!=', $currentUser->id) // Aktueller Benutzer ausschließen
                ->where(function ($query) {
                    $query->where('is_active', true)
                        ->orWhereNull('is_active'); // Falls is_active Feld nicht gesetzt
                })
                ->select('id', 'name', 'email', 'is_active', 'created_at')
                ->orderBy('name', 'asc')
                ->get()
                ->map(function ($agent) {
                    // Aktuelle Chats des Agents zählen
                    $currentChatsCount = Chat::where('assigned_to', $agent->id)
                        ->whereIn('status', ['in_progress', 'human'])
                        ->count();

                    // Letzte Aktivität prüfen
                    $lastActivity = Chat::where('assigned_to', $agent->id)
                        ->orderBy('last_agent_activity', 'desc')
                        ->value('last_agent_activity');

                    return [
                        'id' => $agent->id,
                        'name' => $agent->name,
                        'email' => $agent->email,
                        'is_active' => $agent->is_active ?? true,
                        'current_chats' => $currentChatsCount,
                        'last_activity' => $lastActivity,
                        'workload_status' => $this->getWorkloadStatus($currentChatsCount)
                    ];
                })
                ->filter(function ($agent) {
                    // Nur aktive Agents mit weniger als 10 gleichzeitigen Chats
                    return $agent['is_active'] && $agent['current_chats'] < 10;
                })
                ->values(); // Array-Indizes neu nummerieren

            \Log::info('Available agents loaded:', [
                'total_users_checked' => User::whereHas('roles', function ($query) {
                    $query->whereIn('name', ['Admin', 'Agent']);
                })->count(),
                'current_user_id' => $currentUser->id,
                'available_agents_count' => $agents->count(),
                'agents' => $agents->toArray()
            ]);

            return response()->json([
                'success' => true,
                'agents' => $agents,
                'meta' => [
                    'total_available' => $agents->count(),
                    'current_user' => $currentUser->name,
                    'timestamp' => now()
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Error loading available agents: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Laden der verfügbaren Agents',
                'agents' => [],
                'error' => app()->environment('local') ? $e->getMessage() : 'Server error'
            ], 500);
        }
    }

    private function getWorkloadStatus(int $chatCount): string
    {
        if ($chatCount === 0) {
            return 'available';
        } elseif ($chatCount <= 3) {
            return 'light';
        } elseif ($chatCount <= 6) {
            return 'moderate';
        } elseif ($chatCount <= 9) {
            return 'heavy';
        } else {
            return 'full';
        }
    }

    /**
     * Chat-Assignment Status prüfen - auch für anonyme Benutzer
     */
    public function getAssignmentStatus($chatId): JsonResponse
    {
        $chat = Chat::where('session_id', $chatId)
            ->with('assignedTo:id,name,email')
            ->first();

        if (!$chat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat nicht gefunden'
            ], 404);
        }

        // ✅ Für anonyme Benutzer: Prüfung überspringen
        $currentUser = Auth::user();
        $canUserWrite = false;

        if ($currentUser) {
            // Authentifizierter Benutzer
            $canUserWrite = $chat->canUserWrite($currentUser->id);
        } else {
            // Anonymer Benutzer: Kann schreiben wenn Chat nicht zugewiesen ist oder auf human wartet
            $canUserWrite = in_array($chat->status, ['human', 'bot']) || !$chat->assigned_to;
        }

        return response()->json([
            'success' => true,
            'assignment_status' => [
                'is_assigned' => (bool) $chat->assigned_to,
                'assigned_to' => $chat->assignedTo,
                'assigned_at' => $chat->assigned_at,
                'can_user_write' => $canUserWrite,
                'status' => $chat->status,
                'transfer_count' => $chat->transfer_count ?? 0
            ]
        ]);
    }
    /**
     * Transfer-History eines Chats abrufen
     */
    public function getTransferHistory($chatId): JsonResponse
    {
        $chat = Chat::where('session_id', $chatId)->first();

        if (!$chat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat nicht gefunden'
            ], 404);
        }

        $transfers = ChatTransfer::where('chat_id', $chat->id)
            ->with(['fromAgent:id,name', 'toAgent:id,name'])
            ->orderBy('transferred_at', 'desc')
            ->get()
            ->map(function ($transfer) {
                return [
                    'id' => $transfer->id,
                    'from_agent' => $transfer->fromAgent->name,
                    'to_agent' => $transfer->toAgent->name,
                    'reason' => $transfer->reason,
                    'transferred_at' => $transfer->transferred_at
                ];
            });

        return response()->json([
            'success' => true,
            'transfers' => $transfers
        ]);
    }

    public function getExplicitAssignmentStatus($chatId): JsonResponse
    {
        $chat = Chat::where('session_id', $chatId)
            ->with('assignedTo:id,name,email')
            ->first();

        if (!$chat) {
            return response()->json([
                'success' => false,
                'message' => 'Chat nicht gefunden'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'session_id' => $chat->session_id,
            'chat_id' => $chat->id,
            'status' => $chat->status,
            'assignment_status' => [
                'is_assigned' => !is_null($chat->assigned_to), // Explizite boolean Prüfung
                'assigned_to' => $chat->assigned_to,
                'assigned_agent_name' => $chat->assignedTo?->name,
                'assigned_at' => $chat->assigned_at,
                'can_assign' => is_null($chat->assigned_to) && $chat->status === 'human',
                'needs_assignment' => is_null($chat->assigned_to) && $chat->status === 'human',
                'transfer_count' => $chat->transfer_count ?? 0
            ],
            'debug_info' => [
                'assigned_to_raw' => $chat->assigned_to,
                'assigned_to_type' => gettype($chat->assigned_to),
                'assigned_to_is_null' => is_null($chat->assigned_to),
                'status_raw' => $chat->status
            ]
        ]);
    }
}
