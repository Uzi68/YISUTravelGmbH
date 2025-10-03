<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            $table->text('close_reason')->nullable()->after('closed_at');
            $table->unsignedBigInteger('closed_by_agent')->nullable()->after('close_reason');

            $table->foreign('closed_by_agent')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            $table->dropForeign(['closed_by_agent']);
            $table->dropColumn(['close_reason', 'closed_by_agent']);
        });
    }
};
