<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewRating extends Model
{
    protected $fillable = [
        'guest_review_id',
        'rating_category_id',
        'score',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
        ];
    }

    /**
     * Penilaian ini milik satu review tamu.
     */
    public function review(): BelongsTo
    {
        return $this->belongsTo(
            GuestReview::class,
            'guest_review_id'
        );
    }

    /**
     * Penilaian ini milik satu kategori.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(
            RatingCategory::class,
            'rating_category_id'
        );
    }
}
