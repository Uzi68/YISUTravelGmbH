<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EscalationPrompt extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_id',
        'sent_by_agent_id',
        'status',
        'sent_at',
        'responded_at',
        'visitor_response'
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'responded_at' => 'datetime'
    ];

    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }

    public function sentByAgent()
    {
        return $this->belongsTo(User::class, 'sent_by_agent_id');
    }

    public function isAccepted(): bool
    {
        return $this->status === 'accepted';
    }

    public function isDeclined(): bool
    {
        return $this->status === 'declined';
    }
}
