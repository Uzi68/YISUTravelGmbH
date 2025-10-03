<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatTransfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_id',
        'from_agent_id',
        'to_agent_id',
        'reason',
        'transferred_at'
    ];

    protected $casts = [
        'transferred_at' => 'datetime'
    ];

    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }

    public function fromAgent()
    {
        return $this->belongsTo(User::class, 'from_agent_id');
    }

    public function toAgent()
    {
        return $this->belongsTo(User::class, 'to_agent_id');
    }
}
