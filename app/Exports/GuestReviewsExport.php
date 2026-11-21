<?php

namespace App\Exports;

use DateTimeImmutable;
use DateTimeZone;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithStrictNullComparison;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class GuestReviewsExport implements Export, WithMultipleSheets
{
    public function __construct(
        private readonly array $data,
        private readonly string $hotelName = 'WE HOTEL'
    ) {}

    /* ==========================================
       FOUR WORKSHEETS
       ========================================== */

    public function sheets(): array
    {
        return [
            $this->summarySheet(),
            $this->reviewsSheet(),
            $this->feedbackSheet(),
            $this->categoriesSheet(),
        ];
    }

    /* ==========================================
       HELPERS
       ========================================== */

    private function percent(
        int|float|null $value
    ): ?float {
        return $value === null
            ? null
            : $value / 100;
    }

    private function excelDate(?string $value): ?float
    {
        if (!$value) {
            return null;
        }

        $date = new DateTimeImmutable(
            $value,
            new DateTimeZone('Asia/Jakarta')
        );

        return Date::dateTimeToExcel($date);
    }

    private function reportPeriod(): string
    {
        $from = $this->data['filters']['from'] ?? '';
        $to = $this->data['filters']['to'] ?? '';

        if ($from !== '' && $to !== '') {
            return $from . ' sampai ' . $to;
        }

        if ($from !== '') {
            return 'Sejak ' . $from;
        }

        if ($to !== '') {
            return 'Sampai ' . $to;
        }

        return 'Seluruh periode';
    }

    private function starFilter(): string
    {
        $star = $this->data['filters']['star'] ?? null;

        if ($star === null || $star === '') {
            return 'Semua rating';
        }

        $star = (int) $star;

        if ($star === 5) {
            return 'Tepat 5,0';
        }

        return $star . ',0 sampai kurang dari '
            . ($star + 1) . ',0';
    }

    /* ==========================================
       WORKSHEET 1 — RINGKASAN
       ========================================== */

    private function summarySheet(): object
    {
        $summary = $this->data['summary'];

        $rows = [];
        $formats = [];

        $add = function (
            string $label,
            mixed $value,
            string $description = '',
            ?string $format = null
        ) use (&$rows, &$formats): void {
            $rows[] = [
                $label,
                $value,
                $description,
            ];

            $rowNumber = count($rows) + 3;

            if ($format !== null) {
                $formats['B' . $rowNumber] =
                    $format;
            }
        };

        /* INFORMASI LAPORAN */

        $add(
            'Nama Hotel',
            $this->hotelName
        );

        $add(
            'Periode Laporan',
            $this->reportPeriod(),
            'Seluruh tanggal berdasarkan WIB.'
        );

        $add(
            'Tanggal Export',
            $this->excelDate(
                $this->data['generated_at']
            ),
            'Waktu Indonesia Barat (WIB).',
            'dd/mm/yyyy hh:mm:ss'
        );

        $add(
            'Filter Rating',
            $this->starFilter(),
            'Menggunakan rata-rata rating asli.'
        );

        $add(
            'Filter Pencarian',
            !empty($this->data['filters']['search'])
                ? 'Aktif'
                : 'Tidak aktif',
            'Nilai pencarian tidak ditampilkan untuk menjaga privasi.'
        );

        $add(
            'Data Privat',
            $this->data['include_private']
                ? 'Disertakan'
                : 'Tidak disertakan'
        );

        $add(
            'Kerahasiaan Laporan',
            'Dokumen internal',
            'Jawaban bebas tamu dapat mengandung informasi pribadi.'
        );

        /* STATISTIK ULASAN */

        $add(
            'Total Ulasan',
            $summary['total'],
            'Seluruh ulasan sesuai cakupan export.',
            '#,##0'
        );

        $add(
            'Ulasan dengan Rating',
            $summary['scored'],
            'Ulasan yang memiliki minimal satu rating.',
            '#,##0'
        );

        $add(
            'Ulasan Tanpa Rating',
            $summary['unrated'],
            'Tidak dihitung dalam rata-rata kepuasan.',
            '#,##0'
        );

        $add(
            'Overall Rating',
            $summary['overall'],
            'Rata-rata dari rata-rata setiap ulasan.',
            '0.00'
        );

        $add(
            'Ulasan Positif',
            $summary['positive_count'],
            'Rata-rata minimal 4,0.',
            '#,##0'
        );

        $add(
            'Persentase Positif',
            $this->percent(
                $summary['positive_percentage']
            ),
            'Ulasan positif dibagi ulasan yang memiliki rating.',
            '0.00%'
        );

        $add(
            'Perlu Peningkatan',
            $summary['improvement'],
            'Rata-rata 3,0 sampai kurang dari 4,0.',
            '#,##0'
        );

        $add(
            'Persentase Perlu Peningkatan',
            $this->percent(
                $summary['improvement_percentage']
            ),
            'Proporsi ulasan yang perlu peningkatan.',
            '0.00%'
        );

        $add(
            'Perlu Perhatian',
            $summary['attention'],
            'Rata-rata di bawah 3,0.',
            '#,##0'
        );

        $add(
            'Persentase Perlu Perhatian',
            $this->percent(
                $summary['attention_percentage']
            ),
            'Proporsi ulasan yang perlu perhatian.',
            '0.00%'
        );

        /* STATISTIK PER ASPEK */

        $add(
            'Total Skor Kategori',
            $summary['total_scores'],
            'Setiap aspek yang dinilai dihitung satu kali.',
            '#,##0'
        );

        $add(
            'Tidak Menggunakan Layanan',
            $summary['not_used'],
            'Tidak dihitung sebagai skor nol.',
            '#,##0'
        );

        $add(
            'Skor Kategori 1–3',
            $summary['low_scores'],
            'Jumlah skor aspek dengan bintang 1 sampai 3.',
            '#,##0'
        );

        $add(
            'Persentase Skor Kategori 1–3',
            $this->percent(
                $summary['low_percentage']
            ),
            'Skor 1–3 dibagi total skor kategori.',
            '0.00%'
        );

        /* DISTRIBUSI PER ULASAN */

        foreach (range(5, 1) as $star) {
            $label = $star === 5
                ? 'Per Ulasan — Tepat 5,0'
                : 'Per Ulasan — Kelompok '
                . $star . ' Bintang';

            $description = $star === 5
                ? 'Rata-rata tepat 5,0.'
                : 'Rata-rata ' . $star
                . ',0 sampai kurang dari '
                . ($star + 1) . ',0.';

            $add(
                $label,
                $this->data['review_distribution'][$star] ?? 0,
                $description,
                '#,##0'
            );
        }

        /* DISTRIBUSI PER ASPEK */

        foreach (range(5, 1) as $star) {
            $add(
                'Per Aspek — ' . $star . ' Bintang',
                $this->data['aspect_distribution'][$star] ?? 0,
                'Jumlah skor kategori tepat '
                    . $star . ' bintang.',
                '#,##0'
            );
        }

        return $this->makeSheet(
            name: 'Ringkasan',

            title: $this->hotelName
                . ' — RINGKASAN KEPUASAN TAMU',

            headings: [
                'Indikator',
                'Nilai',
                'Keterangan',
            ],

            rows: $rows,

            widths: [
                'A' => 38,
                'B' => 36,
                'C' => 72,
            ],

            formats: $formats,
            autoFilter: false,
            tabColor: '192C43'
        );
    }

    /* ==========================================
       WORKSHEET 2 — DATA ULASAN
       ========================================== */

    private function reviewsSheet(): object
    {
        $categories = $this->data['categories'];
        $includePrivate = $this->data['include_private'];

        $headings = [
            'No.',
            'Nama Tamu',
            'Tanggal Ulasan (WIB)',
            'Overall Rating',
            'Aspek Dinilai',
            'Klasifikasi Kepuasan',
        ];

        $widths = [
            'A' => 9,
            'B' => 28,
            'C' => 25,
            'D' => 18,
            'E' => 17,
            'F' => 26,
        ];

        $formats = [
            'A' => '#,##0',
            'C' => 'dd/mm/yyyy hh:mm',
            'D' => '0.00',
            'E' => '#,##0',
        ];

        /*
         * Kolom kategori mengikuti database.
         */
        foreach ($categories as $category) {
            $headings[] = $category['name'];

            $column =
                Coordinate::stringFromColumnIndex(
                    count($headings)
                );

            $widths[$column] = 24;
            $formats[$column] = '0';
        }

        /* KOLOM PRIVAT OPSIONAL */

        if ($includePrivate) {
            $privateColumns = [
                'Nomor Kamar',
                'Persetujuan Dihubungi',
                'Jenis Kontak',
                'Kontak Tamu',
            ];

            foreach ($privateColumns as $heading) {
                $headings[] = $heading;

                $column =
                    Coordinate::stringFromColumnIndex(
                        count($headings)
                    );

                $widths[$column] =
                    $heading === 'Kontak Tamu'
                    ? 35
                    : 25;
            }
        }

        $rows = [];

        foreach ($this->data['reviews'] as $review) {
            $row = [
                $review['number'],

                $review['guest_name'],

                $this->excelDate(
                    $review['date_wib']
                ),

                $review['average'],
                $review['rated_count'],
                $review['classification'],
            ];

            foreach ($categories as $category) {
                $rating =
                    $review['ratings'][$category['id']]
                    ?? null;

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

            if ($includePrivate) {
                $row[] = $review['room_number'];

                $row[] = $review['contact_consent']
                    ? 'Bersedia'
                    : 'Tidak bersedia';

                $row[] = match ($review['contact_method']) {
                    'whatsapp' => 'WhatsApp',
                    'email' => 'Email',
                    default => null,
                };

                $row[] = $review['contact_value'];
            }

            $rows[] = $row;
        }

        return $this->makeSheet(
            name: 'Data Ulasan',

            title: $this->hotelName
                . ' — DATA ULASAN TAMU',

            headings: $headings,
            rows: $rows,
            widths: $widths,
            formats: $formats,
            autoFilter: true,
            tabColor: '527F9E'
        );
    }

    /* ==========================================
       WORKSHEET 3 — MASUKAN TAMU
       ========================================== */

    private function feedbackSheet(): object
    {
        $headings = [
            'No.',
            'Nama Tamu',
            'Tanggal Ulasan (WIB)',
            'Overall Rating',
            'Hal yang Paling Disukai',
            'Hal yang Perlu Ditingkatkan',
            'Pengalaman Kurang Menyenangkan',
            'Saran atau Masukan',
        ];

        $rows = [];

        foreach ($this->data['reviews'] as $review) {
            $rows[] = [
                $review['number'],

                $review['guest_name'],

                $this->excelDate(
                    $review['date_wib']
                ),

                $review['average'],

                $review['liked'],
                $review['improvement'],
                $review['unpleasant'],
                $review['suggestions'],
            ];
        }

        return $this->makeSheet(
            name: 'Masukan Tamu',

            title: $this->hotelName
                . ' — MASUKAN DAN PENGALAMAN TAMU',

            headings: $headings,
            rows: $rows,

            widths: [
                'A' => 9,
                'B' => 28,
                'C' => 25,
                'D' => 18,
                'E' => 48,
                'F' => 48,
                'G' => 48,
                'H' => 55,
            ],

            formats: [
                'A' => '#,##0',
                'C' => 'dd/mm/yyyy hh:mm',
                'D' => '0.00',
            ],

            autoFilter: true,
            tabColor: 'D4AF69'
        );
    }

    /* ==========================================
       WORKSHEET 4 — ANALISIS KATEGORI
       ========================================== */

    private function categoriesSheet(): object
    {
        $categories = $this->data['categories'];

        /*
         * Urutkan proporsi skor 1–3 terbesar.
         */
        usort(
            $categories,
            function (array $a, array $b): int {
                if (
                    $a['rated_count'] === 0 &&
                    $b['rated_count'] === 0
                ) {
                    return $a['id'] <=> $b['id'];
                }

                if ($a['rated_count'] === 0) {
                    return 1;
                }

                if ($b['rated_count'] === 0) {
                    return -1;
                }

                $aRatio =
                    $a['low_count'] / $a['rated_count'];

                $bRatio =
                    $b['low_count'] / $b['rated_count'];

                $comparison = $bRatio <=> $aRatio;

                if ($comparison !== 0) {
                    return $comparison;
                }

                // Samakan urutan dengan Analitik.
                $countComparison =
                    $b['low_count'] <=> $a['low_count'];

                return $countComparison !== 0
                    ? $countComparison
                    : $a['id'] <=> $b['id'];
            }
        );

        $rows = [];

        foreach ($categories as $index => $category) {
            $rows[] = [
                $index + 1,

                $category['name'],

                $category['active']
                    ? 'Aktif'
                    : 'Nonaktif',

                $category['average'],
                $category['rated_count'],
                $category['not_used_count'],
                $category['low_count'],

                $this->percent(
                    $category['low_percentage']
                ),
            ];
        }

        return $this->makeSheet(
            name: 'Analisis Kategori',

            title: $this->hotelName
                . ' — ANALISIS ASPEK PELAYANAN',

            headings: [
                'No.',
                'Kategori Penilaian',
                'Status',
                'Rata-rata Rating',
                'Jumlah Penilaian',
                'Tidak Menggunakan Layanan',
                'Jumlah Skor 1–3',
                'Persentase Skor 1–3',
            ],

            rows: $rows,

            widths: [
                'A' => 9,
                'B' => 32,
                'C' => 15,
                'D' => 22,
                'E' => 22,
                'F' => 32,
                'G' => 22,
                'H' => 25,
            ],

            formats: [
                'A' => '#,##0',
                'D' => '0.00',
                'E' => '#,##0',
                'F' => '#,##0',
                'G' => '#,##0',
                'H' => '0.00%',
            ],

            autoFilter: true,
            tabColor: 'B0795E'
        );
    }

    /* ==========================================
       REUSABLE WORKSHEET BUILDER
       ========================================== */

    private function makeSheet(
        string $name,
        string $title,
        array $headings,
        array $rows,
        array $widths,
        array $formats,
        bool $autoFilter = true,
        string $tabColor = '192C43'
    ): object {
        $subtitle =
            'Periode: ' . $this->reportPeriod()
            . ' | WIB | DOKUMEN INTERNAL';

        return new class(
            $name,
            $title,
            $subtitle,
            $headings,
            $rows,
            $widths,
            $formats,
            $autoFilter,
            $tabColor
        ) extends DefaultValueBinder implements
            Export,
            FromArray,
            WithTitle,
            WithStyles,
            WithCustomValueBinder,
            WithStrictNullComparison
        {
            public function __construct(
                private readonly string $sheetName,
                private readonly string $sheetTitle,
                private readonly string $subtitle,
                private readonly array $headings,
                private readonly array $rows,
                private readonly array $widths,
                private readonly array $formats,
                private readonly bool $autoFilter,
                private readonly string $tabColor
            ) {}

            public function title(): string
            {
                return $this->sheetName;
            }

            public function array(): array
            {
                return array_merge(
                    [
                        [$this->sheetTitle],
                        [$this->subtitle],
                        $this->headings,
                    ],
                    $this->rows
                );
            }

            /* ==================================
               SAFE EXCEL VALUE BINDER
               ================================== */

            public function bindValue(
                Cell $cell,
                mixed $value
            ): bool {
                /*
                 * String selalu disimpan sebagai teks.
                 * Mencegah formula injection.
                 */
                if (is_string($value)) {
                    $cell->setValueExplicit(
                        $value,
                        DataType::TYPE_STRING
                    );

                    return true;
                }

                /*
                 * Rating, tanggal Excel, jumlah
                 * dan persentase tetap numerik.
                 */
                if (
                    is_int($value) ||
                    is_float($value)
                ) {
                    $cell->setValueExplicit(
                        $value,
                        DataType::TYPE_NUMERIC
                    );

                    return true;
                }

                return parent::bindValue($cell, $value);
            }

            /* ==================================
               EXCEL VISUAL STYLING
               ================================== */

            public function styles(
                Worksheet $sheet
            ): array {
                $lastColumn =
                    Coordinate::stringFromColumnIndex(
                        count($this->headings)
                    );

                $lastRow = count($this->rows) + 3;

                $fullRange =
                    'A1:' . $lastColumn . $lastRow;

                $sheet->setShowGridlines(false);

                $sheet->getTabColor()
                    ->setRGB($this->tabColor);

                /* DEFAULT FONT */

                $sheet->getStyle($fullRange)
                    ->applyFromArray([
                        'font' => [
                            'name' => 'Calibri',
                            'size' => 11,
                            'color' => [
                                'rgb' => '29465D',
                            ],
                        ],

                        'alignment' => [
                            'vertical' =>
                            Alignment::VERTICAL_TOP,
                        ],
                    ]);

                /* HEADER MIDNIGHT NAVY */

                $sheet->mergeCells(
                    'A1:' . $lastColumn . '1'
                );

                $sheet->getStyle(
                    'A1:' . $lastColumn . '1'
                )->applyFromArray([
                    'font' => [
                        'name' => 'Calibri',
                        'bold' => true,
                        'size' => 17,
                        'color' => [
                            'rgb' => 'FFFFFF',
                        ],
                    ],

                    'fill' => [
                        'fillType' =>
                        Fill::FILL_SOLID,

                        'startColor' => [
                            'rgb' => '192C43',
                        ],
                    ],

                    'alignment' => [
                        'vertical' =>
                        Alignment::VERTICAL_CENTER,

                        'horizontal' =>
                        Alignment::HORIZONTAL_LEFT,
                    ],
                ]);

                $sheet->getRowDimension(1)
                    ->setRowHeight(38);

                /* SUBTITLE */

                $sheet->mergeCells(
                    'A2:' . $lastColumn . '2'
                );

                $sheet->getStyle(
                    'A2:' . $lastColumn . '2'
                )->applyFromArray([
                    'font' => [
                        'size' => 10,
                        'color' => [
                            'rgb' => '64819A',
                        ],
                    ],

                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,

                        'startColor' => [
                            'rgb' => 'EDF3F7',
                        ],
                    ],

                    'alignment' => [
                        'vertical' =>
                        Alignment::VERTICAL_CENTER,

                        'wrapText' => true,
                    ],

                    'borders' => [
                        'bottom' => [
                            'borderStyle' =>
                            Border::BORDER_MEDIUM,

                            'color' => [
                                'rgb' => 'D4AF69',
                            ],
                        ],
                    ],
                ]);

                $sheet->getRowDimension(2)
                    ->setRowHeight(32);

                /* HEADER KOLOM */

                $sheet->getStyle(
                    'A3:' . $lastColumn . '3'
                )->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 11,
                        'color' => [
                            'rgb' => 'FFFFFF',
                        ],
                    ],

                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,

                        'startColor' => [
                            'rgb' => '365B78',
                        ],
                    ],

                    'alignment' => [
                        'horizontal' =>
                        Alignment::HORIZONTAL_CENTER,

                        'vertical' =>
                        Alignment::VERTICAL_CENTER,

                        'wrapText' => true,
                    ],
                ]);

                $sheet->getRowDimension(3)
                    ->setRowHeight(34);

                /* DATA TABLE */

                if ($lastRow >= 4) {
                    $bodyRange =
                        'A4:' . $lastColumn . $lastRow;

                    $sheet->getStyle($bodyRange)
                        ->applyFromArray([
                            'alignment' => [
                                'vertical' =>
                                Alignment::VERTICAL_TOP,

                                'wrapText' => true,
                            ],

                            'borders' => [
                                'allBorders' => [
                                    'borderStyle' =>
                                    Border::BORDER_THIN,

                                    'color' => [
                                        'rgb' => 'DFE9F0',
                                    ],
                                ],
                            ],
                        ]);

                    foreach (
                        $this->formats as
                        $coordinate => $format
                    ) {
                        $range = preg_match(
                            '/^[A-Z]+$/',
                            $coordinate
                        )
                            ? $coordinate . '4:'
                            . $coordinate . $lastRow
                            : $coordinate;

                        $sheet->getStyle($range)
                            ->getNumberFormat()
                            ->setFormatCode($format);
                    }
                }

                /* COLUMN WIDTH */

                foreach (
                    $this->widths as $column => $width
                ) {
                    $sheet->getColumnDimension($column)
                        ->setWidth($width);
                }

                /* SUMMARY LABEL */

                if (
                    $this->sheetName === 'Ringkasan' &&
                    $lastRow >= 4
                ) {
                    $sheet->getStyle(
                        'A4:A' . $lastRow
                    )->applyFromArray([
                        'font' => [
                            'bold' => true,
                        ],

                        'fill' => [
                            'fillType' =>
                            Fill::FILL_SOLID,

                            'startColor' => [
                                'rgb' => 'F0F5F8',
                            ],
                        ],
                    ]);
                }

                /* FREEZE HEADER */

                $sheet->freezePane('A4');

                /* AUTO FILTER */

                if ($this->autoFilter) {
                    $sheet->setAutoFilter(
                        'A3:'
                            . $lastColumn
                            . max(3, $lastRow)
                    );
                }

                return [];
            }
        };
    }
}
