<?php

namespace App\Http\Controllers;

use App\Models\ChatbotResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatbotResponses extends Controller
{

    public function insertChatbotResponse(Request $request) {
        try {
            $validated = $request->validate([
                'input' => 'required|string',
                'response' => 'required|string',
                'keywords' => 'nullable|array',
            ]);

            $response = ChatbotResponse::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Response erfolgreich gespeichert',
                'data' => $response
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }


    public function getTrainedData() {
        $responses = DB::table("chatbot_responses")->get();

        // Keywords in Array umwandeln
        $responses->transform(function ($item) {
            if (is_string($item->keywords)) {
                $decoded = json_decode($item->keywords, true);
                $item->keywords = is_array($decoded) ? $decoded : [];
            }
            return $item;
        });

        return response()->json($responses);
    }



    public function deleteChatbotResponse($id)
    {
        try {
            $response = ChatbotResponse::find($id);

            if (!$response) {
                return response()->json([
                    'success' => false,
                    'message' => 'Response nicht gefunden'
                ], 404);
            }

            $response->delete();

            return response()->json([
                'success' => true,
                'message' => 'Response erfolgreich gelöscht'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateChatbotResponse(Request $request, $id) {
        try {
            $response = ChatbotResponse::find($id);

            if(!$response) {
                return response()->json([
                    'success' => false,
                    'message' => 'Response nicht gefunden'
                ], 404);
            }

            $validated = $request->validate([
                'input' => 'required|string',
                'response' => 'required|string',
                'keywords' => 'nullable|array',
            ]);

            $response->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Response erfolgreich aktualisiert',
                'data' => $response
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }




}
