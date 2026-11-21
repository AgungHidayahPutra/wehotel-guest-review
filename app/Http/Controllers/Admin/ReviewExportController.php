<?php

namespace App\Http\Controllers\Admin;

use App\Exports\GuestReviewsExport;
use App\Http\Controllers\Controller;
use App\Models\HotelSetting;
use App\Services\ReviewExportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response;

class ReviewExportController extends Controller
{
    /*
     * Batas khusus PDF Detail untuk menjaga
     * penggunaan memori dan waktu rendering.
     */
    private const MAX_PDF_DETAIL_REVIEWS = 200;

    private const MAX_LOGO_BYTES = 2097152;

    /* ==========================================
       MAIN EXPORT CONTROLLER
       ========================================== */

    public function __invoke(Request $request, ReviewExportService $service): Response
    {
        /*
         * Hanya administrator yang berwenang
         * melakukan export data ulasan.
         */
        abort_unless($request->user()?->is_admin, 403);

        /* ======================================
           VALIDATE EXPORT OPTIONS
           ====================================== */

        $validated = $request->validate([
            'format' => ['required', Rule::in(['xlsx', 'pdf', 'csv'])],

            'scope' => ['nullable', Rule::in(['all', 'filtered'])],

            'report_type' => ['nullable', Rule::in(['summary', 'detail'])],

            'include_private' => ['nullable', 'boolean'],
        ]);

        $format = $validated['format'];

        $scope = $validated['scope'] ?? 'filtered';

        $reportType = $validated['report_type'] ?? 'summary';

        $includePrivate = $request->boolean('include_private');

        /* ======================================
           DETERMINE EXPORT SCOPE
           ====================================== */

        /*
         * Seluruh data:
         * Abaikan filter pencarian, rating,
         * dan tanggal yang sedang aktif.
         *
         * Sesuai filter:
         * Gunakan filter dari halaman Semua Ulasan.
         */
        $filters = $scope === 'all' ? [] : $service->validateFilters($request);

        /*
         * PDF Ringkasan tidak membutuhkan
         * identitas maupun kontak tamu.
         */
        if ($format === 'pdf' && $reportType === 'summary') {
            $includePrivate = false;
        }

        /* ======================================
           PDF DETAIL LIMIT
           ====================================== */

        $isPdfDetail = $format === 'pdf' && $reportType === 'detail';

        if ($isPdfDetail) {
            $reviewCount = $service->query($filters)->count();

            if ($reviewCount > self::MAX_PDF_DETAIL_REVIEWS) {
                throw ValidationException::withMessages([
                    'export' => 'PDF Detail maksimal '.self::MAX_PDF_DETAIL_REVIEWS.' ulasan dalam satu file. '.'Silakan batasi rentang tanggal '.'atau gunakan format Excel.',
                ]);
            }
        }

        /* ======================================
           BUILD EXPORT DATA
           ====================================== */

        $data = $service->build($filters, $includePrivate);

        /*
         * Pemeriksaan ulang apabila ada
         * ulasan baru ketika query diproses.
         */
        if ($isPdfDetail && $data['summary']['total'] > self::MAX_PDF_DETAIL_REVIEWS) {
            throw ValidationException::withMessages([
                'export' => 'Jumlah ulasan melebihi batas PDF Detail. '.'Silakan persempit rentang tanggal.',
            ]);
        }

        /* ======================================
           HOTEL SETTINGS
           ====================================== */

        $hotel = HotelSetting::current();

        $hotelName = trim((string) $hotel->hotel_name);

        if ($hotelName === '') {
            $hotelName = 'WE HOTEL';
        }

        /* ======================================
           DOWNLOAD RESPONSE
           ====================================== */

        $response = match ($format) {
            'xlsx' => $this->exportExcel($data, $hotelName),

            'pdf' => $this->exportPdf($data, $hotelName, $reportType, $hotel->logo_path),

            'csv' => $this->exportCsv($data, $hotelName),
        };

        /*
         * Informasi tamu bersifat internal.
         * Hindari penyimpanan respons download
         * pada cache browser dan proxy.
         */
        $response->headers->set('Cache-Control', 'private, no-store, no-cache, must-revalidate');

        $response->headers->set('Pragma', 'no-cache');

        $response->headers->set('Expires', '0');

        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }

    /* ==========================================
       GENERATE FILE NAME
       ========================================== */

    private function filename(string $hotelName, string $report, string $extension): string
    {
        $hotelSlug = Str::slug($hotelName);

        if ($hotelSlug === '') {
            $hotelSlug = 'we-hotel';
        }

        $timestamp = CarbonImmutable::now('Asia/Jakarta')->format('Y-m-d_His');

        return $hotelSlug.'-'.$report.'-'.$timestamp.'.'.$extension;
    }

    /* ==========================================
       EXPORT MICROSOFT EXCEL
       ========================================== */

    private function exportExcel(array $data, string $hotelName): Response
    {
        $filename = $this->filename($hotelName, 'laporan-ulasan', 'xlsx');

        return Excel::download(new GuestReviewsExport($data, $hotelName), $filename);
    }

    /* ==========================================
       EXPORT PDF
       ========================================== */

    private function exportPdf(array $data, string $hotelName, string $reportType, ?string $logoPath): Response
    {
        $logoDataUri = $this->logoDataUri($logoPath);

        $reportName = $reportType === 'detail' ? 'detail-ulasan' : 'ringkasan-kepuasan';

        $filename = $this->filename($hotelName, $reportName, 'pdf');

        $pdf = Pdf::loadView('exports.guest-reviews', [
            'data' => $data,
            'hotelName' => $hotelName,
            'reportType' => $reportType,
            'logoDataUri' => $logoDataUri,
        ]);

        /*
         * Tidak mengizinkan resource eksternal,
         * eksekusi PHP, atau JavaScript di PDF.
         */
        $pdf->setOption([
            'isRemoteEnabled' => false,
            'isPhpEnabled' => false,
            'isJavascriptEnabled' => false,
            'defaultFont' => 'DejaVu Sans',
            'dpi' => 96,
        ]);

        $pdf->setPaper('a4', 'portrait');

        return $pdf->download($filename);
    }

    /* ==========================================
       HOTEL LOGO FOR PDF
       ========================================== */

    private function logoDataUri(?string $logoPath): ?string
    {
        /*
         * Logo diambil dari penyimpanan lokal.
         * Tidak menggunakan HTTP atau URL eksternal.
         */
        if ($logoPath !== null && trim($logoPath) !== '') {
            $root = config('filesystems.disks.public.root', storage_path('app/public'));

            $logo = $this->localImageDataUri((string) $root, $logoPath);

            if ($logo !== null) {
                return $logo;
            }
        }

        /*
         * Fallback logo bawaan proyek.
         */
        return $this->localImageDataUri(public_path(), 'images/wehotel/hotel-logo.png');
    }

    private function localImageDataUri(string $root, string $relativePath): ?string
    {
        $base = realpath($root);

        if ($base === false) {
            return null;
        }

        /*
         * Pastikan path gambar berada di dalam
         * direktori penyimpanan yang diizinkan.
         */
        $path = realpath($base.DIRECTORY_SEPARATOR.ltrim($relativePath, '/\\'));

        if ($path === false || ! str_starts_with($path, rtrim($base, '/\\').DIRECTORY_SEPARATOR) || ! is_file($path) || ! is_readable($path)) {
            return null;
        }

        $size = filesize($path);

        if ($size === false || $size <= 0 || $size > self::MAX_LOGO_BYTES) {
            return null;
        }

        /*
         * Validasi tipe gambar berdasarkan isi file,
         * bukan hanya berdasarkan ekstensi.
         */
        $image = @getimagesize($path);

        if ($image === false) {
            return null;
        }

        $mime = $image['mime'] ?? '';

        if (! in_array($mime, ['image/png', 'image/jpeg', 'image/gif'], true)) {
            return null;
        }

        /*
         * Hindari gambar dengan dimensi berlebihan.
         */
        if ($image[0] > 3000 || $image[1] > 3000) {
            return null;
        }

        $contents = file_get_contents($path);

        if ($contents === false) {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode($contents);
    }

    /* ==========================================
       EXPORT CSV
       ========================================== */

    private function exportCsv(array $data, string $hotelName): Response
    {
        $filename = $this->filename($hotelName, 'data-ulasan', 'csv');

        $categories = $data['categories'];

        $includePrivate = $data['include_private'];

        /*
         * CSV berisi satu tabel lengkap.
         * Rating kategori dan masukan tamu
         * digabung dalam satu file.
         */
        $headings = ['No.', 'Nama Tamu', 'Tanggal Ulasan (WIB)', 'Overall Rating', 'Aspek Dinilai', 'Klasifikasi Kepuasan'];

        /* KOLOM KATEGORI DINAMIS */

        foreach ($categories as $category) {
            $headings[] = $category['name'];
        }

        /* KOLOM MASUKAN TAMU */

        $headings[] = 'Hal yang Paling Disukai';

        $headings[] = 'Hal yang Perlu Ditingkatkan';

        $headings[] = 'Pengalaman Kurang Menyenangkan';

        $headings[] = 'Saran atau Masukan';

        /* KOLOM PRIVAT OPSIONAL */

        if ($includePrivate) {
            $headings[] = 'Nomor Kamar';

            $headings[] = 'Persetujuan Dihubungi';

            $headings[] = 'Jenis Kontak';

            $headings[] = 'Kontak Tamu';
        }

        return response()->streamDownload(
            function () use ($data, $categories, $headings, $includePrivate) {
                $handle = fopen('php://output', 'wb');

                if ($handle === false) {
                    throw new \RuntimeException('Tidak dapat membuat file CSV.');
                }

                try {
                    /*
                     * UTF-8 BOM untuk membantu Excel
                     * membaca karakter dengan benar.
                     */
                    fwrite($handle, "\xEF\xBB\xBF");

                    /*
                     * Header juga diamankan karena
                     * kategori dapat dibuat oleh admin.
                     */
                    $this->writeCsvRow($handle, $headings);

                    foreach ($data['reviews'] as $review) {
                        $row = [$review['number'], $review['guest_name'], $review['date_wib'], $review['average'], $review['rated_count'], $review['classification']];

                        /* ASPECT RATINGS */

                        foreach ($categories as $category) {
                            $rating = $review['ratings'][$category['id']] ?? null;

                            if ($rating === null) {
                                $row[] = null;

                                continue;
                            }

                            if ($rating['status'] === 'not_used') {
                                $row[] = 'N/A';

                                continue;
                            }

                            $row[] = $rating['score'];
                        }

                        /* GUEST FEEDBACK */

                        $row[] = $review['liked'];

                        $row[] = $review['improvement'];

                        $row[] = $review['unpleasant'];

                        $row[] = $review['suggestions'];

                        /* PRIVATE INFORMATION */

                        if ($includePrivate) {
                            $row[] = $review['room_number'];

                            $row[] = $review['contact_consent'] ? 'Bersedia' : 'Tidak bersedia';

                            $row[] = match ($review['contact_method']) {
                                'whatsapp' => 'WhatsApp',
                                'email' => 'Email',
                                default => null,
                            };

                            $row[] = $review['contact_value'];
                        }

                        $this->writeCsvRow($handle, $row);
                    }
                } finally {
                    fclose($handle);
                }
            },
            $filename,
            [
                'Content-Type' => 'text/csv; charset=UTF-8',
            ],
        );
    }

    /* ==========================================
       SAFE CSV ROW WRITER
       ========================================== */

    private function writeCsvRow($handle, array $row): void
    {
        $safeRow = array_map(fn ($value) => $this->safeCsvValue($value), $row);

        /*
         * Escape karakter bawaan dinonaktifkan
         * untuk kompatibilitas format CSV standar.
         */
        $written = fputcsv($handle, $safeRow, ',', '"', '', "\r\n");

        if ($written === false) {
            throw new \RuntimeException('Gagal menulis data CSV.');
        }
    }

    /* ==========================================
       CSV FORMULA INJECTION PROTECTION
       ========================================== */

    private function safeCsvValue(mixed $value): string|int|float
    {
        if ($value === null) {
            return '';
        }

        /*
         * Nilai rating dan jumlah penilaian
         * tetap berupa angka.
         */
        if (is_int($value) || is_float($value)) {
            return $value;
        }

        $text = (string) $value;

        /*
         * Cegah teks dari pengguna dibaca
         * sebagai formula spreadsheet.
         *
         * Termasuk jika terdapat whitespace
         * sebelum karakter pembuka formula.
         */
        if (preg_match('/^(?:[\p{Z}\x00-\x20]*[=+\-@＝＋－＠]|[\t\r\n])/u', $text) === 1) {
            return "'".$text;
        }

        return $text;
    }
}
