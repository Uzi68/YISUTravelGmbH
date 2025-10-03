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
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_number')->unique(); // Eindeutige Buchungsnummer
            $table->string('session_id');
            $table->foreignId('chat_id')->constrained()->onDelete('cascade');
            $table->foreignId('visitor_id')->constrained()->onDelete('cascade');
            $table->string('destination');
            $table->date('travel_date');
            $table->integer('persons');
            $table->string('status')->default('confirmed'); // confirmed, cancelled, pending
            $table->decimal('price', 10, 2)->nullable(); // Optional: Preis
            $table->json('metadata')->nullable(); // Für zusätzliche Daten
            $table->timestamps();

            $table->index('session_id');
            $table->index('booking_number');
            $table->index('status');
            $table->index('visitor_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
