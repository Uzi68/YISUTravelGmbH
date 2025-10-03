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

class ChatAssigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $chat;
    public $agent;

    public function __construct(Chat $chat, User $agent)
    {
        $this->chat = $chat;
        $this->agent = $agent;
    }

    public function broadcastOn()
    {
        return [
            new Channel('chat.' . $this->chat->session_id),
            new Channel('all.active.chats'),
            new Channel('agent.' . $this->agent->id)
        ];
    }

    public function broadcastAs()
    {
        return 'chat.assigned';
    }

    public function broadcastWith()
    {
        return [
            'chat_id' => $this->chat->id,
            'session_id' => $this->chat->session_id,
            'assigned_to' => $this->agent->id,
            'agent_name' => $this->agent->name,
            'status' => $this->chat->status,
            'assigned_at' => $this->chat->assigned_at
        ];
    }
}
