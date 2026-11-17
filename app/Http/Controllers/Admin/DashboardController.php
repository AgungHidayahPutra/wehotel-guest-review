<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuestReview;
use App\Models\HotelSetting;
use App\Models\RatingCategory;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Menghitung rata-rata rating setiap review.
     *
     * Kategori tidak digunakan (not_used)
     * tidak ikut dihitung.
     */
    private function scoredReviews(): Builder
    {
        $ratings = DB::table('review_ratings')
            ->where('status', 'rated')
            ->whereNotNull('score')
            ->select('guest_review_id')
            ->selectRaw(
                'AVG(score) as average_score'
            )
            ->groupBy('guest_review_id');

        return DB::table('guest_reviews as gr')
            ->joinSub(
                $ratings,
                'rs',
                function ($join) {
                    $join->on(
                        'rs.guest_review_id',
                        '=',
                        'gr.id'
                    );
                }
            )
            ->select(
                'gr.id',
                'gr.created_at',
                'rs.average_score'
            );
    }


    private function metrics(
        Builder $averages,
        ?CarbonImmutable $start = null,
        ?CarbonImmutable $end = null
    ): array {
        $scores = DB::query()->fromSub(clone $averages, 't');
        $reviews = GuestReview::query();

        if ($start !== null) {
            $scores->where('t.created_at', '>=', $start->utc());
            $reviews->where('created_at', '>=', $start->utc());
        }

        if ($end !== null) {
            $scores->where('t.created_at', '<', $end->utc());
            $reviews->where('created_at', '<', $end->utc());
        }

        $row = $scores
            ->selectRaw('COUNT(*) AS scored_reviews')
            ->selectRaw('AVG(t.average_score) AS overall')
            ->selectRaw(
                'SUM(CASE WHEN t.average_score >= 4
                THEN 1 ELSE 0 END) AS positive'
            )
            ->selectRaw(
                'SUM(CASE WHEN t.average_score >= 3
                AND t.average_score < 4
                THEN 1 ELSE 0 END) AS improvement'
            )
            ->selectRaw(
                'SUM(CASE WHEN t.average_score < 3
                THEN 1 ELSE 0 END) AS attention'
            )
            ->first();

        $scored = (int) ($row->scored_reviews ?? 0);
        $positive = (int) ($row->positive ?? 0);

        return [
            'total' => $reviews->count(),
            'scored_reviews' => $scored,

            // Simpan presisi lebih tinggi untuk
            // menghitung perubahan antarperiode.
            'overall' => $scored > 0
                ? round((float) $row->overall, 4)
                : null,

            'positive_count' => $positive,
            'positive_percentage' => $scored > 0
                ? round($positive / $scored * 100, 4)
                : null,

            'improvement' => (int) ($row->improvement ?? 0),
            'attention' => (int) ($row->attention ?? 0),
        ];
    }

    /**
     * Halaman dashboard admin.
     */
    public function __invoke(): Response
    {
        $today = CarbonImmutable::now(
            'Asia/Jakarta'
        )->startOfDay();

        $averages = $this->scoredReviews();

        /* ==================================
           SUMMARY
           ================================== */

        $summary = $this->metrics(
            $averages
        );

        $recent30 = $this->metrics(
            $averages,
            $today->subDays(29),
            $today->addDay()
        );

        $previous30 = $this->metrics(
            $averages,
            $today->subDays(59),
            $today->subDays(29)
        );


        $ratingChange = (
            $recent30['overall'] !== null &&
            $previous30['overall'] !== null
        )
            ? round(
                $recent30['overall'] - $previous30['overall'],
                2
            )
            : null;

        $satisfactionChange = (
            $recent30['positive_percentage'] !== null &&
            $previous30['positive_percentage'] !== null
        )
            ? round(
                $recent30['positive_percentage']
                    - $previous30['positive_percentage'],
                1
            )
            : null;

        $comparison = [
            'recent_reviews' => $recent30['total'],
            'previous_reviews' => $previous30['total'],

            'review_growth' => $previous30['total'] > 0
                ? round(
                    ($recent30['total'] - $previous30['total'])
                        / $previous30['total'] * 100,
                    1
                )
                : null,

            'recent_rating' => $recent30['overall'],
            'previous_rating' => $previous30['overall'],
            'rating_change' => $ratingChange,

            'recent_satisfaction' =>
            $recent30['positive_percentage'],
            'previous_satisfaction' =>
            $previous30['positive_percentage'],
            'satisfaction_change' => $satisfactionChange,

            'recent_attention' => $recent30['attention'],
            'previous_attention' => $previous30['attention'],

            'attention_change' =>
            $previous30['scored_reviews'] > 0
                ? $recent30['attention']
                - $previous30['attention']
                : null,
        ];

        /* ==================================
           MONTHLY TREND - LAST 7 MONTHS
           ================================== */

        $firstMonth = $today
            ->startOfMonth()
            ->subMonths(6);

        $monthRows = (clone $averages)
            ->where(
                'gr.created_at',
                '>=',
                $firstMonth->utc()
            )
            ->where(
                'gr.created_at',
                '<',
                $today->addDay()->utc()
            )
            ->get()
            ->groupBy(function ($row) {
                return CarbonImmutable::parse(
                    $row->created_at,
                    'UTC'
                )
                    ->setTimezone('Asia/Jakarta')
                    ->format('Y-m');
            });

        $trend = collect(range(6, 0))
            ->map(function ($monthsAgo) use (
                $today,
                $monthRows
            ) {
                $month = $today
                    ->startOfMonth()
                    ->subMonths($monthsAgo);

                $rows = $monthRows->get(
                    $month->format('Y-m'),
                    collect()
                );

                return [
                    'key' =>
                    $month->format('Y-m'),

                    'label' =>
                    $month
                        ->locale('id')
                        ->translatedFormat('M'),

                    'average' =>
                    $rows->isEmpty()
                        ? null
                        : round(
                            (float) $rows->avg(
                                'average_score'
                            ),
                            2
                        ),

                    'count' =>
                    $rows->count(),
                ];
            })
            ->values();

        /* ==================================
           AUTO TREND MODE
           ================================== */

        $trendMode = 'monthly';

        $monthsWithRatings = $trend
            ->filter(
                fn($point) =>
                $point['average'] !== null
            )
            ->count();

        /*
         * Jika belum ada data dari dua bulan
         * berbeda, gunakan 30 hari terakhir.
         *
         * Dengan begitu review dari dua
         * tanggal berbeda dapat membentuk
         * garis walaupun masih di bulan sama.
         */
        if ($monthsWithRatings < 2) {
            $trendMode = 'daily';

            $startDay = $today->subDays(29);

            $dailyRows = (clone $averages)
                ->where(
                    'gr.created_at',
                    '>=',
                    $startDay->utc()
                )
                ->where(
                    'gr.created_at',
                    '<',
                    $today->addDay()->utc()
                )
                ->get()
                ->groupBy(function ($row) {
                    return CarbonImmutable::parse(
                        $row->created_at,
                        'UTC'
                    )
                        ->setTimezone('Asia/Jakarta')
                        ->format('Y-m-d');
                });

            $trend = collect(range(29, 0))
                ->map(function ($daysAgo) use (
                    $today,
                    $dailyRows
                ) {
                    $day = $today->subDays(
                        $daysAgo
                    );

                    $rows = $dailyRows->get(
                        $day->format('Y-m-d'),
                        collect()
                    );

                    return [
                        'key' =>
                        $day->format('Y-m-d'),

                        'label' =>
                        $day
                            ->locale('id')
                            ->translatedFormat('d M'),

                        'average' =>
                        $rows->isEmpty()
                            ? null
                            : round(
                                (float) $rows->avg(
                                    'average_score'
                                ),
                                2
                            ),

                        'count' =>
                        $rows->count(),
                    ];
                })
                ->values();
        }

        /* ==================================
           RATING CATEGORIES
           ================================== */

        $categories = RatingCategory::active()
            ->withAvg(
                [
                    'ratings as average_score' =>
                    fn($query) =>
                    $query
                        ->where(
                            'status',
                            'rated'
                        )
                        ->whereNotNull(
                            'score'
                        ),
                ],
                'score'
            )
            ->withCount([
                'ratings as scored_count' =>
                fn($query) =>
                $query
                    ->where(
                        'status',
                        'rated'
                    )
                    ->whereNotNull(
                        'score'
                    ),
            ])
            ->get()
            ->map(
                fn(RatingCategory $category) => [
                    'id' =>
                    $category->id,

                    'name' =>
                    $category->name_id,

                    'average' =>
                    $category->average_score === null
                        ? null
                        : round(
                            (float) $category->average_score,
                            1
                        ),

                    'count' =>
                    (int) $category->scored_count,
                ]
            )
            ->values();

        /* ==================================
           THREE MOST RECENT REVIEWS
           ================================== */

        $recent = GuestReview::query()
            ->with('ratings')
            ->latest('id')
            ->limit(3)
            ->get()
            ->map(function (GuestReview $review) {
                $scores = $review->ratings
                    ->where('status', 'rated')
                    ->pluck('score')
                    ->filter(
                        fn($score) =>
                        $score !== null
                    );

                return [
                    'id' => $review->id,

                    'name' =>
                    $review->display_name,

                    'room_number' =>
                    $review->room_number,

                    'date' =>
                    $review->created_at
                        ?->toIso8601String(),

                    'suggestions' =>
                    $review->suggestions,

                    'average' =>
                    $scores->isEmpty()
                        ? null
                        : round(
                            (float) $scores->avg(),
                            1
                        ),
                ];
            })
            ->values();

        /* ==================================
           HOTEL IDENTITY
           ================================== */

        $hotel = HotelSetting::current();

        /* ==================================
           INERTIA RESPONSE
           ================================== */

        return Inertia::render(
            'admin/dashboard',
            [
                'hotel' => [
                    'hotel_name' =>
                    $hotel->hotel_name,

                    'logo_url' =>
                    $hotel->logo_path
                        ? asset(
                            'storage/' .
                                $hotel->logo_path
                        )
                        : asset(
                            'images/wehotel/hotel-logo.png'
                        ),
                ],

                'summary' =>
                $summary,

                'comparison' =>
                $comparison,

                'trend' =>
                $trend,

                'trend_mode' =>
                $trendMode,

                'categories' =>
                $categories,

                'recent' =>
                $recent,
            ]
        );
    }
}
