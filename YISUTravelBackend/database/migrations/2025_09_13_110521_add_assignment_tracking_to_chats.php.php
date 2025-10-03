<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            // Falls assigned_to nicht bereits existiert
            if (!Schema::hasColumn('chats', 'assigned_to')) {
                $table->foreignId('assigned_to')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('users')
                    ->onDelete('set null');
            }

            // Assignment-Tracking hinzufügen
            if (!Schema::hasColumn('chats', 'assigned_at')) {
                $table->timestamp('assigned_at')->nullable()->after('assigned_to');
            }

            if (!Schema::hasColumn('chats', 'last_agent_activity')) {
                $table->timestamp('last_agent_activity')->nullable()->after('assigned_at');
            }

            // Transfer-History
            if (!Schema::hasColumn('chats', 'transfer_count')) {
                $table->integer('transfer_count')->default(0)->after('last_agent_activity');
            }
        });
    }

    public function down(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            $table->dropColumn(['assigned_at', 'last_agent_activity', 'transfer_count']);
            if (Schema::hasColumn('chats', 'assigned_to')) {
                $table->dropForeign(['assigned_to']);
                $table->dropColumn('assigned_to');
            }
        });
    }
};
