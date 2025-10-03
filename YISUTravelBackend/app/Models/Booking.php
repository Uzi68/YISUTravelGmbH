<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_number',
        'session_id',
        'chat_id',
        'visitor_id',
        'destination',
        'travel_date',
        'persons',
        'status',
        'price',
        'metadata'
    ];

    protected $casts = [
        'travel_date' => 'date',
        'metadata' => 'array'
    ];

    /**
     * Get the visitor that owns the booking.
     */
    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }

    /**
     * Get the chat that owns the booking.
     */
    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }

    /**
     * Generate a unique booking number.
     */
    public static function generateBookingNumber(): string
    {
        return 'BK-' . date('Ymd') . '-' . strtoupper(Str::random(6));
    }

    /**
     * Accessor for customer name (from visitor relation).
     */
    public function getCustomerNameAttribute(): ?string
    {
        return $this->visitor->name ?? null;
    }

    /**
     * Accessor for customer email (from visitor relation).
     */
    public function getCustomerEmailAttribute(): ?string
    {
        return $this->visitor->email ?? null;
    }

    /**
     * Accessor for customer phone (from visitor relation).
     */
    public function getCustomerPhoneAttribute(): ?string
    {
        return $this->visitor->phone ?? null;
    }
}
