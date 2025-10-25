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
        Schema::table('appointments', function (Blueprint $table) {
            // Remove unused columns
            $table->dropColumn(['destination', 'budget_range', 'travelers_count']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Add back the columns if needed
            $table->string('destination')->nullable();
            $table->string('budget_range')->nullable();
            $table->integer('travelers_count')->default(1);
        });
    }
};