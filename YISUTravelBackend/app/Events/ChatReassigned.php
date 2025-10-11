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

class ChatReassigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $chat;
    public $newAgent;
    public $previousAgentId;

    public function __construct(Chat $chat, User $newAgent, $previousAgentId)
    {
        $this->chat = $chat;
        $this->newAgent = $newAgent;
        $this->previousAgentId = $previousAgentId;
    }

    public function broadcastOn()
    {
        return [
            new Channel('chat.' . $this->chat->session_id),
            new PrivateChannel('all.active.chats'),
            new Channel('user.' . $this->previousAgentId),
            new Channel('user.' . $this->newAgent->id),
        ];
    }

    public function broadcastAs()
    {
        return 'chat.reassigned';
    }
}
