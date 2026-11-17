<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGuestReviewRequest;
use App\Models\GuestReview;
use App\Models\HotelSetting;
use App\Models\RatingCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GuestReviewController extends Controller
{
    /**
     * Menampilkan halaman review tamu.
     */
    public function create(): Response
    {
        $hotel = HotelSetting::current();

        return Inertia::render('guest/review', [
            'hotel' => [
                'name' => $hotel->hotel_name,

                'logo_url' => $this->publicImageUrl(
                    $hotel->logo_path,
                    'images/wehotel/hotel-logo.png'
                ),

                'hero_image_url' => $this->publicImageUrl(
                    $hotel->hero_image_path,
                    'images/wehotel/hotel-front.jpeg'
                ),
            ],

            'categories' => RatingCategory::active()->get([
                'id',
                'slug',
                'name_id',
                'name_en',
                'description_id',
                'description_en',
                'icon_key',
                'allow_not_applicable',
            ]),
        ]);
    }

    /**
     * Menghasilkan URL gambar hotel.
     *
     * Gambar bawaan berada di public/images.
     * Gambar upload admin berada di public/storage.
     *
     * Jika gambar tidak ditemukan, sistem
     * menggunakan gambar bawaan.
     */
    private function publicImageUrl(
        ?string $path,
        string $fallback
    ): string {
        $relative = ltrim(
            trim((string) $path),
            '/'
        );

        if (
            $relative !== '' &&
            !str_contains($relative, '..')
        ) {
            if (is_file(public_path($relative))) {
                return asset($relative);
            }

            $storageRelative = str_starts_with(
                $relative,
                'storage/'
            )
                ? substr(
                    $relative,
                    strlen('storage/')
                )
                : $relative;

            if (
                is_file(
                    public_path(
                        'storage/' . $storageRelative
                    )
                )
            ) {
                return asset(
                    'storage/' . $storageRelative
                );
            }
        }

        return asset($fallback);
    }

    /**
     * Menyimpan review tamu.
     */
    public function store(
        StoreGuestReviewRequest $request
    ): RedirectResponse {
        $data = $request->validated();

        DB::transaction(
            function () use ($data, $request): void {
                $consent = $request->boolean(
                    'contact_consent'
                );

                $review = GuestReview::create([
                    'guest_name' => trim(
                        $data['guest_name']
                    ),

                    'room_number' => trim(
                        $data['room_number']
                    ),

                    'hide_name' => $request->boolean(
                        'hide_name'
                    ),

                    'liked' => trim(
                        (string) (
                            $data['answers']['liked']
                            ?? ''
                        )
                    ) ?: null,

                    'improvement' => trim(
                        (string) (
                            $data['answers']['improvement']
                            ?? ''
                        )
                    ) ?: null,

                    'unpleasant' => trim(
                        (string) (
                            $data['answers']['unpleasant']
                            ?? ''
                        )
                    ) ?: null,

                    'suggestions' => trim(
                        $data['answers']['suggestions']
                    ),

                    'contact_consent' => $consent,

                    // contact_method ditentukan oleh
                    // StoreGuestReviewRequest di server.
                    'contact_method' => $consent
                        ? $data['contact_method']
                        : null,

                    'contact_value' => $consent
                        ? trim($data['contact_value'])
                        : null,
                ]);

                foreach (
                    $data['ratings'] as $rating
                ) {
                    $review->ratings()->create([
                        'rating_category_id' =>
                        $rating['category_id'],

                        'score' =>
                        $rating['status'] === 'rated'
                            ? $rating['score']
                            : null,

                        'status' =>
                        $rating['status'],
                    ]);
                }
            }
        );

        /**
         * Ringkasan rating untuk halaman
         * terima kasih.
         *
         * Kategori yang tidak digunakan
         * tidak dihitung dalam rata-rata.
         */
        $ratedScores = collect(
            $data['ratings']
        )
            ->filter(
                fn(array $rating) =>
                $rating['status'] === 'rated'
            )
            ->pluck('score');

        session()->put(
            'wehotel_last_review_rating',
            [
                'average' =>
                $ratedScores->isNotEmpty()
                    ? round(
                        (float) $ratedScores->avg(),
                        1
                    )
                    : null,

                'rated_count' =>
                $ratedScores->count(),

                'category_count' =>
                count($data['ratings']),
            ]
        );

        return redirect()
            ->route('review.thanks')
            ->with('review_submitted', true);
    }

    /**
     * Menampilkan halaman terima kasih.
     */
    public function thanks(): Response
    {
        $hotel = HotelSetting::current();

        return Inertia::render('guest/thanks', [
            'hotel_name' => $hotel->hotel_name,

            'hotel' => [
                'name' => $hotel->hotel_name,

                'logo_url' => $this->publicImageUrl(
                    $hotel->logo_path,
                    'images/wehotel/hotel-logo.png'
                ),

                'hero_image_url' => $this->publicImageUrl(
                    $hotel->hero_image_path,
                    'images/wehotel/hotel-front.jpeg'
                ),
            ],

            'rating_summary' => session(
                'wehotel_last_review_rating'
            ),
        ]);
    }
}
