<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_name',
        'customer_email',
        'customer_phone',
        'appointment_date',
        'appointment_time',
        'service_type',
        'message',
        'status',
        'blocked_by_admin'
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'appointment_time' => 'datetime',
        'blocked_by_admin' => 'boolean'
    ];

    /**
     * Scope for confirmed appointments
     */
    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    /**
     * Scope for cancelled appointments
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Scope for completed appointments
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for admin blocked appointments
     */
    public function scopeBlockedByAdmin($query)
    {
        return $query->where('blocked_by_admin', true);
    }

    /**
     * Get service type label in German
     */
    public function getServiceTypeLabelAttribute(): string
    {
        return match($this->service_type) {
            'flight' => 'Flugbuchung',
            'hotel' => 'Hotelbuchung',
            'package' => 'Pauschalreise',
            'custom' => 'Individuelle Reise',
            'consultation' => 'Reiseberatung',
            'beratung' => 'Reiseberatung',
            'buchung' => 'Buchung',
            'visum' => 'Visum-Service',
            'sonstiges' => 'Sonstiges',
            default => $this->service_type
        };
    }

    /**
     * Get status label in German
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'confirmed' => 'Bestätigt',
            'cancelled' => 'Storniert',
            'completed' => 'Abgeschlossen',
            default => $this->status
        };
    }

    /**
     * Get formatted appointment datetime
     */
    public function getFormattedDateTimeAttribute(): string
    {
        $date = $this->appointment_date->format('d.m.Y');
        $time = $this->appointment_time->format('H:i');
        return "{$date} um {$time} Uhr";
    }
}


