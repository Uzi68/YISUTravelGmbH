<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Illuminate\Http\Request;
use \Illuminate\Http\JsonResponse;
use App\Models\User;
use App\Mail\PasswordResetMail;

class AuthController extends Controller
{

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');
        $remember = $request->has('remember') ? $request->boolean('remember') : true;

        if (Auth::attempt($credentials, $remember)) {
            // Regeneriere die Session-ID für den eingeloggten Benutzer
            $request->session()->regenerate();

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

    /**
     * Send password reset link
     */
    public function sendPasswordResetLink(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if user exists
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['error' => 'Benutzer mit dieser E-Mail-Adresse nicht gefunden'], 404);
        }

        // Generate reset token
        $token = Password::getRepository()->create($user);
        
        // Send custom email
        try {
            Mail::to($user->email)->send(new PasswordResetMail($token, $user->email));
            
            return response()->json([
                'message' => 'Passwort-Reset-Link wurde an Ihre E-Mail gesendet',
                'email' => $user->email
            ]);
        } catch (\Exception $e) {
            \Log::error('Password reset email failed: ' . $e->getMessage());
            return response()->json(['error' => 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es später erneut.'], 500);
        }
    }

    /**
     * Reset password
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password reset successfully']);
        }

        return response()->json(['error' => 'Unable to reset password'], 400);
    }

    /**
     * Change password (for authenticated users)
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required',
            'password' => 'required|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = Auth::user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'Current password is incorrect'], 400);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->password)
        ]);

        // Invalidate all sessions for this user (except current one)
        $this->invalidateUserSessions($user->id);

        // Logout current session
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Password changed successfully. Please log in again.',
            'logout_required' => true
        ]);
    }

    /**
     * Invalidate all sessions for a user except the current one
     */
    private function invalidateUserSessions($userId): void
    {
        // Delete all sessions from database for this user
        DB::table('sessions')
            ->where('user_id', $userId)
            ->delete();
    }

}
