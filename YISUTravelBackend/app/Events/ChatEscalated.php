<?php

namespace App\Events;

use App\Models\Chat;
use App\Models\ChatRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatEscalated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $chat;
    public $chatRequest;

    public function __construct(Chat $chat, ChatRequest $chatRequest)
    {
        $this->chat = $chat;
        $this->chatRequest = $chatRequest;
    }

    public function broadcastOn()
    {
        //return new PrivateChannel('chat.requests');
        return new Channel('chat.escalations');
    }

    public function broadcastAs()
    {
        return 'chat.escalated';
    }

    public function broadcastWith()
    {
        return [
            'chat_id' => $this->chat->id,
            'session_id' => $this->chat->session_id,
            'customer_name' => $this->chatRequest->visitor->name,
            'initial_question' => $this->chatRequest->initial_question,
            'requested_at' => $this->chatRequest->created_at->toDateTimeString()
        ];
    }
}
