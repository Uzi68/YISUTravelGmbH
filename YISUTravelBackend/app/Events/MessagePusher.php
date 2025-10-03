<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessagePusher implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;
    public $sessionId;
    public $assignmentData;

    public function __construct(Message $message, string $sessionId, array $assignmentData = null)
    {
        $this->message = $message;
        $this->sessionId = $sessionId;
        $this->assignmentData = $assignmentData;

        // ✅ WICHTIG: Session-ID auch in der Message setzen falls nicht vorhanden
        if (!isset($this->message->session_id)) {
            $this->message->session_id = $sessionId;
        }
    }

    public function broadcastOn()
    {
        return [
            new Channel('chat.' . $this->sessionId),  // Für den Visitor
            new Channel('all.active.chats')           // Für Admin Dashboard
        ];
    }

    public function broadcastAs()
    {
        return 'message.received';
    }

    public function broadcastWith()
    {
        // WICHTIG: Attachments immer frisch laden, da dynamische Properties nach Serialisierung verloren gehen
        if (!$this->message->relationLoaded('attachments')) {
            $this->message->load('attachments');
        }

        $messageData = [
            'id' => $this->message->id,
            'text' => $this->message->text,
            'from' => $this->message->from,
            'created_at' => $this->message->created_at,
            'message_type' => $this->message->message_type ?? null,
            'metadata' => $this->message->metadata ?? null,
            'session_id' => $this->sessionId,
        ];

        // Add attachment data if present (check both dynamic property and relation)
        if (isset($this->message->has_attachment) && $this->message->has_attachment) {
            $messageData['has_attachment'] = true;
            $messageData['attachment'] = $this->message->attachment;
        } elseif ($this->message->attachments && $this->message->attachments->count() > 0) {
            $attachment = $this->message->attachments->first();
            $messageData['has_attachment'] = true;
            $messageData['attachment'] = [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_type' => $attachment->file_type,
                'file_size' => $attachment->file_size,
                'download_url' => url('api/attachments/' . $attachment->id . '/download')
            ];
        }

        $data = [
            'message' => $messageData
        ];

        // ✅ Assignment-Daten hinzufügen wenn vorhanden
        if ($this->assignmentData) {
            $data = array_merge($data, $this->assignmentData);
        }

        // ✅ WICHTIG: Kundendaten für Notifications hinzufügen
        // Lade Chat mit Visitor-Daten
        $chat = \App\Models\Chat::where('session_id', $this->sessionId)->first();
        if ($chat && $chat->visitor_id) {
            $visitor = \App\Models\Visitor::find($chat->visitor_id);
            if ($visitor) {
                $data['customer_first_name'] = $visitor->first_name;
                $data['customer_last_name'] = $visitor->last_name;
                $data['customer_email'] = $visitor->email;
                $data['customer_name'] = trim($visitor->first_name . ' ' . $visitor->last_name) ?: 'Unbekannter Kunde';
            }
        }

        return $data;
    }
}
