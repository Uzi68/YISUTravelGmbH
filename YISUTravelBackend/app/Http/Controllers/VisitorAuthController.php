<?php

namespace App\Http\Controllers;

use App\Models\Visitor;
use Illuminate\Http\Request;
use Pusher\Pusher;

class VisitorAuthController extends Controller
{
    public function authenticateVisitor(Request $request)
    {
        $channelName = $request->input('channel_name');
        $socketId = $request->input('socket_id');
        $sessionId = $request->header('X-Session-ID');

        // Channel-Name parsen
        if (preg_match('/private-chat\.(.+)/', $channelName, $matches)) {
            $channelSessionId = $matches[1];

            // Validiere Session
            if ($sessionId === $channelSessionId) {
                // Optional: Visitor in DB registrieren/updaten
                $visitor = Visitor::firstOrCreate(
                    ['session_id' => $sessionId],
                    ['ip_address' => hash('sha256', $request->ip())]
                );

                $pusher = new Pusher(
                    config('broadcasting.connections.pusher.key'),
                    config('broadcasting.connections.pusher.secret'),
                    config('broadcasting.connections.pusher.app_id'),
                    config('broadcasting.connections.pusher.options')
                );

                $auth = $pusher->authorizeChannel($channelName, $socketId);
                return response($auth);
            }
        }

        return response()->json(['error' => 'Unauthorized'], 403);
    }
}
