<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GuestReview extends Model
{
    protected $fillable = [
        'guest_name',
        'room_number',
        'hide_name',
        'liked',
        'improvement',
        'unpleasant',
        'suggestions',
        'contact_consent',
        'contact_method',
        'contact_value',
    ];

    protected $appends = [
        'display_name',
    ];

    protected function casts(): array
    {
        return [
            'hide_name' => 'boolean',
            'contact_consent' => 'boolean',
            'contact_value' => 'encrypted',
        ];
    }

    /**
     * Nama yang ditampilkan sesuai pilihan privasi tamu.
     *
     * Contoh:
     * Budi Hartono -> B****o
     */
    protected function displayName(): Attribute
    {
        return Attribute::make(
            get: function (): string {
                $name = trim($this->guest_name ?? '');

                if (!$this->hide_name || mb_strlen($name) < 2) {
                    return $name;
                }

                $first = mb_substr($name, 0, 1);
                $last = mb_substr($name, -1, 1);

                return $first . '****' . $last;
            }
        );
    }

    /**
     * Satu review mempunyai banyak penilaian kategori.
     */
    public function ratings(): HasMany
    {
        return $this->hasMany(
            ReviewRating::class,
            'guest_review_id'
        );
    }
}
