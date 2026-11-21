<?php

namespace App\Services;

use App\Models\GuestReview;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewExportService
{
    private const MAX_REVIEWS = 10000;

    /* ==========================================
       VALIDATION FILTER
       ========================================== */

    public function validateFilters(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'star' => ['nullable', 'integer', 'between:1,5'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $filters = [
            'search' => trim(
                (string) ($validated['search'] ?? '')
            ),

            'star' => isset($validated['star'])
                ? (int) $validated['star']
                : null,

            'from' => (string) ($validated['from'] ?? ''),
            'to' => (string) ($validated['to'] ?? ''),
        ];

        if (
            $filters['from'] !== '' &&
            $filters['to'] !== '' &&
            $filters['from'] > $filters['to']
        ) {
            throw ValidationException::withMessages([
                'from' =>
                'Tanggal awal tidak boleh melebihi tanggal akhir.',
            ]);
        }

        return $filters;
    }

    /* ==========================================
       QUERY REVIEW
       ========================================== */

    public function query(array $filters = []): Builder
    {
        $query = GuestReview::query();

        $search = trim(
            (string) ($filters['search'] ?? '')
        );

        $star = isset($filters['star'])
            && $filters['star'] !== ''
            ? (int) $filters['star']
            : null;

        $from = (string) ($filters['from'] ?? '');
        $to = (string) ($filters['to'] ?? '');

        // Filter nama tamu dan nomor kamar.
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
         * Filter berdasarkan rata-rata asli.
         * Tidak menggunakan pembulatan.
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
                        $q->havingRaw(
                            'AVG(score) = ?',
                            [5]
                        );
                    } else {
                        $q->havingRaw(
                            'AVG(score) >= ? AND AVG(score) < ?',
                            [$star, $star + 1]
                        );
                    }
                }
            );
        }

        /*
         * Filter tanggal WIB.
         * Timestamp database menggunakan UTC.
         */
        if ($from !== '') {
            $start = CarbonImmutable::createFromFormat(
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
            $until = CarbonImmutable::createFromFormat(
                '!Y-m-d',
                $to,
                'Asia/Jakarta'
            )->addDay()->startOfDay()->utc();

            $query->where(
                'guest_reviews.created_at',
                '<',
                $until
            );
        }

        return $query;
    }

    /* ==========================================
       SATISFACTION CLASSIFICATION
       ========================================== */

    private function classification(?float $average): string
    {
        if ($average === null) {
            return 'Tidak Dinilai';
        }

        if ($average >= 4) {
            return 'Positif';
        }

        if ($average >= 3) {
            return 'Perlu Peningkatan';
        }

        return 'Perlu Perhatian';
    }

    /* ==========================================
       PERCENTAGE HELPER
       ========================================== */

    private function percentage(
        int $count,
        int $total
    ): ?float {
        return $total > 0
            ? round($count / $total * 100, 2)
            : null;
    }

    /* ==========================================
       CATEGORY STRUCTURE
       ========================================== */

    private function categoryRecord(
        int $id,
        string $name,
        string $nameEn,
        bool $active
    ): array {
        return [
            'id' => $id,
            'name' => $name,
            'name_en' => $nameEn,
            'active' => $active,

            'score_sum' => 0,
            'rated_count' => 0,
            'not_used_count' => 0,
            'low_count' => 0,

            'average' => null,
            'low_percentage' => null,
        ];
    }

    private function categories(): array
    {
        $rows = DB::table('rating_categories')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get([
                'id',
                'name_id',
                'name_en',
                'is_active',
            ]);

        $categories = [];

        foreach ($rows as $row) {
            $id = (int) $row->id;

            $categories[$id] = $this->categoryRecord(
                $id,
                (string) $row->name_id,
                (string) ($row->name_en ?? ''),
                (bool) $row->is_active
            );
        }

        return $categories;
    }

    /* ==========================================
       BUILD EXPORT DATA
       ========================================== */

    public function build(
        array $filters = [],
        bool $includePrivate = false
    ): array {
        /*
         * Ambil seluruh hasil filter.
         * Tidak menggunakan pagination.
         */
        $reviews = $this->query($filters)
            ->with(['ratings.category'])
            ->orderByDesc('guest_reviews.id')
            ->limit(self::MAX_REVIEWS + 1)
            ->get();

        if ($reviews->count() > self::MAX_REVIEWS) {
            throw ValidationException::withMessages([
                'export' =>
                'Data terlalu banyak. Batasi rentang tanggal sebelum melakukan export.',
            ]);
        }

        $categories = $this->categories();

        $records = [];

        // Statistik per ulasan.
        $totalReviews = $reviews->count();
        $scoredReviews = 0;
        $overallSum = 0.0;

        $positiveCount = 0;
        $improvementCount = 0;
        $attentionCount = 0;
        $unratedCount = 0;

        // Statistik per aspek.
        $totalScores = 0;
        $totalNotUsed = 0;
        $totalLowScores = 0;

        $reviewDistribution = [
            5 => 0,
            4 => 0,
            3 => 0,
            2 => 0,
            1 => 0,
        ];

        $aspectDistribution = [
            5 => 0,
            4 => 0,
            3 => 0,
            2 => 0,
            1 => 0,
        ];

        /* ======================================
           PROCESS EACH REVIEW
           ====================================== */

        foreach ($reviews as $index => $review) {
            $scores = [];
            $reviewRatings = [];

            foreach ($review->ratings as $rating) {
                $categoryId = (int)
                $rating->rating_category_id;

                /*
                 * Pertahankan kategori historis.
                 */
                if (!isset($categories[$categoryId])) {
                    $categories[$categoryId] =
                        $this->categoryRecord(
                            $categoryId,

                            $rating->category?->name_id
                                ?? 'Kategori #' . $categoryId,

                            $rating->category?->name_en
                                ?? '',

                            false
                        );
                }

                /*
                 * Tidak menggunakan layanan
                 * tidak dianggap skor nol.
                 */
                if ($rating->status === 'not_used') {
                    $reviewRatings[$categoryId] = [
                        'status' => 'not_used',
                        'score' => null,
                    ];

                    $categories[$categoryId]['not_used_count']++;

                    $totalNotUsed++;

                    continue;
                }

                if (
                    $rating->status !== 'rated' ||
                    $rating->score === null
                ) {
                    continue;
                }

                $score = (int) $rating->score;

                if ($score < 1 || $score > 5) {
                    continue;
                }

                $scores[] = $score;

                $reviewRatings[$categoryId] = [
                    'status' => 'rated',
                    'score' => $score,
                ];

                $categories[$categoryId]['score_sum'] += $score;

                $categories[$categoryId]['rated_count']++;

                $aspectDistribution[$score]++;
                $totalScores++;

                // Skor kategori 1–3.
                if ($score <= 3) {
                    $categories[$categoryId]['low_count']++;

                    $totalLowScores++;
                }
            }

            /*
             * Rata-rata per ulasan.
             */
            $average = count($scores) > 0
                ? array_sum($scores) / count($scores)
                : null;

            if ($average !== null) {
                $scoredReviews++;
                $overallSum += $average;

                if ($average >= 4) {
                    $positiveCount++;
                } elseif ($average >= 3) {
                    $improvementCount++;
                } else {
                    $attentionCount++;
                }

                $group = (int) floor($average);

                $reviewDistribution[$group]++;
            } else {
                $unratedCount++;
            }

            /* ==================================
               GUEST PRIVACY
               ================================== */

            $guestName = $includePrivate
                ? $review->guest_name
                : 'Tamu ' . ($index + 1);

            $roomNumber = $includePrivate
                ? $review->room_number
                : null;

            $contactConsent = (bool)
            $review->contact_consent;

            $contactMethod = null;
            $contactValue = null;

            /*
             * Kontak hanya disertakan jika
             * ekspor privat dipilih dan
             * tamu bersedia dihubungi.
             */
            if ($includePrivate && $contactConsent) {
                $contactMethod =
                    $review->contact_method;

                $contactValue =
                    $review->contact_value;
            }

            $dateWib = $review->created_at
                ? $review->created_at
                ->copy()
                ->setTimezone('Asia/Jakarta')
                ->format('Y-m-d H:i:s')
                : null;

            /* ==================================
               EXPORTED REVIEW RECORD
               ================================== */

            $records[] = [
                'number' => $index + 1,

                'guest_name' => $guestName,
                'room_number' => $roomNumber,

                'date_wib' => $dateWib,

                'average' => $average,
                'rated_count' => count($scores),

                'classification' =>
                $this->classification($average),

                'liked' => $review->liked,
                'improvement' => $review->improvement,
                'unpleasant' => $review->unpleasant,
                'suggestions' => $review->suggestions,

                'contact_consent' => $includePrivate
                    ? $contactConsent
                    : null,

                'contact_method' => $contactMethod,
                'contact_value' => $contactValue,

                'ratings' => $reviewRatings,
            ];
        }

        /* ======================================
           FINAL CATEGORY STATISTICS
           ====================================== */

        foreach ($categories as $id => $category) {
            $ratedCount = $category['rated_count'];

            $categories[$id]['average'] =
                $ratedCount > 0
                ? round(
                    $category['score_sum']
                        / $ratedCount,
                    2
                )
                : null;

            $categories[$id]['low_percentage'] =
                $this->percentage(
                    $category['low_count'],
                    $ratedCount
                );

            unset($categories[$id]['score_sum']);
        }

        /* ======================================
           SUMMARY STATISTICS
           ====================================== */

        $summary = [
            'total' => $totalReviews,
            'scored' => $scoredReviews,
            'unrated' => $unratedCount,

            'overall' => $scoredReviews > 0
                ? round(
                    $overallSum / $scoredReviews,
                    2
                )
                : null,

            'positive_count' => $positiveCount,

            'positive_percentage' =>
            $this->percentage(
                $positiveCount,
                $scoredReviews
            ),

            'improvement' => $improvementCount,

            'improvement_percentage' =>
            $this->percentage(
                $improvementCount,
                $scoredReviews
            ),

            'attention' => $attentionCount,

            'attention_percentage' =>
            $this->percentage(
                $attentionCount,
                $scoredReviews
            ),

            'total_scores' => $totalScores,
            'not_used' => $totalNotUsed,
            'low_scores' => $totalLowScores,

            'low_percentage' =>
            $this->percentage(
                $totalLowScores,
                $totalScores
            ),
        ];

        /* ======================================
           RETURN EXPORT DATA
           ====================================== */

        return [
            'generated_at' =>
            CarbonImmutable::now('Asia/Jakarta')
                ->format('Y-m-d H:i:s'),

            'timezone' => 'Asia/Jakarta',

            'filters' => [
                'search' => $filters['search'] ?? '',
                'star' => $filters['star'] ?? null,
                'from' => $filters['from'] ?? '',
                'to' => $filters['to'] ?? '',
            ],

            'include_private' => $includePrivate,

            'summary' => $summary,

            'review_distribution' =>
            $reviewDistribution,

            'aspect_distribution' =>
            $aspectDistribution,

            'categories' => array_values($categories),

            'reviews' => $records,
        ];
    }
}
