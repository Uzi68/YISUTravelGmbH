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
     * Upload file attachment and send message
     */
    public function uploadAttachment(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'chat_id' => 'required|exists:chats,id',
            'session_id' => 'required',
            'from' => 'required|in:agent,user,visitor'
        ]);

        try {
            $file = $request->file('file');
            $chatId = $request->input('chat_id');
            $sessionId = $request->input('session_id');
            $from = $request->input('from');

            // Generate unique filename
            $fileName = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();

            // Store file in storage/app/public/attachments
            $filePath = $file->storeAs('attachments', $fileName, 'public');

            // Create message
            $message = Message::create([
                'chat_id' => $chatId,
                'from' => $from,
                'text' => '[File: ' . $file->getClientOriginalName() . ']',
                'metadata' => json_encode(['has_attachment' => true])
            ]);

            // Create attachment record
            $attachment = MessageAttachment::create([
                'message_id' => $message->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $filePath,
                'file_type' => $this->getFileType($file->getMimeType()),
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType()
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
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload file: ' . $e->getMessage()
            ], 500);
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
