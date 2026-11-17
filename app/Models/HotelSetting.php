<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HotelSetting extends Model
{
    /**
     * Nama tabel database.
     */
    protected $table = 'hotel_settings';

    /**
     * Kolom yang boleh diisi atau diperbarui.
     */
    protected $fillable = [
        'hotel_name',
        'logo_path',
        'hero_image_path',
    ];

    public static function current(): self
    {
        return static::query()->first()
            ?? static::query()->create([
                'hotel_name' => 'WE HOTEL',
            ]);
    }
}
