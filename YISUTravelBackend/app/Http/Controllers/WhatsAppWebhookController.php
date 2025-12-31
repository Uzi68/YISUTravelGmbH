<?php

namespace App\Http\Controllers;

use App\Events\AllChatsUpdate;
use App\Events\ChatEscalated;
use App\Events\ChatStatusChanged;
use App\Events\MessagePusher;
use App\Models\Chat;
use App\Models\ChatRequest;
use App\Models\Message;
use App\Models\MessageAttachment;
use App\Models\Visitor;
use App\Services\EscalationNotifier;
use App\Services\OpenAiChatService;
use App\Services\PushNotificationService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class WhatsAppWebhookController extends Controller
{
    public function __construct(
        private readonly WhatsAppService $whatsappService,
        private readonly PushNotificationService $pushNotifications,
        private readonly OpenAiChatService $aiChatService,
        private readonly EscalationNotifier $escalationNotifier
    ) {}

    /**
     * Webhook-Verifizierung für WhatsApp (GET Request)
     */
    public function verify(Request $request)
    {
        // WICHTIG: PHP/Laravel konvertiert Punkte in Parameter-Namen automatisch zu Unterstrichen!
        // Facebook sendet: hub.mode, hub.verify_token, hub.challenge
        // Laravel empfängt: hub_mode, hub_verify_token, hub_challenge

        // Log ALLE Details der eingehenden Anfrage für Debugging
        Log::info('WhatsApp Webhook verification request received', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'query_params' => $request->query(),
            'all_input' => $request->all(),
            'headers' => [
                'user_agent' => $request->header('User-Agent'),
                'content_type' => $request->header('Content-Type'),
                'x_forwarded_for' => $request->header('X-Forwarded-For'),
                'x_real_ip' => $request->header('X-Real-IP'),
            ],
            'ip' => $request->ip(),
            'raw_query_string' => $request->getQueryString()
        ]);

        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        $verifyToken = config('services.whatsapp.verify_token');

        Log::info('WhatsApp Webhook verification attempt', [
            'mode' => $mode,
            'token_length' => $token ? strlen($token) : 0,
            'token_match' => $token === $verifyToken,
            'challenge' => $challenge,
            'verify_token_length' => strlen($verifyToken)
        ]);

        if ($mode === 'subscribe' && $token === $verifyToken && $challenge) {
            Log::info('WhatsApp Webhook verified successfully - returning challenge', [
                'challenge' => $challenge
            ]);

            // Return challenge as plain text without any wrapping
            return response($challenge, 200)
                ->header('Content-Type', 'text/plain; charset=UTF-8');
        }

        Log::warning('WhatsApp Webhook verification FAILED', [
            'mode' => $mode,
            'mode_ok' => $mode === 'subscribe',
            'token_ok' => $token === $verifyToken,
            'challenge_ok' => !empty($challenge),
            'token_length' => $token ? strlen($token) : 0,
            'expected_token_length' => strlen($verifyToken)
        ]);

        return response()->json([
            'error' => 'Verification failed',
            'details' => [
                'mode_ok' => $mode === 'subscribe',
                'token_ok' => $token === $verifyToken,
                'challenge_present' => !empty($challenge)
            ]
        ], 403);
    }

    /**
     * Webhook für eingehende WhatsApp-Nachrichten (POST Request)
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        try {
            // Signature-Verifizierung
            $signature = $request->header('X-Hub-Signature-256');
            $payload = $request->getContent();

            if ($signature && !$this->whatsappService->verifyWebhookSignature($payload, $signature)) {
                Log::warning('WhatsApp Webhook signature verification failed');
                return response()->json(['error' => 'Invalid signature'], 403);
            }

            $data = $request->all();

            Log::info('WhatsApp Webhook received', ['data' => $data]);

            // WhatsApp sendet Events im "entry" Array
            if (!isset($data['entry'])) {
                return response()->json(['status' => 'ok']);
            }

            foreach ($data['entry'] as $entry) {
                foreach ($entry['changes'] ?? [] as $change) {
                    if ($change['field'] === 'messages') {
                        $this->processMessages($change['value']);
                    }

                    if ($change['field'] === 'message_status') {
                        $this->processMessageStatus($change['value']);
                    }
                }
            }

            return response()->json(['status' => 'ok']);

        } catch (\Exception $e) {
            Log::error('WhatsApp Webhook Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Verarbeite eingehende Nachrichten
     */
    private function processMessages(array $data): void
    {
        try {
            $messages = $data['messages'] ?? [];
            $contacts = $data['contacts'] ?? [];
            $metadata = $data['metadata'] ?? [];

            foreach ($messages as $messageData) {
                $this->handleIncomingMessage($messageData, $contacts, $metadata);
            }

        } catch (\Exception $e) {
            Log::error('Error processing WhatsApp messages', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
        }
    }

    /**
     * Verarbeite einzelne eingehende Nachricht
     */
    private function handleIncomingMessage(array $messageData, array $contacts, array $metadata): void
    {
        $chat = null;
        $messageText = '';
        $messageType = '';

        DB::beginTransaction();

        try {
            $from = $messageData['from']; // WhatsApp Telefonnummer des Senders
            $messageId = $messageData['id'];
            $timestamp = $messageData['timestamp'];
            $messageType = $messageData['type'];

            // Finde oder erstelle Visitor basierend auf WhatsApp-Nummer
            $visitor = $this->findOrCreateVisitor($from, $contacts);

            // Finde oder erstelle Chat für diesen WhatsApp-Kontakt
            $chat = $this->findOrCreateWhatsAppChat($visitor, $from);

            // ✅ Aktualisiere last_activity für Zuletzt-Online-Status
            $chat->update(['last_activity' => now()]);

            // Extrahiere Nachrichteninhalt basierend auf Typ
            $messageContent = $this->extractMessageContent($messageData, $messageType);
            $messageText = $messageContent['text'];

            // Erstelle Message-Eintrag
            $message = Message::create([
                'chat_id' => $chat->id,
                'from' => 'user',
                'text' => $messageContent['text'],
                'metadata' => [
                    'whatsapp_message_id' => $messageId,
                    'whatsapp_from' => $from,
                    'whatsapp_timestamp' => $timestamp,
                    'whatsapp_type' => $messageType,
                    'contact_name' => $messageContent['contact_name'] ?? null
                ],
                'message_type' => 'whatsapp_' . $messageType
            ]);

            // Verarbeite Media-Attachments (Bilder, PDFs, Videos, etc.)
            if (isset($messageContent['media'])) {
                $this->processMediaAttachment($message, $messageContent['media'], $messageType);
            }

            // Markiere WhatsApp-Nachricht als gelesen
            $this->whatsappService->markAsRead($messageId);

            // ✅ WICHTIG: Lade Message mit Chat und Visitor-Relationen für Broadcasting
            $message->load(['chat.visitor', 'attachments']);

            // Broadcast über Pusher an Admin Dashboard
            broadcast(new MessagePusher($message, $chat->session_id))->toOthers();

            try {
                $chat->loadMissing('visitor');
                $this->pushNotifications->notifyStaffAboutChatMessage($chat, $message);
            } catch (\Throwable $exception) {
                Log::warning('Failed to dispatch push for WhatsApp message', [
                    'chat_id' => $chat->id,
                    'message_id' => $message->id ?? null,
                    'error' => $exception->getMessage(),
                ]);
            }

            DB::commit();

            Log::info('WhatsApp message processed successfully', [
                'message_id' => $messageId,
                'chat_id' => $chat->id,
                'from' => $from
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error handling WhatsApp message', [
                'error' => $e->getMessage(),
                'message_data' => $messageData
            ]);
            return;
        }

        if ($chat instanceof Chat) {
            $this->maybeAutoRespondToWhatsApp($chat, $messageText, $messageType);
        }
    }

    /**
     * Extrahiere Nachrichteninhalt basierend auf Nachrichtentyp
     */
    private function extractMessageContent(array $messageData, string $type): array
    {
        $content = [
            'text' => '',
            'media' => null,
            'contact_name' => null
        ];

        switch ($type) {
            case 'text':
                $content['text'] = $messageData['text']['body'] ?? '';
                break;

            case 'image':
                $content['text'] = $messageData['image']['caption'] ?? '[Bild]';
                $content['media'] = $messageData['image'];
                break;

            case 'document':
                $filename = $messageData['document']['filename'] ?? 'Dokument';
                $content['text'] = $messageData['document']['caption'] ?? "📄 {$filename}";
                $content['media'] = $messageData['document'];
                break;

            case 'video':
                $content['text'] = $messageData['video']['caption'] ?? '[Video]';
                $content['media'] = $messageData['video'];
                break;

            case 'audio':
                $content['text'] = '[Sprachnachricht]';
                $content['media'] = $messageData['audio'];
                break;

            case 'voice':
                $content['text'] = '[Sprachnachricht]';
                $content['media'] = $messageData['voice'];
                break;

            case 'location':
                $location = $messageData['location'];
                $content['text'] = sprintf(
                    '📍 Standort: %s, %s (Lat: %s, Lng: %s)',
                    $location['name'] ?? 'Unbekannt',
                    $location['address'] ?? '',
                    $location['latitude'],
                    $location['longitude']
                );
                break;

            case 'contacts':
                $contacts = $messageData['contacts'] ?? [];
                $contactNames = array_map(fn($c) => $c['name']['formatted_name'] ?? 'Unbekannt', $contacts);
                $content['text'] = '👤 Kontakt: ' . implode(', ', $contactNames);
                $content['contact_name'] = implode(', ', $contactNames);
                break;

            case 'button':
                $content['text'] = $messageData['button']['text'] ?? '[Button geklickt]';
                break;

            case 'interactive':
                if (isset($messageData['interactive']['button_reply'])) {
                    $content['text'] = $messageData['interactive']['button_reply']['title'] ?? '[Button-Antwort]';
                } elseif (isset($messageData['interactive']['list_reply'])) {
                    $content['text'] = $messageData['interactive']['list_reply']['title'] ?? '[Listen-Auswahl]';
                }
                break;

            default:
                $content['text'] = '[Nicht unterstützter Nachrichtentyp: ' . $type . ']';
                break;
        }

        return $content;
    }

    /**
     * Verarbeite Media-Attachment (lade herunter und speichere)
     */
    private function processMediaAttachment(Message $message, array $mediaData, string $type): void
    {
        try {
            $mediaId = $mediaData['id'] ?? null;

            if (!$mediaId) {
                Log::warning('No media ID found for message', ['message_id' => $message->id]);
                return;
            }

            // Lade Media von WhatsApp herunter
            $downloadResult = $this->whatsappService->downloadMedia($mediaId);

            if (!$downloadResult['success']) {
                Log::error('Failed to download WhatsApp media', [
                    'media_id' => $mediaId,
                    'error' => $downloadResult['error']
                ]);
                return;
            }

            // Generiere Dateinamen
            $mimeType = $downloadResult['mime_type'];
            $extension = $this->getExtensionFromMimeType($mimeType);
            $filename = sprintf('whatsapp_%s_%s.%s', $type, $mediaId, $extension);

            // Speichere Datei
            $path = "whatsapp_media/{$type}s/" . $filename;
            Storage::disk('public')->put($path, $downloadResult['data']);

            // Erstelle MessageAttachment
            MessageAttachment::create([
                'message_id' => $message->id,
                'file_name' => $mediaData['filename'] ?? $filename,
                'file_path' => $path,
                'file_type' => $type,
                'file_size' => $downloadResult['file_size'],
                'mime_type' => $mimeType
            ]);

            Log::info('WhatsApp media downloaded and saved', [
                'media_id' => $mediaId,
                'path' => $path,
                'message_id' => $message->id
            ]);

        } catch (\Exception $e) {
            Log::error('Error processing media attachment', [
                'error' => $e->getMessage(),
                'message_id' => $message->id
            ]);
        }
    }

    private function maybeAutoRespondToWhatsApp(Chat $chat, string $messageText, string $messageType): void
    {
        if ($messageType !== 'text') {
            return;
        }

        $trimmedText = trim($messageText);
        if ($trimmedText === '') {
            return;
        }

        $chat->refresh();
        if ($chat->status !== 'bot' || $chat->assigned_to) {
            return;
        }

        $aiResult = $this->aiChatService->generateReply($chat, $trimmedText);
        $reply = (string) ($aiResult['reply'] ?? '');
        $needsEscalation = (bool) ($aiResult['needs_escalation'] ?? false);
        $reason = (string) ($aiResult['escalation_reason'] ?? 'none');
        if ($needsEscalation && ($reason === '' || $reason === 'none')) {
            $reason = 'missing_knowledge';
        }

        if ($needsEscalation) {
            $this->escalationNotifier->notify($chat, $trimmedText, $reason);
            $this->escalateWhatsAppChat($chat, $trimmedText);
            return;
        }

        if ($reply === '') {
            return;
        }

        $this->sendWhatsAppBotReply($chat, $reply, [
            'ai_generated' => true
        ]);
    }

    private function sendWhatsAppBotReply(Chat $chat, string $reply, array $metadata = []): void
    {
        if ($chat->channel !== 'whatsapp' || !$chat->whatsapp_number) {
            return;
        }

        $sendResult = $this->whatsappService->sendTextMessage($chat->whatsapp_number, $reply);
        if (empty($sendResult['success'])) {
            Log::warning('Failed to send WhatsApp bot reply', [
                'chat_id' => $chat->id,
                'whatsapp_number' => $chat->whatsapp_number,
                'error' => $sendResult['error'] ?? 'Unknown error'
            ]);
            return;
        }

        $message = Message::create([
            'chat_id' => $chat->id,
            'from' => 'bot',
            'text' => $reply,
            'metadata' => array_filter(array_merge($metadata, [
                'whatsapp_message_id' => $sendResult['message_id'] ?? null,
                'sent_via_whatsapp' => true
            ])),
            'message_type' => 'whatsapp_text'
        ]);

        $message->load(['chat.visitor', 'attachments']);
        broadcast(new MessagePusher($message, $chat->session_id))->toOthers();
        $chat->touch();
    }

    private function escalateWhatsAppChat(Chat $chat, string $messageText): void
    {
        $previousStatus = $chat->status;

        if ($chat->status !== 'human') {
            $chat->update([
                'status' => 'human',
                'assigned_to' => null,
                'assigned_at' => null
            ]);
        }

        $chat->loadMissing('visitor');

        $chatRequest = ChatRequest::create([
            'visitor_id' => $chat->visitor_id,
            'chat_id' => $chat->id,
            'initial_question' => $messageText,
            'status' => 'pending'
        ]);

        event(new ChatEscalated($chat, $chatRequest));

        if ($previousStatus !== 'human') {
            broadcast(new ChatStatusChanged($chat, $previousStatus, 'human'))->toOthers();
        }

        event(new AllChatsUpdate([
            'type' => 'chat_escalated',
            'session_id' => $chat->session_id,
            'chat' => [
                'session_id' => $chat->session_id,
                'chat_id' => $chat->id,
                'status' => 'human',
                'channel' => $chat->channel ?? 'whatsapp',
                'whatsapp_number' => $chat->whatsapp_number ?? null,
                'customer_first_name' => $chat->visitor?->first_name ?? 'WhatsApp',
                'customer_last_name' => $chat->visitor?->last_name ?? 'Kunde',
                'customer_phone' => $chat->visitor?->phone ?? ($chat->whatsapp_number ? '+' . $chat->whatsapp_number : 'Nicht bekannt'),
                'last_message' => $messageText,
                'last_message_time' => now(),
                'unread_count' => 1,
                'assigned_to' => null,
                'assigned_agent' => null,
                'isNew' => true,
                'can_assign' => true,
                'needs_assignment' => true
            ]
        ]));

        $botReply = 'Vielen Dank! Ich verbinde Sie mit einem unserer Mitarbeiter. Bitte haben Sie einen Moment Geduld.';
        $this->sendWhatsAppBotReply($chat, $botReply, [
            'ai_generated' => true,
            'escalation_reply' => true
        ]);
    }

    /**
     * Finde oder erstelle Visitor basierend auf WhatsApp-Nummer
     */
    private function findOrCreateVisitor(string $whatsappNumber, array $contacts): Visitor
    {
        $sessionId = 'whatsapp_' . $whatsappNumber;

        // Extrahiere Kontaktdaten IMMER (auch für Updates)
        $contactData = $contacts[0] ?? null;
        $contactName = $contactData['profile']['name'] ?? null;

        \Log::info('WhatsApp contact data', [
            'whatsapp_number' => $whatsappNumber,
            'contact_name' => $contactName,
            'full_contact_data' => $contactData
        ]);

        // Splitze Namen in Vor- und Nachname
        $firstName = 'WhatsApp';
        $lastName = 'Kunde';

        if ($contactName) {
            $nameParts = explode(' ', trim($contactName), 2);
            $firstName = $nameParts[0];
            $lastName = $nameParts[1] ?? '';
        }

        // Versuche Visitor anhand WhatsApp-Nummer ODER Session-ID zu finden
        $visitor = Visitor::where('whatsapp_number', $whatsappNumber)
            ->orWhere('session_id', $sessionId)
            ->first();

        if ($visitor) {
            // ✅ WICHTIG: Aktualisiere IMMER den Namen, falls er sich geändert hat
            $updateData = [
                'whatsapp_number' => $whatsappNumber,
                'phone' => '+' . $whatsappNumber,
            ];

            // Nur Namen aktualisieren wenn wir einen echten Namen haben
            if ($contactName) {
                $updateData['first_name'] = $firstName;
                $updateData['last_name'] = $lastName;
            }

            $visitor->update($updateData);

            \Log::info('Updated existing WhatsApp visitor', [
                'visitor_id' => $visitor->id,
                'first_name' => $visitor->first_name,
                'last_name' => $visitor->last_name,
                'whatsapp_number' => $visitor->whatsapp_number
            ]);

            return $visitor;
        }

        // Erstelle neuen Visitor
        $newVisitor = Visitor::create([
            'session_id' => $sessionId,
            'whatsapp_number' => $whatsappNumber,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'phone' => '+' . $whatsappNumber,
            'email' => null,
            'channel' => 'whatsapp'
        ]);

        \Log::info('Created new WhatsApp visitor', [
            'visitor_id' => $newVisitor->id,
            'first_name' => $newVisitor->first_name,
            'last_name' => $newVisitor->last_name,
            'whatsapp_number' => $newVisitor->whatsapp_number
        ]);

        return $newVisitor;
    }

    /**
     * Finde oder erstelle Chat für WhatsApp-Kontakt
     */
    private function findOrCreateWhatsAppChat(Visitor $visitor, string $whatsappNumber): Chat
    {
        // Suche nach bestehendem WhatsApp-Chat für diese Nummer
        $chat = Chat::where('whatsapp_number', $whatsappNumber)
            ->orderByDesc('updated_at')
            ->first();

        if ($chat) {
            if ($chat->status === 'closed') {
                return Chat::create([
                    'session_id' => 'whatsapp_' . $whatsappNumber . '_' . time(),
                    'visitor_id' => $visitor->id,
                    'whatsapp_number' => $whatsappNumber,
                    'channel' => 'whatsapp',
                    'status' => 'bot',
                    'state' => 'active'
                ]);
            }

            // ✅ WICHTIG: Aktualisiere visitor_id falls er sich geändert hat
            if ($chat->visitor_id !== $visitor->id) {
                $chat->update(['visitor_id' => $visitor->id]);
                \Log::info('Updated chat visitor_id', [
                    'chat_id' => $chat->id,
                    'old_visitor_id' => $chat->visitor_id,
                    'new_visitor_id' => $visitor->id
                ]);
            }

            // ✅ SEHR WICHTIG: Lade Visitor-Relation neu, damit MessagePusher aktuelle Daten hat
            $chat->load('visitor');

            \Log::info('Chat loaded with visitor', [
                'chat_id' => $chat->id,
                'visitor_id' => $chat->visitor_id,
                'visitor_loaded' => $chat->visitor ? true : false,
                'visitor_first_name' => $chat->visitor ? $chat->visitor->first_name : null,
                'visitor_whatsapp_number' => $chat->visitor ? $chat->visitor->whatsapp_number : null
            ]);

            return $chat;
        }

        // Erstelle neuen Chat
        return Chat::create([
            'session_id' => 'whatsapp_' . $whatsappNumber . '_' . time(),
            'visitor_id' => $visitor->id,
            'whatsapp_number' => $whatsappNumber,
            'channel' => 'whatsapp',
            'status' => 'bot',
            'state' => 'active'
        ]);
    }

    /**
     * Verarbeite Nachrichten-Status-Updates (delivered, read, sent, failed)
     */
    private function processMessageStatus(array $data): void
    {
        try {
            $statuses = $data['statuses'] ?? [];

            foreach ($statuses as $status) {
                $whatsappMessageId = $status['id'];
                $statusType = $status['status']; // sent, delivered, read, failed
                $timestamp = $status['timestamp'];

                // Finde Message anhand WhatsApp Message ID
                $message = Message::whereJsonContains('metadata->whatsapp_message_id', $whatsappMessageId)->first();

                if ($message) {
                    $metadata = $message->metadata ?? [];
                    $metadata['whatsapp_status'] = $statusType;
                    $metadata['whatsapp_status_timestamp'] = $timestamp;

                    if ($statusType === 'failed' && isset($status['errors'])) {
                        $metadata['whatsapp_error'] = $status['errors'];
                    }

                    $message->update(['metadata' => $metadata]);

                    Log::info('WhatsApp message status updated', [
                        'message_id' => $message->id,
                        'whatsapp_message_id' => $whatsappMessageId,
                        'status' => $statusType
                    ]);
                }
            }

        } catch (\Exception $e) {
            Log::error('Error processing WhatsApp message status', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
        }
    }

    /**
     * Hilfsmethode: Hole Extension basierend auf MIME-Type
     */
    private function getExtensionFromMimeType(string $mimeType): string
    {
        $mimeMap = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'video/mp4' => 'mp4',
            'video/3gpp' => '3gp',
            'audio/mpeg' => 'mp3',
            'audio/ogg' => 'ogg',
            'audio/amr' => 'amr',
            'application/pdf' => 'pdf',
            'application/vnd.ms-powerpoint' => 'ppt',
            'application/msword' => 'doc',
            'application/vnd.ms-excel' => 'xls',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        ];

        return $mimeMap[$mimeType] ?? 'bin';
    }
}
