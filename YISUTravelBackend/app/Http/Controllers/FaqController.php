<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class FaqController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'category' => 'nullable|string|max:50',
            'limit' => 'nullable|integer|max:20'
        ]);

        return Faq::query()
            ->when($validated['category'] ?? null, fn($q, $cat) => $q->where('category', $cat))
            ->orderBy('popularity', 'desc')
            ->limit($validated['limit'] ?? 10)
            ->get();
    }

    public function incrementPopularity($id)
    {
        $faq = Faq::findOrFail($id);

        return DB::transaction(function () use ($faq) {
            $faq->increment('popularity');
            return response()->json(['popularity' => $faq->fresh()->popularity]);
        });
    }
}
