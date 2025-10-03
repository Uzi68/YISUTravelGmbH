<?php

namespace Database\Seeders;

use App\Models\Chat;
use App\Models\Escalation;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EscalationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Chat::where('status', 'human')->limit(3)->get()->each(function ($chat) {
            Escalation::create([
                'chat_id' => $chat->id,
                'requested_at' => now()->subHours(1),
                'status' => $chat->assigned_to ? 'accepted' : 'pending',
                'assigned_to' => $chat->assigned_to,
                'answered_at' => $chat->assigned_to ? now() : null
            ]);
        });
    }
}
