<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatbotOption extends Model
{
    use HasFactory;

    protected $fillable = [
        'chatbot_response_id',
        'option_text',
        'option_value',
        'order'
    ];

    public function response()
    {
        return $this->belongsTo(ChatbotResponse::class);
    }
}
