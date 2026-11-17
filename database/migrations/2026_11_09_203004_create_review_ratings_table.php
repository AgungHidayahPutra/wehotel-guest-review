<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_ratings', function (Blueprint $table) {
            $table->id();

            // Relasi ke review tamu
            $table->foreignId('guest_review_id')
                ->constrained('guest_reviews')
                ->cascadeOnDelete();

            // Relasi ke kategori penilaian
            $table->foreignId('rating_category_id')
                ->constrained('rating_categories')
                ->restrictOnDelete();

            // Nilai bintang 1–5
            // NULL jika layanan tidak digunakan
            $table->unsignedTinyInteger('score')->nullable();

            // rated / not_used
            $table->string('status', 12);

            $table->timestamps();

            // Satu kategori hanya boleh dinilai sekali per review
            $table->unique(
                ['guest_review_id', 'rating_category_id'],
                'one_score_per_category'
            );

            $table->index(['rating_category_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_ratings');
    }
};
