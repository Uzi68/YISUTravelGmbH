<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingMessage extends Model
{
    protected $fillable = ['conversation_id', 'role', 'content', 'saved_items'];

    protected $casts = [
        'saved_items' => 'array',
    ];

    public function conversation()
    {
        return $this->belongsTo(TrainingConversation::class, 'conversation_id');
    }
}
