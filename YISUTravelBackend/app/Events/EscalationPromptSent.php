<?php

namespace App\Events;

use App\Models\Chat;
use App\Models\EscalationPrompt;
use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EscalationPromptSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;
    public $sessionId;

    public function __construct(Message $message, string $sessionId)
    {
        $this->message = $message;
        $this->sessionId = $sessionId;
    }

    public function broadcastOn()
    {
        return [
            new Channel('chat.' . $this->sessionId),
            new PrivateChannel('all.active.chats')
        ];
    }

    public function broadcastAs()
    {
        return 'escalation.prompt.sent';
    }

    public function broadcastWith()
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'from' => $this->message->from,
                'text' => $this->message->text,
                'message_type' => $this->message->message_type,
                'metadata' => $this->message->metadata,
                'created_at' => $this->message->created_at,
                'session_id' => $this->sessionId
            ],
            'escalation_prompt' => true,
            'session_id' => $this->sessionId
        ];
    }
}
