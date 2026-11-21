<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HotelSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $hotel = HotelSetting::current();

        $logoUrl = asset(
            'images/wehotel/hotel-logo.png'
        );

        $logoPath = ltrim(
            trim((string) $hotel->logo_path),
            '/'
        );

        if (
            $logoPath !== '' &&
            ! str_contains($logoPath, '..') &&
            ! str_contains($logoPath, ':') &&
            ! str_contains($logoPath, '\\')
        ) {
            $storagePath = Str::startsWith(
                $logoPath,
                'storage/'
            )
                ? Str::after($logoPath, 'storage/')
                : $logoPath;

            if (
                is_file(
                    public_path('storage/'.$storagePath)
                )
            ) {
                $logoUrl = asset(
                    'storage/'.$storagePath
                );
            }
        }

        $hasSecret = filled(
            $user->two_factor_secret
        );

        $isConfirmed = $hasSecret &&
            $user->two_factor_confirmed_at !== null;

        return Inertia::render('admin/security', [
            'hotel' => [
                'hotel_name' => $hotel->hotel_name
                    ?: 'WE HOTEL',

                'logo_url' => $logoUrl,
            ],

            'two_factor' => [
                'enabled' => $isConfirmed,
                'pending' => $hasSecret && ! $isConfirmed,
            ],
        ]);
    }
}
