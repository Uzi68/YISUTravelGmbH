<?php

namespace App\Http\Controllers;

use App\Events\MessagePusher;
use Illuminate\Http\Request;

class MessagePusherController extends Controller
{
    public function message(Request $request)
    {
        $chat = $request->input('chat');  // z. B. 123
        $message = (object)[
            'id' => uniqid(),
            'text' => $request->input('message'),
            'from' => 'AngularClient',
            'created_at' => now()->toISOString()
        ];

/*
        event(new MessagePusher($message, $chat));

        return ['status' => 'sent'];*/
    }


}
