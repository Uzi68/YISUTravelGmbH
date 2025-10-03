<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // from enum erweitern um 'system' für Assignment-Nachrichten
            $table->enum('from', ['user', 'bot', 'agent', 'system'])->change();

            // Metadata-Spalte erweitern falls nicht vorhanden
            if (!Schema::hasColumn('messages', 'metadata')) {
                $table->json('metadata')->nullable()->after('text');
            }

            // Message-Typ für bessere Filterung
            if (!Schema::hasColumn('messages', 'message_type')) {
                $table->string('message_type')->default('chat')->after('from');
                $table->index('message_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->enum('from', ['user', 'bot', 'agent'])->change();
            $table->dropColumn(['message_type']);
        });
    }
};
