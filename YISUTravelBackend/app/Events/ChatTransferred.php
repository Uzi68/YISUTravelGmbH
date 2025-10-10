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
        // ✅ Lade Visitor-Daten für Kundennamen
        $this->chat->load('visitor');

        // ✅ Berechne Kundennamen (für WhatsApp-Namen)
        $customerFirstName = 'Unbekannt';
        $customerLastName = '';
        $customerName = 'Unbekannter Kunde';

        if ($this->chat->visitor) {
            $customerFirstName = $this->chat->visitor->first_name;
            $customerLastName = $this->chat->visitor->last_name ?? '';

            if ($this->chat->channel === 'whatsapp') {
                if ($customerFirstName && $customerFirstName !== 'WhatsApp') {
                    $customerName = trim($customerFirstName . ' ' . $customerLastName);
                } else {
                    $customerName = $this->chat->whatsapp_number ? '+' . $this->chat->whatsapp_number : 'WhatsApp Kunde';
                }
            } else {
                $customerName = trim($customerFirstName . ' ' . $customerLastName) ?: 'Unbekannter Kunde';
            }
        } elseif ($this->chat->channel === 'whatsapp') {
            $customerName = $this->chat->whatsapp_number ? '+' . $this->chat->whatsapp_number : 'WhatsApp Kunde';
        }

        return [
            'chat_id' => $this->chat->id,
            'session_id' => $this->chat->session_id,
            'from_agent_id' => $this->fromAgent->id,
            'from_agent_name' => $this->fromAgent->name,
            'to_agent_id' => $this->toAgent->id,
            'to_agent_name' => $this->toAgent->name,
            'transferred_at' => now(),
            // ✅ NEU: Kundendaten für Notifications
            'customer_first_name' => $customerFirstName,
            'customer_last_name' => $customerLastName,
            'customer_name' => $customerName,
            'channel' => $this->chat->channel ?? 'website',
            'whatsapp_number' => $this->chat->whatsapp_number ?? null
        ];
    }
}
