<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Visitor extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'agb_accepted',
        'agb_accepted_at',
        'agb_version'
    ];

    public function chats()
    {
        return $this->hasMany(Chat::class);
    }

    public function chatRequests()
    {
        return $this->hasMany(ChatRequest::class);
    }
}
