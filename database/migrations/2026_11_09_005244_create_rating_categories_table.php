<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rating_categories', function (Blueprint $table) {
            $table->id();

            // Identitas kategori
            $table->string('slug', 100)->unique();

            // Nama kategori bilingual
            $table->string('name_id', 150);
            $table->string('name_en', 150);

            // Deskripsi singkat bilingual
            $table->string('description_id', 500);
            $table->string('description_en', 500);

            // Pengaturan tampilan
            $table->string('icon_key', 50)->default('star');
            $table->unsignedSmallInteger('sort_order')->default(0);

            // Pengaturan penilaian
            $table->boolean('allow_not_applicable')->default(false);
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rating_categories');
    }
};
