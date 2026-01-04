<?php

namespace App\Http\Controllers;

use App\Models\ChatbotInstruction;
use Illuminate\Http\Request;

class ChatbotInstructionsController extends Controller
{
    public function insertInstruction(Request $request)
    {
        try {
            $validated = $request->validate([
                'topic' => 'required|string',
                'instruction' => 'required|string',
            ]);

            $instruction = ChatbotInstruction::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Instruktion erfolgreich gespeichert',
                'data' => $instruction
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getInstructions()
    {
        $instructions = ChatbotInstruction::query()
            ->orderBy('id')
            ->get();

        return response()->json($instructions);
    }

    public function deleteInstruction($id)
    {
        try {
            $instruction = ChatbotInstruction::find($id);

            if (!$instruction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Instruktion nicht gefunden'
                ], 404);
            }

            $instruction->delete();

            return response()->json([
                'success' => true,
                'message' => 'Instruktion erfolgreich geloescht'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateInstruction(Request $request, $id)
    {
        try {
            $instruction = ChatbotInstruction::find($id);

            if (!$instruction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Instruktion nicht gefunden'
                ], 404);
            }

            $validated = $request->validate([
                'topic' => 'required|string',
                'instruction' => 'required|string',
            ]);

            $instruction->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Instruktion erfolgreich aktualisiert',
                'data' => $instruction
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }
}
