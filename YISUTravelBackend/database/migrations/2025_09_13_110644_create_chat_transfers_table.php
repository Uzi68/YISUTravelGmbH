<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained()->onDelete('cascade');
            $table->foreignId('from_agent_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('to_agent_id')->constrained('users')->onDelete('cascade');
            $table->text('reason')->nullable();
            $table->timestamp('transferred_at');
            $table->timestamps();

            $table->index(['chat_id', 'transferred_at']);
            $table->index('from_agent_id');
            $table->index('to_agent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_transfers');
    }
};
