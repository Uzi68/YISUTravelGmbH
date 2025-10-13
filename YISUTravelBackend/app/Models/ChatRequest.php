<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'visitor_id',
        'chat_id',
        'assigned_to',
        'status',
        'initial_question'
    ];

    public function visitor()
    {
        return $this->belongsTo(Visitor::class);
    }

    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }

    public function assignedAgent()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isAccepted(): bool
    {
        return $this->status === 'accepted';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}
