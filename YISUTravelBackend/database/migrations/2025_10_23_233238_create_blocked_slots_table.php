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
        Schema::create('blocked_slots', function (Blueprint $table) {
            $table->id();
            $table->date('blocked_date');
            $table->time('blocked_time');
            $table->string('reason')->nullable(); // Optional: reason for blocking
            $table->timestamps();

            // Indexes for fast queries
            $table->index(['blocked_date', 'blocked_time']);
            $table->unique(['blocked_date', 'blocked_time']); // Prevent duplicate blocks
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blocked_slots');
    }
};