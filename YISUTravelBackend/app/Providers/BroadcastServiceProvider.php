<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

class BroadcastServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot()
    {
        // Custom auth endpoint für Visitors
        Broadcast::routes(['middleware' => ['web']]);

        // Auth logic für nicht-authentifizierte Benutzer
        Broadcast::channel('private-chat.{sessionId}', function ($user, $sessionId) {
            // Wenn User authentifiziert
            if ($user) {
                if ($user->hasRole(['Admin', 'Agent'])) {
                    return ['id' => $user->id, 'name' => $user->name];
                }

                $chat = \App\Models\Chat::where('session_id', $sessionId)
                    ->where('user_id', $user->id)
                    ->exists();

                return $chat ? ['id' => $user->id, 'name' => $user->name] : false;
            }

            // Für Visitors: Session-basierte Auth
            $requestSessionId = request()->header('X-Session-ID') ??
                request()->input('session_id');

            if ($requestSessionId === $sessionId) {
                return ['id' => 'visitor-' . $sessionId, 'name' => 'Visitor'];
            }

            return false;
        });

        require base_path('routes/channels.php');
    }

}
