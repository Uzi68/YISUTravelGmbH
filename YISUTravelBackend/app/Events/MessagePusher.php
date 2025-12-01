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
            new Channel('chat.' . $this->sessionId),  // ✅ Public für Visitor (kein Login)
            new PrivateChannel('all.active.chats')    // ✅ Private für Admin Dashboard (nur authentifiziert)
        ];
    }

    public function broadcastAs()
    {
        return 'message.received';
    }

    public function broadcastWith()
    {
        // WICHTIG: Attachments sollten bereits geladen sein (via Eager Loading im Controller)
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

        // ✅ WICHTIG: Kundendaten aus bereits geladener Relation verwenden (verhindert doppelte DB-Queries)
        // Nutze die bereits geladene Chat-Relation wenn verfügbar
        $chat = $this->message->relationLoaded('chat')
            ? $this->message->chat
            : \App\Models\Chat::where('session_id', $this->sessionId)->with('visitor')->first();

        if ($chat) {
            $chat->loadMissing('assignedTo');
            // ✅ WhatsApp-spezifische Daten hinzufügen
            if ($chat->channel === 'whatsapp') {
                $data['channel'] = 'whatsapp';
                $data['whatsapp_number'] = $chat->whatsapp_number;
            }

            // ✅ Last Activity für Zuletzt-Online-Status hinzufügen
            if ($chat->last_activity) {
                $data['last_activity'] = $chat->last_activity->toIso8601String();
            }

            // ✅ Nutze bereits geladene Visitor-Relation falls verfügbar
            $visitor = $chat->relationLoaded('visitor') ? $chat->visitor : null;

            if ($visitor) {
                $data['customer_first_name'] = $visitor->first_name;
                $data['customer_last_name'] = $visitor->last_name;
                $data['customer_email'] = $visitor->email;
                $data['customer_phone'] = $visitor->phone;

                // ✅ Für WhatsApp: Zeige den echten Namen falls vorhanden
                if ($chat->channel === 'whatsapp') {
                    // Wenn wir einen echten Namen haben (nicht nur "WhatsApp Kunde")
                    if ($visitor->first_name && $visitor->first_name !== 'WhatsApp') {
                        $data['customer_name'] = trim($visitor->first_name . ' ' . $visitor->last_name);
                    } else {
                        // Fallback: Zeige WhatsApp-Nummer wenn kein Name vorhanden
                        $data['customer_name'] = $chat->whatsapp_number ? '+' . $chat->whatsapp_number : 'WhatsApp Kunde';
                    }
                } else {
                    $data['customer_name'] = trim($visitor->first_name . ' ' . $visitor->last_name) ?: 'Unbekannter Kunde';
                }
            } elseif ($chat->channel === 'whatsapp') {
                // ✅ WhatsApp-Chat ohne Visitor
                $data['customer_first_name'] = 'WhatsApp';
                $data['customer_last_name'] = 'Kunde';
                $data['customer_name'] = $chat->whatsapp_number ? '+' . $chat->whatsapp_number : 'WhatsApp Kunde';
                $data['customer_phone'] = $chat->whatsapp_number ? '+' . $chat->whatsapp_number : null;
            }

            $data['status'] = $chat->status;
            $data['assigned_to'] = $chat->assigned_to;
            $data['assigned_agent'] = $chat->assignedTo?->name;
        }

        // ✅ DEBUG: Log was gebroadcastet wird (für WhatsApp-Debugging)
        if (isset($data['channel']) && $data['channel'] === 'whatsapp') {
            \Log::info('WhatsApp MessagePusher Broadcast:', [
                'session_id' => $this->sessionId,
                'customer_first_name' => $data['customer_first_name'] ?? null,
                'customer_last_name' => $data['customer_last_name'] ?? null,
                'customer_name' => $data['customer_name'] ?? null,
                'customer_phone' => $data['customer_phone'] ?? null,
                'whatsapp_number' => $data['whatsapp_number'] ?? null,
                'last_activity' => $data['last_activity'] ?? null,
                'message_from' => $data['message']['from'] ?? null
            ]);
        }

        return $data;
    }
}
