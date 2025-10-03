<?php

namespace App\Http\Controllers;

use App\Models\Visitor;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VisitorController extends Controller
{
        public function register(Request $request)
        {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'nullable|email|max:255|unique:visitors,email',
                'phone' => 'required|string|max:20|unique:visitors,phone'
            ]);

            $visitor = Visitor::create([
                ...$validated,
                'session_id' => Str::uuid(),
                'ip_address' => $request->ip() // Für Sicherheitslogging
            ]);

            $visitor->ip_address = hash('sha256', $request->ip());
            return response()->json([
                'session_id' => $visitor->session_id,
                'visitor' => $visitor->only('name', 'email') // Privacy
            ], 201);
        }


        public function getVisitorDetails($session_id)
        {
            $visitor = Visitor::where('session_id', $session_id)->first();

            if (!$visitor) {
                return response()->json(['message' => 'Visitor not found'], 404);
            }

            return response()->json([
                'name' => $visitor->name,
                'phone'=> $visitor->phone
            ]);
        }
}
