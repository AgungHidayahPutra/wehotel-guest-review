@php
    $hotelName = $hotelName ?? 'WE HOTEL';
    $reportType = $reportType ?? 'summary';
    $logoDataUri = $logoDataUri ?? null;

    $summary = $data['summary'];
    $categories = $data['categories'];
    $reviews = $data['reviews'];
    $filters = $data['filters'];

    $includePrivate = $data['include_private'];
    $isDetail = $reportType === 'detail';

    /* ==========================================
       FORMATTING HELPERS
       ========================================== */

    $fmt = function ($value) {
        return number_format((int) $value, 0, ',', '.');
    };

    $decimal = function ($value, $digits = 2) {
        return $value === null ? '—' : number_format((float) $value, $digits, ',', '.');
    };

    $percent = function ($value) use ($decimal) {
        return $value === null ? '—' : $decimal($value) . '%';
    };

    $ratio = function ($count, $total) {
        return $total > 0 ? ($count / $total) * 100 : 0;
    };

    $dateFormat = function ($value) {
        if (!$value) {
            return '—';
        }

        return \Carbon\CarbonImmutable::parse($value, 'Asia/Jakarta')->locale('id')->translatedFormat('d F Y');
    };

    $dateTimeFormat = function ($value) {
        if (!$value) {
            return '—';
        }

        return \Carbon\CarbonImmutable::parse($value, 'Asia/Jakarta')->locale('id')->translatedFormat('d F Y, H:i');
    };

    /* ==========================================
       REPORT PERIOD
       ========================================== */

    $from = $filters['from'] ?? '';
    $to = $filters['to'] ?? '';

    if ($from && $to) {
        $periodLabel = $dateFormat($from) . ' sampai ' . $dateFormat($to);
    } elseif ($from) {
        $periodLabel = 'Sejak ' . $dateFormat($from);
    } elseif ($to) {
        $periodLabel = 'Sampai ' . $dateFormat($to);
    } else {
        $periodLabel = 'Seluruh periode';
    }

    $star = $filters['star'] ?? null;

    if (!$star) {
        $starLabel = 'Semua rating';
    } elseif ((int) $star === 5) {
        $starLabel = 'Tepat 5,0';
    } else {
        $starLabel = $star . ',0 sampai kurang dari ' . ($star + 1) . ',0';
    }

    /* ==========================================
       SATISFACTION GROUPS
       ========================================== */

    $groups = [
        [
            'name' => 'Positif',
            'range' => '4,0–5,0',
            'count' => $summary['positive_count'],
            'percentage' => $summary['positive_percentage'],
            'color' => '#38876C',
            'background' => '#EDF7F2',
        ],

        [
            'name' => 'Perlu Peningkatan',
            'range' => '3,0 sampai kurang dari 4,0',
            'count' => $summary['improvement'],
            'percentage' => $summary['improvement_percentage'],
            'color' => '#B18B48',
            'background' => '#FBF6EB',
        ],

        [
            'name' => 'Perlu Perhatian',
            'range' => 'Di bawah 3,0',
            'count' => $summary['attention'],
            'percentage' => $summary['attention_percentage'],
            'color' => '#B6534B',
            'background' => '#FCF0ED',
        ],
    ];

    /* ==========================================
       CATEGORY PERFORMANCE
       ========================================== */

    $rankedCategories = $categories;

    usort($rankedCategories, function ($a, $b) {
        if ($a['average'] === null && $b['average'] === null) {
            return $a['id'] <=> $b['id'];
        }

        if ($a['average'] === null) {
            return 1;
        }

        if ($b['average'] === null) {
            return -1;
        }

        return $b['average'] <=> $a['average'] ?: $a['id'] <=> $b['id'];
    });

    /* ==========================================
       SERVICE PRIORITIES
       ========================================== */

    $priorities = $categories;

    usort($priorities, function ($a, $b) {
        if ($a['rated_count'] === 0 && $b['rated_count'] === 0) {
            return $a['id'] <=> $b['id'];
        }

        if ($a['rated_count'] === 0) {
            return 1;
        }

        if ($b['rated_count'] === 0) {
            return -1;
        }

        $aRatio = $a['low_count'] / $a['rated_count'];

        $bRatio = $b['low_count'] / $b['rated_count'];

        return $bRatio <=> $aRatio ?: $b['low_count'] <=> $a['low_count'] ?: $a['id'] <=> $b['id'];
    });

    $topCategory = collect($rankedCategories)->first(fn($category) => $category['average'] !== null);

    $topPriority = collect($priorities)->first(
        fn($category) => $category['rated_count'] > 0 && $category['low_count'] > 0,
    );

    $ratingColors = [
        5 => '#284C69',
        4 => '#86ACC1',
        3 => '#D8AF61',
        2 => '#E7A07E',
        1 => '#CC7B79',
    ];
@endphp

<!DOCTYPE html>

<html lang="id">

<head>

    <meta charset="UTF-8">

    <title>
        Laporan Evaluasi Kepuasan Tamu
        — {{ $hotelName }}
    </title>

    <style>
        /* ======================================
           PAPER SETTINGS
           ====================================== */

        @page {
            margin: 92pt 38pt 58pt 38pt;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: "DejaVu Sans", sans-serif;
            font-size: 9px;
            line-height: 1.65;

            color: #29465D;
            background: #FFFFFF;
        }

        h1,
        h2,
        h3,
        p {
            margin-top: 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        td,
        th {
            vertical-align: top;
        }

        thead {
            display: table-header-group;
        }

        tr {
            page-break-inside: avoid;
        }

        h2,
        h3 {
            page-break-after: avoid;
        }

        .page-break {
            page-break-before: always;
        }

        .keep-together {
            page-break-inside: avoid;
        }

        .muted {
            color: #7C94A6;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        /* ======================================
           FIXED HEADER
           ====================================== */

        .document-header {
            position: fixed;

            top: -70pt;
            left: 0;
            right: 0;

            height: 57pt;

            border-bottom: 2px solid #D4AF69;
        }

        .header-table td {
            vertical-align: middle;
        }

        .logo-cell {
            width: 65px;
            padding-right: 12px;
        }

        .hotel-logo {
            max-width: 64px;
            max-height: 48px;
        }

        .hotel-name {
            font-size: 23px;
            line-height: 1.2;

            color: #192C43;
            font-weight: bold;

            margin-bottom: 4px;
        }

        .hotel-subtitle {
            font-size: 7px;
            letter-spacing: 1.5px;

            color: #8099AA;
        }

        .header-right {
            text-align: right;
            font-size: 8px;
            color: #7C94A6;
        }

        .header-type {
            color: #365B78;
            font-weight: bold;
            font-size: 9px;
        }

        /* ======================================
           FIXED FOOTER
           ====================================== */

        .document-footer {
            position: fixed;

            bottom: -39pt;
            left: 0;
            right: 0;

            height: 28pt;

            border-top: 1px solid #DFE9F0;

            padding-top: 9px;
        }

        .footer-table {
            font-size: 7px;
            color: #859CAB;
        }

        .page-number:after {
            content: counter(page);
        }

        /* ======================================
           REPORT TITLE
           ====================================== */

        .report-eyebrow {
            font-size: 8px;
            font-weight: bold;
            letter-spacing: 2px;

            color: #66859C;

            margin-bottom: 8px;
        }

        .report-title {
            font-size: 23px;
            font-weight: bold;
            line-height: 1.35;

            color: #192C43;

            margin-bottom: 12px;
        }

        .report-description {
            font-size: 9px;
            line-height: 1.8;

            color: #7891A3;

            margin-bottom: 20px;
        }

        /* ======================================
           REPORT METADATA
           ====================================== */

        .metadata {
            background: #F2F6F9;
            border: 1px solid #E2EBF1;

            margin-bottom: 20px;
        }

        .metadata td {
            padding: 10px 12px;
            width: 50%;
        }

        .metadata-label {
            color: #7D96A8;

            font-size: 7px;
            font-weight: bold;

            text-transform: uppercase;

            margin-bottom: 4px;
        }

        .metadata-value {
            color: #365B78;
            font-size: 9px;
            font-weight: bold;

            word-wrap: break-word;
        }

        /* ======================================
           KPI CARDS
           ====================================== */

        .kpi-table {
            border-collapse: separate;
            border-spacing: 5px;

            margin-left: -5px;
            margin-bottom: 15px;
        }

        .kpi-card {
            width: 50%;

            background: #F1F5F8;
            border: 1px solid #E0E9F0;
            border-top: 3px solid #527F9E;

            padding: 14px 12px;
        }

        .kpi-positive {
            border-top-color: #38876C;
        }

        .kpi-attention {
            border-top-color: #BF7468;
        }

        .kpi-label {
            color: #6A8699;

            font-size: 8px;
            font-weight: bold;

            margin-bottom: 6px;
        }

        .kpi-value {
            color: #192C43;

            font-size: 25px;
            font-weight: bold;
            line-height: 1.3;
        }

        .kpi-unit {
            font-size: 10px;

            font-weight: normal;
            color: #7891A3;
        }

        .kpi-note {
            font-size: 7px;
            color: #7D96A8;

            margin-top: 7px;
        }

        /* ======================================
           SECTION TITLES
           ====================================== */

        .section {
            margin-top: 22px;
            margin-bottom: 15px;
        }

        .section-heading {
            font-size: 13px;
            font-weight: bold;

            color: #192C43;

            margin-bottom: 4px;
            padding-bottom: 7px;

            border-bottom: 1px solid #DFE9F0;
        }

        .section-number {
            color: #7896AA;
            font-size: 10px;
            margin-right: 5px;
        }

        .section-description {
            font-size: 8px;
            color: #7891A3;

            margin-bottom: 12px;
        }

        /* ======================================
           DATA TABLE
           ====================================== */

        .data-table {
            margin-bottom: 12px;
        }

        .data-table th {
            padding: 8px 7px;

            background: #365B78;
            color: #FFFFFF;

            font-weight: bold;
            font-size: 8px;

            text-align: left;
        }

        .data-table td {
            border-bottom: 1px solid #E2EBF1;

            padding: 8px 7px;

            font-size: 8px;
            word-wrap: break-word;
        }

        .data-table tbody tr:nth-child(even) {
            background: #F5F8FA;
        }

        .data-table .number {
            text-align: right;
            white-space: nowrap;
        }

        .data-table .strong {
            font-weight: bold;
            color: #29465D;
        }

        /* ======================================
           GROUP DISTRIBUTION
           ====================================== */

        .group-table {
            margin-top: 12px;
            margin-bottom: 12px;
        }

        .group-table td {
            padding: 9px 6px;

            border-bottom: 1px solid #E6EDF2;
        }

        .color-square {
            display: inline-block;

            width: 8px;
            height: 8px;

            margin-right: 5px;
        }

        .distribution-bar {
            width: 100%;
            height: 14px;

            border-collapse: collapse;
            table-layout: fixed;

            background: #E8EFF4;
        }

        .distribution-bar td {
            padding: 0;
            height: 14px;
            border: none;
        }

        .group-name {
            font-size: 9px;
            font-weight: bold;
        }

        .group-range {
            font-size: 7px;
            color: #8DA4B4;
        }

        /* ======================================
           RATING CHART
           ====================================== */

        .rating-row {
            margin-bottom: 12px;
        }

        .rating-label {
            width: 115px;

            font-size: 8px;
            color: #476B84;
        }

        .rating-value {
            width: 100px;

            text-align: right;

            font-size: 8px;
            color: #476B84;
            font-weight: bold;
        }

        .chart-track {
            height: 8px;
            width: 100%;

            background: #EAF0F4;
        }

        .chart-fill {
            height: 8px;
        }

        /* ======================================
           SERVICE PRIORITY
           ====================================== */

        .priority-item {
            margin-bottom: 16px;

            page-break-inside: avoid;
        }

        .priority-name {
            font-size: 9px;
            font-weight: bold;

            color: #365B78;
        }

        .priority-value {
            font-size: 9px;
            font-weight: bold;

            color: #B0795E;
        }

        .priority-track {
            width: 100%;
            height: 7px;

            background: #EDF2F6;

            margin-top: 6px;
        }

        .priority-fill {
            height: 7px;
            background: #C49579;
        }

        .priority-note {
            font-size: 7px;
            color: #7C94A6;

            margin-top: 5px;
        }

        .priority-summary {
            padding: 12px;

            border-left: 3px solid #C49579;
            background: #FBF5EF;

            margin-bottom: 17px;
        }

        .priority-summary-value {
            font-size: 20px;
            font-weight: bold;
            color: #B0795E;
        }

        /* ======================================
           MANAGEMENT INSIGHTS
           ====================================== */

        .insight-item {
            margin-bottom: 10px;

            padding: 10px 12px;

            background: #F4F7FA;
            border-left: 3px solid #86ACC1;

            font-size: 9px;
            line-height: 1.9;

            page-break-inside: avoid;
        }

        .insight-positive {
            border-left-color: #38876C;
        }

        .insight-attention {
            border-left-color: #BF7468;
        }

        .insight-warning {
            border-left-color: #D4AF69;
        }

        /* ======================================
           INFORMATION NOTE
           ====================================== */

        .information-note {
            background: #F2F6F9;

            padding: 11px 12px;

            font-size: 8px;
            line-height: 1.8;

            color: #6A8598;

            margin-top: 12px;
        }

        .privacy-note {
            background: #FBF6EB;
            border: 1px solid #EDE2CC;

            padding: 12px;

            color: #8C754D;
            font-size: 8px;
            line-height: 1.8;

            margin-top: 16px;
        }

        /* ======================================
           REVIEW DETAIL
           ====================================== */

        .review {
            margin-bottom: 25px;

            padding-bottom: 15px;

            border-bottom: 2px solid #DFE9F0;
        }

        .review-header {
            width: 100%;

            background: #192C43;

            padding: 10px 12px;

            margin-bottom: 10px;

            page-break-after: avoid;
        }

        .review-header-table td {
            vertical-align: middle;
        }

        .review-number {
            font-size: 7px;
            color: #A8BFCE;

            margin-bottom: 4px;
        }

        .review-name {
            color: #FFFFFF;
            font-size: 13px;
            font-weight: bold;

            word-wrap: break-word;
        }

        .review-date {
            color: #B5C8D5;
            font-size: 8px;

            margin-top: 4px;
        }

        .review-score {
            color: #FFFFFF;
            font-size: 23px;
            font-weight: bold;
        }

        .review-score-unit {
            font-size: 9px;
            color: #B5C8D5;
        }

        .review-meta {
            background: #F2F6F9;

            border: 1px solid #E1EAF0;

            padding: 8px 10px;
            margin-bottom: 12px;

            font-size: 8px;
            line-height: 1.8;

            word-wrap: break-word;
        }

        .review-classification {
            font-size: 8px;
            font-weight: bold;
        }

        .feedback-heading {
            font-weight: bold;
            font-size: 10px;

            color: #365B78;

            margin: 13px 0 9px;

            page-break-after: avoid;
        }

        .feedback-item {
            margin-bottom: 10px;
        }

        .feedback-label {
            font-size: 8px;
            font-weight: bold;

            color: #638299;

            margin-bottom: 4px;

            page-break-after: avoid;
        }

        .feedback-content {
            background: #F5F8FA;

            border-left: 2px solid #A6BDC9;

            padding: 8px 10px;

            font-size: 9px;
            line-height: 1.8;

            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .contact-information {
            padding: 10px 12px;

            margin-top: 12px;

            background: #FBF6EB;
            border: 1px solid #EDE2CC;

            font-size: 8px;
            line-height: 1.9;

            word-wrap: break-word;
        }

        .empty-state {
            text-align: center;

            padding: 30px 15px;

            background: #F2F6F9;

            color: #7891A3;
            font-size: 10px;
        }

        .end-report {
            margin-top: 25px;

            border-top: 1px solid #DFE9F0;

            padding-top: 15px;

            text-align: center;
            font-size: 8px;

            color: #8199AA;
        }
    </style>

</head>

<body>

    {{-- ========================================
         HEADER
         ======================================== --}}

    <header class="document-header">

        <table class="header-table">

            <tr>

                @if ($logoDataUri)
                    <td class="logo-cell">

                        <img src="{{ $logoDataUri }}" class="hotel-logo" alt="Logo Hotel">

                    </td>
                @endif

                <td>

                    <div class="hotel-name">
                        {{ $hotelName }}
                    </div>

                    <div class="hotel-subtitle">
                        GUEST EXPERIENCE MANAGEMENT
                    </div>

                </td>

                <td class="header-right">

                    <div class="header-type">
                        INTERNAL REPORT
                    </div>

                    Evaluasi Kepuasan Tamu

                </td>

            </tr>

        </table>

    </header>

    {{-- ========================================
         FOOTER
         ======================================== --}}

    <footer class="document-footer">

        <table class="footer-table">

            <tr>

                <td>

                    {{ $hotelName }}
                    · Dokumen Internal & Rahasia

                </td>

                <td class="text-right">

                    Halaman
                    <span class="page-number"></span>

                </td>

            </tr>

        </table>

    </footer>

    {{-- ========================================
         REPORT TITLE
         ======================================== --}}

    <div class="report-eyebrow">

        GUEST SATISFACTION REPORT

    </div>

    <h1 class="report-title">

        Laporan Evaluasi<br>
        Kepuasan Tamu

    </h1>

    <p class="report-description">

        Ringkasan hasil penilaian, pengalaman,
        serta masukan tamu sebagai dasar evaluasi
        dan peningkatan kualitas pelayanan hotel.

    </p>

    {{-- ========================================
         REPORT INFORMATION
         ======================================== --}}

    <table class="metadata">

        <tr>

            <td>

                <div class="metadata-label">
                    Periode Laporan
                </div>

                <div class="metadata-value">
                    {{ $periodLabel }}
                </div>

            </td>

            <td>

                <div class="metadata-label">
                    Tanggal Export
                </div>

                <div class="metadata-value">

                    {{ $dateTimeFormat($data['generated_at']) }} WIB

                </div>

            </td>

        </tr>

        <tr>

            <td>

                <div class="metadata-label">
                    Jenis Laporan
                </div>

                <div class="metadata-value">

                    {{ $isDetail ? 'Ringkasan dan Detail Ulasan' : 'Ringkasan Kepuasan' }}

                </div>

            </td>

            <td>

                <div class="metadata-label">
                    Filter Rating
                </div>

                <div class="metadata-value">
                    {{ $starLabel }}
                </div>

            </td>

        </tr>

        <tr>

            <td>

                <div class="metadata-label">
                    Filter Pencarian
                </div>

                <div class="metadata-value">

                    {{ !empty($filters['search']) ? 'Aktif' : 'Tidak aktif' }}

                </div>

            </td>

            <td>

                <div class="metadata-label">
                    Identitas & Kontak
                </div>

                <div class="metadata-value">

                    {{ $isDetail && $includePrivate ? 'Disertakan sesuai ketentuan' : 'Tidak disertakan' }}

                </div>

            </td>

        </tr>

    </table>

    {{-- ========================================
         MAIN KPI
         ======================================== --}}

    <table class="kpi-table">

        <tr>

            <td class="kpi-card">

                <div class="kpi-label">
                    TOTAL ULASAN
                </div>

                <div class="kpi-value">

                    {{ $fmt($summary['total']) }}

                </div>

                <div class="kpi-note">

                    {{ $fmt($summary['scored']) }}
                    ulasan memiliki rating

                </div>

            </td>

            <td class="kpi-card">

                <div class="kpi-label">
                    OVERALL RATING
                </div>

                <div class="kpi-value">

                    {{ $decimal($summary['overall']) }}

                    <span class="kpi-unit">
                        / 5
                    </span>

                </div>

                <div class="kpi-note">

                    Rata-rata rating setiap tamu

                </div>

            </td>

        </tr>

        <tr>

            <td class="kpi-card kpi-positive">

                <div class="kpi-label">
                    ULASAN POSITIF
                </div>

                <div class="kpi-value" style="color: #38876C;">

                    {{ $percent($summary['positive_percentage']) }}

                </div>

                <div class="kpi-note">

                    {{ $fmt($summary['positive_count']) }}

                    dari

                    {{ $fmt($summary['scored']) }}

                    ulasan dengan rating

                </div>

            </td>

            <td class="kpi-card kpi-attention">

                <div class="kpi-label">
                    PERLU PERHATIAN
                </div>

                <div class="kpi-value" style="color: #B6534B;">

                    {{ $fmt($summary['attention']) }}

                </div>

                <div class="kpi-note">

                    {{ $percent($summary['attention_percentage']) }}

                    · Rata-rata di bawah 3,0

                </div>

            </td>

        </tr>

    </table>

    {{-- ========================================
         01 — SATISFACTION GROUPS
         ======================================== --}}

    <section class="section">

        <h2 class="section-heading">

            <span class="section-number">
                01
            </span>

            Distribusi Kepuasan Tamu

        </h2>

        <p class="section-description">

            Pengelompokan berdasarkan rata-rata
            rating asli setiap ulasan.

        </p>

        @if ($summary['scored'] > 0)

            <table class="distribution-bar">

                <tr>

                    @foreach ($groups as $group)
                        @if ($group['count'] > 0)
                            <td
                                style="
                                    width: {{ $ratio($group['count'], $summary['scored']) }}%;
                                    background: {{ $group['color'] }};
                                ">

                            </td>
                        @endif
                    @endforeach

                </tr>

            </table>

        @endif

        <table class="group-table">

            @foreach ($groups as $group)
                <tr>

                    <td>

                        <div class="group-name" style="color: {{ $group['color'] }};">

                            <span class="color-square"
                                style="
                                    background:
                                    {{ $group['color'] }};
                                "></span>

                            {{ $group['name'] }}

                        </div>

                        <div class="group-range">

                            Rating {{ $group['range'] }}

                        </div>

                    </td>

                    <td class="text-right" style="vertical-align: middle;">

                        {{ $fmt($group['count']) }}
                        ulasan

                    </td>

                    <td class="text-right"
                        style="
                            vertical-align: middle;
                            font-weight: bold;
                            color: {{ $group['color'] }};
                        ">

                        {{ $percent($group['percentage']) }}

                    </td>

                </tr>
            @endforeach

        </table>

        <div class="information-note">

            Persentase dihitung dari seluruh ulasan
            yang memiliki rating. Ulasan dengan
            rata-rata tepat 4,0 termasuk ulasan positif.

        </div>

    </section>

    {{-- ========================================
         02 — RATING DISTRIBUTION
         ======================================== --}}

    <section class="section">

        <h2 class="section-heading">

            <span class="section-number">
                02
            </span>

            Distribusi Rating

        </h2>

        <p class="section-description">

            Distribusi per ulasan tamu dan per aspek
            pelayanan disajikan secara terpisah.

        </p>

        <h3 class="feedback-heading">

            A. Distribusi Per Ulasan

        </h3>

        @foreach (range(5, 1) as $score)
            @php
                $count = $data['review_distribution'][$score] ?? 0;

                $width = $ratio($count, $summary['scored']);
            @endphp

            <table class="rating-row">

                <tr>

                    <td class="rating-label">

                        {{ $score }} Bintang

                        <br>

                        <span class="muted">

                            @if ($score === 5)
                                Tepat 5,0
                            @else
                                {{ $score }},0 –
                                &lt;{{ $score + 1 }},0
                            @endif

                        </span>

                    </td>

                    <td>

                        <div class="chart-track">

                            <div class="chart-fill"
                                style="
                                    width: {{ $width }}%;
                                    background: {{ $ratingColors[$score] }};
                                ">
                            </div>

                        </div>

                    </td>

                    <td class="rating-value">

                        {{ $fmt($count) }} ulasan

                        <br>

                        <span class="muted">

                            {{ $summary['scored'] > 0 ? $percent($width) : '—' }}

                        </span>

                    </td>

                </tr>

            </table>
        @endforeach

        <h3 class="feedback-heading">

            B. Distribusi Per Aspek

        </h3>

        @foreach (range(5, 1) as $score)
            @php
                $count = $data['aspect_distribution'][$score] ?? 0;

                $width = $ratio($count, $summary['total_scores']);
            @endphp

            <table class="rating-row">

                <tr>

                    <td class="rating-label">

                        {{ $score }} Bintang

                    </td>

                    <td>

                        <div class="chart-track">

                            <div class="chart-fill"
                                style="
                                    width: {{ $width }}%;
                                    background: {{ $ratingColors[$score] }};
                                ">
                            </div>

                        </div>

                    </td>

                    <td class="rating-value">

                        {{ $fmt($count) }} skor

                        <br>

                        <span class="muted">

                            {{ $summary['total_scores'] > 0 ? $percent($width) : '—' }}

                        </span>

                    </td>

                </tr>

            </table>
        @endforeach

        <div class="information-note">

            Total skor kategori:

            <strong>
                {{ $fmt($summary['total_scores']) }}
            </strong>.

            Tidak menggunakan layanan:

            <strong>
                {{ $fmt($summary['not_used']) }}
            </strong>.

            Penilaian layanan yang tidak digunakan
            tidak dihitung sebagai skor nol.

        </div>

    </section>

    {{-- ========================================
         03 — CATEGORY PERFORMANCE
         ======================================== --}}

    <section class="section">

        <h2 class="section-heading">

            <span class="section-number">
                03
            </span>

            Analisis Kategori Pelayanan

        </h2>

        <p class="section-description">

            Seluruh kategori diurutkan berdasarkan
            rata-rata rating tertinggi.

        </p>

        <table class="data-table">

            <thead>

                <tr>

                    <th>
                        Kategori
                    </th>

                    <th class="number">
                        Rating
                    </th>

                    <th class="number">
                        Dinilai
                    </th>

                    <th class="number">
                        Tidak<br>Digunakan
                    </th>

                    <th class="number">
                        Skor 1–3
                    </th>

                    <th class="number">
                        Persentase
                    </th>

                </tr>

            </thead>

            <tbody>

                @forelse($rankedCategories as $category)
                    <tr>

                        <td class="strong">

                            {{ $category['name'] }}

                            @if (!$category['active'])
                                <br>

                                <span class="muted">
                                    Nonaktif
                                </span>
                            @endif

                        </td>

                        <td class="number">

                            {{ $decimal($category['average']) }}

                        </td>

                        <td class="number">

                            {{ $fmt($category['rated_count']) }}

                        </td>

                        <td class="number">

                            {{ $fmt($category['not_used_count']) }}

                        </td>

                        <td class="number">

                            {{ $fmt($category['low_count']) }}

                        </td>

                        <td class="number"
                            style="
                                color: #B0795E;
                                font-weight: bold;
                            ">

                            {{ $percent($category['low_percentage']) }}

                        </td>

                    </tr>

                @empty

                    <tr>

                        <td colspan="6" class="text-center">

                            Belum ada kategori penilaian.

                        </td>

                    </tr>
                @endforelse

            </tbody>

        </table>

        @if ($topCategory)

            <div class="insight-item insight-positive">

                <strong>Kategori unggulan:</strong>

                {{ $topCategory['name'] }}

                memiliki rata-rata rating

                <strong>

                    {{ $decimal($topCategory['average']) }}/5

                </strong>

                berdasarkan

                {{ $fmt($topCategory['rated_count']) }}

                penilaian.

                @if ($topCategory['rated_count'] < 5)
                    Jumlah penilaian masih terbatas.
                @endif

            </div>

        @endif

    </section>

    {{-- ========================================
         04 — SERVICE PRIORITIES
         ======================================== --}}

    <section class="section">

        <h2 class="section-heading">

            <span class="section-number">
                04
            </span>

            Prioritas Peningkatan Layanan

        </h2>

        <p class="section-description">

            Kategori diurutkan berdasarkan proporsi
            skor 1–3 bintang terbesar.

        </p>

        <div class="priority-summary">

            <div class="priority-summary-value">

                {{ $fmt($summary['low_scores']) }}

                <span class="kpi-unit">
                    skor kategori
                </span>

            </div>

            <div>

                {{ $percent($summary['low_percentage']) }}

                dari

                {{ $fmt($summary['total_scores']) }}

                penilaian kategori

            </div>

        </div>

        @forelse($priorities as $category)
            <div class="priority-item">

                <table>

                    <tr>

                        <td class="priority-name">

                            {{ $category['name'] }}

                            @if (!$category['active'])
                                <span class="muted">
                                    (Nonaktif)
                                </span>
                            @endif

                        </td>

                        <td class="priority-value text-right">

                            {{ $percent($category['low_percentage']) }}

                        </td>

                    </tr>

                </table>

                <div class="priority-track">

                    <div class="priority-fill"
                        style="
                            width: {{ min(100, max(0, $category['low_percentage'] ?? 0)) }}%;
                        ">
                    </div>

                </div>

                <div class="priority-note">

                    @if ($category['rated_count'] > 0)
                        {{ $fmt($category['low_count']) }}

                        dari

                        {{ $fmt($category['rated_count']) }}

                        penilaian mendapatkan
                        skor 1–3 bintang.
                    @else
                        Belum ada penilaian.
                    @endif

                </div>

            </div>

        @empty

            <div class="empty-state">

                Belum ada kategori penilaian.

            </div>
        @endforelse

        <div class="information-note">

            Skor 1–3 digunakan sebagai indikator
            ruang peningkatan pelayanan.

            Persentase dihitung dari jumlah skor 1–3
            dibagi jumlah penilaian valid pada
            masing-masing kategori, bukan dari
            jumlah seluruh tamu.

            Skor 3 tidak selalu menunjukkan
            ketidakpuasan tamu.

        </div>

    </section>

    {{-- ========================================
         05 — MANAGEMENT INSIGHTS
         ======================================== --}}

    <section class="section">

        <h2 class="section-heading">

            <span class="section-number">
                05
            </span>

            Insight Manajemen

        </h2>

        @if ($summary['scored'] === 0)

            <div class="insight-item insight-warning">

                <strong>
                    Belum ada data rating.
                </strong>

                Tidak tersedia cukup informasi
                untuk mengevaluasi kepuasan tamu
                pada periode ini.

            </div>
        @else
            <div class="insight-item insight-positive">

                <strong>
                    Tingkat kepuasan tamu.
                </strong>

                Terdapat

                {{ $fmt($summary['positive_count']) }}

                ulasan positif dari

                {{ $fmt($summary['scored']) }}

                ulasan dengan rating, atau sebesar

                {{ $percent($summary['positive_percentage']) }}.

            </div>

            <div class="insight-item insight-warning">

                <strong>
                    Peluang peningkatan pelayanan.
                </strong>

                Sebanyak

                {{ $fmt($summary['improvement']) }}

                ulasan berada pada rentang
                rata-rata 3,0 sampai kurang dari 4,0.

                Kelompok ini dapat digunakan
                sebagai bahan evaluasi pelayanan.

            </div>

            <div class="insight-item insight-attention">

                <strong>
                    Ulasan yang memerlukan perhatian.
                </strong>

                @if ($summary['attention'] > 0)
                    Sebanyak

                    {{ $fmt($summary['attention']) }}

                    ulasan memiliki rata-rata
                    di bawah 3,0.

                    Manajemen disarankan meninjau
                    keluhan dan pengalaman tamu
                    pada kelompok ini.
                @else
                    Tidak terdapat ulasan dengan
                    rata-rata di bawah 3,0
                    pada periode ini.
                @endif

            </div>

        @endif

        @if ($topPriority)

            <div class="insight-item insight-warning">

                <strong>
                    Prioritas aspek pelayanan.
                </strong>

                {{ $topPriority['name'] }}

                memiliki proporsi skor 1–3 terbesar,
                yaitu

                <strong>

                    {{ $percent($topPriority['low_percentage']) }}

                </strong>,

                berdasarkan

                {{ $fmt($topPriority['low_count']) }}

                dari

                {{ $fmt($topPriority['rated_count']) }}

                penilaian.

                @if ($topPriority['rated_count'] < 5)
                    Jumlah penilaian kategori ini
                    masih terbatas sehingga hasil
                    perlu ditafsirkan dengan hati-hati.
                @endif

            </div>

        @endif

        @if ($summary['scored'] > 0 && $summary['scored'] < 10)
            <div class="insight-item insight-warning">

                <strong>
                    Keterbatasan jumlah ulasan.
                </strong>

                Laporan hanya didasarkan pada

                {{ $fmt($summary['scored']) }}

                ulasan dengan rating.
                Kumpulkan lebih banyak penilaian
                sebelum mengambil kesimpulan umum.

            </div>
        @endif

    </section>

    {{-- ========================================
         06 — CALCULATION METHODOLOGY
         ======================================== --}}

    <section class="section">

        <h2 class="section-heading">

            <span class="section-number">
                06
            </span>

            Metodologi Perhitungan

        </h2>

        <table class="data-table">

            <thead>

                <tr>

                    <th style="width: 32%;">
                        Indikator
                    </th>

                    <th>
                        Metode Perhitungan
                    </th>

                </tr>

            </thead>

            <tbody>

                <tr>

                    <td class="strong">
                        Overall Rating
                    </td>

                    <td>

                        Rata-rata dari rata-rata
                        penilaian setiap ulasan.
                        Setiap tamu memiliki bobot
                        yang sama.

                    </td>

                </tr>

                <tr>

                    <td class="strong">
                        Ulasan Positif
                    </td>

                    <td>

                        Ulasan dengan rata-rata
                        rating minimal 4,0.

                    </td>

                </tr>

                <tr>

                    <td class="strong">
                        Persentase Positif
                    </td>

                    <td>

                        Jumlah ulasan positif dibagi
                        jumlah ulasan yang memiliki
                        rating, dikalikan 100%.

                    </td>

                </tr>

                <tr>

                    <td class="strong">
                        Perlu Peningkatan
                    </td>

                    <td>

                        Ulasan dengan rata-rata
                        mulai 3,0 sampai kurang dari 4,0.

                    </td>

                </tr>

                <tr>

                    <td class="strong">
                        Perlu Perhatian
                    </td>

                    <td>

                        Ulasan dengan rata-rata
                        di bawah 3,0.

                    </td>

                </tr>

                <tr>

                    <td class="strong">
                        Rata-rata Kategori
                    </td>

                    <td>

                        Total skor suatu kategori
                        dibagi jumlah penilaian
                        valid kategori tersebut.

                    </td>

                </tr>

                <tr>

                    <td class="strong">
                        Prioritas Peningkatan
                    </td>

                    <td>

                        Jumlah skor 1–3 dibagi
                        jumlah penilaian valid
                        pada kategori yang sama,
                        dikalikan 100%.

                    </td>

                </tr>

                <tr>

                    <td class="strong">
                        Tidak Menggunakan Layanan
                    </td>

                    <td>

                        Dikecualikan dari perhitungan
                        rata-rata rating dan
                        persentase penilaian kategori.

                    </td>

                </tr>

            </tbody>

        </table>

        <div class="information-note">

            Pengelompokan kepuasan menggunakan
            rating sebelum pembulatan.

            Angka desimal pada laporan dibulatkan
            untuk kebutuhan tampilan. Jumlah
            persentase dapat sedikit berbeda dari
            100% akibat pembulatan.

        </div>

    </section>

    {{-- ========================================
         07 — DETAILED REVIEWS
         ======================================== --}}

    @if ($isDetail)

        <div class="page-break"></div>

        <div class="report-eyebrow">

            GUEST REVIEW DETAILS

        </div>

        <h1 class="report-title">

            Rincian Ulasan Tamu

        </h1>

        <p class="report-description">

            Seluruh rincian penilaian dan masukan
            dari

            {{ $fmt($summary['total']) }}

            ulasan sesuai cakupan laporan.

        </p>

        @forelse($reviews as $review)
            @php
                $classificationColor = match ($review['classification']) {
                    'Positif' => '#38876C',
                    'Perlu Peningkatan' => '#AD8440',
                    'Perlu Perhatian' => '#B6534B',
                    default => '#7891A3',
                };

                $feedbackItems = [
                    'Hal yang paling disukai' => $review['liked'],

                    'Hal yang perlu ditingkatkan' => $review['improvement'],

                    'Pengalaman kurang menyenangkan' => $review['unpleasant'],

                    'Saran atau masukan' => $review['suggestions'],
                ];
            @endphp

            <div class="review">

                {{-- REVIEW HEADER --}}

                <div class="review-header">

                    <table class="review-header-table">

                        <tr>

                            <td style="width: 76%;">

                                <div class="review-number">

                                    ULASAN

                                    #{{ str_pad((string) $review['number'], 4, '0', STR_PAD_LEFT) }}

                                </div>

                                <div class="review-name">

                                    {{ $review['guest_name'] }}

                                </div>

                                <div class="review-date">

                                    {{ $dateTimeFormat($review['date_wib']) }}

                                    WIB

                                </div>

                            </td>

                            <td class="text-right">

                                <div class="review-score">

                                    {{ $decimal($review['average']) }}

                                </div>

                                <div class="review-score-unit">

                                    dari 5,00

                                </div>

                            </td>

                        </tr>

                    </table>

                </div>

                {{-- REVIEW INFORMATION --}}

                <div class="review-meta">

                    <strong>
                        Klasifikasi:
                    </strong>

                    <span class="review-classification" style="color: {{ $classificationColor }};">

                        {{ $review['classification'] }}

                    </span>

                    &nbsp; | &nbsp;

                    <strong>
                        Aspek dinilai:
                    </strong>

                    {{ $fmt($review['rated_count']) }}

                    @if ($includePrivate)
                        <br>

                        <strong>
                            Nomor kamar:
                        </strong>

                        {{ $review['room_number'] ?? '—' }}
                    @endif

                </div>

                {{-- CATEGORY RATINGS --}}

                <table class="data-table">

                    <thead>

                        <tr>

                            <th>
                                Aspek Pelayanan
                            </th>

                            <th class="number">
                                Rating
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        @foreach ($categories as $category)
                            @php
                                $rating = $review['ratings'][$category['id']] ?? null;
                            @endphp

                            <tr>

                                <td>

                                    {{ $category['name'] }}

                                </td>

                                <td class="number">

                                    @if ($rating === null)
                                        <span class="muted">
                                            Tidak tersedia
                                        </span>
                                    @elseif($rating['status'] === 'not_used')
                                        <span class="muted">
                                            Tidak menggunakan
                                        </span>
                                    @else
                                        <strong>

                                            {{ $rating['score'] }}

                                            / 5

                                        </strong>
                                    @endif

                                </td>

                            </tr>
                        @endforeach

                    </tbody>

                </table>

                {{-- GUEST FEEDBACK --}}

                <h3 class="feedback-heading">

                    Masukan dan Pengalaman Tamu

                </h3>

                @foreach ($feedbackItems as $label => $value)
                    <div class="feedback-item">

                        <div class="feedback-label">

                            {{ $label }}

                        </div>

                        <div class="feedback-content">
                            {{ trim((string) $value) !== '' ? $value : 'Tidak ada jawaban.' }}</div>

                    </div>
                @endforeach

                {{-- PRIVATE CONTACT INFORMATION --}}

                @if ($includePrivate)
                    <div class="contact-information">

                        <strong>
                            Informasi Tindak Lanjut
                        </strong>

                        <br>

                        Bersedia dihubungi:

                        {{ $review['contact_consent'] ? 'Ya' : 'Tidak' }}

                        @if ($review['contact_consent'])
                            <br>

                            Metode:

                            {{ match ($review['contact_method']) {
                                'whatsapp' => 'WhatsApp',
                                'email' => 'Email',
                                default => '—',
                            } }}

                            <br>

                            Kontak:

                            {{ $review['contact_value'] ?? '—' }}
                        @endif

                    </div>
                @endif

            </div>

        @empty

            <div class="empty-state">

                Tidak terdapat ulasan yang sesuai
                dengan cakupan laporan.

            </div>
        @endforelse

    @endif

    {{-- ========================================
         PRIVACY AND CLOSING
         ======================================== --}}

    <div class="privacy-note">

        <strong>
            Kerahasiaan Dokumen
        </strong>

        <br>

        Laporan ini diperuntukkan bagi kebutuhan
        evaluasi internal manajemen hotel.

        Informasi tamu dan jawaban yang diberikan
        harus dijaga kerahasiaannya serta tidak
        disebarluaskan kepada pihak yang tidak
        berkepentingan.

    </div>

    <div class="end-report">

        <strong>
            {{ $hotelName }}
        </strong>

        <br>

        Guest Experience Management System

        <br>

        Laporan dihasilkan secara otomatis pada

        {{ $dateTimeFormat($data['generated_at']) }}

        WIB.

        <br><br>

        — Akhir Laporan —

    </div>

</body>

</html>
