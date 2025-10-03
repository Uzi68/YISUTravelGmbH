<?php

namespace Database\Seeders;

use App\Models\Visitor;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class VisitorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        /*
        $visitors = [
            [
                'name' => 'Max Mustermann',
                'email' => 'max@example.com',
                'phone' => '+49123456789',
                'session_id' => Str::uuid()
            ],
            [
                'name' => 'Erika Musterfrau',
                'email' => 'erika@example.com',
                'phone' => '+49123456780',
                'session_id' => Str::uuid()
            ],
            [
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+49123456781',
                'session_id' => Str::uuid()
            ]
        ];

        foreach ($visitors as $visitor) {
            Visitor::create($visitor);
        }
        */
    }
}
