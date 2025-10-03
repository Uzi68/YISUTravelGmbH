<?php

namespace Database\Seeders;

use App\Models\Chat;
use App\Models\User;
use App\Models\Visitor;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ChatSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        /*
        $agent = User::role('employee')->first();
        $visitor = Visitor::first();

        $chats = [
            [
                'session_id' => 'session_123',
                'user_id' => User::role('user')->first()->id,
                'status' => 'human',
                'assigned_to' => $agent->id,
                'assigned_at' => now()
            ],
            [
                'session_id' => 'session_456',
                'visitor_id' => $visitor->id,
                'visitor_session_id' => $visitor->session_id,
                'status' => 'human'
            ]
        ];

        foreach ($chats as $chat) {
            Chat::create($chat);
        }*/
    }
}
