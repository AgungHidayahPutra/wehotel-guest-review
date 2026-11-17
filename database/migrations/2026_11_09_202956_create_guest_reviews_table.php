<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guest_reviews', function (Blueprint $table) {
            $table->id();

            // Identitas tamu
            $table->string('guest_name', 150);
            $table->string('room_number', 20);
            $table->boolean('hide_name')->default(true);

            // Pertanyaan 1–3
            // Minimal satu wajib diisi (validasi dilakukan di backend).
            $table->text('liked')->nullable();
            $table->text('improvement')->nullable();
            $table->text('unpleasant')->nullable();

            // Pertanyaan 4 - wajib
            $table->text('suggestions');

            // Persetujuan untuk dihubungi
            $table->boolean('contact_consent')->default(false);

            // whatsapp / email
            $table->string('contact_method', 20)->nullable();

            // Nantinya dienkripsi oleh Laravel
            $table->longText('contact_value')->nullable();

            $table->timestamps();

            // Mempercepat pencarian dan pengurutan
            $table->index('room_number');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_reviews');
    }
};
