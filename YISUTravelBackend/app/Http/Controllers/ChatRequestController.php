<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ChatRequest;
use App\Events\ChatRequestAccepted;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ChatRequestController extends Controller
{
    public function index()
    {
        $requests = ChatRequest::with(['visitor', 'assignedTo', 'chat'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($request) {
                return [
                    'id' => $request->id,
                    'visitor_name' => $request->visitor->name ?? 'Unknown',
                    'initial_question' => $request->initial_question,
                    'created_at' => $request->created_at,
                    'assigned_to' => $request->assignedTo ? $request->assignedTo->name : null,
                    'chat_id' => $request->chat_id,
                    'visitor_id' => $request->visitor_id
                ];
            });

        return response()->json($requests);
    }

    public function accept($id)
    {
        $request = ChatRequest::findOrFail($id);
        $agent = Auth::user();

        // Prüfen, ob die Anfrage bereits zugewiesen wurde
        if ($request->assigned_to && $request->assigned_to !== $agent->id) {
            return response()->json([
                'success' => false,
                'message' => 'This request is already assigned to another agent'
            ], 403);
        }

        // Anfrage aktualisieren
        $request->update([
            'assigned_to' => $agent->id,
            'status' => 'accepted'
        ]);

        // Verknüpften Chat aktualisieren, falls vorhanden
        if ($request->chat) {
            $request->chat->update([
                'assigned_to' => $agent->id,
                'status' => 'in_progress'
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Chat request accepted',
            'chat_id' => $request->chat_id
        ]);
    }
}
