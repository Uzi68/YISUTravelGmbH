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

class ChatUnassigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $chat;
    public $previousAgent;
    public $unassignedBy;

    public function __construct(Chat $chat, ?User $previousAgent, User $unassignedBy)
    {
        $this->chat = $chat;
        $this->previousAgent = $previousAgent;
        $this->unassignedBy = $unassignedBy;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('all.active.chats'), // ✅ Admin-Dashboard Channel
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'chat.unassigned';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->chat->session_id,
            'chat_id' => $this->chat->id,
            'status' => $this->chat->status,
            'assigned_to' => null,
            'assigned_agent' => null,
            'previous_agent' => $this->previousAgent?->name,
            'unassigned_by' => $this->unassignedBy->name,
            'customer_name' => $this->chat->visitor
                ? ($this->chat->visitor->first_name . ' ' . $this->chat->visitor->last_name)
                : 'Anonymous',
            'last_message' => 'Zuweisung aufgehoben - wartet auf Übernahme',
            'last_message_time' => now(),
            'needs_assignment' => true,
            'isNew' => true,
            'timestamp' => now()
        ];
    }
}
