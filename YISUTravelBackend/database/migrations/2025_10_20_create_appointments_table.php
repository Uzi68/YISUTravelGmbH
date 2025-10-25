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
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone');
            $table->date('appointment_date');
            $table->time('appointment_time');
            $table->enum('service_type', ['flight', 'hotel', 'package', 'custom', 'consultation', 'beratung', 'buchung', 'visum', 'sonstiges']);
            $table->integer('travelers_count');
            $table->string('destination')->nullable();
            $table->string('budget_range')->nullable();
            $table->text('message')->nullable();
            $table->enum('status', ['confirmed', 'cancelled', 'completed'])->default('confirmed');
            $table->boolean('blocked_by_admin')->default(false);
            $table->timestamps();

            // Indexes for fast availability queries
            $table->index(['appointment_date', 'appointment_time']);
            $table->index('appointment_date');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};


