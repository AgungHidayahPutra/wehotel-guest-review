<?php

namespace App\Providers;

use App\Models\HotelSetting;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap application services.
     */
    public function boot(): void
    {
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Get hotel branding.
     */
    private function hotelBranding(): array
    {
        $hotel = HotelSetting::current();

        $defaultLogo = asset(
            'images/wehotel/hotel-logo.png'
        );

        $logoUrl = $defaultLogo;

        $logoPath = trim(
            (string) $hotel->logo_path
        );

        if (
            $logoPath !== '' &&
            ! str_contains($logoPath, '..') &&
            ! str_contains($logoPath, ':') &&
            ! str_contains($logoPath, '\\')
        ) {
            $relativePath = ltrim(
                $logoPath,
                '/'
            );

            $storagePath = Str::startsWith(
                $relativePath,
                'storage/'
            )
                ? Str::after(
                    $relativePath,
                    'storage/'
                )
                : $relativePath;

            if (
                is_file(
                    public_path(
                        'storage/'.$storagePath
                    )
                )
            ) {
                $logoUrl = asset(
                    'storage/'.$storagePath
                );
            } elseif (
                Str::startsWith(
                    $relativePath,
                    'images/wehotel/'
                ) &&
                is_file(public_path($relativePath))
            ) {
                $logoUrl = asset($relativePath);
            }
        }

        return [
            'hotel_name' => $hotel->hotel_name
                ?: 'WE HOTEL',

            'logo_url' => $logoUrl,
        ];
    }

    /**
     * Configure authentication views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(
            fn (Request $request) => Inertia::render('auth/login', [
                'hotel' => $this->hotelBranding(),

                'status' => $request->session()->get('status'),
            ])
        );

        Fortify::twoFactorChallengeView(
            fn (Request $request) => Inertia::render(
                'auth/two-factor-challenge',
                [
                    'hotel' => $this->hotelBranding(),
                ]
            )
        );
    }

    /**
     * Configure login rate limiting.
     */

    /**
     * Configure login rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $username = Str::lower(
                trim((string) $request->input(Fortify::username()))
            );

            $ip = (string) $request->ip();

            $combinationKey = hash(
                'sha256',
                $username.'|'.$ip
            );

            return [
                // Maksimal 5 login per menit per email dan IP.
                Limit::perMinute(5)
                    ->by('login:combination:'.$combinationKey),

                // Maksimal 20 login per menit dari satu IP.
                Limit::perMinute(20)
                    ->by('login:ip:minute:'.$ip),

                // Maksimal 100 login per jam dari satu IP.
                Limit::perHour(100)
                    ->by('login:ip:hour:'.$ip),
            ];
        });

        RateLimiter::for('two-factor', function (Request $request) {
            $ip = (string) $request->ip();

            return [
                Limit::perMinute(5)
                    ->by('two-factor:minute:'.$ip),

                Limit::perHour(30)
                    ->by('two-factor:hour:'.$ip),
            ];
        });
    }
}
