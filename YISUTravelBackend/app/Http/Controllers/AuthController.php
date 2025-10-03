<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use \Illuminate\Http\JsonResponse;

class AuthController extends Controller
{

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        if (Auth::attempt($credentials)) {
            // Regeneriere die Session-ID für den eingeloggten Benutzer
            //$request->session()->regenerate();

            // Hole den authentifizierten Benutzer
            $user = Auth::user();


            return response()->json([
                'message' => 'Login successful',
                'user' => $user,
                'roles' => $user->getRoleNames(),
            ]);
        }

        return response()->json(['message' => 'Unauthorized'], 401);
    }


    public function logout(Request $request): JsonResponse
    {
        // Benutzersession ungültig machen und den CSRF-Token zurücksetzen
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();  // Regeneriere den CSRF-Token

        return response()->json(['message' => 'Logout successful']);
    }

}
