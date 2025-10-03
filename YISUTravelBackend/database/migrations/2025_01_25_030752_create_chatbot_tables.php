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
        // Table for chatbot responses
        Schema::create('chatbot_responses', function (Blueprint $table) {
            $table->id();
            $table->string('input')->unique(); // User input (e.g., "Hello")
            $table->text('response'); // Bot response (e.g., "Hi there!")
            $table->json('keywords')->nullable();  // Eine neue Spalte für Synonyme
            $table->timestamps();
        });

        // Table for chat history
        Schema::create('chats', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->unique(); // Unique ID for each chat session
            $table->enum('status', ['bot', 'human', 'in_progress', 'closed'])->default('bot');
            //Spalte 'user_id' und Foreign Key
            $table->unsignedBigInteger('user_id')->nullable(); // Make it mandatory
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade'); // Foreign Key zu users, mit Cascade-Löschung
            $table->string('state')->nullable(); // z.B. "booking_destination", "booking_date"
            $table->json('context')->nullable(); // um Zwischenergebnisse zu speichern
            $table->string('visitor_session_id')->nullable(); // Für nicht authentifizierte Besucher
            $table->foreignId('visitor_id')->nullable()->constrained()->onDelete('cascade');
            $table->timestamp('assigned_at')->nullable(); // Wann der Chat einem Mitarbeiter zugewiesen wurde
            $table->timestamp('closed_at')->nullable(); // Wann der Chat geschlossen wurde
            $table->timestamps();
        });

        // Table for storing messages
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('chat_id'); // Foreign key to the `chats` table
            $table->foreign('chat_id')->references('id')->on('chats')->onDelete('cascade'); // Cascade delete when chat is deleted
            $table->enum('from', ['user', 'bot', 'agent']); // Who sent the message
            $table->text('text'); // Message content
            $table->json('metadata')->nullable(); // Für Dateianhänge, Bot-Buttons etc.
            $table->boolean('is_escalation_trigger')->default(false); // Markiert die "Mit Mitarbeiter sprechen"-Nachricht
            $table->timestamps();
        });



        // Neue Tabelle für Chatbot-Optionen/Buttons
        Schema::create('chatbot_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chatbot_response_id')->constrained()->onDelete('cascade');
            $table->string('option_text');
            $table->string('option_value'); // Wert der bei Auswahl gesendet wird
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        // Tabelle für Eskalationsanfragen
        Schema::create('escalations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained()->onDelete('cascade');
            $table->timestamp('requested_at');
            $table->timestamp('answered_at')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->timestamps();
        });

        Schema::create('chat_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained();
            $table->tinyInteger('rating'); // 1-5 Sterne
            $table->text('feedback')->nullable();
            $table->timestamps();
        });


    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_ratings');
        Schema::dropIfExists('escalations');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('chatbot_options');
        Schema::dropIfExists('chats');
        Schema::dropIfExists('chatbot_responses');
    }
};
