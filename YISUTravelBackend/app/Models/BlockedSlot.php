<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BlockedSlot extends Model
{
    use HasFactory;

    protected $fillable = [
        'blocked_date',
        'blocked_time',
        'reason'
    ];

    protected $casts = [
        'blocked_date' => 'date',
        'blocked_time' => 'datetime:H:i:s',
    ];

    /**
     * Check if a specific date and time is blocked
     */
    public static function isBlocked(string $date, string $time): bool
    {
        return self::where('blocked_date', $date)
            ->where('blocked_time', $time)
            ->exists();
    }

    /**
     * Get all blocked slots for a specific date
     */
    public static function getBlockedSlotsForDate(string $date): array
    {
        return self::where('blocked_date', $date)
            ->pluck('blocked_time')
            ->map(function($time) {
                // Return time in HH:MM format
                return date('H:i', strtotime($time));
            })
            ->toArray();
    }

    /**
     * Block a specific slot
     */
    public static function blockSlot(string $date, string $time, string $reason = null): self
    {
        return self::create([
            'blocked_date' => $date,
            'blocked_time' => $time,
            'reason' => $reason
        ]);
    }

    /**
     * Unblock a specific slot
     */
    public static function unblockSlot(string $date, string $time): bool
    {
        return self::where('blocked_date', $date)
            ->where('blocked_time', $time)
            ->delete() > 0;
    }
}