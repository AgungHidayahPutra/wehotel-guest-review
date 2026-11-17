<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateHotelSettingsRequest;
use App\Models\HotelSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class HotelSettingsController extends Controller
{
    public function index(): Response
    {
        $hotel = HotelSetting::current();

        $defaultLogo = asset(
            'images/wehotel/hotel-logo.png'
        );

        $defaultHero = asset(
            'images/wehotel/hotel-front.jpeg'
        );

        $logoUrl = $hotel->logo_path
            ? asset('storage/' . $hotel->logo_path)
            : $defaultLogo;

        $heroUrl = $hotel->hero_image_path
            ? asset('storage/' . $hotel->hero_image_path)
            : $defaultHero;

        return Inertia::render(
            'admin/hotel-settings',
            [
                'hotel' => [
                    'hotel_name' => $hotel->hotel_name,
                    'logo_url' => $logoUrl,
                ],

                'settings' => [
                    'hotel_name' => $hotel->hotel_name,
                    'logo_url' => $logoUrl,
                    'hero_image_url' => $heroUrl,

                    'has_custom_logo' =>
                    !empty($hotel->logo_path),

                    'has_custom_hero' =>
                    !empty($hotel->hero_image_path),
                ],
            ]
        );
    }

    public function update(
        UpdateHotelSettingsRequest $request
    ): RedirectResponse {
        $data = $request->validated();

        $hotel = HotelSetting::current();

        $oldLogo = $hotel->logo_path;
        $oldHero = $hotel->hero_image_path;

        // Identitas hotel.
        $hotel->hotel_name = trim(
            $data['hotel_name']
        );

        // Upload atau kembalikan logo bawaan.
        if ($request->hasFile('logo')) {
            $hotel->logo_path = $request
                ->file('logo')
                ->store('wehotel/logos', 'public');
        } elseif ($request->boolean('remove_logo')) {
            $hotel->logo_path = null;
        }

        // Upload atau kembalikan foto bawaan.
        if ($request->hasFile('hero_image')) {
            $hotel->hero_image_path = $request
                ->file('hero_image')
                ->store('wehotel/heroes', 'public');
        } elseif ($request->boolean('remove_hero_image')) {
            $hotel->hero_image_path = null;
        }

        // Simpan perubahan ke database.
        $hotel->save();

        // Hapus upload logo lama jika telah diganti.
        if (
            $oldLogo &&
            $oldLogo !== $hotel->logo_path &&
            str_starts_with(
                $oldLogo,
                'wehotel/logos/'
            )
        ) {
            Storage::disk('public')
                ->delete($oldLogo);
        }

        // Hapus upload foto lama jika telah diganti.
        if (
            $oldHero &&
            $oldHero !== $hotel->hero_image_path &&
            str_starts_with(
                $oldHero,
                'wehotel/heroes/'
            )
        ) {
            Storage::disk('public')
                ->delete($oldHero);
        }

        return redirect()
            ->route('admin.hotel-settings.index')
            ->with(
                'success',
                'Pengaturan hotel berhasil diperbarui.'
            );
    }
}
