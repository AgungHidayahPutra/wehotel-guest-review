<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RatingCategory extends Model
{
    protected $table = 'rating_categories';

    protected $fillable = [
        'slug',
        'name_id',
        'name_en',
        'description_id',
        'description_en',
        'icon_key',
        'sort_order',
        'allow_not_applicable',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'allow_not_applicable' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Mengambil kategori aktif sesuai urutan.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(
            ReviewRating::class,
            'rating_category_id'
        );
    }
}
