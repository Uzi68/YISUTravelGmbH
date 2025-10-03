<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Rollen erstellen
        Role::firstOrCreate(['name' => 'Agent']);
        Role::firstOrCreate(['name' => 'User']);
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        //____________________________________________
        //CREATE Admin Role and Admin Login credentials


        $admin = User::factory()->create([
            'name' => 'admin',
            'email' => 'info@yisu-travel.de',
            'password' => Hash::make('YISU_Tr4v3l.!'),
        ]);
        // Assign the 'Admin' role to the admin user
        $admin->assignRole($adminRole);

        /*
        // Admin Benutzer
        User::create([
            'name' => 'Admin',
            'email' => 'admin@yisu-travel.de',
            'password' => bcrypt('password'),
            'is_active' => true,
            'avatar' => 'https://randomuser.me/api/portraits/men/1.jpg'
        ])->assignRole('admin');
*/
        // Support Mitarbeiter
        User::create([
            'name' => 'Support Agent 1',
            'email' => 'agent1@yisu-travel.de',
            'password' => bcrypt('YISU_4G3NT.$'),
            'is_active' => true,
            'avatar' => ''
        ])->assignRole('Agent');

        // Normale Benutzer
        /*
        User::create([
            'name' => 'Max Mustermann',
            'email' => 'max@example.com',
            'password' => bcrypt('password'),
            'is_active' => true
        ])->assignRole('User');
        */
    }
}
