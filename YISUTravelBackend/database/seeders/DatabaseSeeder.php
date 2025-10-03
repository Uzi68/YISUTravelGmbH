<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {




/*
        //____________________________________________
        //CREATE User Role and User Login credentials Testing purpose
        $userRole = Role::firstOrCreate(['name' => 'User']);

        // Create 5 users and assign them the 'User' role
        User::factory(5)->create()->each(function ($user) use ($userRole) {
            $user->assignRole($userRole);
            $user->password = Hash::make('123123');
            $user->save();

        });*/

        $this->call([
            UserSeeder::class,
            VisitorSeeder::class,
            ChatbotResponseSeeder::class,
            ChatSeeder::class,
            MessageSeeder::class,
            EscalationSeeder::class,
            ActiveChatsSeeder::class
        ]);
    }
}
