<?php

namespace App\Events;

use App\Models\Chat;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatAssignmentUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $chat;
    public $newAgent;
    public $previousAgent;

    public function __construct(Chat $chat, ?User $newAgent = null, ?User $previousAgent = null)
    {
        $this->chat = $chat;
        $this->newAgent = $newAgent;
        $this->previousAgent = $previousAgent;
    }

    public function broadcastOn()
    {
        return [
            new Channel('all.active.chats'),
            new Channel('chat.' . $this->chat->session_id)
        ];
    }

    public function broadcastAs()
    {
        return 'assignment.updated';
    }

    public function broadcastWith()
    {
        return [
            'session_id' => $this->chat->session_id,
            'chat_id' => $this->chat->id,
            'assigned_to' => $this->chat->assigned_to,
            'agent_name' => $this->newAgent ? $this->newAgent->name : null,
            'previous_agent' => $this->previousAgent ? $this->previousAgent->name : null,
            'status' => $this->chat->status,
            'unassigned' => $this->chat->assigned_to === null
        ];
    }
}
