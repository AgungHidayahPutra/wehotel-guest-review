<?php

namespace Database\Seeders;

use App\Models\GuestReview;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WeHotelDemoSeeder extends Seeder
{
    public function run(): void
    {
        /*
         * KEAMANAN
         * Data dummy hanya boleh dibuat
         * pada database lokal WE HOTEL.
         */
        if (
            !app()->environment('local') ||
            DB::connection()->getDatabaseName()
            !== 'wehotel_guest_review'
        ) {
            throw new RuntimeException(
                'Seeder DEMO hanya dapat dijalankan ' .
                    'di database lokal wehotel_guest_review.'
            );
        }

        /*
         * Cegah data DEMO ganda.
         */
        $existing = DB::table('guest_reviews')
            ->where('guest_name', 'like', '[DEMO] %')
            ->where('room_number', 'like', 'DEMO-%')
            ->exists();

        if ($existing) {
            $this->command?->warn(
                'Data DEMO masih tersedia. ' .
                    'Jalankan ClearWeHotelDemoSeeder terlebih dahulu.'
            );

            return;
        }

        /*
         * Ambil kategori aktif.
         */
        $categories = DB::table('rating_categories')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get([
                'id',
                'allow_not_applicable',
            ]);

        if ($categories->isEmpty()) {
            throw new RuntimeException(
                'Tidak ada kategori penilaian aktif.'
            );
        }

        $now = CarbonImmutable::now('Asia/Jakarta');

        /*
         * 500 REVIEW DALAM 3 TAHUN KALENDER
         *
         * Jika dijalankan pada 2026:
         * 2024 = 100 review
         * 2025 = 140 review
         * 2026 = 260 review
         *
         * Tahun saat ini dibagi menjadi
         * tiga kelompok agar filter harian
         * dan bulanan mempunyai cukup data.
         *
         * Format:
         * [jumlah, tanggal_awal, tanggal_akhir]
         */
        $periods = [
            [
                100,
                $now->subYears(2)->startOfYear(),
                $now->subYears(2)->endOfYear(),
            ],
            [
                140,
                $now->subYear()->startOfYear(),
                $now->subYear()->endOfYear(),
            ],
            [
                120,
                $now->startOfYear(),
                $now->subDays(30)->endOfDay(),
            ],
            [
                75,
                $now->subDays(29)->startOfDay(),
                $now->subDays(7)->endOfDay(),
            ],
            [
                65,
                $now->subDays(6)->startOfDay(),
                $now,
            ],
        ];

        /*
         * DATA TAMU FIKTIF
         */
        $firstNames = [
            'Andi',
            'Budi',
            'Dinda',
            'Rizky',
            'Salsa',
            'Rina',
            'Fajar',
            'Nadia',
            'Rafi',
            'Putri',
            'Dimas',
            'Intan',
            'Agus',
            'Nabila',
            'Farhan',
            'Tiara',
            'Bagas',
            'Ayu',
            'Reza',
            'Maya',
            'Dewi',
            'Teguh',
            'Nisa',
            'Arif',
        ];

        $lastNames = [
            'Pratama',
            'Saputra',
            'Rahmawati',
            'Permata',
            'Wijaya',
            'Putri',
            'Hidayat',
            'Nugraha',
            'Ananda',
            'Ramadhan',
            'Lestari',
            'Maulana',
            'Sari',
            'Firmansyah',
            'Utami',
            'Kurniawan',
            'Wulandari',
        ];

        /*
         * HAL YANG DISUKAI
         */
        $likedAnswers = [
            'Pelayanan resepsionis ramah dan membantu.',
            'Kamar bersih dan nyaman untuk beristirahat.',
            'Lokasi hotel strategis dan mudah dijangkau.',
            'Proses check-in cepat dan tidak rumit.',
            'Staf hotel tanggap terhadap permintaan tamu.',
            'Suasana hotel cukup tenang pada malam hari.',
            'Fasilitas kamar berfungsi dengan baik.',
            'Pelayanan restoran cukup memuaskan.',
            'Area hotel tertata rapi dan bersih.',
            'Pengalaman menginap secara keseluruhan menyenangkan.',
        ];

        /*
         * HAL YANG PERLU DITINGKATKAN
         */
        $improvementAnswers = [
            'Koneksi Wi-Fi perlu dibuat lebih stabil.',
            'Waktu pelayanan saat jam sibuk perlu dipercepat.',
            'Perawatan AC kamar perlu lebih rutin.',
            'Variasi menu sarapan masih bisa ditingkatkan.',
            'Pencahayaan kamar sebaiknya diperbaiki.',
            'Kebersihan area umum perlu lebih diperhatikan.',
            'Informasi fasilitas hotel perlu lebih lengkap.',
            'Respons terhadap permintaan tambahan dapat dipercepat.',
            'Kualitas perlengkapan kamar perlu diperiksa.',
            'Proses check-out dapat dibuat lebih efisien.',
        ];

        /*
         * PENGALAMAN KURANG MENYENANGKAN
         */
        $unpleasantAnswers = [
            'Sempat menunggu cukup lama saat check-in.',
            'Koneksi internet beberapa kali terputus.',
            'Suara dari koridor terdengar ke kamar.',
            'Air panas membutuhkan waktu untuk menyala.',
            'Salah satu perlengkapan kamar perlu diganti.',
            'Pesanan makanan datang lebih lambat dari perkiraan.',
            'AC sempat kurang dingin saat pertama masuk kamar.',
            'Area parkir cukup ramai pada jam tertentu.',
        ];

        /*
         * SARAN WAJIB
         * Seluruh review DEMO mengisi kolom ini.
         */
        $suggestionAnswers = [
            'Pertahankan keramahan staf dan kualitas pelayanan.',
            'Mohon tingkatkan kestabilan Wi-Fi di seluruh kamar.',
            'Periksa seluruh fasilitas sebelum kamar digunakan tamu.',
            'Sediakan pilihan menu sarapan yang lebih bervariasi.',
            'Tingkatkan konsistensi kebersihan kamar dan area umum.',
            'Mohon percepat respons terhadap keluhan tamu.',
            'Pertahankan suasana hotel yang nyaman dan tenang.',
            'Lakukan perawatan fasilitas secara lebih terjadwal.',
            'Berikan informasi fasilitas hotel yang lebih lengkap.',
            'Tingkatkan kecepatan proses check-in dan check-out.',
            'Pelayanan sudah baik, semoga terus ditingkatkan.',
            'Perhatikan kembali kenyamanan tempat tidur dan AC.',
            'Mohon jaga kebersihan restoran dan area makan.',
            'Akan lebih baik jika tersedia informasi layanan di kamar.',
            'Terima kasih atas pelayanan yang diberikan selama menginap.',
        ];

        $pick = static fn(array $items) =>
        $items[array_rand($items)];

        $created = 0;

        /*
         * Gunakan transaksi agar tidak ada
         * review tanpa rating saat gagal.
         */
        DB::transaction(function () use (
            $periods,
            $categories,
            $firstNames,
            $lastNames,
            $likedAnswers,
            $improvementAnswers,
            $unpleasantAnswers,
            $suggestionAnswers,
            $pick,
            $now,
            &$created
        ): void {

            foreach ($periods as [$amount, $start, $end]) {

                /*
                 * Pilih tanggal acak di dalam
                 * periode yang sudah ditentukan.
                 */
                $rangeSeconds = max(
                    0,
                    $end->getTimestamp()
                        - $start->getTimestamp()
                );

                for ($i = 0; $i < $amount; $i++) {
                    $created++;

                    $localDate = $start->addSeconds(
                        mt_rand(0, $rangeSeconds)
                    );

                    /*
                     * Timestamp database UTC,
                     * sementara tanggal pengujian WIB.
                     */
                    $timestamp = $localDate
                        ->utc()
                        ->format('Y-m-d H:i:s');

                    $guestName = '[DEMO] '
                        . $pick($firstNames)
                        . ' '
                        . $pick($lastNames);

                    $roomNumber = 'DEMO-'
                        . str_pad(
                            (string) $created,
                            4,
                            '0',
                            STR_PAD_LEFT
                        );

                    $hideName = mt_rand(1, 100) <= 25;
                    $contactConsent = mt_rand(1, 100) <= 20;

                    $contactValue = $contactConsent
                        ? 'wehotel-test-'
                        . $created
                        . '@example.invalid'
                        : null;

                    $liked = $pick($likedAnswers);

                    $improvement =
                        mt_rand(1, 100) <= 80
                        ? $pick($improvementAnswers)
                        : null;

                    $unpleasant =
                        mt_rand(1, 100) <= 40
                        ? $pick($unpleasantAnswers)
                        : null;

                    $suggestions =
                        $pick($suggestionAnswers);

                    /*
                     * SIMPAN MENGGUNAKAN ELOQUENT
                     *
                     * Penting karena model GuestReview
                     * memakai cast encrypted untuk
                     * informasi kontak.
                     */
                    $review = new GuestReview();

                    $review->guest_name = $guestName;
                    $review->room_number = $roomNumber;
                    $review->hide_name = $hideName;

                    $review->liked = $liked;
                    $review->improvement = $improvement;
                    $review->unpleasant = $unpleasant;
                    $review->suggestions = $suggestions;

                    $review->contact_consent =
                        $contactConsent;

                    $review->contact_method =
                        $contactConsent
                        ? 'email'
                        : null;

                    $review->contact_value =
                        $contactValue;

                    $review->created_at = $timestamp;
                    $review->updated_at = $timestamp;

                    $review->save();

                    /*
                     * VARIASI RATING ANTAR TAHUN
                     *
                     * 2024: lebih banyak evaluasi
                     * 2025: mulai meningkat
                     * 2026: cenderung lebih baik
                     *
                     * Tetap ada rating rendah agar
                     * fitur Perlu Perhatian teruji.
                     */
                    $yearDifference =
                        $now->year - $localDate->year;

                    if ($yearDifference >= 2) {
                        $scorePool = [
                            1,
                            2,
                            2,
                            3,
                            3,
                            3,
                            4,
                            4,
                            5,
                        ];
                    } elseif ($yearDifference === 1) {
                        $scorePool = [
                            1,
                            2,
                            3,
                            3,
                            4,
                            4,
                            4,
                            5,
                            5,
                        ];
                    } else {
                        $scorePool = [
                            1,
                            2,
                            3,
                            4,
                            4,
                            5,
                            5,
                            5,
                            5,
                        ];
                    }

                    $baseScore = (int) $pick(
                        $scorePool
                    );

                    $ratingRows = [];

                    foreach (
                        $categories as $index => $category
                    ) {
                        /*
                         * Kategori pertama selalu rated,
                         * sehingga setiap review minimal
                         * mempunyai satu skor.
                         */
                        $notUsed =
                            $index > 0
                            && (bool)
                            $category->allow_not_applicable
                            && mt_rand(1, 100) <= 18;

                        $score = $notUsed
                            ? null
                            : max(
                                1,
                                min(
                                    5,
                                    $baseScore + mt_rand(-1, 1)
                                )
                            );

                        $ratingRows[] = [
                            'guest_review_id' =>
                            $review->id,

                            'rating_category_id' =>
                            $category->id,

                            'status' => $notUsed
                                ? 'not_used'
                                : 'rated',

                            'score' => $score,

                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ];
                    }

                    DB::table('review_ratings')
                        ->insert($ratingRows);
                }
            }
        });

        $this->command?->info(
            $created .
                ' review DEMO berhasil dibuat.'
        );

        $this->command?->info(
            'Periode: ' .
                ($now->year - 2) .
                ' sampai ' .
                $now->year
        );

        $this->command?->info(
            'Review asli tidak diubah.'
        );
    }
}
