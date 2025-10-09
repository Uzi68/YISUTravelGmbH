<?php

namespace App\Http\Controllers;

use App\Events\MessagePusher;
use App\Models\Chat;
use App\Models\Message;
use App\Models\MessageAttachment;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class WhatsAppMessageController extends Controller
{
    private WhatsAppService $whatsappService;

    public function __construct(WhatsAppService $whatsappService)
    {
        $this->whatsappService = $whatsappService;
    }

    /**
     * Sende Text-Nachricht über WhatsApp
     */
    public function sendTextMessage(Request $request): JsonResponse
    {
        $request->validate([
            'chat_id' => 'required|exists:chats,id',
            'message' => 'required|string|max:4096'
        ]);

        try {
            $chat = Chat::findOrFail($request->chat_id);

            // Prüfe ob Chat WhatsApp-Channel ist
            if (!$chat->isWhatsAppChat()) {
                return response()->json(['error' => 'Chat ist kein WhatsApp-Chat'], 400);
            }

            // Prüfe Berechtigung
            if (!$chat->canUserWrite(Auth::id())) {
                return response()->json(['error' => 'Keine Berechtigung zum Schreiben'], 403);
            }

            // Sende über WhatsApp API
            $result = $this->whatsappService->sendTextMessage(
                $chat->whatsapp_number,
                $request->message
            );

            if (!$result['success']) {
                return response()->json([
                    'error' => 'Fehler beim Senden der WhatsApp-Nachricht',
                    'details' => $result['error'] ?? 'Unbekannter Fehler'
                ], 500);
            }

            // Speichere Nachricht in Datenbank
            $message = Message::create([
                'chat_id' => $chat->id,
                'from' => 'agent',
                'text' => $request->message,
                'metadata' => [
                    'whatsapp_message_id' => $result['message_id'],
                    'sent_by_agent' => Auth::id(),
                    'agent_name' => Auth::user()->name,
                    'sent_at' => now()
                ],
                'message_type' => 'whatsapp_text'
            ]);

            // Broadcast über Pusher
            broadcast(new MessagePusher($message, $chat->session_id))->toOthers();

            return response()->json([
                'success' => true,
                'message' => $message,
                'whatsapp_message_id' => $result['message_id']
            ]);

        } catch (\Exception $e) {
            Log::error('Error sending WhatsApp text message', [
                'error' => $e->getMessage(),
                'chat_id' => $request->chat_id
            ]);

            return response()->json(['error' => 'Fehler beim Senden der Nachricht'], 500);
        }
    }

    /**
     * Sende Bild über WhatsApp
     */
    public function sendImage(Request $request): JsonResponse
    {
        $request->validate([
            'chat_id' => 'required|exists:chats,id',
            'image' => 'required|file|mimes:jpeg,jpg,png,gif,webp|max:5120', // Max 5MB
            'caption' => 'nullable|string|max:1024'
        ]);

        try {
            $chat = Chat::findOrFail($request->chat_id);

            if (!$chat->isWhatsAppChat()) {
                return response()->json(['error' => 'Chat ist kein WhatsApp-Chat'], 400);
            }

            if (!$chat->canUserWrite(Auth::id())) {
                return response()->json(['error' => 'Keine Berechtigung'], 403);
            }

            DB::beginTransaction();

            // Speichere Bild lokal
            $file = $request->file('image');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('whatsapp_uploads/images', $filename, 'public');
            $fullPath = Storage::disk('public')->path($path);

            // Lade Bild zu WhatsApp hoch
            $uploadResult = $this->whatsappService->uploadMedia(
                $fullPath,
                $file->getMimeType()
            );

            if (!$uploadResult['success']) {
                throw new \Exception('Fehler beim Upload zu WhatsApp: ' . ($uploadResult['error'] ?? 'Unbekannt'));
            }

            $mediaId = $uploadResult['media_id'];

            // Sende Bild über WhatsApp
            $sendResult = $this->whatsappService->sendImageById(
                $chat->whatsapp_number,
                $mediaId,
                $request->caption
            );

            if (!$sendResult['success']) {
                throw new \Exception('Fehler beim Senden: ' . ($sendResult['error'] ?? 'Unbekannt'));
            }

            // Erstelle Message
            $message = Message::create([
                'chat_id' => $chat->id,
                'from' => 'agent',
                'text' => $request->caption ?? '[Bild]',
                'metadata' => [
                    'whatsapp_message_id' => $sendResult['message_id'],
                    'whatsapp_media_id' => $mediaId,
                    'sent_by_agent' => Auth::id(),
                    'agent_name' => Auth::user()->name
                ],
                'message_type' => 'whatsapp_image'
            ]);

            // Erstelle Attachment
            MessageAttachment::create([
                'message_id' => $message->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_type' => 'image',
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType()
            ]);

            broadcast(new MessagePusher($message, $chat->session_id))->toOthers();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $message->load('attachments'),
                'whatsapp_message_id' => $sendResult['message_id']
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error sending WhatsApp image', [
                'error' => $e->getMessage(),
                'chat_id' => $request->chat_id
            ]);

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Sende Dokument (PDF, DOCX, etc.) über WhatsApp
     */
    public function sendDocument(Request $request): JsonResponse
    {
        $request->validate([
            'chat_id' => 'required|exists:chats,id',
            'document' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt|max:102400', // Max 100MB
            'caption' => 'nullable|string|max:1024'
        ]);

        try {
            $chat = Chat::findOrFail($request->chat_id);

            if (!$chat->isWhatsAppChat()) {
                return response()->json(['error' => 'Chat ist kein WhatsApp-Chat'], 400);
            }

            if (!$chat->canUserWrite(Auth::id())) {
                return response()->json(['error' => 'Keine Berechtigung'], 403);
            }

            DB::beginTransaction();

            $file = $request->file('document');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('whatsapp_uploads/documents', $filename, 'public');
            $fullPath = Storage::disk('public')->path($path);

            // Upload zu WhatsApp
            $uploadResult = $this->whatsappService->uploadMedia(
                $fullPath,
                $file->getMimeType()
            );

            if (!$uploadResult['success']) {
                throw new \Exception('Upload-Fehler: ' . ($uploadResult['error'] ?? 'Unbekannt'));
            }

            // Sende Dokument
            $sendResult = $this->whatsappService->sendDocumentById(
                $chat->whatsapp_number,
                $uploadResult['media_id'],
                $request->caption,
                $file->getClientOriginalName()
            );

            if (!$sendResult['success']) {
                throw new \Exception('Sende-Fehler: ' . ($sendResult['error'] ?? 'Unbekannt'));
            }

            // Erstelle Message
            $message = Message::create([
                'chat_id' => $chat->id,
                'from' => 'agent',
                'text' => $request->caption ?? "📄 {$file->getClientOriginalName()}",
                'metadata' => [
                    'whatsapp_message_id' => $sendResult['message_id'],
                    'whatsapp_media_id' => $uploadResult['media_id'],
                    'sent_by_agent' => Auth::id(),
                    'agent_name' => Auth::user()->name
                ],
                'message_type' => 'whatsapp_document'
            ]);

            MessageAttachment::create([
                'message_id' => $message->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_type' => 'document',
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType()
            ]);

            broadcast(new MessagePusher($message, $chat->session_id))->toOthers();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $message->load('attachments'),
                'whatsapp_message_id' => $sendResult['message_id']
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error sending WhatsApp document', [
                'error' => $e->getMessage(),
                'chat_id' => $request->chat_id
            ]);

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Sende Template-Nachricht
     */
    public function sendTemplate(Request $request): JsonResponse
    {
        $request->validate([
            'chat_id' => 'required|exists:chats,id',
            'template_name' => 'required|string',
            'language_code' => 'nullable|string',
            'components' => 'nullable|array'
        ]);

        try {
            $chat = Chat::findOrFail($request->chat_id);

            if (!$chat->isWhatsAppChat()) {
                return response()->json(['error' => 'Chat ist kein WhatsApp-Chat'], 400);
            }

            // Sende Template
            $result = $this->whatsappService->sendTemplate(
                $chat->whatsapp_number,
                $request->template_name,
                $request->language_code ?? 'de',
                $request->components ?? []
            );

            if (!$result['success']) {
                return response()->json([
                    'error' => 'Fehler beim Senden des Templates',
                    'details' => $result['error'] ?? 'Unbekannt'
                ], 500);
            }

            // Speichere Message
            $message = Message::create([
                'chat_id' => $chat->id,
                'from' => 'agent',
                'text' => "[Template: {$request->template_name}]",
                'metadata' => [
                    'whatsapp_message_id' => $result['message_id'],
                    'template_name' => $request->template_name,
                    'sent_by_agent' => Auth::id(),
                    'agent_name' => Auth::user()->name
                ],
                'message_type' => 'whatsapp_template'
            ]);

            broadcast(new MessagePusher($message, $chat->session_id))->toOthers();

            return response()->json([
                'success' => true,
                'message' => $message,
                'whatsapp_message_id' => $result['message_id']
            ]);

        } catch (\Exception $e) {
            Log::error('Error sending WhatsApp template', [
                'error' => $e->getMessage(),
                'chat_id' => $request->chat_id
            ]);

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Hole alle WhatsApp Chats
     */
    public function getWhatsAppChats(): JsonResponse
    {
        try {
            $chats = Chat::whatsApp()
                ->with(['visitor', 'messages' => function($query) {
                    $query->latest()->limit(1);
                }])
                ->whereIn('status', ['human', 'in_progress', 'bot'])
                ->orderBy('updated_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'chats' => $chats
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching WhatsApp chats', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Fehler beim Laden der Chats'], 500);
        }
    }
}
