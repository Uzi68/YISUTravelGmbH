<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PushSubscriptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasAnyRole(['Admin', 'Agent'])) {
            return response()->json([
                'success' => false,
                'message' => 'Nur Mitarbeiter dürfen Push-Benachrichtigungen registrieren.'
            ], 403);
        }

        $validated = $request->validate([
            'token' => 'required|string',
            'device_id' => 'nullable|string|max:191',
            'device_name' => 'nullable|string|max:191',
            'platform' => 'nullable|string|max:50',
            'app_version' => 'nullable|string|max:50',
        ]);

        if (!empty($validated['device_id'])) {
            PushSubscription::where('device_id', $validated['device_id'])
                ->where('user_id', $user->id)
                ->where('token', '!=', $validated['token'])
                ->update(['is_active' => false]);
        }

        $subscription = PushSubscription::updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id' => $user->id,
                'device_id' => $validated['device_id'] ?? null,
                'device_name' => $validated['device_name'] ?? null,
                'platform' => $validated['platform'] ?? null,
                'app_version' => $validated['app_version'] ?? null,
                'last_seen_at' => now(),
                'is_active' => true,
            ]
        );

        Log::info('Push subscription stored', [
            'user_id' => $subscription->user_id,
            'device_id' => $subscription->device_id,
            'platform' => $subscription->platform,
        ]);

        return response()->json([
            'success' => true,
            'data' => $subscription,
        ]);
    }

    public function destroy(Request $request, string $token): JsonResponse
    {
        $user = $request->user();

        PushSubscription::where('token', $token)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['success' => true]);
    }

    public function destroyByDevice(Request $request, string $deviceId): JsonResponse
    {
        $user = $request->user();

        PushSubscription::where('device_id', $deviceId)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['success' => true]);
    }
}
