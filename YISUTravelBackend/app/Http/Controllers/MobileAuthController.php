<?php

namespace App\Http\Controllers;

use App\Events\AllChatsUpdate;
use App\Events\ChatEnded;
use App\Events\ChatStatusChanged;
use App\Models\Chat;
use App\Models\ChatRequest;
use App\Models\ChatTransfer;
use App\Models\Escalation;
use App\Models\EscalationPrompt;
use App\Models\MessageAttachment;
use App\Models\PushSubscription;
use App\Models\User;
use App\Models\Visitor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class MobileAuthController extends Controller
{
    /**
     * Registriert einen neuen App-Nutzer mit Telefonnummer + Name + Email.
     * Gibt einen Sanctum API-Token zurück (kein Passwort nötig).
     *
     * POST /api/mobile/register
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone'      => 'required|string|max:30',
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'nullable|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Prüfen ob Telefonnummer ODER E-Mail bereits registriert → direkt einloggen
        $existing = User::where(function ($q) use ($request) {
                $q->where('phone', $request->phone);
                if ($request->email) {
                    $q->orWhere('email', $request->email);
                }
            })
            ->where('user_type', User::USER_TYPE_CUSTOMER)
            ->first();

        if ($existing) {
            // Telefonnummer aktualisieren falls noch nicht gesetzt
            if (!$existing->phone && $request->phone) {
                $existing->update(['phone' => $request->phone]);
            }
            return response()->json([
                'message' => 'Bereits registriert. Einloggen...',
                'already_registered' => true,
            ], 409);
        }

        // E-Mail könnte von einem Staff-Account belegt sein → dann ohne E-Mail registrieren
        $email = $request->email;
        if ($email && User::where('email', $email)->exists()) {
            $email = null;
        }

        $user = User::create([
            'name'       => $request->first_name . ' ' . $request->last_name,
            'first_name' => $request->first_name,
            'last_name'  => $request->last_name,
            'email'      => $email,
            'phone'      => $request->phone,
            'password'   => bcrypt(Str::random(32)), // Kein echtes Passwort
            'user_type'  => User::USER_TYPE_CUSTOMER,
            'is_active'  => true,
        ]);

        $user->assignRole('User');

        // Persistente Session-ID für diesen Nutzer erstellen
        $sessionId = (string) Str::uuid();

        Visitor::create([
            'session_id'      => $sessionId,
            'first_name'      => $user->first_name,
            'last_name'       => $user->last_name,
            'email'           => $user->email,
            'phone'           => $user->phone,
            'channel'         => 'app',
            'agb_accepted'    => true,
            'agb_accepted_at' => now(),
            'agb_version'     => '1.0',
        ]);

        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'token'      => $token,
            'session_id' => $sessionId,
            'user'       => $this->userResponse($user),
        ], 201);
    }

    /**
     * Login mit Telefonnummer (kein Passwort).
     * Gibt einen neuen Sanctum API-Token zurück.
     *
     * POST /api/mobile/login
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|max:30',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('phone', $request->phone)
            ->where('user_type', User::USER_TYPE_CUSTOMER)
            ->first();

        if (!$user) {
            return response()->json([
                'message'      => 'Nicht gefunden',
                'not_found'    => true,
            ], 404);
        }

        // Existierende Session-ID des Nutzers holen (persistente Session)
        $visitor = Visitor::where('phone', $user->phone)
            ->where('channel', 'app')
            ->first();

        // Falls kein Visitor-Eintrag existiert (Altdaten), einen erstellen
        if (!$visitor) {
            $sessionId = (string) Str::uuid();
            Visitor::create([
                'session_id'      => $sessionId,
                'first_name'      => $user->first_name,
                'last_name'       => $user->last_name,
                'email'           => $user->email,
                'phone'           => $user->phone,
                'channel'         => 'app',
                'agb_accepted'    => true,
                'agb_accepted_at' => now(),
                'agb_version'     => '1.0',
            ]);
        } else {
            $sessionId = $visitor->session_id;
        }

        // Alte Mobile-Tokens löschen und neuen erstellen
        $user->tokens()->where('name', 'mobile-app')->delete();
        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'token'      => $token,
            'session_id' => $sessionId,
            'user'       => $this->userResponse($user),
        ]);
    }

    /**
     * Gibt die Daten des eingeloggten App-Nutzers zurück.
     *
     * GET /api/mobile/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $visitor = Visitor::where('phone', $user->phone)
            ->where('channel', 'app')
            ->first();

        return response()->json([
            'user'       => $this->userResponse($user),
            'session_id' => $visitor?->session_id,
        ]);
    }

    /**
     * Aktualisiert Profildaten des eingeloggten App-Nutzers.
     *
     * PATCH /api/mobile/me
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name'  => 'sometimes|string|max:255',
            'email'      => 'sometimes|nullable|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = array_filter($request->only(['first_name', 'last_name', 'email']));

        if (isset($data['first_name']) || isset($data['last_name'])) {
            $firstName = $data['first_name'] ?? $user->first_name;
            $lastName  = $data['last_name']  ?? $user->last_name;
            $data['name'] = $firstName . ' ' . $lastName;
        }

        $user->update($data);

        // Visitor-Eintrag synchronisieren
        Visitor::where('phone', $user->phone)
            ->where('channel', 'app')
            ->update(array_filter([
                'first_name' => $data['first_name'] ?? null,
                'last_name'  => $data['last_name']  ?? null,
                'email'      => $data['email']       ?? null,
            ]));

        // Admin-Dashboard in Echtzeit über Namensänderung informieren
        $freshUser = $user->fresh();
        $visitors = Visitor::where('phone', $user->phone)->where('channel', 'app')->get();
        foreach ($visitors as $v) {
            $chat = Chat::where('session_id', $v->session_id)->first();
            if ($chat) {
                event(new AllChatsUpdate([
                    'type'                => 'visitor_updated',
                    'session_id'          => $v->session_id,
                    'customer_name'       => $freshUser->name,
                    'customer_first_name' => $freshUser->first_name,
                    'customer_last_name'  => $freshUser->last_name,
                    'customer_email'      => $freshUser->email,
                    'customer_phone'      => $freshUser->phone,
                ]));
            }
        }

        return response()->json([
            'user' => $this->userResponse($freshUser),
        ]);
    }

    /**
     * Gibt den Chatverlauf des eingeloggten App-Nutzers zurück.
     * Akzeptiert session_id als Query-Parameter (Priorität) oder X-Session-ID Header.
     *
     * GET /api/mobile/chat-history
     */
    public function chatHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        // Session-ID aus Query-Parameter (Priorität) oder Header lesen
        $sessionId = $request->query('session_id') ?? $request->header('X-Session-ID');

        if ($sessionId) {
            // Sicherstellen, dass die Session dem Nutzer gehört
            $visitor = Visitor::where('phone', $user->phone)
                ->where('session_id', $sessionId)
                ->where('channel', 'app')
                ->first();

            if (!$visitor) {
                return response()->json(['error' => 'Forbidden'], 403);
            }
        } else {
            $visitor = Visitor::where('phone', $user->phone)
                ->where('channel', 'app')
                ->first();
            $sessionId = $visitor?->session_id;
        }

        if (!$sessionId) {
            return response()->json(['messages' => []]);
        }

        $chat = Chat::where('session_id', $sessionId)->first();

        if (!$chat) {
            return response()->json(['messages' => []]);
        }

        $messages = $chat->messages()
            ->with('attachments')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($m) {
                $attachment = $m->attachments->first();
                return [
                    'from'       => $m->from,
                    'text'       => $m->text,
                    'created_at' => $m->created_at,
                    'attachment' => $attachment ? [
                        'id'           => $attachment->id,
                        'file_name'    => $attachment->file_name,
                        'file_type'    => $attachment->file_type,
                        'file_size'    => $attachment->file_size,
                        'download_url' => url('api/attachments/' . $attachment->id . '/download'),
                    ] : null,
                ];
            });

        return response()->json([
            'messages' => $messages,
            'chat_id'  => $chat->id,
        ]);
    }

    /**
     * Listet alle Chat-Sessions des eingeloggten App-Nutzers auf.
     *
     * GET /api/mobile/sessions
     */
    public function sessions(Request $request): JsonResponse
    {
        $user = $request->user();

        // Alle App-Visitors dieses Nutzers (auch ohne Chat-Record)
        $visitors = Visitor::where('phone', $user->phone)
            ->where('channel', 'app')
            ->orderBy('created_at', 'desc')
            ->get();

        if ($visitors->isEmpty()) {
            return response()->json(['sessions' => []]);
        }

        $sessions = $visitors->map(function ($visitor) {
            $chat = Chat::where('session_id', $visitor->session_id)
                ->with(['messages' => function ($q) {
                    $q->orderBy('created_at', 'desc')->limit(1);
                }])
                ->first();

            $lastMessage = $chat?->messages->first();
            $messageCount = 0;
            if ($chat) {
                $query = $chat->messages();
                if ($visitor->last_read_at) {
                    $query = $query->where('created_at', '>', $visitor->last_read_at);
                }
                $messageCount = $query->count();
            }

            return [
                'session_id'        => $visitor->session_id,
                'last_message'      => $lastMessage?->text ?? null,
                'last_message_from' => $lastMessage?->from ?? null,
                'last_message_at'   => $lastMessage?->created_at ?? null,
                'created_at'        => $visitor->created_at,
                'message_count'     => $messageCount,
            ];
        })
        // Sortierung: Sessions mit Nachrichten zuerst, dann nach letzter Aktivität
        ->sortByDesc(function ($s) {
            return $s['last_message_at'] ?? $s['created_at'];
        })
        ->values();

        return response()->json(['sessions' => $sessions]);
    }

    /**
     * Erstellt eine neue Chat-Session für den eingeloggten App-Nutzer.
     *
     * POST /api/mobile/sessions
     */
    public function createSession(Request $request): JsonResponse
    {
        $user = $request->user();

        $sessionId = (string) Str::uuid();

        Visitor::create([
            'session_id'      => $sessionId,
            'first_name'      => $user->first_name,
            'last_name'       => $user->last_name,
            'email'           => $user->email,
            'phone'           => $user->phone,
            'channel'         => 'app',
            'agb_accepted'    => true,
            'agb_accepted_at' => now(),
            'agb_version'     => '1.0',
        ]);

        return response()->json(['session_id' => $sessionId], 201);
    }

    /**
     * Registriert oder aktualisiert den FCM Push-Token des eingeloggten App-Nutzers.
     *
     * POST /api/mobile/push-token
     */
    public function registerPushToken(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'token'       => 'required|string',
            'device_id'   => 'nullable|string|max:191',
            'device_name' => 'nullable|string|max:191',
            'platform'    => 'nullable|string|max:50',
        ]);

        // Alte Tokens für dieses Gerät deaktivieren
        if (!empty($validated['device_id'])) {
            PushSubscription::where('device_id', $validated['device_id'])
                ->where('user_id', $user->id)
                ->where('token', '!=', $validated['token'])
                ->update(['is_active' => false]);
        }

        PushSubscription::updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id'     => $user->id,
                'device_id'   => $validated['device_id'] ?? null,
                'device_name' => $validated['device_name'] ?? null,
                'platform'    => $validated['platform'] ?? 'android',
                'last_seen_at' => now(),
                'is_active'   => true,
            ]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Löscht eine Chat-Session des eingeloggten App-Nutzers.
     *
     * DELETE /api/mobile/sessions/{sessionId}
     */
    public function deleteSession(Request $request, string $sessionId): JsonResponse
    {
        $user = $request->user();

        $visitor = Visitor::where('phone', $user->phone)
            ->where('session_id', $sessionId)
            ->where('channel', 'app')
            ->first();

        if (!$visitor) {
            return response()->json(['error' => 'Session nicht gefunden'], 404);
        }

        // Chat und alle verknüpften Datensätze löschen
        $chat = Chat::where('session_id', $sessionId)->first();
        if ($chat) {
            // Admin-Dashboard via Pusher benachrichtigen, bevor die Daten gelöscht werden
            if ($chat->status !== 'closed') {
                $assignedAgent = $chat->assignedTo;
                $wasAssigned = (bool) $chat->assigned_to;

                $chat->update([
                    'status' => 'closed',
                    'closed_at' => now(),
                    'assigned_to' => null,
                    'assigned_at' => null,
                    'assigned_agent' => null,
                    'last_agent_activity' => null,
                    'archived_at' => now(),
                ]);

                broadcast(new ChatEnded($chat, 'visitor', $assignedAgent?->name))->toOthers();

                event(new AllChatsUpdate([
                    'type' => 'chat_ended_by_visitor',
                    'chat' => [
                        'session_id' => $chat->session_id,
                        'chat_id' => $chat->id,
                        'status' => 'closed',
                        'channel' => $chat->channel ?? 'website',
                        'customer_first_name' => $visitor->first_name ?? 'Anonymous',
                        'customer_last_name' => $visitor->last_name ?? '',
                        'last_message' => 'Chat vom Nutzer gelöscht',
                        'last_message_time' => now(),
                        'ended_by' => 'visitor',
                        'previous_agent' => $assignedAgent?->name,
                        'chat_closed' => true,
                        'remove_from_list' => true,
                    ]
                ]));

                broadcast(new ChatStatusChanged(
                    $chat,
                    $wasAssigned ? 'in_progress' : 'bot',
                    'closed'
                ))->toOthers();
            }

            // Nachrichten-Anhänge löschen
            $messageIds = $chat->messages()->pluck('id');
            if ($messageIds->isNotEmpty()) {
                MessageAttachment::whereIn('message_id', $messageIds)->delete();
            }

            // Alle verknüpften Datensätze in korrekter Reihenfolge löschen
            $chat->escalationPrompts()->delete();
            $chat->escalations()->delete();
            ChatTransfer::where('chat_id', $chat->id)->delete();
            ChatRequest::where('chat_id', $chat->id)->delete();
            $chat->messages()->delete();
            $chat->delete();
        }

        $visitor->delete();

        return response()->json(['message' => 'Session gelöscht'], 200);
    }

    /**
     * Markiert alle Nachrichten einer Session als gelesen.
     *
     * POST /api/mobile/sessions/{sessionId}/read
     */
    public function markSessionAsRead(Request $request, string $sessionId): JsonResponse
    {
        $user = $request->user();

        $visitor = Visitor::where('phone', $user->phone)
            ->where('channel', 'app')
            ->where('session_id', $sessionId)
            ->first();

        if (!$visitor) {
            return response()->json(['message' => 'Session nicht gefunden'], 404);
        }

        $visitor->update(['last_read_at' => now()]);

        return response()->json(['message' => 'Als gelesen markiert']);
    }

    private function userResponse(User $user): array
    {
        return [
            'id'         => $user->id,
            'first_name' => $user->first_name,
            'last_name'  => $user->last_name,
            'name'       => $user->name,
            'email'      => $user->email,
            'phone'      => $user->phone,
            'user_type'  => $user->user_type,
        ];
    }
}
