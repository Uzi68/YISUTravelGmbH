<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\MessageAttachment;
use App\Models\Chat;
use App\Events\MessagePusher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MessageAttachmentController extends Controller
{
    /**
     * Upload file attachment and send message (MIT WHATSAPP SUPPORT)
     */
    public function uploadAttachment(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:102400', // 100MB max (WhatsApp limit)
            'chat_id' => 'required|exists:chats,id',
            'session_id' => 'required',
            'from' => 'required|in:agent,user,visitor',
            'caption' => 'nullable|string|max:1024'
        ]);

        try {
            $file = $request->file('file');
            $chatId = $request->input('chat_id');
            $sessionId = $request->input('session_id');
            $from = $request->input('from');
            $caption = $request->input('caption', '');

            $chat = Chat::findOrFail($chatId);

            // Generate unique filename
            $fileName = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $mimeType = $file->getMimeType();
            $fileType = $this->getFileType($mimeType);

            // Store file in storage/app/public/attachments
            $filePath = $file->storeAs('attachments', $fileName, 'public');

            $metadata = ['has_attachment' => true];
            $messageText = $caption ?: '[File: ' . $file->getClientOriginalName() . ']';

            // ✅ NEU: WhatsApp Integration für Agent-Nachrichten
            if ($chat->channel === 'whatsapp' && $chat->whatsapp_number && $from === 'agent') {
                $whatsappService = app(\App\Services\WhatsAppService::class);

                // Speichere Datei auch für WhatsApp
                $whatsappFileName = time() . '_' . $file->getClientOriginalName();
                $whatsappPath = $file->storeAs("whatsapp_uploads/{$fileType}s", $whatsappFileName, 'public');
                $fullPath = Storage::disk('public')->path($whatsappPath);

                \Log::info('Uploading attachment to WhatsApp', [
                    'file_name' => $file->getClientOriginalName(),
                    'file_type' => $fileType,
                    'mime_type' => $mimeType,
                    'file_size' => $file->getSize(),
                    'whatsapp_number' => $chat->whatsapp_number
                ]);

                // Upload zu WhatsApp
                $uploadResult = $whatsappService->uploadMedia($fullPath, $mimeType);

                if ($uploadResult['success']) {
                    $mediaId = $uploadResult['media_id'];

                    // Sende Media über WhatsApp
                    $sendResult = $this->sendWhatsAppMedia(
                        $whatsappService,
                        $chat->whatsapp_number,
                        $fileType,
                        $mediaId,
                        $caption,
                        $file->getClientOriginalName()
                    );

                    if ($sendResult['success']) {
                        $metadata['whatsapp_message_id'] = $sendResult['message_id'];
                        $metadata['whatsapp_media_id'] = $mediaId;
                        $metadata['sent_via_whatsapp'] = true;

                        \Log::info('WhatsApp media sent successfully', [
                            'message_id' => $sendResult['message_id'],
                            'media_id' => $mediaId
                        ]);
                    } else {
                        \Log::error('Failed to send WhatsApp media', [
                            'error' => $sendResult['error'] ?? 'Unknown error'
                        ]);
                    }
                } else {
                    \Log::error('Failed to upload media to WhatsApp', [
                        'error' => $uploadResult['error'] ?? 'Unknown error'
                    ]);
                }
            }

            // Create message
            $message = Message::create([
                'chat_id' => $chatId,
                'from' => $from,
                'text' => $messageText,
                'metadata' => json_encode($metadata),
                'message_type' => $chat->channel === 'whatsapp' ? "whatsapp_{$fileType}" : null
            ]);

            // Create attachment record
            $attachment = MessageAttachment::create([
                'message_id' => $message->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $filePath,
                'file_type' => $fileType,
                'file_size' => $file->getSize(),
                'mime_type' => $mimeType
            ]);

            // Load attachment relationship
            $message->load('attachments');

            // Add attachment data to message for broadcasting
            $message->has_attachment = true;
            $message->attachment = [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_type' => $attachment->file_type,
                'file_size' => $attachment->file_size,
                'download_url' => url('api/attachments/' . $attachment->id . '/download')
            ];

            // Broadcast message via Pusher
            event(new MessagePusher($message, $sessionId));

            return response()->json([
                'success' => true,
                'message' => $message,
                'attachment' => [
                    'id' => $attachment->id,
                    'file_name' => $attachment->file_name,
                    'file_type' => $attachment->file_type,
                    'file_size' => $attachment->file_size,
                    'download_url' => url('api/attachments/' . $attachment->id . '/download')
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Attachment upload failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload file: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ Helper: Sende Media über WhatsApp basierend auf Typ
     */
    private function sendWhatsAppMedia($whatsappService, string $phoneNumber, string $fileType, string $mediaId, ?string $caption, ?string $filename): array
    {
        switch ($fileType) {
            case 'image':
                return $whatsappService->sendImageById($phoneNumber, $mediaId, $caption);
            case 'video':
                return $whatsappService->sendVideoById($phoneNumber, $mediaId, $caption);
            case 'pdf':
            case 'document':
            case 'spreadsheet':
            case 'other':
                return $whatsappService->sendDocumentById($phoneNumber, $mediaId, $caption, $filename);
            case 'audio':
                // WhatsApp hat keine sendAudioById, verwende Document als Fallback
                return $whatsappService->sendDocumentById($phoneNumber, $mediaId, $caption, $filename);
            default:
                return ['success' => false, 'error' => 'Unsupported file type: ' . $fileType];
        }
    }

    /**
     * Download attachment
     */
    public function downloadAttachment($id)
    {
        $attachment = MessageAttachment::findOrFail($id);

        if (!Storage::disk('public')->exists($attachment->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found'
            ], 404);
        }

        return Storage::disk('public')->download(
            $attachment->file_path,
            $attachment->file_name
        );
    }

    /**
     * Get attachment info
     */
    public function getAttachment($id)
    {
        $attachment = MessageAttachment::findOrFail($id);

        return response()->json([
            'success' => true,
            'attachment' => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_type' => $attachment->file_type,
                'file_size' => $attachment->file_size,
                'mime_type' => $attachment->mime_type,
                'download_url' => url('api/attachments/' . $attachment->id . '/download'),
                'created_at' => $attachment->created_at
            ]
        ]);
    }

    /**
     * Get all attachments for a chat
     */
    public function getChatAttachments($chatId)
    {
        $chat = Chat::findOrFail($chatId);

        $attachments = MessageAttachment::whereHas('message', function($query) use ($chatId) {
            $query->where('chat_id', $chatId);
        })
        ->with('message')
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'attachments' => $attachments->map(function($attachment) {
                return [
                    'id' => $attachment->id,
                    'file_name' => $attachment->file_name,
                    'file_type' => $attachment->file_type,
                    'file_size' => $attachment->file_size,
                    'mime_type' => $attachment->mime_type,
                    'download_url' => url('api/attachments/' . $attachment->id . '/download'),
                    'created_at' => $attachment->created_at,
                    'from' => $attachment->message->from
                ];
            })
        ]);
    }

    /**
     * Determine file type category
     */
    private function getFileType($mimeType)
    {
        if (Str::startsWith($mimeType, 'image/')) {
            return 'image';
        } elseif (Str::startsWith($mimeType, 'video/')) {
            return 'video';
        } elseif (Str::startsWith($mimeType, 'audio/')) {
            return 'audio';
        } elseif (in_array($mimeType, ['application/pdf'])) {
            return 'pdf';
        } elseif (in_array($mimeType, [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ])) {
            return 'document';
        } elseif (in_array($mimeType, [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ])) {
            return 'spreadsheet';
        } else {
            return 'other';
        }
    }
}
