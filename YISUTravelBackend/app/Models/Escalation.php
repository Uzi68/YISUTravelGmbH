<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Escalation extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_id',
        'requested_at',
        'answered_at',
        'assigned_to',
        'status'
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'answered_at' => 'datetime'
    ];

    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
