<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AllChatsUpdate implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $updateData;

    public function __construct($updateData)
    {
        $this->updateData = $updateData;
    }

    public function broadcastOn()
    {
        return [
            new PrivateChannel('all.active.chats'), // ✅ Private Channel für Admin Dashboard
        ];
    }

    public function broadcastAs()
    {
        return 'chats.updated';
    }

    public function broadcastWith()
    {
        return $this->updateData;
    }
}
