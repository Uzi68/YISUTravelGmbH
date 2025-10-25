<?php

namespace App\Http\Controllers;

use App\Models\Offer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class OfferController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Offer::query();

        // Filter für aktive Angebote (für öffentliche API)
        if ($request->has('active_only') && $request->boolean('active_only')) {
            $query->active();
        }

        // Filter für Hauptangebot
        if ($request->has('featured_only') && $request->boolean('featured_only')) {
            $query->featured();
        }

        $offers = $query->ordered()->get();

        return response()->json([
            'success' => true,
            'data' => $offers
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        // Prepare data for validation - parse FormData fields first
        $data = $request->all();
        
        // Parse highlights if sent as JSON string (from FormData)
        if (isset($data['highlights']) && is_string($data['highlights'])) {
            $data['highlights'] = json_decode($data['highlights'], true);
        }
        
        // Parse boolean fields from FormData strings
        if (isset($data['is_featured']) && is_string($data['is_featured'])) {
            $data['is_featured'] = $data['is_featured'] === '1' || $data['is_featured'] === 'true';
        }
        if (isset($data['is_active']) && is_string($data['is_active'])) {
            $data['is_active'] = $data['is_active'] === '1' || $data['is_active'] === 'true';
        }

        $validator = Validator::make($data, [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'location' => 'required|string|max:255',
            'image_url' => 'nullable|string|max:500',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120', // 5MB max
            'price' => 'required|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'rating' => 'nullable|integer|min:1|max:5',
            'badge' => 'nullable|string|max:100',
            'highlights' => 'nullable|array',
            'duration' => 'nullable|string|max:100',
            'inclusions' => 'nullable|string|max:500',
            'is_featured' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Handle image upload
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('offers', 'public');
            $data['image_url'] = Storage::url($imagePath);
        }

        $offer = Offer::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Angebot erfolgreich erstellt',
            'data' => $offer
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $offer = Offer::find($id);

        if (!$offer) {
            return response()->json([
                'success' => false,
                'message' => 'Angebot nicht gefunden'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $offer
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $offer = Offer::find($id);

        if (!$offer) {
            return response()->json([
                'success' => false,
                'message' => 'Angebot nicht gefunden'
            ], 404);
        }

        // Prepare data for validation - parse FormData fields first
        $data = $request->all();
        
        // Parse highlights if sent as JSON string (from FormData)
        if (isset($data['highlights']) && is_string($data['highlights'])) {
            $data['highlights'] = json_decode($data['highlights'], true);
        }
        
        // Parse boolean fields from FormData strings
        if (isset($data['is_featured']) && is_string($data['is_featured'])) {
            $data['is_featured'] = $data['is_featured'] === '1' || $data['is_featured'] === 'true';
        }
        if (isset($data['is_active']) && is_string($data['is_active'])) {
            $data['is_active'] = $data['is_active'] === '1' || $data['is_active'] === 'true';
        }

        $validator = Validator::make($data, [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'location' => 'sometimes|required|string|max:255',
            'image_url' => 'nullable|string|max:500',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120', // 5MB max
            'price' => 'sometimes|required|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'rating' => 'nullable|integer|min:1|max:5',
            'badge' => 'nullable|string|max:100',
            'highlights' => 'nullable|array',
            'duration' => 'nullable|string|max:100',
            'inclusions' => 'nullable|string|max:500',
            'is_featured' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($offer->image_url) {
                $oldImagePath = str_replace('/storage/', '', $offer->image_url);
                if (Storage::disk('public')->exists($oldImagePath)) {
                    Storage::disk('public')->delete($oldImagePath);
                }
            }

            $imagePath = $request->file('image')->store('offers', 'public');
            $data['image_url'] = Storage::url($imagePath);
        }

        $offer->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Angebot erfolgreich aktualisiert',
            'data' => $offer
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $offer = Offer::find($id);

        if (!$offer) {
            return response()->json([
                'success' => false,
                'message' => 'Angebot nicht gefunden'
            ], 404);
        }

        $offer->delete();

        return response()->json([
            'success' => true,
            'message' => 'Angebot erfolgreich gelöscht'
        ]);
    }

    /**
     * Get featured offer (Hauptangebot)
     */
    public function featured(): JsonResponse
    {
        $featuredOffer = Offer::featured()->active()->first();

        return response()->json([
            'success' => true,
            'data' => $featuredOffer
        ]);
    }

    /**
     * Get all active offers except featured
     */
    public function active(): JsonResponse
    {
        $offers = Offer::active()
            ->where('is_featured', false)
            ->ordered()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $offers
        ]);
    }

    /**
     * Toggle featured status
     */
    public function toggleFeatured(string $id): JsonResponse
    {
        $offer = Offer::find($id);

        if (!$offer) {
            return response()->json([
                'success' => false,
                'message' => 'Angebot nicht gefunden'
            ], 404);
        }

        // Wenn dieses Angebot als featured gesetzt wird, alle anderen deaktivieren
        if (!$offer->is_featured) {
            Offer::where('is_featured', true)->update(['is_featured' => false]);
        }

        $offer->update(['is_featured' => !$offer->is_featured]);

        return response()->json([
            'success' => true,
            'message' => $offer->is_featured ? 'Angebot als Hauptangebot gesetzt' : 'Hauptangebot-Status entfernt',
            'data' => $offer
        ]);
    }
}
