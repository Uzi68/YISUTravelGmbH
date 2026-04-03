<?php

namespace App\Http\Controllers;

use App\Models\TrainingConversation;
use App\Models\TrainingMessage;
use App\Services\TrainingChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TrainingChatController extends Controller
{
    public function __construct(
        private readonly TrainingChatService $trainingService
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:5000',
            'conversation_id' => 'nullable|integer|exists:training_conversations,id',
        ]);

        $user = Auth::user();
        $conversationId = $validated['conversation_id'] ?? null;

        // Get or create conversation
        if ($conversationId) {
            $conversation = TrainingConversation::where('id', $conversationId)
                ->where('user_id', $user->id)
                ->firstOrFail();
        } else {
            $conversation = TrainingConversation::create([
                'title' => mb_substr($validated['message'], 0, 60),
                'user_id' => $user->id,
            ]);
        }

        // Save user message
        TrainingMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $validated['message'],
        ]);

        // Build history from DB
        $history = $conversation->messages()
            ->orderBy('created_at')
            ->get()
            ->map(fn($m) => ['role' => $m->role, 'content' => $m->content])
            ->toArray();

        // Remove the last message (current one) from history since processTrainingMessage adds it
        array_pop($history);

        $result = $this->trainingService->processTrainingMessage(
            $validated['message'],
            $history
        );

        // Save assistant response
        TrainingMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $result['reply'],
            'saved_items' => $result['saved_items'],
        ]);

        return response()->json([
            'success' => true,
            'reply' => $result['reply'],
            'saved_items' => $result['saved_items'],
            'conversation_id' => $conversation->id,
        ]);
    }

    public function getConversations(): JsonResponse
    {
        $conversations = TrainingConversation::where('user_id', Auth::id())
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'title' => $c->title,
                'updated_at' => $c->updated_at->toIso8601String(),
                'message_count' => $c->messages()->count(),
            ]);

        return response()->json(['success' => true, 'conversations' => $conversations]);
    }

    public function getConversation(int $id): JsonResponse
    {
        $conversation = TrainingConversation::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $messages = $conversation->messages()
            ->orderBy('created_at')
            ->get()
            ->map(fn($m) => [
                'role' => $m->role,
                'content' => $m->content,
                'savedItems' => $m->saved_items,
                'timestamp' => $m->created_at->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'conversation' => [
                'id' => $conversation->id,
                'title' => $conversation->title,
            ],
            'messages' => $messages,
        ]);
    }

    public function deleteConversation(int $id): JsonResponse
    {
        $conversation = TrainingConversation::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $conversation->delete();

        return response()->json(['success' => true]);
    }
}
