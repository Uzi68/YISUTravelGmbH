<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Offer extends Model
{
    protected $fillable = [
        'title',
        'description',
        'location',
        'image_url',
        'price',
        'currency',
        'rating',
        'badge',
        'highlights',
        'duration',
        'inclusions',
        'is_featured',
        'is_active',
        'sort_order'
    ];

    protected $casts = [
        'highlights' => 'array',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'price' => 'decimal:2'
    ];

    // Scope für aktive Angebote
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Scope für Hauptangebot
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    // Scope für sortierte Angebote
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('created_at', 'desc');
    }

    // Accessor für formatierten Preis
    public function getFormattedPriceAttribute()
    {
        return number_format($this->price, 0, ',', '.') . ' €';
    }

    // Accessor für Sterne-Rating
    public function getStarRatingAttribute()
    {
        return str_repeat('★', $this->rating) . str_repeat('☆', 5 - $this->rating);
    }
}
