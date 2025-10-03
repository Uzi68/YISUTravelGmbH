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

class ChatStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $chat;
    public $oldStatus;
    public $newStatus;

    public function __construct(Chat $chat, string $oldStatus, string $newStatus)
    {
        $this->chat = $chat;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
    }

    public function broadcastOn()
    {
        return [
            new Channel('all.active.chats')
        ];
    }

    public function broadcastAs()
    {
        return 'chat.status.changed';
    }

    public function broadcastWith()
    {
        return [
            'session_id' => $this->chat->session_id,
            'chat_id' => $this->chat->id,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'status' => $this->newStatus,
            'can_assign' => $this->newStatus === 'human' && !$this->chat->assigned_to,
            'needs_assignment' => $this->newStatus === 'human',
            'timestamp' => now()
        ];
    }
}
