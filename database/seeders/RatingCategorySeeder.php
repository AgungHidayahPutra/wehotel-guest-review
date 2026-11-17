<?php

namespace Database\Seeders;

use App\Models\RatingCategory;
use Illuminate\Database\Seeder;

class RatingCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'slug' => 'staff-service',
                'name_id' => 'Pelayanan Staf',
                'name_en' => 'Staff Service',
                'description_id' => 'Keramahan, kesopanan, kecepatan respons, kemampuan membantu, dan profesionalisme staf.',
                'description_en' => 'Friendliness, courtesy, response time, helpfulness, and staff professionalism.',
                'icon_key' => 'heart-handshake',
                'sort_order' => 10,
                'allow_not_applicable' => false,
                'is_active' => true,
            ],
            [
                'slug' => 'cleanliness',
                'name_id' => 'Kebersihan',
                'name_en' => 'Cleanliness',
                'description_id' => 'Kebersihan kamar mandi, kamar tidur, linen, koridor, lobi, restoran, dan area umum.',
                'description_en' => 'Cleanliness of bathrooms, bedrooms, linen, corridors, lobby, restaurant, and common areas.',
                'icon_key' => 'sparkles',
                'sort_order' => 20,
                'allow_not_applicable' => false,
                'is_active' => true,
            ],
            [
                'slug' => 'comfort',
                'name_id' => 'Kenyamanan',
                'name_en' => 'Comfort',
                'description_id' => 'Kualitas tidur, ketenangan, suhu ruangan, pencahayaan, dan suasana hotel.',
                'description_en' => 'Sleep quality, quietness, room temperature, lighting, and hotel ambience.',
                'icon_key' => 'bed',
                'sort_order' => 30,
                'allow_not_applicable' => false,
                'is_active' => true,
            ],
            [
                'slug' => 'facilities',
                'name_id' => 'Fasilitas',
                'name_en' => 'Facilities',
                'description_id' => 'Kelengkapan fasilitas, lift, Wi-Fi, AC, TV, dan fasilitas pendukung lainnya.',
                'description_en' => 'Facilities, elevators, Wi-Fi, air conditioning, television, and other amenities.',
                'icon_key' => 'building',
                'sort_order' => 40,
                'allow_not_applicable' => false,
                'is_active' => true,
            ],
            [
                'slug' => 'food-beverage',
                'name_id' => 'Makanan & Minuman',
                'name_en' => 'Food & Beverage',
                'description_id' => 'Rasa makanan, variasi menu, kualitas penyajian, kebersihan makanan, dan pelayanan restoran.',
                'description_en' => 'Food taste, menu variety, presentation quality, food hygiene, and restaurant service.',
                'icon_key' => 'coffee',
                'sort_order' => 50,
                'allow_not_applicable' => true,
                'is_active' => true,
            ],
        ];

        foreach ($categories as $category) {
            RatingCategory::firstOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}
