@php
    $code = (int) ($code ?? 500);

    $errorPages = [
        401 => [
            'eyebrow' => 'AUTHENTICATION REQUIRED',
            'title' => 'Autentikasi diperlukan.',
            'description' => 'Anda perlu memiliki akses yang sah untuk membuka halaman ini.',
        ],

        402 => [
            'eyebrow' => 'ACCESS UNAVAILABLE',
            'title' => 'Halaman tidak tersedia.',
            'description' => 'Mohon maaf, layanan ini belum dapat diakses saat ini.',
        ],

        403 => [
            'eyebrow' => 'ACCESS DENIED',
            'title' => 'Akses tidak diizinkan.',
            'description' => 'Mohon maaf, Anda tidak memiliki izin untuk mengakses halaman ini.',
        ],

        404 => [
            'eyebrow' => 'PAGE NOT FOUND',
            'title' => 'Halaman tidak ditemukan.',
            'description' =>
                'Mohon maaf, halaman yang Anda cari tidak tersedia atau alamat yang Anda masukkan tidak tepat.',
        ],

        405 => [
            'eyebrow' => 'METHOD NOT ALLOWED',
            'title' => 'Permintaan tidak diizinkan.',
            'description' => 'Permintaan yang Anda lakukan tidak dapat diproses melalui halaman ini.',
        ],

        419 => [
            'eyebrow' => 'SESSION EXPIRED',
            'title' => 'Sesi telah berakhir.',
            'description' => 'Sesi Anda telah kedaluwarsa. Silakan kembali ke halaman utama dan coba kembali.',
        ],

        429 => [
            'eyebrow' => 'TOO MANY REQUESTS',
            'title' => 'Terlalu banyak permintaan.',
            'description' =>
                'Untuk menjaga keamanan dan kenyamanan layanan, silakan tunggu beberapa saat sebelum mencoba kembali.',
        ],

        500 => [
            'eyebrow' => 'INTERNAL SERVER ERROR',
            'title' => 'Terjadi kesalahan sistem.',
            'description' => 'Mohon maaf atas ketidaknyamanan ini. Silakan coba kembali beberapa saat lagi.',
        ],

        503 => [
            'eyebrow' => 'SERVICE UNAVAILABLE',
            'title' => 'Kami sedang melakukan pemeliharaan.',
            'description' => 'Layanan untuk sementara tidak tersedia. Terima kasih atas kesabaran dan pengertian Anda.',
        ],
    ];

    $page = $errorPages[$code] ?? [
        'eyebrow' => 'SERVICE NOTICE',
        'title' => 'Permintaan tidak dapat diproses.',
        'description' =>
            'Mohon maaf atas ketidaknyamanan ini. Silakan kembali ke halaman utama atau coba kembali nanti.',
    ];

    $year = date('Y');
@endphp

<!DOCTYPE html>

<html lang="id">

<head>
    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <meta name="robots" content="noindex, nofollow">

    <meta name="theme-color" content="#192c43">

    <title>{{ $code }} — WE HOTEL</title>

    <link rel="icon" type="image/png" href="/images/wehotel/favicon.png">

    <link rel="apple-touch-icon" href="/images/wehotel/favicon.png">

    <style>
        /* ======================================
           GLOBAL DESIGN
           ====================================== */

        :root {
            --primary: #192c43;
            --secondary: #8bafc3;
            --accent: #d4af69;
            --text: #29465d;
            --muted: #6e879b;
            --background: #edf2f5;
            --border: #dce6ee;
        }

        * {
            box-sizing: border-box;
        }

        html {
            min-height: 100%;
            color-scheme: light;
        }

        body {
            margin: 0;

            min-height: 100vh;
            min-height: 100dvh;

            font-family: "DM Sans", system-ui,
                -apple-system, BlinkMacSystemFont,
                "Segoe UI", sans-serif;

            color: var(--text);

            background:
                radial-gradient(ellipse at top right,
                    #dce8f0,
                    transparent 55%),
                linear-gradient(135deg,
                    #f8fafb,
                    #edf2f5);

            -webkit-font-smoothing: antialiased;
        }

        .error-page {
            display: flex;
            flex-direction: column;

            min-height: 100vh;
            min-height: 100dvh;

            width: 100%;
        }

        /* ======================================
           HEADER
           ====================================== */

        .error-header {
            display: flex;
            align-items: center;
            justify-content: space-between;

            gap: 20px;

            padding: 26px clamp(24px, 5vw, 85px);

            border-bottom: 1px solid #e0e8ee;

            background: rgba(255, 255, 255, 0.75);
        }

        .error-brand {
            display: flex;
            align-items: center;

            gap: 18px;
        }

        .error-logo {
            display: block;

            width: 138px;
            height: 52px;

            object-fit: contain;
        }

        .error-brand-copy {
            display: flex;
            flex-direction: column;

            gap: 5px;
        }

        .error-brand-copy strong {
            color: #365b78;

            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.2px;
        }

        .error-brand-copy span {
            color: #7891a3;

            font-size: 9px;
            font-weight: 600;
            letter-spacing: 1.4px;
        }

        .error-location {
            color: #7891a3;

            font-size: 10px;
            font-weight: 700;

            letter-spacing: 1.5px;
        }

        /* ======================================
           MAIN CONTENT
           ====================================== */

        .error-main {
            display: flex;
            align-items: center;
            justify-content: center;

            flex: 1;

            padding: 45px 24px;
        }

        .error-card {
            position: relative;

            width: 100%;
            max-width: 650px;

            padding: 45px 48px;

            border: 1px solid var(--border);
            border-radius: 24px;

            background: #ffffff;

            text-align: center;

            overflow: hidden;

            box-shadow:
                0 20px 65px rgba(25, 44, 67, 0.06);

            animation: error-enter 0.65s ease both;
        }

        .error-card::before {
            content: "";

            position: absolute;

            top: 0;
            left: 0;
            right: 0;

            height: 4px;

            background: linear-gradient(90deg,
                    #192c43,
                    #8bafc3,
                    #d4af69);
        }

        @keyframes error-enter {
            from {
                opacity: 0;
                transform: translateY(14px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* ======================================
           ERROR ICON
           ====================================== */

        .error-icon {
            display: grid;
            place-items: center;

            width: 62px;
            height: 62px;

            margin: 0 auto 22px;

            border: 1px solid #dce7ef;
            border-radius: 18px;

            color: #527f9e;
            background: #eff5f9;
        }

        .error-icon svg {
            width: 30px;
            height: 30px;
        }

        /* ======================================
           ERROR CODE
           ====================================== */

        .error-eyebrow {
            display: block;

            color: #7193a8;

            font-size: 10px;
            font-weight: 800;
            letter-spacing: 2.4px;

            margin-bottom: 8px;
        }

        .error-code {
            margin: 0;

            color: var(--primary);

            font-family: "Outfit", system-ui,
                sans-serif;

            font-size: clamp(76px, 10vw, 115px);
            font-weight: 750;

            letter-spacing: -5px;
            line-height: 1.05;
        }

        .error-accent {
            width: 40px;
            height: 3px;

            margin: 20px auto 25px;

            border-radius: 10px;

            background: var(--accent);
        }

        /* ======================================
           ERROR MESSAGE
           ====================================== */

        .error-title {
            margin: 0 0 14px;

            color: var(--primary);

            font-family: "Outfit", system-ui,
                sans-serif;

            font-size: clamp(23px, 3vw, 32px);
            font-weight: 700;

            letter-spacing: -0.7px;
            line-height: 1.35;
        }

        .error-description {
            max-width: 440px;

            margin: 0 auto;

            color: var(--muted);

            font-size: 13px;
            line-height: 1.9;
        }

        /* ======================================
           RETURN BUTTON
           ====================================== */

        .error-action {
            margin-top: 30px;
        }

        .error-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;

            gap: 10px;

            min-height: 48px;

            padding: 14px 23px;

            border: 1px solid var(--primary);
            border-radius: 11px;

            color: #ffffff;
            background: var(--primary);

            font-size: 12px;
            font-weight: 700;

            text-decoration: none;

            transition:
                background 0.2s ease,
                box-shadow 0.2s ease,
                transform 0.2s ease;
        }

        .error-button:hover {
            background: #365b78;

            box-shadow:
                0 8px 20px rgba(25, 44, 67, 0.13);

            transform: translateY(-2px);
        }

        .error-button:active {
            transform: translateY(0);
        }

        .error-button:focus-visible {
            outline: 2px solid #527f9e;
            outline-offset: 5px;
        }

        .error-button svg {
            width: 17px;
            height: 17px;
        }

        /* ======================================
           FOOTER
           ====================================== */

        .error-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;

            flex-wrap: wrap;

            gap: 15px;

            margin: 0 clamp(24px, 5vw, 85px);

            padding: 22px 0;

            border-top: 1px solid #dce6ee;

            color: #7891a3;

            font-size: 10px;
            line-height: 1.7;
        }

        /* ======================================
           MOBILE RESPONSIVE
           ====================================== */

        @media (max-width: 600px) {
            .error-header {
                padding: 18px 22px;
            }

            .error-logo {
                width: 115px;
                height: 43px;
            }

            .error-brand {
                gap: 10px;
            }

            .error-brand-copy strong {
                font-size: 9px;
            }

            .error-brand-copy span {
                font-size: 8px;
            }

            .error-location {
                display: none;
            }

            .error-main {
                padding: 30px 18px;
            }

            .error-card {
                padding: 34px 22px;

                border-radius: 19px;
            }

            .error-icon {
                width: 54px;
                height: 54px;
            }

            .error-code {
                font-size: 82px;
            }

            .error-description {
                font-size: 12px;
            }

            .error-button {
                width: 100%;
            }

            .error-footer {
                justify-content: center;

                gap: 5px;

                margin: 0 22px;

                text-align: center;
                flex-direction: column;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .error-card {
                animation: none;
            }

            .error-button {
                transition: none;
            }
        }
    </style>
</head>

<body>
    <div class="error-page">

        {{-- HEADER --}}

        <header class="error-header">

            <div class="error-brand">

                <img class="error-logo" src="/images/wehotel/hotel-logo.png" alt="WE HOTEL">

                <div class="error-brand-copy">

                    <strong>
                        GUEST EXPERIENCE
                    </strong>

                    <span>
                        WE HOTEL
                    </span>

                </div>

            </div>

            <span class="error-location">
                LUBUKLINGGAU · INDONESIA
            </span>

        </header>

        {{-- MAIN ERROR CONTENT --}}

        <main class="error-main">

            <section class="error-card" aria-labelledby="error-title">

                <div class="error-icon">

                    @if (in_array($code, [401, 403]))
                        {{-- SHIELD ICON --}}

                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10Z" />
                            <path d="M12 8v4" />
                            <path d="M12 16h.01" />
                        </svg>
                    @elseif(in_array($code, [419, 429]))
                        {{-- CLOCK ICON --}}

                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                        </svg>
                    @elseif($code >= 500)
                        {{-- SYSTEM ICON --}}

                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="3" y="3" width="18" height="8" rx="2" />
                            <rect x="3" y="13" width="18" height="8" rx="2" />
                            <path d="M7 7h.01M7 17h.01" />
                        </svg>
                    @else
                        {{-- COMPASS ICON --}}

                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" />
                        </svg>
                    @endif

                </div>

                <span class="error-eyebrow">
                    {{ $page['eyebrow'] }}
                </span>

                <div class="error-code">
                    {{ $code }}
                </div>

                <div class="error-accent"></div>

                <h1 class="error-title" id="error-title">
                    {{ $page['title'] }}
                </h1>

                <p class="error-description">
                    {{ $page['description'] }}
                </p>

                <div class="error-action">

                    <a href="/" class="error-button">

                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="m12 19-7-7 7-7" />
                            <path d="M5 12h14" />
                        </svg>

                        Kembali ke halaman utama

                    </a>

                </div>

            </section>

        </main>

        {{-- FOOTER --}}

        <footer class="error-footer">

            <span>
                &copy; {{ $year }} WE HOTEL
            </span>

            <span>
                Guest Experience Management
            </span>

        </footer>

    </div>
</body>

</html>
