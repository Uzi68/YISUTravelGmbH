<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escalation_prompts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained()->onDelete('cascade');
            $table->foreignId('sent_by_agent_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['sent', 'accepted', 'declined', 'ignored'])->default('sent');
            $table->timestamp('sent_at');
            $table->timestamp('responded_at')->nullable();
            $table->text('visitor_response')->nullable();
            $table->timestamps();

            $table->index(['chat_id', 'sent_at']);
            $table->index('sent_by_agent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escalation_prompts');
    }
};
