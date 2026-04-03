<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingConversation extends Model
{
    protected $fillable = ['title', 'user_id'];

    public function messages()
    {
        return $this->hasMany(TrainingMessage::class, 'conversation_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
