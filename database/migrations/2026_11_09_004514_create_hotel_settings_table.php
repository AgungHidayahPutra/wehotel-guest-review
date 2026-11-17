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
        Schema::create('hotel_settings', function (Blueprint $table) {
            $table->id();

            // Identitas hotel
            $table->string('hotel_name', 150)
                ->default('WE HOTEL');

            // Logo dan foto hotel
            $table->string('logo_path')->nullable();
            $table->string('hero_image_path')->nullable();

            // Waktu pembuatan dan perubahan data
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hotel_settings');
    }
};
