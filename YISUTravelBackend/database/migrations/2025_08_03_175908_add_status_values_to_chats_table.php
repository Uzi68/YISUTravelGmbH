<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('chats', function (Blueprint $table) {
            $table->enum('status', [
                'bot',
                'human',
                'in_progress',
                'closed',
                'closed_by_user', // Neuer Wert
                'closed_by_agent' // Optional für spätere Verwendung
            ])->default('bot')->change();
        });
    }

    public function down()
    {
        Schema::table('chats', function (Blueprint $table) {
            $table->enum('status', [
                'bot',
                'human',
                'in_progress',
                'closed'
            ])->default('bot')->change();
        });
    }
};
