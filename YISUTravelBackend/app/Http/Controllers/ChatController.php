<?php

namespace App\Http\Controllers;

use App\Events\ChatAssignmentUpdated;
use App\Models\Chat;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    /**
     * Chat einem Agent zuweisen
     */
    public function assignChat(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => 'required|string',
            'agent_id' => 'nullable|integer|exists:users,id'
        ]);

        $sessionId = $request->session_id;
        $agentId = $request->agent_id ?? Auth::id();

        try {
            DB::beginTransaction();

            // Chat finden
            $chat = Chat::where('session_id', $sessionId)->first();
            if (!$chat) {
                return response()->json(['error' => 'Chat nicht gefunden'], 404);
            }

            // Prüfen ob Chat bereits zugewiesen ist
            if ($chat->assigned_to && $chat->assigned_to !== $agentId) {
                return response()->json([
                    'error' => 'Chat ist bereits einem anderen Agent zugewiesen',
                    'assigned_agent' => $chat->assignedTo->name ?? 'Unbekannt'
                ], 409);
            }

            // Prüfen ob Chat im richtigen Status ist (human oder in_progress)
            if (!in_array($chat->status, ['human', 'in_progress'])) {
                return response()->json(['error' => 'Chat kann nicht zugewiesen werden. Status: ' . $chat->status], 400);
            }

            // Agent finden
            $agent = User::find($agentId);
            if (!$agent) {
                return response()->json(['error' => 'Agent nicht gefunden'], 404);
            }

            // Chat zuweisen
            $chat->assignTo($agent);

            // System-Nachricht senden
            $systemMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'system',
                'text' => "Chat wurde von {$agent->name} übernommen.",
                'message_type' => 'assignment',
                'metadata' => [
                    'assigned_agent_id' => $agent->id,
                    'assigned_agent_name' => $agent->name,
                    'assigned_at' => now()
                ]
            ]);

            // Pusher-Event senden
            broadcast(new MessageSent($systemMessage, $chat->session_id))->toOthers();
            broadcast(new ChatAssignmentUpdated($chat, 'assigned', $agent))->toOthers();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Chat erfolgreich zugewiesen',
                'chat' => [
                    'id' => $chat->id,
                    'session_id' => $chat->session_id,
                    'assigned_to' => $chat->assigned_to,
                    'assigned_agent' => $agent->name,
                    'status' => $chat->status,
                    'assigned_at' => $chat->assigned_at
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Fehler beim Zuweisen: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Chat an anderen Agent übertragen
     */
    public function transferChat(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => 'required|string',
            'new_agent_id' => 'required|integer|exists:users,id',
            'reason' => 'nullable|string|max:500'
        ]);

        $sessionId = $request->session_id;
        $newAgentId = $request->new_agent_id;
        $reason = $request->reason ?? 'Chat übertragen';
        $currentUserId = Auth::id();

        try {
            DB::beginTransaction();

            // Chat finden
            $chat = Chat::where('session_id', $sessionId)->first();
            if (!$chat) {
                return response()->json(['error' => 'Chat nicht gefunden'], 404);
            }

            // Prüfen ob aktueller User berechtigt ist (nur der zugewiesene Agent oder Admin)
            $user = Auth::user();
            if ($chat->assigned_to !== $currentUserId && !$user->hasRole('Admin')) {
                return response()->json(['error' => 'Keine Berechtigung für diese Aktion'], 403);
            }

            // Neuen Agent finden
            $newAgent = User::find($newAgentId);
            if (!$newAgent) {
                return response()->json(['error' => 'Neuer Agent nicht gefunden'], 404);
            }

            // Nicht an sich selbst übertragen
            if ($newAgentId === $currentUserId) {
                return response()->json(['error' => 'Chat kann nicht an sich selbst übertragen werden'], 400);
            }

            $oldAgentName = $chat->assignedTo->name ?? 'Unbekannt';

            // Chat übertragen
            $chat->transferTo($newAgent);

            // System-Nachrichten senden
            $transferMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'system',
                'text' => "Chat wurde von {$oldAgentName} an {$newAgent->name} übertragen. Grund: {$reason}",
                'message_type' => 'transfer',
                'metadata' => [
                    'from_agent_id' => $currentUserId,
                    'from_agent_name' => $oldAgentName,
                    'to_agent_id' => $newAgent->id,
                    'to_agent_name' => $newAgent->name,
                    'reason' => $reason,
                    'transferred_at' => now()
                ]
            ]);

            // Pusher-Event senden
            broadcast(new MessageSent($transferMessage, $chat->session_id))->toOthers();
            broadcast(new ChatAssignmentUpdated($chat, 'transferred', $newAgent, $user, $request->reason))->toOthers();
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Chat erfolgreich übertragen',
                'chat' => [
                    'id' => $chat->id,
                    'session_id' => $chat->session_id,
                    'assigned_to' => $chat->assigned_to,
                    'assigned_agent' => $newAgent->name,
                    'previous_agent' => $oldAgentName,
                    'status' => $chat->status,
                    'assigned_at' => $chat->assigned_at
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Fehler beim Übertragen: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Chat-Zuweisung aufheben (nur für Admins)
     */
    public function unassignChat(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => 'required|string',
            'reason' => 'nullable|string|max:500'
        ]);

        $sessionId = $request->session_id;
        $reason = $request->reason ?? 'Zuweisung aufgehoben';

        // Nur Admins dürfen Zuweisungen aufheben
        if (!Auth::user()->hasRole('Admin')) {
            return response()->json(['error' => 'Keine Berechtigung für diese Aktion'], 403);
        }
        $currentUser = Auth::user();
        try {
            DB::beginTransaction();

            // Chat finden
            $chat = Chat::where('session_id', $sessionId)->first();
            if (!$chat) {
                return response()->json(['error' => 'Chat nicht gefunden'], 404);
            }

            if (!$chat->assigned_to) {
                return response()->json(['error' => 'Chat ist nicht zugewiesen'], 400);
            }

            $previousAgentName = $chat->assignedTo->name ?? 'Unbekannt';

            // Zuweisung aufheben
            $chat->unassign();

            // System-Nachricht senden
            $systemMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'system',
                'text' => "Zuweisung von {$previousAgentName} wurde aufgehoben. Grund: {$reason}",
                'message_type' => 'unassignment',
                'metadata' => [
                    'previous_agent_name' => $previousAgentName,
                    'unassigned_by' => $currentUser->id,
                    'unassigned_by_name' => $currentUser->name,
                    'reason' => $reason,
                    'unassigned_at' => now()
                ]
            ]);

            // Pusher-Event senden
            broadcast(new MessageSent($systemMessage, $chat->session_id))->toOthers();
            broadcast(new ChatAssignmentUpdated($chat, 'unassigned', null, $currentUser))->toOthers();
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Chat-Zuweisung erfolgreich aufgehoben',
                'chat' => [
                    'id' => $chat->id,
                    'session_id' => $chat->session_id,
                    'assigned_to' => null,
                    'assigned_agent' => null,
                    'status' => $chat->status
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Fehler beim Aufheben der Zuweisung: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Verfügbare Agents für Übertragung abrufen
     */
    public function getAvailableAgents(): JsonResponse
    {
        try {
            // Alle Users mit Admin oder Agent Rolle
            $agents = User::whereHas('roles', function($query) {
                $query->whereIn('name', ['Admin', 'Agent']);
            })
                ->where('id', '!=', Auth::id()) // Aktuellen User ausschließen
                ->select('id', 'name', 'email')
                ->get();

            return response()->json([
                'success' => true,
                'agents' => $agents
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Fehler beim Laden der Agents: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Chat-Status und Zuweisungsinformationen abrufen
     */
    public function getChatAssignmentInfo(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => 'required|string'
        ]);

        try {
            $chat = Chat::with('assignedTo')
                ->where('session_id', $request->session_id)
                ->first();

            if (!$chat) {
                return response()->json(['error' => 'Chat nicht gefunden'], 404);
            }

            return response()->json([
                'success' => true,
                'chat' => [
                    'id' => $chat->id,
                    'session_id' => $chat->session_id,
                    'status' => $chat->status,
                    'assigned_to' => $chat->assigned_to,
                    'assigned_agent' => $chat->assignedTo->name ?? null,
                    'assigned_at' => $chat->assigned_at,
                    'can_assign' => $chat->status === 'human' && !$chat->assigned_to,
                    'can_write' => $chat->canUserWrite(Auth::id()),
                    'is_assigned_to_me' => $chat->assigned_to === Auth::id()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Fehler beim Laden der Chat-Informationen: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Escalation Prompt an Visitor senden (für Agents)
     */
    public function sendEscalationPrompt(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => 'required|string',
            'message' => 'nullable|string|max:500'
        ]);

        $sessionId = $request->session_id;
        $customMessage = $request->message ?? 'Ein Mitarbeiter möchte Ihnen helfen. Möchten Sie mit einem Mitarbeiter sprechen?';

        try {
            DB::beginTransaction();

            // Chat finden
            $chat = Chat::where('session_id', $sessionId)->first();
            if (!$chat) {
                return response()->json(['error' => 'Chat nicht gefunden'], 404);
            }

            // Prüfen ob Chat im Bot-Modus ist
            if ($chat->status !== 'bot') {
                return response()->json(['error' => 'Escalation Prompt kann nur bei Bot-Chats gesendet werden'], 400);
            }

            // Escalation Prompt-Nachricht senden
            $escalationMessage = Message::create([
                'chat_id' => $chat->id,
                'from' => 'bot',
                'text' => $customMessage,
                'metadata' => json_encode([
                    'type' => 'escalation_prompt',
                    'sent_by_agent' => Auth::id(),
                    'agent_name' => Auth::user()->name
                ])
            ]);

            $chat->update([
                'state' => ChatbotController::STATE_AWAITING_ESCALATION_CONSENT
            ]);

            // Pusher-Event senden
            broadcast(new MessageSent($escalationMessage, $chat->session_id))->toOthers();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Escalation Prompt erfolgreich gesendet',
                'escalation_message' => [
                    'id' => $escalationMessage->id,
                    'text' => $escalationMessage->text,
                    'timestamp' => $escalationMessage->created_at
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Fehler beim Senden des Escalation Prompts: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Verfügbare Chats für Assignment abrufen
     */
    public function getAvailableChats(): JsonResponse
    {
        try {
            $chats = Chat::unassigned()
                ->with(['visitor', 'escalationPrompts' => function($query) {
                    $query->latest();
                }])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($chat) {
                    return [
                        'id' => $chat->id,
                        'session_id' => $chat->session_id,
                        'status' => $chat->status,
                        'visitor_name' => $chat->visitor ?
                            ($chat->visitor->first_name . ' ' . $chat->visitor->last_name) :
                            'Anonymer Benutzer',
                        'created_at' => $chat->created_at,
                        'waiting_time' => $chat->created_at->diffInMinutes(),
                        'has_escalation_prompt' => $chat->escalationPrompts->count() > 0,
                        'last_escalation_prompt' => $chat->escalationPrompts->first()
                    ];
                });

            return response()->json([
                'success' => true,
                'chats' => $chats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Abrufen verfügbarer Chats: ' . $e->getMessage()
            ], 500);
        }
    }


}
