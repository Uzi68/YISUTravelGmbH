<?php

namespace Database\Seeders;

use App\Models\Chat;
use App\Models\Message;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class MessageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        /*
        $chat = Chat::first();

        $messages = [
            [
                'chat_id' => $chat->id,
                'from' => 'user',
                'text' => 'Hallo, ich brauche Hilfe',
                'read' => false
            ],
            [
                'chat_id' => $chat->id,
                'from' => 'agent',
                'text' => 'Wie kann ich Ihnen helfen?',
                'read' => true
            ]
        ];

        foreach ($messages as $message) {
            Message::create($message);
        }*/
    }
/*
    private function getRandomUserMessage()
    {
        $messages = [
            'Hallo, ich habe eine Frage',
            'Wie kann ich meine Buchung stornieren?',
            'Was sind eure Öffnungszeiten?',
            'Ich brauche Hilfe bei meiner Buchung'
        ];

        return $messages[array_rand($messages)];
    }*/
}
