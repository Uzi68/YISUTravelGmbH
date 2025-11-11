<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Chat;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use App\Mail\CustomerWelcomeMail;

class CustomerController extends Controller
{
    /**
     * Register a new customer
     */
    public function register(Request $request): JsonResponse
    {
        // Debug: Log the incoming request data
        \Log::info('Customer registration request data:', $request->all());
        
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            \Log::error('Customer registration validation failed:', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'name' => $request->first_name . ' ' . $request->last_name,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'user_type' => User::USER_TYPE_CUSTOMER,
            'is_active' => true,
        ]);

        // Assign customer role
        $user->assignRole('User');

        // Send welcome mail (fails silently but logged)
        try {
            Mail::to($user->email)->send(new CustomerWelcomeMail($user));
        } catch (\Throwable $th) {
            \Log::error('Customer welcome mail failed to send', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $th->getMessage(),
            ]);
        }

        // Auto-login after registration
        Auth::login($user);
        
        // Regenerate session to prevent session fixation
        request()->session()->regenerate();

        return response()->json([
            'message' => 'Customer registered successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'user_type' => $user->user_type,
                'roles' => $user->getRoleNames(),
            ]
        ], 201);
    }

    /**
     * Get customer's chat history
     */
    public function getChatHistory(): JsonResponse
    {
        $user = auth()->user();
        
        if ($user->user_type !== User::USER_TYPE_CUSTOMER) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $chats = Chat::where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhere(function ($fallback) use ($user) {
                        $fallback->whereNull('user_id')
                            ->where('visitor_id', $user->id);
                    });
            })
            ->with(['messages' => function($query) {
                $query->orderBy('created_at', 'asc');
            }])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($chat) {
                return [
                    'id' => $chat->id,
                    'status' => $chat->status,
                    'channel' => $chat->channel,
                    'assigned_to' => $chat->assigned_to,
                    'created_at' => $chat->created_at,
                    'updated_at' => $chat->updated_at,
                    'messages' => $chat->messages->map(function($message) {
                        return [
                            'id' => $message->id,
                            'content' => $message->content,
                            'sender_type' => $message->sender_type,
                            'created_at' => $message->created_at,
                            'attachments' => $message->attachments ?? []
                        ];
                    })
                ];
            });

        return response()->json($chats);
    }

    /**
     * Get customer dashboard statistics
     */
    public function getDashboardStats(): JsonResponse
    {
        $user = auth()->user();
        
        if ($user->user_type !== User::USER_TYPE_CUSTOMER) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $chatQuery = Chat::where(function ($query) use ($user) {
            $query->where('user_id', $user->id)
                ->orWhere(function ($fallback) use ($user) {
                    $fallback->whereNull('user_id')
                        ->where('visitor_id', $user->id);
                });
        });

        $totalChats = (clone $chatQuery)->count();
        $activeChats = (clone $chatQuery)
            ->whereIn('status', ['active', 'waiting', 'human', 'in_progress'])
            ->count();
        $resolvedChats = (clone $chatQuery)
            ->where('status', 'closed')
            ->count();

        return response()->json([
            'total_chats' => $totalChats,
            'active_chats' => $activeChats,
            'resolved_chats' => $resolvedChats,
        ]);
    }

    /**
     * Get customer profile
     */
    public function getProfile(): JsonResponse
    {
        $user = auth()->user();
        
        if ($user->user_type !== User::USER_TYPE_CUSTOMER) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'user_type' => $user->user_type,
            'created_at' => $user->created_at,
        ]);
    }
}