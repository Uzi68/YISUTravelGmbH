<?php

use App\Models\User;
use App\Models\Chat;
use App\Models\Visitor;
use Illuminate\Support\Facades\Broadcast;

/*
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});


Broadcast::channel('chat.{sessionId}', function ($user, $sessionId) {
    return true;
});

Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    return true;
});

Broadcast::channel('all.active.chats', function ($user) {
    return true;
});

Broadcast::channel('contact.requests', function ($user) {
    return true;
});

Broadcast::channel('admin.dashboard', function ($user) {
    return $user->isAdmin ?? false;
});
*/

/*
// Für Admin-Dashboard (authentifizierte Benutzer)
Broadcast::channel('private-admin.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Für alle aktiven Chats (nur für Agents/Admins)
Broadcast::channel('private-all-active-chats', function ($user) {
    return $user->hasRole(['Admin', 'Agent']);
});

// Für individuelle Chat-Sessions
Broadcast::channel('private-chat.{sessionId}', function ($user, $sessionId) {
    // Für authentifizierte Benutzer
    if ($user) {
        // Admins und Agents können alle Chats sehen
        if ($user->hasRole(['Admin', 'Agent'])) {
            return true;
        }

        // Normale User können nur ihre eigenen Chats sehen
        $chat = Chat::where('session_id', $sessionId)
            ->where('user_id', $user->id)
            ->exists();
        return $chat;
    }

    // Für nicht-authentifizierte Benutzer (Visitors)
    // Session-basierte Authentifizierung
    return request()->header('X-Session-ID') === $sessionId;
});

// Für Agent-spezifische Channels
Broadcast::channel('private-agent.{agentId}', function ($user, $agentId) {
    return (int) $user->id === (int) $agentId;
});
*/

// Für authentifizierte Admin/Agent Benutzer
// 1. Admin/Agent Dashboard - nur für authentifizierte Admins/Agents
Broadcast::channel('private-admin-dashboard', function ($user) {
    return $user && $user->hasRole(['Admin', 'Agent']) ?
        ['id' => $user->id, 'name' => $user->name, 'type' => 'agent'] :
        false;
});

// 2. All Active Chats - nur für Admins/Agents
Broadcast::channel('private-all-active-chats', function ($user) {
    return $user && $user->hasRole(['Admin', 'Agent']) ?
        ['id' => $user->id, 'name' => $user->name, 'type' => 'agent'] :
        false;
});

// 3. Individuelle Chat Sessions - Dual Auth (Visitor + Agent)
Broadcast::channel('private-chat.{sessionId}', function ($user, $sessionId) {
    // Für authentifizierte User (Agents/Admins)
    if ($user) {
        if ($user->hasRole(['Admin', 'Agent'])) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'type' => 'agent',
                'can_view_all_chats' => true
            ];
        }

        // Normale User können nur ihre eigenen Chats sehen
        $chat = Chat::where('session_id', $sessionId)
            ->where('user_id', $user->id)
            ->exists();

        return $chat ? [
            'id' => $user->id,
            'name' => $user->name,
            'type' => 'user'
        ] : false;
    }

    // Für nicht-authentifizierte Benutzer (Visitors)
    // Diese werden über die separate Auth-Route authentifiziert
    $requestSessionId = request()->header('X-Session-ID');

    if ($requestSessionId === $sessionId) {
        // Visitor existiert prüfen
        $visitor = Visitor::where('session_id', $sessionId)->first();
        $chat = Chat::where('session_id', $sessionId)->first();

        if ($visitor && $chat) {
            return [
                'id' => 'visitor-' . $sessionId,
                'name' => $visitor->first_name . ' ' . $visitor->last_name,
                'type' => 'visitor',
                'session_id' => $sessionId
            ];
        }
    }

    return false;
});

// 4. Agent-spezifische Channels
Broadcast::channel('private-agent.{agentId}', function ($user, $agentId) {
    return $user && (int) $user->id === (int) $agentId ?
        ['id' => $user->id, 'name' => $user->name, 'type' => 'agent'] :
        false;
});

// 5. Visitor-spezifische Channels (für persönliche Benachrichtigungen)
Broadcast::channel('private-visitor.{sessionId}', function ($user, $sessionId) {
    // Nur für nicht-authentifizierte Visitors
    if ($user) {
        return false; // Authentifizierte User haben keinen Zugang zu Visitor-Channels
    }

    $requestSessionId = request()->header('X-Session-ID');

    if ($requestSessionId === $sessionId) {
        $visitor = Visitor::where('session_id', $sessionId)->first();

        if ($visitor) {
            return [
                'id' => 'visitor-' . $sessionId,
                'name' => $visitor->first_name . ' ' . $visitor->last_name,
                'type' => 'visitor',
                'session_id' => $sessionId
            ];
        }
    }

    return false;
});

// 6. Escalation Channels - nur für Agents
Broadcast::channel('private-escalations', function ($user) {
    return $user && $user->hasRole(['Admin', 'Agent']) ?
        ['id' => $user->id, 'name' => $user->name, 'type' => 'agent'] :
        false;
});

// 7. Transfer Notifications - nur für betroffene Agents
Broadcast::channel('private-transfer.{fromAgentId}.{toAgentId}', function ($user, $fromAgentId, $toAgentId) {
    if (!$user || !$user->hasRole(['Admin', 'Agent'])) {
        return false;
    }

    $userId = (int) $user->id;
    $fromId = (int) $fromAgentId;
    $toId = (int) $toAgentId;

    // Nur From-Agent, To-Agent oder Admins haben Zugang
    if ($userId === $fromId || $userId === $toId || $user->hasRole('Admin')) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'type' => 'agent',
            'is_involved' => ($userId === $fromId || $userId === $toId)
        ];
    }

    return false;
});
