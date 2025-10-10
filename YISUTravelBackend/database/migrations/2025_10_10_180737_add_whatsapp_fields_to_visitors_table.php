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
        Schema::table('visitors', function (Blueprint $table) {
            // Check if whatsapp_number column doesn't exist before adding
            if (!Schema::hasColumn('visitors', 'whatsapp_number')) {
                $table->string('whatsapp_number')->nullable()->after('phone');
            }

            // Check if channel column doesn't exist before adding
            if (!Schema::hasColumn('visitors', 'channel')) {
                $table->string('channel')->nullable()->default('website')->after('whatsapp_number');
            }

            // Only add index if column exists and index doesn't exist
            if (Schema::hasColumn('visitors', 'whatsapp_number')) {
                $indexExists = collect(\DB::select("SHOW INDEX FROM visitors WHERE Key_name = 'visitors_whatsapp_number_index'"))->isNotEmpty();
                if (!$indexExists) {
                    $table->index('whatsapp_number');
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('visitors', function (Blueprint $table) {
            if (Schema::hasColumn('visitors', 'whatsapp_number')) {
                $indexExists = collect(\DB::select("SHOW INDEX FROM visitors WHERE Key_name = 'visitors_whatsapp_number_index'"))->isNotEmpty();
                if ($indexExists) {
                    $table->dropIndex(['whatsapp_number']);
                }
                $table->dropColumn('whatsapp_number');
            }

            if (Schema::hasColumn('visitors', 'channel')) {
                $table->dropColumn('channel');
            }
        });
    }
};
