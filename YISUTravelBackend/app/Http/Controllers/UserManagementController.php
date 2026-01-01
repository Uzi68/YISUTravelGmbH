<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    /**
     * Get all staff users (for admin management)
     */
    public function getStaffUsers(): JsonResponse
    {
        $staffUsers = User::where('user_type', User::USER_TYPE_STAFF)
            ->with([
                'roles',
                'pushSubscriptions' => function ($query) {
                    $query->where('is_active', true)
                        ->orderByDesc('last_seen_at');
                }
            ])
            ->get()
            ->map(function ($user) {
                $activeSubscriptions = $user->pushSubscriptions ?? collect();
                $pushDeviceCount = $activeSubscriptions->count();
                $pushLastSeenAt = $activeSubscriptions->max('last_seen_at');
                $pushLastNotifiedAt = $activeSubscriptions->max('last_notified_at');

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'is_active' => $user->is_active,
                    'avatar' => $user->avatar,
                    'profile_image_url' => $user->profile_image_url,
                    'roles' => $user->getRoleNames(),
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                    'push_enabled' => $pushDeviceCount > 0,
                    'push_device_count' => $pushDeviceCount,
                    'push_last_seen_at' => $pushLastSeenAt,
                    'push_last_notified_at' => $pushLastNotifiedAt,
                ];
            });

        return response()->json($staffUsers);
    }

    /**
     * Create a new staff user
     */
    public function createStaffUser(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:20',
            'role' => ['required', Rule::in(['Admin', 'Agent'])],
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'name' => $request->first_name . ' ' . $request->last_name,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'user_type' => User::USER_TYPE_STAFF,
            'is_active' => $request->is_active ?? true,
        ]);

        // Assign role
        $user->assignRole($request->role);

        return response()->json([
            'message' => 'Staff user created successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'is_active' => $user->is_active,
                'roles' => $user->getRoleNames(),
            ]
        ], 201);
    }

    /**
     * Update a staff user
     */
    public function updateStaffUser(Request $request, $id): JsonResponse
    {
        $user = User::where('user_type', User::USER_TYPE_STAFF)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'role' => ['sometimes', 'required', Rule::in(['Admin', 'Agent'])],
            'is_active' => 'sometimes|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updateData = $request->only(['first_name', 'last_name', 'email', 'phone', 'is_active']);
        
        if ($request->has('first_name') || $request->has('last_name')) {
            $updateData['name'] = ($request->first_name ?? $user->first_name) . ' ' . ($request->last_name ?? $user->last_name);
        }

        $user->update($updateData);

        // Update role if provided
        if ($request->has('role')) {
            $user->syncRoles([$request->role]);
        }

        return response()->json([
            'message' => 'Staff user updated successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'is_active' => $user->is_active,
                'roles' => $user->getRoleNames(),
            ]
        ]);
    }

    /**
     * Delete a staff user
     */
    public function deleteStaffUser($id): JsonResponse
    {
        $user = User::where('user_type', User::USER_TYPE_STAFF)->findOrFail($id);
        
        // Prevent deletion of the last admin
        if ($user->hasRole('Admin')) {
            $adminCount = User::role('Admin')->where('user_type', User::USER_TYPE_STAFF)->count();
            if ($adminCount <= 1) {
                return response()->json(['error' => 'Cannot delete the last admin user'], 400);
            }
        }

        $user->delete();

        return response()->json(['message' => 'Staff user deleted successfully']);
    }

    /**
     * Update user profile (for both staff and customers)
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'current_password' => 'required_with:password',
            'password' => 'sometimes|required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify current password if changing password
        if ($request->has('password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json(['error' => 'Current password is incorrect'], 400);
            }
        }

        $updateData = $request->only(['first_name', 'last_name', 'email', 'phone']);
        
        // Always update the name field when first_name or last_name changes
        if ($request->has('first_name') || $request->has('last_name')) {
            $firstName = $request->first_name ?? $user->first_name;
            $lastName = $request->last_name ?? $user->last_name;
            $updateData['name'] = trim($firstName . ' ' . $lastName);
        }

        if ($request->has('password')) {
            $updateData['password'] = Hash::make($request->password);
        }

        $user->update($updateData);

        return response()->json([
            'message' => 'Profile updated successfully',
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
        ]);
    }

    /**
     * Get user profile
     */
    public function getProfile(): JsonResponse
    {
        $user = auth()->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'user_type' => $user->user_type,
            'is_active' => $user->is_active,
            'avatar' => $user->avatar,
            'profile_image_url' => $user->profile_image_url,
            'roles' => $user->getRoleNames(),
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ]);
    }

    /**
     * Upload profile image
     */
    public function uploadProfileImage(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'profile_image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = auth()->user();

        // Delete old profile image if exists
        if ($user->profile_image_url) {
            $oldImagePath = str_replace('/storage/', '', $user->profile_image_url);
            if (Storage::disk('public')->exists($oldImagePath)) {
                Storage::disk('public')->delete($oldImagePath);
            }
        }

        // Store new image
        $imagePath = $request->file('profile_image')->store('profile-images', 'public');
        $imageUrl = Storage::url($imagePath);

        // Update user profile
        $user->update(['profile_image_url' => $imageUrl]);

        return response()->json([
            'message' => 'Profile image uploaded successfully',
            'profile_image_url' => $imageUrl
        ]);
    }

    /**
     * Remove profile image
     */
    public function removeProfileImage(): JsonResponse
    {
        $user = auth()->user();

        if ($user->profile_image_url) {
            // Delete image from storage
            $imagePath = str_replace('/storage/', '', $user->profile_image_url);
            if (Storage::disk('public')->exists($imagePath)) {
                Storage::disk('public')->delete($imagePath);
            }

            // Update user profile
            $user->update(['profile_image_url' => null]);

            return response()->json([
                'message' => 'Profile image removed successfully'
            ]);
        }

        return response()->json([
            'message' => 'No profile image to remove'
        ]);
    }
}
