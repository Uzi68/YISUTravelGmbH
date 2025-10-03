<?php

namespace App\Http\Controllers;

use App\Models\Chat;
use App\Models\Visitor;
use Illuminate\Http\Request;
use Pusher\Pusher;
class BroadcastAuthController extends Controller
{
    /**
     * Authentifizierung für Visitor Private Channels
     */
    public function authenticate(Request $request)
    {
        $sessionId = $request->header('X-Session-ID');
        $channelName = $request->input('channel_name');
        $socketId = $request->input('socket_id');

        \Log::info('Visitor broadcast auth request:', [
            'session_id' => $sessionId,
            'channel' => $channelName,
            'socket_id' => $socketId,
            'headers' => $request->headers->all()
        ]);

        // Validierung der Parameter
        if (!$sessionId || !$channelName || !$socketId) {
            return response()->json([
                'error' => 'Missing required parameters'
            ], 403);
        }

        // Channel Format validieren
        if (!$this->isValidVisitorChannel($channelName, $sessionId)) {
            return response()->json([
                'error' => 'Invalid channel format'
            ], 403);
        }

        // Chat und Visitor existieren prüfen
        $chat = Chat::where('session_id', $sessionId)->first();
        $visitor = Visitor::where('session_id', $sessionId)->first();

        if (!$chat || !$visitor) {
            \Log::warning('Visitor auth failed - chat or visitor not found:', [
                'session_id' => $sessionId,
                'chat_exists' => !!$chat,
                'visitor_exists' => !!$visitor
            ]);

            return response()->json([
                'error' => 'Chat or visitor not found'
            ], 403);
        }

        // Pusher Authorization erstellen
        try {
            $pusher = new Pusher(
                config('broadcasting.connections.pusher.key'),
                config('broadcasting.connections.pusher.secret'),
                config('broadcasting.connections.pusher.app_id'),
                config('broadcasting.connections.pusher.options')
            );

            // Channel Data für Private Channel
            $channelData = json_encode([
                'user_id' => 'visitor-' . $sessionId,
                'user_info' => [
                    'name' => $visitor->first_name . ' ' . $visitor->last_name,
                    'session_id' => $sessionId,
                    'type' => 'visitor'
                ]
            ]);

            $auth = $pusher->authorizeChannel($channelName, $socketId, $channelData);

            \Log::info('Visitor auth successful:', [
                'session_id' => $sessionId,
                'channel' => $channelName
            ]);

            return response($auth, 200)
                ->header('Content-Type', 'application/json');

        } catch (\Exception $e) {
            \Log::error('Pusher auth error:', [
                'session_id' => $sessionId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Authentication failed'
            ], 500);
        }
    }

    /**
     * Validiert ob Channel für den Visitor berechtigt ist
     */
    private function isValidVisitorChannel(string $channelName, string $sessionId): bool
    {
        $validPatterns = [
            "private-chat.{$sessionId}",
            "private-visitor.{$sessionId}"
        ];

        foreach ($validPatterns as $pattern) {
            if ($channelName === $pattern) {
                return true;
            }
        }

        return false;
    }

    /**
     * Authentifizierung für Agent Private Channels (bereits authentifizierte User)
     */
    public function authenticateAgent(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->hasRole(['Admin', 'Agent'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $channelName = $request->input('channel_name');
        $socketId = $request->input('socket_id');

        try {
            $pusher = new Pusher(
                config('broadcasting.connections.pusher.key'),
                config('broadcasting.connections.pusher.secret'),
                config('broadcasting.connections.pusher.app_id'),
                config('broadcasting.connections.pusher.options')
            );

            $channelData = json_encode([
                'user_id' => $user->id,
                'user_info' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'type' => 'agent'
                ]
            ]);

            $auth = $pusher->authorizeChannel($channelName, $socketId, $channelData);

            return response($auth, 200)
                ->header('Content-Type', 'application/json');

        } catch (\Exception $e) {
            \Log::error('Agent Pusher auth error:', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json(['error' => 'Authentication failed'], 500);
        }
    }
}
