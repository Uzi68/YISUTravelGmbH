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
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->string('location');
            $table->string('image_url')->nullable();
            $table->decimal('price', 10, 2);
            $table->string('currency', 3)->default('EUR');
            $table->integer('rating')->default(4);
            $table->string('badge')->nullable(); // z.B. "Top-Angebot", "Neu", etc.
            $table->json('highlights')->nullable(); // Array von Highlights
            $table->string('duration')->nullable(); // z.B. "7 Tage"
            $table->string('inclusions')->nullable(); // z.B. "Flug + Transfer, All Inclusive"
            $table->boolean('is_featured')->default(false); // Hauptangebot
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offers');
    }
};
