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

class ChatTransferred implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $chat;
    public $fromAgent;
    public $toAgent;

    public function __construct(Chat $chat, User $fromAgent, User $toAgent)
    {
        $this->chat = $chat;
        $this->fromAgent = $fromAgent;
        $this->toAgent = $toAgent;
    }

    public function broadcastOn()
    {
        return [
            new Channel('chat.' . $this->chat->session_id),
            new Channel('all.active.chats'),
            new Channel('agent.' . $this->fromAgent->id),
            new Channel('agent.' . $this->toAgent->id)
        ];
    }

    public function broadcastAs()
    {
        return 'chat.transferred';
    }

    public function broadcastWith()
    {
        return [
            'chat_id' => $this->chat->id,
            'session_id' => $this->chat->session_id,
            'from_agent_id' => $this->fromAgent->id,
            'from_agent_name' => $this->fromAgent->name,
            'to_agent_id' => $this->toAgent->id,
            'to_agent_name' => $this->toAgent->name,
            'transferred_at' => now()
        ];
    }
}
