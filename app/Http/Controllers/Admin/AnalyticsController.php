<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HotelSetting;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    /* ==========================================
       AVERAGE RATING PER REVIEW
       ========================================== */

    private function averages(): Builder
    {
        $ratings = DB::table('review_ratings')
            ->where('status', 'rated')
            ->whereNotNull('score')
            ->select('guest_review_id')
            ->selectRaw('AVG(score) AS average_score')
            ->groupBy('guest_review_id');

        return DB::table('guest_reviews as gr')
            ->joinSub(
                $ratings,
                'av',
                function ($join) {
                    $join->on(
                        'gr.id',
                        '=',
                        'av.guest_review_id'
                    );
                }
            )
            ->select(
                'gr.id',
                'gr.created_at',
                'av.average_score'
            );
    }

    /* ==========================================
       PERIOD FILTER — WIB TO UTC
       ========================================== */

    private function applyPeriod(
        Builder $query,
        string $column,
        ?CarbonImmutable $from,
        ?CarbonImmutable $until
    ): Builder {
        if ($from !== null) {
            $query->where(
                $column,
                '>=',
                $from->utc()
            );
        }

        if ($until !== null) {
            $query->where(
                $column,
                '<',
                $until->utc()
            );
        }

        return $query;
    }

    /* ==========================================
       SUMMARY STATISTICS PER REVIEW
       ========================================== */

    private function stats(
        Builder $averages,
        ?CarbonImmutable $from,
        ?CarbonImmutable $until
    ): array {
        $query = $this->applyPeriod(
            DB::query()->fromSub(
                clone $averages,
                'avg_reviews'
            ),
            'avg_reviews.created_at',
            $from,
            $until
        );

        $row = $query
            ->selectRaw('COUNT(*) AS scored')
            ->selectRaw('AVG(average_score) AS overall')
            ->selectRaw(
                'SUM(
                    CASE WHEN average_score >= 4
                    THEN 1 ELSE 0 END
                ) AS positive_count'
            )
            ->selectRaw(
                'SUM(
                    CASE WHEN average_score >= 3
                    AND average_score < 4
                    THEN 1 ELSE 0 END
                ) AS improvement_count'
            )
            ->selectRaw(
                'SUM(
                    CASE WHEN average_score < 3
                    THEN 1 ELSE 0 END
                ) AS attention_count'
            )
            ->first();

        $scored = (int) ($row->scored ?? 0);

        $positive = (int) (
            $row->positive_count ?? 0
        );

        $improvement = (int) (
            $row->improvement_count ?? 0
        );

        $attention = (int) (
            $row->attention_count ?? 0
        );

        $total = $this->applyPeriod(
            DB::table('guest_reviews'),
            'created_at',
            $from,
            $until
        )->count();

        $positivePercentage = $scored > 0
            ? round(
                $positive / $scored * 100,
                2
            )
            : null;

        $improvementPercentage = $scored > 0
            ? round(
                $improvement / $scored * 100,
                2
            )
            : null;

        $attentionPercentage = $scored > 0
            ? round(
                $attention / $scored * 100,
                2
            )
            : null;

        return [
            'total' => $total,
            'scored' => $scored,

            /*
             * Satu tamu dihitung satu kali.
             */
            'overall' => $scored > 0
                ? round(
                    (float) $row->overall,
                    2
                )
                : null,

            /*
             * Properti lama tetap dipertahankan
             * untuk kompatibilitas frontend.
             */
            'satisfied' => $scored > 0
                ? round(
                    $positive / $scored * 100
                )
                : null,

            'positive_count' => $positive,
            'improvement' => $improvement,
            'attention' => $attention,

            'positive_percentage' =>
            $positivePercentage,

            'improvement_percentage' =>
            $improvementPercentage,

            'attention_percentage' =>
            $attentionPercentage,
        ];
    }

    /* ==========================================
       DISTRIBUTION PER REVIEW
       ========================================== */

    private function reviewDistribution(
        Builder $averages,
        ?CarbonImmutable $from,
        ?CarbonImmutable $until
    ) {
        $query = $this->applyPeriod(
            DB::query()->fromSub(
                clone $averages,
                'avg_reviews'
            ),
            'avg_reviews.created_at',
            $from,
            $until
        );

        /*
         * Pengelompokan tanpa pembulatan.
         *
         * 1,0 - <2,0 = kelompok 1
         * 2,0 - <3,0 = kelompok 2
         * 3,0 - <4,0 = kelompok 3
         * 4,0 - <5,0 = kelompok 4
         * Tepat 5,0  = kelompok 5
         */
        $raw = $query
            ->selectRaw(
                'FLOOR(avg_reviews.average_score) AS score'
            )
            ->selectRaw('COUNT(*) AS total')
            ->groupByRaw(
                'FLOOR(avg_reviews.average_score)'
            )
            ->pluck('total', 'score');

        return collect(range(5, 1))
            ->map(function (int $score) use ($raw) {
                return [
                    'score' => $score,
                    'count' => (int) (
                        $raw[$score] ?? 0
                    ),
                ];
            })
            ->values();
    }

    /* ==========================================
       DISTRIBUTION PER ASPECT
       ========================================== */

    private function aspectDistribution(
        ?CarbonImmutable $from,
        ?CarbonImmutable $until
    ): array {
        $ratingRows = $this->applyPeriod(
            DB::table('review_ratings as rr')
                ->join(
                    'guest_reviews as gr',
                    'gr.id',
                    '=',
                    'rr.guest_review_id'
                ),
            'gr.created_at',
            $from,
            $until
        );

        $distributionRaw = (clone $ratingRows)
            ->where('rr.status', 'rated')
            ->whereNotNull('rr.score')
            ->select('rr.score')
            ->selectRaw('COUNT(*) AS total')
            ->groupBy('rr.score')
            ->pluck('total', 'score');

        $distribution = collect(range(5, 1))
            ->map(function (int $score) use (
                $distributionRaw
            ) {
                return [
                    'score' => $score,
                    'count' => (int) (
                        $distributionRaw[$score] ?? 0
                    ),
                ];
            })
            ->values();

        $notUsed = (clone $ratingRows)
            ->where('rr.status', 'not_used')
            ->count();

        /*
         * Jumlah penilaian kategori yang
         * mendapatkan bintang 1 sampai 3.
         *
         * Ini bukan jumlah ulasan tamu.
         */
        $lowScores = (clone $ratingRows)
            ->where('rr.status', 'rated')
            ->whereBetween(
                'rr.score',
                [1, 3]
            )
            ->count();

        $totalScores = (int) $distribution
            ->sum('count');

        $lowPercentage = $totalScores > 0
            ? round(
                $lowScores / $totalScores * 100,
                2
            )
            : null;

        return [
            'distribution' => $distribution,
            'not_used' => $notUsed,
            'low_scores' => $lowScores,
            'total_scores' => $totalScores,
            'low_percentage' => $lowPercentage,
        ];
    }

    /* ==========================================
       CATEGORY STATISTICS
       ========================================== */

    private function categoryStatistics(
        ?CarbonImmutable $from,
        ?CarbonImmutable $until
    ) {
        $query = DB::table('rating_categories as c')
            ->leftJoin(
                'review_ratings as rr',
                'rr.rating_category_id',
                '=',
                'c.id'
            )
            ->leftJoin(
                'guest_reviews as gr',
                function ($join) use ($from, $until) {
                    $join->on(
                        'gr.id',
                        '=',
                        'rr.guest_review_id'
                    );

                    if ($from !== null) {
                        $join->where(
                            'gr.created_at',
                            '>=',
                            $from->utc()
                        );
                    }

                    if ($until !== null) {
                        $join->where(
                            'gr.created_at',
                            '<',
                            $until->utc()
                        );
                    }
                }
            )
            ->select(
                'c.id',
                'c.name_id',
                'c.is_active',
                'c.sort_order'
            )
            ->selectRaw(
                "AVG(
                    CASE
                        WHEN gr.id IS NOT NULL
                        AND rr.status = 'rated'
                        THEN rr.score
                        ELSE NULL
                    END
                ) AS average_score"
            )
            ->selectRaw(
                "SUM(
                    CASE
                        WHEN gr.id IS NOT NULL
                        AND rr.status = 'rated'
                        AND rr.score IS NOT NULL
                        THEN 1 ELSE 0
                    END
                ) AS rated_count"
            )
            ->selectRaw(
                "SUM(
                    CASE
                        WHEN gr.id IS NOT NULL
                        AND rr.status = 'rated'
                        AND rr.score BETWEEN 1 AND 3
                        THEN 1 ELSE 0
                    END
                ) AS low_count"
            )
            ->selectRaw(
                "SUM(
                    CASE
                        WHEN gr.id IS NOT NULL
                        AND rr.status = 'not_used'
                        THEN 1 ELSE 0
                    END
                ) AS not_used_count"
            )
            ->groupBy(
                'c.id',
                'c.name_id',
                'c.is_active',
                'c.sort_order'
            )
            ->orderBy('c.sort_order')
            ->orderBy('c.id');

        return $query->get()->keyBy('id');
    }

    /* ==========================================
       COMPARISON HELPER
       ========================================== */

    private function difference(
        ?float $current,
        ?float $previous,
        int $precision = 2
    ): ?float {
        if (
            $current === null ||
            $previous === null
        ) {
            return null;
        }

        $result = round(
            $current - $previous,
            $precision
        );

        // Hindari tampilan negatif nol.
        return $result == 0
            ? 0.0
            : $result;
    }

    /* ==========================================
       PERIOD COMPARISON
       ========================================== */

    private function periodComparison(
        Builder $averages,
        ?CarbonImmutable $from,
        ?CarbonImmutable $until,
        ?CarbonImmutable $previousFrom,
        ?CarbonImmutable $previousUntil,
        CarbonImmutable $today,
        string $period
    ): array {
        /*
         * Jika memilih Seluruh Data,
         * gunakan perbandingan 30 hari
         * terakhir dengan 30 hari sebelumnya.
         *
         * Statistik utama tetap seluruh data.
         */
        if ($period === 'all') {
            $currentFrom = $today->subDays(29);
            $currentUntil = $today->addDay();

            $oldFrom = $today->subDays(59);
            $oldUntil = $currentFrom;

            $isDefault = true;
        } else {
            $currentFrom = $from;
            $currentUntil = $until;

            $oldFrom = $previousFrom;
            $oldUntil = $previousUntil;

            $isDefault = false;
        }

        $current = $this->stats(
            $averages,
            $currentFrom,
            $currentUntil
        );

        $previous = $this->stats(
            $averages,
            $oldFrom,
            $oldUntil
        );

        /*
         * Tanggal akhir dikurangi satu hari
         * karena batas query bersifat eksklusif.
         */
        return [
            'is_default' => $isDefault,

            'days' => (int) $currentFrom
                ->diffInDays($currentUntil),

            'current_from' =>
            $currentFrom->format('Y-m-d'),

            'current_to' =>
            $currentUntil
                ->subDay()
                ->format('Y-m-d'),

            'previous_from' =>
            $oldFrom->format('Y-m-d'),

            'previous_to' =>
            $oldUntil
                ->subDay()
                ->format('Y-m-d'),

            'current' => $current,
            'previous' => $previous,

            /*
             * Selisih jumlah ulasan.
             */
            'review_change' =>
            $current['total']
                - $previous['total'],

            /*
             * Selisih rating dua desimal.
             */
            'rating_change' => $this->difference(
                $current['overall'],
                $previous['overall'],
                2
            ),

            /*
             * Selisih poin persentase
             * dua angka desimal.
             */
            'satisfaction_change' =>
            $this->difference(
                $current['positive_percentage'],
                $previous['positive_percentage'],
                2
            ),

            /*
             * Selisih jumlah kasus perhatian.
             */
            'attention_change' =>
            $current['scored'] > 0 &&
                $previous['scored'] > 0
                ? $current['attention']
                - $previous['attention']
                : null,
        ];
    }

    /* ==========================================
       ANALYTICS PAGE
       ========================================== */

    public function __invoke(
        Request $request
    ): Response {
        $filters = $request->validate([
            'period' => [
                'nullable',
                Rule::in([
                    '7d',
                    '30d',
                    '90d',
                    'all',
                    'custom',
                ]),
            ],

            'from' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'to' => [
                'nullable',
                'date_format:Y-m-d',
            ],
        ]);

        $period = $filters['period'] ?? '30d';

        $today = CarbonImmutable::now(
            'Asia/Jakarta'
        )->startOfDay();

        $from = null;
        $until = null;

        $previousFrom = null;
        $previousUntil = null;

        $fromInput = '';
        $toInput = '';

        /* ======================================
           DETERMINE SELECTED PERIOD
           ====================================== */

        if ($period === 'custom') {
            if (
                !isset(
                    $filters['from'],
                    $filters['to']
                )
            ) {
                throw ValidationException::withMessages([
                    'from' =>
                    'Tanggal mulai dan akhir wajib diisi.',
                ]);
            }

            $fromInput = $filters['from'];
            $toInput = $filters['to'];

            $from = CarbonImmutable::createFromFormat(
                '!Y-m-d',
                $fromInput,
                'Asia/Jakarta'
            );

            $lastDay = CarbonImmutable::createFromFormat(
                '!Y-m-d',
                $toInput,
                'Asia/Jakarta'
            );

            if ($lastDay->lessThan($from)) {
                throw ValidationException::withMessages([
                    'to' =>
                    'Tanggal akhir tidak boleh mendahului tanggal awal.',
                ]);
            }

            $until = $lastDay->addDay();

            $days = (int) $from->diffInDays(
                $until
            );

            // Maksimal 1096 hari kalender,
            // termasuk tanggal awal dan akhir.
            if ($days > 1096) {
                throw ValidationException::withMessages([
                    'to' =>
                    'Rentang tanggal maksimal 1096 hari atau sekitar tiga tahun.',
                ]);
            }

            $previousFrom = $from->subDays(
                $days
            );

            $previousUntil = $from;
        } elseif ($period !== 'all') {
            $days = match ($period) {
                '7d' => 7,
                '90d' => 90,
                default => 30,
            };

            $from = $today->subDays(
                $days - 1
            );

            $until = $today->addDay();

            $previousFrom = $from->subDays(
                $days
            );

            $previousUntil = $from;
        }

        /* ======================================
           SUMMARY STATISTICS
           ====================================== */

        $averages = $this->averages();

        $summary = $this->stats(
            $averages,
            $from,
            $until
        );

        /*
         * Previous tetap dipertahankan
         * untuk kompatibilitas frontend lama.
         *
         * Frontend baru nantinya menggunakan
         * properti comparison.
         */
        $previous = $period === 'all'
            ? null
            : $this->stats(
                $averages,
                $previousFrom,
                $previousUntil
            );

        /* ======================================
           PERIOD COMPARISON
           ====================================== */

        $comparison = $this->periodComparison(
            $averages,
            $from,
            $until,
            $previousFrom,
            $previousUntil,
            $today,
            $period
        );

        /* ======================================
           DISTRIBUTION PER REVIEW
           ====================================== */

        $reviewDistribution = $this
            ->reviewDistribution(
                $averages,
                $from,
                $until
            );

        /* ======================================
           DISTRIBUTION PER ASPECT
           ====================================== */

        $aspect = $this->aspectDistribution(
            $from,
            $until
        );

        /* ======================================
           REVIEW SATISFACTION GROUPS
           ====================================== */

        $reviewGroups = [
            'positive' =>
            $summary['positive_count'],

            'improvement' =>
            $summary['improvement'],

            'attention' =>
            $summary['attention'],
        ];

        /* ======================================
           CATEGORY PERFORMANCE
           ====================================== */

        $categoryCurrent = $this
            ->categoryStatistics(
                $from,
                $until
            );

        $categoryPrevious = $period === 'all'
            ? collect()
            : $this->categoryStatistics(
                $previousFrom,
                $previousUntil
            );

        $categories = $categoryCurrent
            ->map(function ($row) use (
                $categoryPrevious
            ) {
                $old = $categoryPrevious->get(
                    $row->id
                );

                $currentCount = (int) (
                    $row->rated_count ?? 0
                );

                $oldCount = (int) (
                    $old->rated_count ?? 0
                );

                $lowCount = (int) (
                    $row->low_count ?? 0
                );

                $avg = $row->average_score === null
                    ? null
                    : round(
                        (float) $row->average_score,
                        2
                    );

                $oldAvg = $old?->average_score === null
                    ? null
                    : round(
                        (float) $old->average_score,
                        2
                    );

                /*
                 * Persentase skor 1-3
                 * dari seluruh penilaian
                 * pada kategori tersebut.
                 *
                 * Contoh:
                 * 230 skor rendah / 506 rating.
                 */
                $lowPercentage = $currentCount > 0
                    ? round(
                        $lowCount
                            / $currentCount
                            * 100,
                        2
                    )
                    : null;

                return [
                    'id' => (int) $row->id,

                    'name' => $row->name_id,

                    'active' =>
                    (bool) $row->is_active,

                    'average' => $avg,

                    'rated_count' => $currentCount,

                    'low_count' => $lowCount,

                    'low_percentage' =>
                    $lowPercentage,

                    'not_used_count' => (int) (
                        $row->not_used_count ?? 0
                    ),

                    /*
                     * Perbandingan kategori
                     * membutuhkan minimal lima
                     * penilaian pada kedua periode.
                     */
                    'change' =>
                    $currentCount >= 5 &&
                        $oldCount >= 5 &&
                        $oldAvg !== null &&
                        $avg !== null
                        ? $this->difference(
                            $avg,
                            $oldAvg,
                            2
                        )
                        : null,
                ];
            })
            ->values()
            ->sort(function ($a, $b) {
                if (
                    $a['average'] === null &&
                    $b['average'] === null
                ) {
                    return $a['id'] <=> $b['id'];
                }

                if ($a['average'] === null) {
                    return 1;
                }

                if ($b['average'] === null) {
                    return -1;
                }

                return $b['average']
                    <=> $a['average'];
            })
            ->values();

        /* ======================================
           SERVICE IMPROVEMENT PRIORITIES
           ====================================== */

        /*
         * Semua kategori tetap ditampilkan.
         *
         * Urutkan berdasarkan proporsi skor
         * rendah terbesar, bukan hanya
         * berdasarkan jumlah skor rendah.
         *
         * Kategori tanpa penilaian
         * ditempatkan paling bawah.
         */
        $servicePriorities = $categories
            ->sort(function ($a, $b) {
                $aRated = $a['rated_count'];
                $bRated = $b['rated_count'];

                if ($aRated === 0 && $bRated === 0) {
                    return $a['id'] <=> $b['id'];
                }

                if ($aRated === 0) {
                    return 1;
                }

                if ($bRated === 0) {
                    return -1;
                }

                $aRatio = $a['low_count'] / $aRated;
                $bRatio = $b['low_count'] / $bRated;

                $comparison = $bRatio <=> $aRatio;

                if ($comparison !== 0) {
                    return $comparison;
                }

                $countComparison =
                    $b['low_count'] <=> $a['low_count'];

                return $countComparison !== 0
                    ? $countComparison
                    : $a['id'] <=> $b['id'];
            })
            ->values();

        /* ======================================
           TREND DATE RANGE
           ====================================== */

        if ($period === 'all') {
            $earliest = (clone $averages)
                ->min('gr.created_at');

            $chartFrom = $earliest !== null
                ? CarbonImmutable::parse(
                    $earliest,
                    'UTC'
                )
                ->setTimezone('Asia/Jakarta')
                ->startOfMonth()
                : $today->startOfMonth();
        } else {
            $chartFrom = $from
                ?? $today->startOfMonth();
        }

        $chartUntil = $until
            ?? $today->addDay();

        $chartDays = (int) $chartFrom
            ->diffInDays($chartUntil);

        /*
         * <= 31 hari  : harian
         * <= 120 hari : mingguan
         * > 120 hari  : bulanan
         */
        $bucket = (
            $period === 'all' ||
            $chartDays > 120
        )
            ? 'month'
            : (
                $chartDays > 31
                ? 'week'
                : 'day'
            );

        $cursor = match ($bucket) {
            'month' =>
            $chartFrom->startOfMonth(),

            'week' =>
            $chartFrom->startOfWeek(),

            default =>
            $chartFrom->startOfDay(),
        };

        /* ======================================
           TREND DATA
           ====================================== */

        $trendRows = $this->applyPeriod(
            clone $averages,
            'gr.created_at',
            $chartFrom,
            $chartUntil
        )
            ->get()
            ->groupBy(function ($row) use ($bucket) {
                $date = CarbonImmutable::parse(
                    $row->created_at,
                    'UTC'
                )->setTimezone('Asia/Jakarta');

                return match ($bucket) {
                    'month' =>
                    $date->format('Y-m'),

                    'week' =>
                    $date
                        ->startOfWeek()
                        ->format('Y-m-d'),

                    default =>
                    $date->format('Y-m-d'),
                };
            });

        $trend = [];

        while ($cursor->lessThan($chartUntil)) {
            $key = $bucket === 'month'
                ? $cursor->format('Y-m')
                : $cursor->format('Y-m-d');

            $rows = $trendRows->get(
                $key,
                collect()
            );

            $trend[] = [
                'key' => $key,

                'label' => $bucket === 'month'
                    ? $cursor
                    ->locale('id')
                    ->translatedFormat('M y')
                    : $cursor
                    ->locale('id')
                    ->translatedFormat('d M'),

                /*
                 * Tidak mengisi rating palsu
                 * pada periode tanpa data.
                 */
                'average' => $rows->isEmpty()
                    ? null
                    : round(
                        (float) $rows->avg(
                            'average_score'
                        ),
                        2
                    ),

                'count' => $rows->count(),
            ];

            $cursor = match ($bucket) {
                'month' =>
                $cursor->addMonth(),

                'week' =>
                $cursor->addWeek(),

                default =>
                $cursor->addDay(),
            };
        }

        /* ======================================
           HOTEL IDENTITY
           ====================================== */

        $hotel = HotelSetting::current();

        /* ======================================
           INERTIA RESPONSE
           ====================================== */

        return Inertia::render(
            'admin/analytics',
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

                'period' => $period,

                'filters' => [
                    'from' => $fromInput,
                    'to' => $toInput,
                ],

                // Statistik periode terpilih.
                'summary' => $summary,

                // Properti sebelumnya.
                'previous' => $previous,

                // Perbandingan periode baru.
                'comparison' => $comparison,

                // Distribusi per ulasan.
                'review_distribution' =>
                $reviewDistribution,

                'review_groups' =>
                $reviewGroups,

                // Distribusi per aspek.
                'distribution' =>
                $aspect['distribution'],

                'not_used' =>
                $aspect['not_used'],

                'low_scores' =>
                $aspect['low_scores'],

                'total_scores' =>
                $aspect['total_scores'],

                'low_percentage' =>
                $aspect['low_percentage'],

                // Kategori berdasarkan rating.
                'categories' =>
                $categories,

                // Prioritas peningkatan layanan.
                'service_priorities' =>
                $servicePriorities,

                // Grafik tren kepuasan.
                'trend' => $trend,

                'trend_bucket' => $bucket,

                'trend_note' =>
                $period === 'all'
                    ? 'Grafik mencakup seluruh riwayat ulasan dengan rating hingga hari ini.'
                    : 'Grafik menggunakan waktu Indonesia Barat (WIB).',
            ]
        );
    }
}
