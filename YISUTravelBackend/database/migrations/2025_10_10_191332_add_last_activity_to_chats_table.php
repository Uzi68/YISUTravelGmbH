<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            // Füge last_activity Feld hinzu für Zuletzt-Online-Status
            if (!Schema::hasColumn('chats', 'last_activity')) {
                $table->timestamp('last_activity')->nullable()->after('last_agent_activity');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            if (Schema::hasColumn('chats', 'last_activity')) {
                $table->dropColumn('last_activity');
            }
        });
    }
};
