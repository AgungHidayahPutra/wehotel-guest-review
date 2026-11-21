
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    CalendarDays,
    ClipboardList,
    Minus,
    ShieldCheck,
    Star,
    TrendingDown,
    TrendingUp,
    UsersRound,
    type LucideIcon,
} from 'lucide-react';

import AdminShell, {
    type AdminHotel,
} from '../../components/admin-shell';

import '../../../css/wehotel-overview.css';

/* ==========================================
   TYPES
   ========================================== */

type Summary = {
    total: number;
    scored_reviews: number;
    overall: number | null;
    positive_count: number;
    positive_percentage: number | null;
    improvement: number;
    attention: number;
};

type Comparison = {
    recent_reviews: number;
    previous_reviews: number;
    review_growth: number | null;

    recent_rating: number | null;
    previous_rating: number | null;
    rating_change: number | null;

    recent_satisfaction: number | null;
    previous_satisfaction: number | null;
    satisfaction_change: number | null;

    recent_attention: number;
    previous_attention: number;
    attention_change: number | null;
};

type Trend = {
    key: string;
    label: string;
    average: number | null;
    count: number;
};

type Category = {
    id: number;
    name: string;
    average: number | null;
    count: number;
};

type Recent = {
    id: number;
    name: string;
    room_number: string;
    date: string | null;
    suggestions: string | null;
    average: number | null;
};

type Props = {
    hotel: AdminHotel;
    summary: Summary;
    comparison: Comparison;
    trend: Trend[];
    trend_mode?: 'daily' | 'monthly';
    categories: Category[];
    recent: Recent[];
};

type StatCard = {
    title: string;
    value: string;
    suffix: string;
    icon: LucideIcon;
    delta: number | null;
    deltaDigits: number;
    deltaUnit: string;
    goodWhen: 'up' | 'down';
    caption: string;
    detail: string;
};

type DeltaTone = 'good' | 'bad' | 'neutral';

/* ==========================================
   NUMBER FORMATTERS
   ========================================== */

function formatNumber(value: number): string {
    return value.toLocaleString('id-ID');
}

function formatDecimal(
    value: number | null,
    digits: number
): string {
    if (value === null || !Number.isFinite(value)) {
        return '—';
    }

    return value.toLocaleString('id-ID', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

function formatRating(value: number | null): string {
    return formatDecimal(value, 1);
}

function formatPercentage(value: number | null): string {
    if (value === null) return '—';

    // Nilai utama ditampilkan tanpa desimal.
    return `${formatDecimal(Math.round(value), 0)}%`;
}

function formatDelta(
    value: number | null,
    digits: number,
    unit: string
): string {
    if (value === null || !Number.isFinite(value)) {
        return 'Belum ada pembanding';
    }

    const rounded = Number(value.toFixed(digits));

    if (rounded === 0) {
        return 'Relatif stabil';
    }

    const prefix = rounded > 0 ? '+' : '';

    return `${prefix}${formatDecimal(rounded, digits)} ${unit}`;
}

/* ==========================================
   KPI DELTA HELPERS
   ========================================== */

function getDeltaTone(
    value: number | null,
    goodWhen: 'up' | 'down',
    digits: number
): DeltaTone {
    if (
        value === null ||
        !Number.isFinite(value) ||
        Number(value.toFixed(digits)) === 0
    ) {
        return 'neutral';
    }

    const isGood =
        goodWhen === 'up'
            ? value > 0
            : value < 0;

    return isGood ? 'good' : 'bad';
}

function getDeltaIcon(
    value: number | null,
    digits: number
): LucideIcon {
    if (
        value === null ||
        !Number.isFinite(value) ||
        Number(value.toFixed(digits)) === 0
    ) {
        return Minus;
    }

    return value > 0 ? TrendingUp : TrendingDown;
}

function DeltaBadge({
    value,
    digits,
    unit,
    goodWhen,
}: {
    value: number | null;
    digits: number;
    unit: string;
    goodWhen: 'up' | 'down';
}) {
    const tone = getDeltaTone(value, goodWhen, digits);
    const Icon = getDeltaIcon(value, digits);

    const palette = {
        good: {
            color: '#267B5C',
            background: '#E9F5EF',
        },
        bad: {
            color: '#B6534B',
            background: '#FBEDEB',
        },
        neutral: {
            color: '#58768D',
            background: '#EDF3F7',
        },
    }[tone];

    return (
        <span
            className={`wov-delta wov-delta--${tone}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 6,
                flexShrink: 0,
                width: 'fit-content',
                maxWidth: '100%',
                padding: '6px 9px',
                borderRadius: 6,
                backgroundColor: palette.background,
                color: palette.color,
                fontSize: 10,
                fontWeight: 800,
                lineHeight: 1.5,
                whiteSpace: 'normal',
            }}
            title="Perubahan dibandingkan 30 hari sebelumnya"
        >
            <Icon
                size={14}
                strokeWidth={2.4}
                aria-hidden="true"
                style={{
                    display: 'inline-block',
                    flexShrink: 0,
                }}
            />

            <span>
                {formatDelta(value, digits, unit)}
            </span>
        </span>
    );
}

/* ==========================================
   GREETING AND DATE
   ========================================== */

function greeting(): string {
    const hour = Number(
        new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            hourCycle: 'h23',
        }).format(new Date())
    );

    if (hour >= 5 && hour < 11) {
        return 'Good Morning';
    }

    if (hour >= 11 && hour < 18) {
        return 'Good Afternoon';
    }

    return 'Good Evening';
}

function localDate(value: string | null): string {
    if (!value) return '—';

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(parsed);
}

/* ==========================================
   SATISFACTION LINE CHART
   PRESERVE SMOOTH BEZIER DESIGN
   ========================================== */

function SatisfactionChart({
    data,
    mode,
}: {
    data: Trend[];
    mode: 'daily' | 'monthly';
}) {
    const x = (index: number): number =>
        55 +
        (index * 670) /
        Math.max(1, data.length - 1);

    const y = (value: number): number =>
        226 - (value - 1) * 49;

    /*
     * Rating null berarti periode tersebut
     * tidak memiliki penilaian.
     */
    const rated = data.flatMap((point, index) => {
        if (
            point.average === null ||
            !Number.isFinite(point.average)
        ) {
            return [];
        }

        return [
            {
                ...point,
                x: x(index),
                y: y(point.average),
            },
        ];
    });

    /*
     * Garis Bezier halus.
     * Mempertahankan bentuk grafik prototype.
     */
    const linePath = rated
        .map((current, index) => {
            if (index === 0) {
                return `M ${current.x} ${current.y}`;
            }

            const previous = rated[index - 1];

            const middleX =
                (previous.x + current.x) / 2;

            return [
                `C ${middleX} ${previous.y}`,
                `${middleX} ${current.y}`,
                `${current.x} ${current.y}`,
            ].join(' ');
        })
        .join(' ');

    /*
     * Area transparan di bawah garis.
     */
    const areaPath =
        rated.length > 1
            ? [
                linePath,
                `L ${rated[rated.length - 1].x} ${y(1)}`,
                `L ${rated[0].x} ${y(1)}`,
                'Z',
            ].join(' ')
            : '';

    const labelEvery =
        mode === 'daily'
            ? Math.max(
                1,
                Math.ceil(data.length / 6)
            )
            : 1;

    const chartDescription =
        mode === 'daily'
            ? 'Tren rating harian selama 30 hari terakhir'
            : 'Tren rating bulanan selama 7 bulan terakhir';

    return (
        <div className="wov-chart-wrap">
            <svg
                className="wov-chart"
                viewBox="0 0 760 275"
                role="img"
                aria-label={chartDescription}
            >
                <defs>
                    <linearGradient
                        id="wov-satisfaction-gradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="#527F9E"
                            stopOpacity="0.25"
                        />

                        <stop
                            offset="100%"
                            stopColor="#527F9E"
                            stopOpacity="0.02"
                        />
                    </linearGradient>
                </defs>

                {/* HORIZONTAL GRID */}
                {[1, 2, 3, 4, 5].map((value) => (
                    <g key={value}>
                        <line
                            x1="55"
                            y1={y(value)}
                            x2="725"
                            y2={y(value)}
                            stroke="#DFEAF1"
                            strokeDasharray="5 6"
                        />

                        <text
                            x="33"
                            y={y(value) + 4}
                            textAnchor="end"
                            fontSize="11"
                            fill="#91A8BA"
                        >
                            {value.toFixed(1)}
                        </text>
                    </g>
                ))}

                {/* GRADIENT AREA */}
                {rated.length > 1 && (
                    <path
                        d={areaPath}
                        fill="url(#wov-satisfaction-gradient)"
                    />
                )}

                {/* SMOOTH LINE */}
                {rated.length > 1 && (
                    <path
                        d={linePath}
                        fill="none"
                        stroke="#527F9E"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {/* DATA POINTS AND LABELS */}
                {data.map((point, index) => (
                    <g key={point.key}>
                        {point.average !== null &&
                            Number.isFinite(point.average) && (
                                <circle
                                    cx={x(index)}
                                    cy={y(point.average)}
                                    r="5.5"
                                    fill="#527F9E"
                                    stroke="#FFFFFF"
                                    strokeWidth="2.2"
                                >
                                    <title>
                                        {`${point.label}: ${formatRating(
                                            point.average
                                        )}/5 dari ${point.count} ulasan`}
                                    </title>
                                </circle>
                            )}

                        {(index % labelEvery === 0 ||
                            index === data.length - 1) && (
                                <text
                                    x={x(index)}
                                    y="258"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="#91A8BA"
                                >
                                    {point.label}
                                </text>
                            )}
                    </g>
                ))}
            </svg>

            <div className="wov-chart-legend">
                <i />
                Rata-rata rating per ulasan · skala 1–5
            </div>

            {rated.length >= 2 ? (
                <p className="wov-chart-hint">
                    Garis menunjukkan perkembangan rating
                    pada periode yang memiliki penilaian.
                    Periode tanpa data tidak diberi skor buatan.
                </p>
            ) : (
                <p className="wov-chart-hint">
                    {rated.length === 0
                        ? 'Belum ada rating pada periode ini.'
                        : `Baru satu ${mode === 'daily'
                            ? 'hari'
                            : 'bulan'
                        } memiliki rating. Diperlukan minimal dua periode untuk membentuk garis.`}
                </p>
            )}
        </div>
    );
}

/* ==========================================
   SCORE DISTRIBUTION
   ========================================== */

function ScoreGroups({
    summary,
}: {
    summary: Summary;
}) {
    const groups = [
        {
            title: 'Positif',
            count: summary.positive_count,
            range: '4,0–5,0',
            background: '#EDF7F2',
            color: '#287B5F',
        },
        {
            title: 'Perlu Peningkatan',
            count: summary.improvement,
            range: '3,0–<4,0',
            background: '#FBF6EB',
            color: '#AD8440',
        },
        {
            title: 'Perlu Perhatian',
            count: summary.attention,
            range: 'Di bawah 3,0',
            background: '#FCF0ED',
            color: '#B6534B',
        },
    ];

    return (
        <section
            className="wov-score-groups"
            aria-label="Distribusi tingkat kepuasan tamu"
            style={{
                display: 'grid',
                gridTemplateColumns:
                    'repeat(auto-fit, minmax(175px, 1fr))',
                gap: 12,
                marginBottom: 21,
                padding: 14,
                border: '1px solid #DFE9F0',
                borderRadius: 14,
                background: '#FFFFFF',
            }}
        >
            <div
                className="wov-score-groups-heading"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 10px',
                }}
            >
                <strong
                    style={{
                        color: '#29465D',
                        fontSize: 12,
                    }}
                >
                    Distribusi Penilaian Tamu
                </strong>

                <small
                    style={{
                        color: '#8FA4B4',
                        fontSize: 10,
                        lineHeight: 1.6,
                    }}
                >
                    Berdasarkan rata-rata per ulasan
                    sepanjang waktu
                </small>
            </div>

            {groups.map((group, index) => (
                <div
                    className={
                        'wov-score-group ' +
                        [
                            'wov-score-group--good',
                            'wov-score-group--medium',
                            'wov-score-group--bad',
                        ][index]
                    }
                    key={group.title}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        minWidth: 0,
                        padding: 13,
                        borderRadius: 10,
                        background: group.background,
                    }}
                >
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#657E91',
                        }}
                    >
                        {group.title}
                    </span>

                    <strong
                        style={{
                            fontSize: 23,
                            lineHeight: 1.1,
                            fontWeight: 750,
                            color: group.color,
                        }}
                    >
                        {formatNumber(group.count)}
                    </strong>

                    <small
                        style={{
                            color: '#8399A8',
                            fontSize: 10,
                        }}
                    >
                        Rating {group.range}
                    </small>
                </div>
            ))}
        </section>
    );
}

/* ==========================================
   DASHBOARD PAGE
   ========================================== */

export default function Dashboard({
    hotel,
    summary,
    comparison,
    trend,
    trend_mode = 'monthly',
    categories,
    recent,
}: Props) {
    /*
     * Semua angka utama menggunakan seluruh
     * data yang memiliki rating.
     *
     * Delta menggunakan perbandingan:
     * 30 hari terakhir vs 30 hari sebelumnya.
     */
    const cards: StatCard[] = [
        {
            title: 'Total Ulasan',
            value: formatNumber(summary.total),
            suffix: '',
            icon: ClipboardList,

            delta: comparison.review_growth,
            deltaDigits: 1,
            deltaUnit: '%',
            goodWhen: 'up',

            caption: 'Seluruh ulasan yang diterima',

            detail:
                `${formatNumber(
                    comparison.recent_reviews
                )} dalam 30 hari terakhir · ` +
                `${formatNumber(
                    comparison.previous_reviews
                )} pada 30 hari sebelumnya`,
        },
        {
            title: 'Overall Rating',
            value: formatRating(summary.overall),
            suffix: '/ 5,0',
            icon: Star,

            delta: comparison.rating_change,
            deltaDigits: 2,
            deltaUnit: 'poin',
            goodWhen: 'up',

            caption:
                `Rata-rata dari ${formatNumber(
                    summary.scored_reviews
                )} ulasan dengan rating`,

            detail:
                `30 hari terakhir: ` +
                `${formatDecimal(
                    comparison.recent_rating,
                    2
                )} · sebelumnya: ` +
                `${formatDecimal(
                    comparison.previous_rating,
                    2
                )}`,
        },
        {
            title: 'Ulasan Positif',
            value: formatPercentage(
                summary.positive_percentage
            ),
            suffix: '',
            icon: UsersRound,

            delta: comparison.satisfaction_change,
            deltaDigits: 1,
            deltaUnit: 'poin persentase',
            goodWhen: 'up',

            caption:
                `${formatNumber(
                    summary.positive_count
                )} dari ${formatNumber(
                    summary.scored_reviews
                )} ulasan memiliki rating ≥4,0`,

            detail:
                `30 hari terakhir: ` +
                `${formatDecimal(
                    comparison.recent_satisfaction,
                    1
                )}% · sebelumnya: ` +
                `${formatDecimal(
                    comparison.previous_satisfaction,
                    1
                )}%`,
        },
        {
            title: 'Perlu Perhatian',
            value: formatNumber(summary.attention),
            suffix: '',
            icon: Activity,

            delta: comparison.attention_change,
            deltaDigits: 0,
            deltaUnit: 'ulasan',
            goodWhen: 'down',

            caption:
                'Seluruh ulasan dengan rating di bawah 3,0',

            detail:
                `${formatNumber(
                    comparison.recent_attention
                )} dalam 30 hari terakhir · ` +
                `${formatNumber(
                    comparison.previous_attention
                )} pada 30 hari sebelumnya`,
        },
    ];

    return (
        <AdminShell
            hotel={hotel}
            section="dashboard"
            count={summary.total}
        >
            <Head
                title={`Dashboard — ${hotel.hotel_name}`}
            />

            <div className="wov-page">
                {/* ===================================
                    HEADER
                   =================================== */}

                <div className="wov-heading">
                    <div>
                        <div className="wov-eyebrow">
                            OVERVIEW · DATA ULASAN
                        </div>

                        <h1>
                            {greeting()}, Team WE HOTEL
                            <span> ✳</span>
                        </h1>

                        <p>
                            Berikut gambaran pengalaman tamu
                            dan performa pelayanan hotel.
                        </p>
                    </div>

                    <span className="wov-date-pill">
                        <CalendarDays size={15} />
                        Ringkasan Kinerja
                    </span>
                </div>

                {/* ===================================
                    INFORMATION
                   =================================== */}

                <div className="wov-info">
                    <ShieldCheck size={17} />

                    <span>
                        Angka utama menunjukkan statistik
                        sepanjang waktu. Indikator naik
                        atau turun membandingkan 30 hari
                        terakhir dengan 30 hari sebelumnya.
                        Rating dihitung dari rata-rata
                        kategori yang dinilai setiap tamu.
                        Layanan yang tidak digunakan tidak
                        ikut dihitung.
                    </span>
                </div>

                {/* ===================================
                    FOUR KPI CARDS
                   =================================== */}

                <section
                    className="wov-stats"
                    aria-label="Statistik utama ulasan"
                >
                    {cards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <article
                                className="wov-stat"
                                key={card.title}
                            >
                                <div className="wov-stat-head">
                                    <span>
                                        {card.title}
                                    </span>

                                    <i>
                                        <Icon size={19} />
                                    </i>
                                </div>

                                <div
                                    className="wov-value"
                                    style={{
                                        whiteSpace: 'nowrap',
                                        fontVariantNumeric:
                                            'tabular-nums',
                                        fontSize:
                                            'clamp(29px, 2.5vw, 39px)',
                                    }}
                                >
                                    {card.value}

                                    {card.suffix && (
                                        <small>
                                            {card.suffix}
                                        </small>
                                    )}
                                </div>

                                <div
                                    className="wov-stat-bottom"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: 8,
                                    }}
                                >
                                    <DeltaBadge
                                        value={card.delta}
                                        digits={card.deltaDigits}
                                        unit={card.deltaUnit}
                                        goodWhen={card.goodWhen}
                                    />

                                    <small
                                        style={{
                                            display: 'block',
                                            fontSize: 10,
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {card.caption}
                                    </small>
                                </div>

                                <p
                                    className="wov-stat-context"
                                    style={{
                                        margin: '10px 0 0',
                                        color: '#859BAB',
                                        fontSize: 10,
                                        lineHeight: 1.7,
                                        overflowWrap: 'anywhere',
                                    }}
                                >
                                    {card.detail}
                                </p>
                            </article>
                        );
                    })}
                </section>

                {/* ===================================
                    THREE RATING GROUPS
                   =================================== */}

                <ScoreGroups summary={summary} />

                {/* ===================================
                    ANALYTICS GRID
                   =================================== */}

                <div className="wov-main-grid">
                    {/* SATISFACTION TREND */}
                    <section className="wov-panel">
                        <div className="wov-panel-head">
                            <div>
                                <h2>
                                    Tren Kepuasan Tamu
                                </h2>

                                <p>
                                    {trend_mode === 'daily'
                                        ? 'Perkembangan rata-rata rating dalam 30 hari terakhir'
                                        : 'Perkembangan rata-rata rating dalam 7 bulan terakhir'}
                                </p>
                            </div>

                            <span className="wov-panel-pill">
                                <TrendingUp size={14} />

                                {trend_mode === 'daily'
                                    ? '30 hari'
                                    : '7 bulan'}
                            </span>
                        </div>

                        <SatisfactionChart
                            data={trend}
                            mode={trend_mode}
                        />
                    </section>

                    {/* CATEGORY PERFORMANCE */}
                    <section className="wov-panel">
                        <div className="wov-panel-head">
                            <div>
                                <h2>
                                    Kategori Penilaian
                                </h2>

                                <p>
                                    Rata-rata rating
                                    per aspek layanan
                                </p>
                            </div>
                        </div>

                        <div className="wov-categories">
                            {categories.length === 0 && (
                                <p className="wov-empty">
                                    Belum ada kategori aktif.
                                </p>
                            )}

                            {categories.map((category) => {
                                const width = Math.max(
                                    0,
                                    Math.min(
                                        100,
                                        (category.average ?? 0) /
                                        5 *
                                        100
                                    )
                                );

                                return (
                                    <div
                                        className="wov-category"
                                        key={category.id}
                                    >
                                        <div className="wov-category-title">
                                            <span>
                                                {category.name}{' '}
                                                <small>
                                                    ({formatNumber(
                                                        category.count
                                                    )})
                                                </small>
                                            </span>

                                            <strong>
                                                {formatRating(
                                                    category.average
                                                )}{' '}
                                                <small>
                                                    / 5
                                                </small>
                                            </strong>
                                        </div>

                                        <div className="wov-track">
                                            <div
                                                style={{
                                                    width: `${width}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* ===================================
                    RECENT REVIEWS
                   =================================== */}

                <section className="wov-panel wov-recent-panel">
                    <div className="wov-panel-head">
                        <div>
                            <h2>
                                Review Terbaru
                            </h2>

                            <p>
                                Masukan tamu yang
                                baru-baru ini diterima
                            </p>
                        </div>

                        <Link
                            href="/admin/reviews"
                            className="wov-more"
                        >
                            Lihat semua
                            <ArrowRight size={17} />
                        </Link>
                    </div>

                    {recent.length === 0 ? (
                        <p className="wov-empty">
                            Belum ada ulasan yang diterima.
                        </p>
                    ) : (
                        <div className="wov-review-grid">
                            {recent.map((item) => (
                                <article
                                    className="wov-review"
                                    key={item.id}
                                >
                                    <div className="wov-review-top">
                                        {/* AVATAR */}
                                        <div className="wov-review-avatar">
                                            {item.name
                                                .slice(0, 1)
                                                .toUpperCase() || 'T'}
                                        </div>

                                        {/* GUEST INFO */}
                                        <div className="wov-review-meta">
                                            <strong>
                                                {item.name}
                                            </strong>

                                            <small>
                                                {localDate(item.date)}
                                                {' · '}
                                                Kamar{' '}
                                                {item.room_number}
                                            </small>
                                        </div>

                                        {/* RATING */}
                                        <div
                                            className="wov-review-score"
                                            aria-label={
                                                item.average === null
                                                    ? 'Belum dinilai'
                                                    : `Rating ${item.average} dari 5`
                                            }
                                        >
                                            <Star
                                                size={13}
                                                fill="currentColor"
                                            />

                                            {formatRating(
                                                item.average
                                            )}
                                        </div>
                                    </div>

                                    <p>
                                        {item.suggestions ||
                                            'Tidak ada saran.'}
                                    </p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                {/* ===================================
                    FOOTER
                   =================================== */}

                <div className="wov-footer">
                    <ShieldCheck size={15} />
                    WE HOTEL · Guest Experience Management
                </div>
            </div>
        </AdminShell>
    );
}
