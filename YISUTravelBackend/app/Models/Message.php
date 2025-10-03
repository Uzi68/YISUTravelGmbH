<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_id',
        'from',
        'text',
        'metadata',
        'message_type',
        'is_escalation_trigger'
    ];

    protected $casts = [
        'is_escalation_trigger' => 'boolean',
        'metadata' => 'array'
    ];


    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }

    public function reads()
    {
        return $this->hasMany(MessageRead::class, 'message_id');
    }

    public function attachments()
    {
        return $this->hasMany(MessageAttachment::class);
    }

}
