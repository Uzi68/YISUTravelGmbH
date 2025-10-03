<?php

namespace Database\Seeders;

use App\Models\Chat;
use App\Models\Message;
use App\Models\User;
use App\Models\Visitor;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class ActiveChatsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        /*
       // 1. Rollen sicherstellen
       Role::firstOrCreate(['name' => 'employee']);
       Role::firstOrCreate(['name' => 'user']);

       // 2. Test-Agenten erstellen
       $agent1 = User::create([
           'name' => 'Support Agent 1',
           'email' => 'agent3@yisu-travel.de',
           'password' => bcrypt('password'),
           'is_active' => true
       ]);
       $agent1->assignRole('employee');

               $agent2 = User::create([
                   'name' => 'Support Agent 2',
                   'email' => 'agent4@yisu-travel.de',
                   'password' => bcrypt('password'),
                   'is_active' => true
               ]);
               $agent2->assignRole('employee');

               $customer1 = User::create([
                   'name' => 'Max Mustermann',
                   'email' => 'max1@example.com',
                   'password' => bcrypt('password')
               ]);
               $customer1->assignRole('user');

               $customer2 = User::create([
                   'name' => 'Erika Musterfrau',
                   'email' => 'erika@example.com',
                   'password' => bcrypt('password')
               ]);
               $customer2->assignRole('user');

               // 4. Visitor mit allen Pflichtfeldern erstellen
               $visitor = Visitor::create([
                   'name' => 'Anonym',
                   'email' => 'anon@example.com',
                   'phone' => '+49123456789', // Pflichtfeld
                   'session_id' => 'anon_session_'.Str::random(10)
               ]);

               // 5. Aktive Chats erstellen
               $activeChats = [
                   [
                       'user_id' => $customer1->id,
                       'status' => 'human',
                       'session_id' => 'unassigned_chat_1',
                       'messages' => [
                           ['from' => 'user', 'text' => 'Hallo, ich brauche Hilfe'],
                           ['from' => 'bot', 'text' => 'Wir leiten Sie weiter']
                       ]
                   ],
                   [
                       'user_id' => $customer2->id,
                       'status' => 'human',
                       'assigned_to' => $agent1->id,
                       'assigned_at' => now(),
                       'session_id' => 'assigned_chat_1',
                       'messages' => [
                           ['from' => 'user', 'text' => 'Meine Buchung ist fehlgeschlagen'],
                           ['from' => 'agent', 'text' => 'Ich helfe Ihnen weiter']
                       ]
                   ],
                   [
                       'user_id' => null,
                       'visitor_id' => $visitor->id,
                       'visitor_session_id' => $visitor->session_id,
                       'status' => 'human',
                       'assigned_to' => $agent2->id,
                       'assigned_at' => now()->subHours(1),
                       'session_id' => 'busy_chat_1',
                       'messages' => [
                           ['from' => 'user', 'text' => 'Wie storniere ich?'],
                           ['from' => 'bot', 'text' => 'Eskalation erforderlich'],
                           ['from' => 'agent', 'text' => 'Bitte geben Sie Ihre Buchungsnummer an'],
                           ['from' => 'user', 'text' => 'ABC123'],
                           ['from' => 'agent', 'text' => 'Danke, ich schaue das an']
                       ]
                   ]
               ];

               // 6. Chats und Nachrichten erstellen
               foreach ($activeChats as $chatData) {
                   $chat = Chat::create([
                       'session_id' => $chatData['session_id'],
                       'user_id' => $chatData['user_id'],
                       'visitor_id' => $chatData['visitor_id'] ?? null,
                       'visitor_session_id' => $chatData['visitor_session_id'] ?? null,
                       'status' => $chatData['status'],
                       'assigned_to' => $chatData['assigned_to'] ?? null,
                       'assigned_at' => $chatData['assigned_at'] ?? null
                   ]);

                   foreach ($chatData['messages'] as $message) {
                       Message::create([
                           'chat_id' => $chat->id,
                           'from' => $message['from'],
                           'text' => $message['text'],
                           'read' => $message['from'] !== 'user'
                       ]);
                   }
       }*/

        $this->command->info('Aktive Chats erfolgreich erstellt!');
    }
}
