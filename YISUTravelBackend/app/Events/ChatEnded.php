<?php

namespace App\Events;

use App\Models\Chat;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatEnded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $chat;
    public $endedBy;
    public $previousAgent;

    public function __construct(Chat $chat, $endedBy = 'visitor', $previousAgent = null)
    {
        $this->chat = $chat;
        $this->endedBy = $endedBy;
        $this->previousAgent = $previousAgent;
    }

    public function broadcastOn()
    {
        return new Channel('all.active.chats');
    }

    public function broadcastAs()
    {
        return 'chat.ended';
    }

    public function broadcastWith()
    {
        return [
            'session_id' => $this->chat->session_id,
            'chat_id' => $this->chat->id,
            'ended_by' => $this->endedBy,
            'previous_agent' => $this->previousAgent,
            'customer_name' => $this->chat->visitor ?
                "{$this->chat->visitor->first_name} {$this->chat->visitor->last_name}" :
                'Anonymous'
        ];
    }
}
