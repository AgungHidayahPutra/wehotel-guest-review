<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuestReview;
use App\Models\HotelSetting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReviewsController extends Controller
{
    /**
     * Menampilkan seluruh ulasan tamu
     * dengan filter nama, rating, dan tanggal.
     */
    public function index(Request $request): Response
    {
        // Validasi parameter filter.
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'star' => ['nullable', 'integer', 'between:1,5'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $search = trim(
            (string) $request->query('search', '')
        );

        $star = $request->filled('star')
            ? (int) $request->query('star')
            : null;

        $from = (string) $request->query('from', '');
        $to = (string) $request->query('to', '');

        // Tanggal awal tidak boleh lebih besar
        // daripada tanggal akhir.
        if (
            $from !== '' &&
            $to !== '' &&
            $from > $to
        ) {
            throw ValidationException::withMessages([
                'from' =>
                'Tanggal awal tidak boleh melebihi tanggal akhir.',
            ]);
        }

        // Jumlah semua review, tanpa filter.
        $totalReviews = GuestReview::query()->count();

        // Ambil review dan penilaian kategori.
        $query = GuestReview::query()
            ->with(['ratings.category']);

        /*
         * FILTER NAMA TAMU / NOMOR KAMAR
         */
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where(
                    'guest_name',
                    'like',
                    '%' . $search . '%'
                )->orWhere(
                    'room_number',
                    'like',
                    '%' . $search . '%'
                );
            });
        }

        /*
         * FILTER RATING BERDASARKAN RENTANG ASLI
         *
         * 1 Bintang: 1,0 <= rating < 2,0
         * 2 Bintang: 2,0 <= rating < 3,0
         * 3 Bintang: 3,0 <= rating < 4,0
         * 4 Bintang: 4,0 <= rating < 5,0
         * 5 Bintang: rating tepat 5,0
         *
         * Rata-rata dihitung per review.
         * Kategori not_used tidak dihitung.
         *
         * Tidak ada pembulatan untuk filter.
         */
        if ($star !== null) {
            $query->whereIn(
                'guest_reviews.id',
                function ($q) use ($star) {
                    $q->select('guest_review_id')
                        ->from('review_ratings')
                        ->where('status', 'rated')
                        ->whereNotNull('score')
                        ->groupBy('guest_review_id');

                    if ($star === 5) {
                        // Hanya rata-rata tepat 5,0.
                        $q->havingRaw(
                            'AVG(score) = ?',
                            [5]
                        );
                    } else {
                        // Rentang tanpa pembulatan.
                        // Contoh 2 bintang:
                        // 2,0 <= AVG(score) < 3,0.
                        $q->havingRaw(
                            'AVG(score) >= ? AND AVG(score) < ?',
                            [$star, $star + 1]
                        );
                    }
                }
            );
        }

        /*
         * FILTER TANGGAL
         *
         * Input menggunakan tanggal WIB.
         * Database menyimpan timestamp UTC.
         */
        if ($from !== '') {
            $start = Carbon::createFromFormat(
                '!Y-m-d',
                $from,
                'Asia/Jakarta'
            )->startOfDay()->utc();

            $query->where(
                'guest_reviews.created_at',
                '>=',
                $start
            );
        }

        if ($to !== '') {
            $end = Carbon::createFromFormat(
                '!Y-m-d',
                $to,
                'Asia/Jakarta'
            )->endOfDay()->utc();

            $query->where(
                'guest_reviews.created_at',
                '<=',
                $end
            );
        }

        /*
         * PAGINATION
         *
         * Filter tetap tersimpan saat
         * berpindah halaman.
         */
        $reviews = $query
            ->orderByDesc('guest_reviews.id')
            ->paginate(10)
            ->withQueryString()
            ->through(function (GuestReview $review) {

                /*
                 * Rata-rata rating per tamu.
                 *
                 * Contoh:
                 * 5 + 5 + 5 + 5 + 4 = 24
                 * 24 / 5 = 4,8
                 */
                $scores = $review->ratings
                    ->where('status', 'rated')
                    ->pluck('score')
                    ->filter(
                        fn($score) => $score !== null
                    );

                $average = $scores->isEmpty()
                    ? null
                    : (float) $scores->avg();

                /*
                 * Urutan kategori mengikuti
                 * sort_order dari admin.
                 */
                $ratings = $review->ratings
                    ->sortBy(function ($rating) {
                        return sprintf(
                            '%06d-%010d',
                            $rating->category?->sort_order
                                ?? 999999,
                            $rating->id
                        );
                    })
                    ->values()
                    ->map(function ($rating) {
                        return [
                            'id' => $rating->id,

                            'category' =>
                            $rating->category?->name_id
                                ?? 'Kategori tidak tersedia',

                            'category_en' =>
                            $rating->category?->name_en
                                ?? '',

                            'score' =>
                            $rating->score === null
                                ? null
                                : (int) $rating->score,

                            'status' => $rating->status,
                        ];
                    });

                /*
                 * Data review yang dikirim
                 * ke halaman admin.
                 */
                return [
                    'id' => $review->id,

                    'name' => $review->display_name,

                    'guest_name' => $review->guest_name,

                    'hide_name' =>
                    (bool) $review->hide_name,

                    'room_number' => $review->room_number,

                    'date' =>
                    $review->created_at
                        ?->toIso8601String(),

                    'average' => $average,

                    'rated_count' => $scores->count(),

                    /*
                     * Jawaban tamu.
                     */
                    'liked' => $review->liked,

                    'improvement' =>
                    $review->improvement,

                    'unpleasant' =>
                    $review->unpleasant,

                    'suggestions' =>
                    $review->suggestions,

                    /*
                     * Informasi kontak hanya
                     * dibaca jika tamu mengizinkan.
                     *
                     * Akses melalui Eloquent
                     * mempertahankan encrypted cast.
                     */
                    'contact_consent' =>
                    (bool) $review->contact_consent,

                    'contact_method' =>
                    $review->contact_consent
                        ? $review->contact_method
                        : null,

                    'contact_value' =>
                    $review->contact_consent
                        ? $review->contact_value
                        : null,

                    'ratings' => $ratings,
                ];
            });

        /*
         * IDENTITAS HOTEL
         */
        $hotel = HotelSetting::current();

        return Inertia::render('admin/reviews', [
            'hotel' => [
                'hotel_name' =>
                $hotel->hotel_name,

                'logo_url' =>
                $hotel->logo_path
                    ? asset(
                        'storage/' . $hotel->logo_path
                    )
                    : asset(
                        'images/wehotel/hotel-logo.png'
                    ),
            ],

            'reviews' => $reviews,

            'totalReviews' => $totalReviews,

            'filters' => [
                'search' => $search,

                'star' => $star === null
                    ? ''
                    : (string) $star,

                'from' => $from,

                'to' => $to,
            ],
        ]);
    }
}
