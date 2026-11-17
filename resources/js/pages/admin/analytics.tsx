
import { Head, Link, router } from '@inertiajs/react';

import {
    ArrowRight,
    CalendarDays,
    ChartNoAxesCombined,
    ClipboardList,
    Minus,
    ShieldCheck,
    Star,
    TrendingDown,
    TrendingUp,
    TriangleAlert,
} from 'lucide-react';

import {
    useEffect,
    useState,
    type FormEvent,
} from 'react';

import AdminShell, {
    type AdminHotel,
} from '../../components/admin-shell';

import '../../../css/wehotel-analytics.css';

/* ==========================================
   TYPES
   ========================================== */

type Period = '7d' | '30d' | '90d' | 'all' | 'custom';

type DistributionMode = 'review' | 'aspect';

type DistributionItem = {
    score: number;
    count: number;
};

type Stats = {
    total: number;
    scored: number;
    overall: number | null;
    satisfied: number | null;

    positive_count: number;
    positive_percentage: number | null;

    improvement: number;
    improvement_percentage: number | null;

    attention: number;
    attention_percentage: number | null;
};

type Comparison = {
    is_default: boolean;
    days: number;

    current_from: string;
    current_to: string;

    previous_from: string;
    previous_to: string;

    current: Stats;
    previous: Stats;

    review_change: number;
    rating_change: number | null;
    satisfaction_change: number | null;
    attention_change: number | null;
};

type Category = {
    id: number;
    name: string;
    active: boolean;

    average: number | null;

    rated_count: number;
    low_count: number;
    low_percentage: number | null;
    not_used_count: number;

    change: number | null;
};

type Point = {
    key: string;
    label: string;
    count: number;
    average: number | null;
};

type Props = {
    hotel: AdminHotel;

    period: Period;

    filters: {
        from: string;
        to: string;
    };

    summary: Stats;
    previous: Stats | null;

    comparison: Comparison;

    review_distribution: DistributionItem[];

    review_groups: {
        positive: number;
        improvement: number;
        attention: number;
    };

    distribution: DistributionItem[];

    not_used: number;
    low_scores: number;
    total_scores: number;
    low_percentage: number | null;

    categories: Category[];
    service_priorities: Category[];

    trend: Point[];
    trend_bucket: 'day' | 'week' | 'month';
    trend_note: string;
};

/* ==========================================
   COLOR PALETTE
   ========================================== */

const palette: Record<number, string> = {
    5: '#284C69',
    4: '#86ACC1',
    3: '#D8AF61',
    2: '#E7A07E',
    1: '#CC7B79',
};

/* ==========================================
   NUMBER FORMATTERS
   ========================================== */

function fmt(value: number): string {
    return value.toLocaleString('id-ID');
}

function decimal(
    value: number | null,
    digits = 1
): string {
    if (
        value === null ||
        !Number.isFinite(value)
    ) {
        return '—';
    }

    return value.toLocaleString('id-ID', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

function percentage(
    value: number | null,
    digits = 2
): string {
    if (
        value === null ||
        !Number.isFinite(value)
    ) {
        return '—';
    }

    return `${decimal(value, digits)}%`;
}

/* ==========================================
   DATE FORMATTERS
   ========================================== */

function formatDate(
    value: string
): string {
    if (!value) return '—';

    const date = new Date(
        `${value}T00:00:00Z`
    );

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        }
    ).format(date);
}

function formatRange(
    from: string,
    to: string
): string {
    if (from === to) {
        return formatDate(from);
    }

    return `${formatDate(from)} – ${formatDate(to)}`;
}

/* ==========================================
   AUTOMATIC CHANGE INDICATOR
   ========================================== */

function ChangeIndicator({
    value,
    digits = 2,
    unit,
    goodWhen = 'up',
}: {
    value: number | null;
    digits?: number;
    unit: string;
    goodWhen?: 'up' | 'down';
}) {
    const rounded =
        value === null ||
            !Number.isFinite(value)
            ? null
            : Number(value.toFixed(digits));

    const isNeutral =
        rounded === null ||
        rounded === 0;

    const isUp =
        rounded !== null &&
        rounded > 0;

    const isDown =
        rounded !== null &&
        rounded < 0;

    const favorable =
        goodWhen === 'up'
            ? isUp
            : isDown;

    const color = isNeutral
        ? '#718A9C'
        : favorable
            ? '#2A8163'
            : '#B6534B';

    const Icon = isUp
        ? TrendingUp
        : isDown
            ? TrendingDown
            : Minus;

    const label =
        rounded === null
            ? 'Belum ada pembanding'
            : rounded === 0
                ? 'Relatif stabil'
                : `${rounded > 0 ? '+' : ''}${decimal(
                    rounded,
                    digits
                )} ${unit}`;

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color,
                fontWeight: 750,
                fontSize: 11,
                lineHeight: 1.6,
            }}
        >
            {rounded !== null && (
                <Icon
                    size={14}
                    strokeWidth={2.3}
                    aria-hidden="true"
                    style={{
                        flexShrink: 0,
                    }}
                />
            )}

            {label}
        </span>
    );
}

/* ==========================================
   DONUT DISTRIBUTION
   ========================================== */

function Donut({
    distribution,
    middleValue,
    middleLabel,
    mode,
}: {
    distribution: DistributionItem[];
    middleValue: string;
    middleLabel: string;
    mode: DistributionMode;
}) {
    const total = distribution.reduce(
        (sum, item) => sum + item.count,
        0
    );

    let consumed = 0;

    const slices = distribution
        .filter((item) => item.count > 0)
        .map((item) => {
            const start = consumed;

            consumed += total > 0
                ? item.count / total * 100
                : 0;

            return `${palette[item.score] ?? '#91A6B5'
                } ${start}% ${consumed}%`;
        });

    const background =
        total === 0
            ? '#E8EFF4'
            : `conic-gradient(${slices.join(',')})`;

    return (
        <div className="wvi-donut-layout">
            <div
                className="wvi-donut"
                style={{ background }}
                role="img"
                aria-label={
                    mode === 'review'
                        ? `Distribusi ${total} ulasan berdasarkan rata-rata per tamu`
                        : `Distribusi ${total} skor kategori pelayanan`
                }
            >
                <div className="wvi-donut-hole">
                    <strong>
                        {middleValue}
                    </strong>

                    <small>
                        {middleLabel}
                    </small>
                </div>
            </div>

            <div className="wvi-legend">
                {distribution.map((item) => {
                    const label =
                        mode === 'review'
                            ? item.score === 5
                                ? '5 Bintang (5,0)'
                                : `${item.score} Bintang (${item.score},0–<${item.score + 1},0)`
                            : `${item.score} Bintang`;

                    const percent = total > 0
                        ? item.count / total * 100
                        : null;

                    return (
                        <div
                            className="wvi-legend-row"
                            key={item.score}
                        >
                            <span>
                                <i
                                    style={{
                                        backgroundColor:
                                            palette[item.score],
                                        flexShrink: 0,
                                    }}
                                />

                                {label}
                            </span>

                            <strong>
                                {percentage(percent, 1)}
                            </strong>

                            <small>
                                {fmt(item.count)}{' '}

                                {mode === 'review'
                                    ? 'ulasan'
                                    : 'skor kategori'}
                            </small>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ==========================================
   SMOOTH SATISFACTION CHART
   ========================================== */

function RatingLine({
    points,
}: {
    points: Point[];
}) {
    const x = (index: number) =>
        50 +
        index * 685 /
        Math.max(1, points.length - 1);

    const y = (value: number) =>
        220 - (value - 1) * 48;

    const labelEvery = Math.max(
        1,
        Math.ceil(points.length / 7)
    );

    type Dot = {
        x: number;
        y: number;
        point: Point;
    };

    const runs: Dot[][] = [];

    let current: Dot[] = [];

    /*
     * Periode kosong tidak dijadikan
     * skor nol atau skor buatan.
     */
    points.forEach((point, index) => {
        if (
            point.average === null ||
            !Number.isFinite(point.average)
        ) {
            if (current.length) {
                runs.push(current);
            }

            current = [];

            return;
        }

        current.push({
            x: x(index),
            y: y(point.average),
            point,
        });
    });

    if (current.length) {
        runs.push(current);
    }

    /*
     * Kurva Bezier halus.
     */
    const pathFor = (
        dots: Dot[]
    ): string => dots
        .map((dot, index) => {
            if (index === 0) {
                return `M ${dot.x} ${dot.y}`;
            }

            const previous =
                dots[index - 1];

            const middleX =
                (previous.x + dot.x) / 2;

            return [
                `C ${middleX} ${previous.y}`,
                `${middleX} ${dot.y}`,
                `${dot.x} ${dot.y}`,
            ].join(' ');
        })
        .join(' ');

    const validCount = runs.reduce(
        (sum, run) => sum + run.length,
        0
    );

    return (
        <>
            <div className="wvi-chart-scroll">
                <svg
                    className="wvi-line-chart"
                    viewBox="0 0 770 270"
                    role="img"
                    aria-label="Perkembangan rata-rata rating setiap tamu berdasarkan periode"
                >
                    <defs>
                        <linearGradient
                            id="wvi-rating-area"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor="#527F9E"
                                stopOpacity="0.24"
                            />

                            <stop
                                offset="100%"
                                stopColor="#527F9E"
                                stopOpacity="0.02"
                            />
                        </linearGradient>
                    </defs>

                    {/* GRID HORIZONTAL */}

                    {[1, 2, 3, 4, 5].map((value) => (
                        <g key={value}>
                            <line
                                x1="50"
                                y1={y(value)}
                                x2="735"
                                y2={y(value)}
                                stroke="#DFEAF0"
                                strokeDasharray="5 7"
                            />

                            <text
                                x="34"
                                y={y(value) + 4}
                                textAnchor="end"
                                fontSize="11"
                                fill="#93A9BA"
                            >
                                {value}
                            </text>
                        </g>
                    ))}

                    {/* GARIS DAN AREA GRADIENT */}

                    {runs
                        .filter((run) => run.length > 1)
                        .map((run, index) => {
                            const line = pathFor(run);

                            const area = [
                                line,
                                `L ${run[run.length - 1].x} ${y(1)}`,
                                `L ${run[0].x} ${y(1)}`,
                                'Z',
                            ].join(' ');

                            return (
                                <g key={index}>
                                    <path
                                        d={area}
                                        fill="url(#wvi-rating-area)"
                                    />

                                    <path
                                        d={line}
                                        fill="none"
                                        stroke="#527F9E"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </g>
                            );
                        })}

                    {/* DATA POINTS */}

                    {points.map((point, index) => {
                        const lastIndex =
                            points.length - 1;

                        const showLabel =
                            index === lastIndex ||
                            (
                                index % labelEvery === 0 &&
                                lastIndex - index >=
                                Math.max(
                                    1,
                                    labelEvery / 2
                                )
                            );

                        return (
                            <g key={point.key}>
                                {point.average !== null &&
                                    Number.isFinite(
                                        point.average
                                    ) && (
                                        <circle
                                            cx={x(index)}
                                            cy={y(point.average)}
                                            r="5.5"
                                            fill="#527F9E"
                                            stroke="#FFFFFF"
                                            strokeWidth="2.2"
                                        >
                                            <title>
                                                {`${point.label}: ${decimal(
                                                    point.average,
                                                    2
                                                )}/5 dari ${point.count} ulasan`}
                                            </title>
                                        </circle>
                                    )}

                                {showLabel && (
                                    <text
                                        x={x(index)}
                                        y="253"
                                        textAnchor="middle"
                                        fontSize="10"
                                        fill="#92A8BA"
                                    >
                                        {point.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>

            <p className="wvi-muted">
                {validCount === 0
                    ? 'Belum ada rating pada periode ini.'
                    : !runs.some((run) => run.length > 1)
                        ? 'Belum ada dua periode berurutan yang memiliki rating untuk membentuk garis tren.'
                        : 'Garis menghubungkan periode berurutan yang memiliki rating. Periode kosong tidak diberi skor buatan.'}
            </p>
        </>
    );
}

/* ==========================================
   DISTRIBUSI KEPUASAN TAMU
   ========================================== */

function ReviewGroups({
    groups,
    scored,
}: {
    groups: Props['review_groups'];
    scored: number;
}) {
    const items = [
        {
            title: 'Positif',
            count: groups.positive,
            range: '4,0–5,0',
            background: '#EDF7F2',
            color: '#287B5F',
        },
        {
            title: 'Perlu Peningkatan',
            count: groups.improvement,
            range: '3,0–<4,0',
            background: '#FBF6EB',
            color: '#AD8440',
        },
        {
            title: 'Perlu Perhatian',
            count: groups.attention,
            range: '< 3,0',
            background: '#FCF0ED',
            color: '#B6534B',
        },
    ];

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns:
                    'repeat(auto-fit, minmax(115px, 1fr))',
                gap: 9,
                marginTop: 16,
            }}
        >
            {items.map((item) => {
                const percent =
                    scored > 0
                        ? item.count / scored * 100
                        : null;

                return (
                    <div
                        key={item.title}
                        style={{
                            background: item.background,
                            borderRadius: 10,
                            padding: 12,
                            minWidth: 0,
                        }}
                    >
                        <span
                            style={{
                                display: 'block',
                                fontSize: 10,
                                color: '#68869A',
                                fontWeight: 700,
                            }}
                        >
                            {item.title}
                        </span>

                        <strong
                            style={{
                                display: 'block',
                                fontSize: 23,
                                color: item.color,
                                margin: '7px 0 3px',
                            }}
                        >
                            {fmt(item.count)}
                        </strong>

                        <small
                            style={{
                                display: 'block',
                                fontSize: 10,
                                color: item.color,
                                fontWeight: 700,
                            }}
                        >
                            {percentage(percent, 1)}
                            {' '}dari ulasan
                        </small>

                        <small
                            style={{
                                display: 'block',
                                fontSize: 10,
                                color: '#8199A8',
                                marginTop: 8,
                            }}
                        >
                            Rating {item.range}
                        </small>
                    </div>
                );
            })}
        </div>
    );
}

/* ==========================================
   PERIOD COMPARISON PANEL
   ========================================== */

function PeriodComparison({
    comparison,
}: {
    comparison: Comparison;
}) {
    const {
        current,
        previous,
    } = comparison;

    return (
        <section className="wvi-panel">
            <div className="wvi-panel-head">
                <div>
                    <h2>Perbandingan Periode</h2>

                    <p>
                        Perbandingan dua periode
                        dengan durasi yang sama
                    </p>
                </div>

                <CalendarDays
                    size={18}
                    style={{
                        color: '#6D95AE',
                        flexShrink: 0,
                    }}
                />
            </div>

            {/* INFORMASI TANGGAL PEMBANDING */}

            <div
                style={{
                    padding: 13,
                    borderRadius: 10,
                    background: '#F2F7FA',
                    border: '1px solid #E3EDF3',
                    marginBottom: 20,
                    display: 'grid',
                    gap: 10,
                }}
            >
                <div>
                    <span
                        style={{
                            display: 'block',
                            color: '#7D97AA',
                            fontSize: 10,
                            fontWeight: 700,
                            marginBottom: 4,
                        }}
                    >
                        PERIODE UTAMA · {comparison.days} HARI
                    </span>

                    <strong
                        style={{
                            fontSize: 12,
                            color: '#365B78',
                            lineHeight: 1.7,
                        }}
                    >
                        {formatRange(
                            comparison.current_from,
                            comparison.current_to
                        )}
                    </strong>
                </div>

                <div
                    style={{
                        borderTop: '1px solid #DFEAF1',
                        paddingTop: 9,
                    }}
                >
                    <span
                        style={{
                            display: 'block',
                            color: '#7D97AA',
                            fontSize: 10,
                            fontWeight: 700,
                            marginBottom: 4,
                        }}
                    >
                        PERIODE PEMBANDING
                    </span>

                    <strong
                        style={{
                            fontSize: 12,
                            color: '#365B78',
                            lineHeight: 1.7,
                        }}
                    >
                        {formatRange(
                            comparison.previous_from,
                            comparison.previous_to
                        )}
                    </strong>
                </div>

                {comparison.is_default && (
                    <small
                        style={{
                            fontSize: 10,
                            color: '#8199A8',
                            lineHeight: 1.7,
                        }}
                    >
                        Pada filter Seluruh Data,
                        perbandingan menggunakan 30 hari
                        terakhir dan 30 hari sebelumnya.
                    </small>
                )}
            </div>

            {/* STATISTIK PERBANDINGAN */}

            <div className="wvi-comparisons">
                {/* JUMLAH ULASAN */}

                <div>
                    <span>
                        Jumlah ulasan
                    </span>

                    <strong>
                        {fmt(current.total)}

                        {' '}

                        <small>
                            vs {fmt(previous.total)}
                        </small>
                    </strong>

                    <em>
                        <ChangeIndicator
                            value={comparison.review_change}
                            digits={0}
                            unit="ulasan"
                        />
                    </em>
                </div>

                {/* OVERALL RATING */}

                <div>
                    <span>
                        Rata-rata rating
                    </span>

                    <strong>
                        {decimal(current.overall, 2)}

                        {' '}

                        <small>
                            vs {decimal(
                                previous.overall,
                                2
                            )}
                        </small>
                    </strong>

                    <em>
                        <ChangeIndicator
                            value={comparison.rating_change}
                            digits={2}
                            unit="poin"
                        />
                    </em>

                    <small
                        style={{
                            display: 'block',
                            fontSize: 10,
                            lineHeight: 1.7,
                            color: '#8DA4B4',
                        }}
                    >
                        Berdasarkan rata-rata
                        setiap ulasan yang memiliki rating.
                    </small>
                </div>

                {/* ULASAN POSITIF */}

                <div>
                    <span>
                        Ulasan positif (rating ≥ 4,0)
                    </span>

                    <strong>
                        {percentage(
                            current.positive_percentage,
                            2
                        )}

                        {' '}

                        <small>
                            vs {percentage(
                                previous.positive_percentage,
                                2
                            )}
                        </small>
                    </strong>

                    <em>
                        <ChangeIndicator
                            value={
                                comparison.satisfaction_change
                            }
                            digits={2}
                            unit="poin persentase"
                        />
                    </em>

                    <small
                        style={{
                            display: 'block',
                            color: '#8DA4B4',
                            fontSize: 10,
                            lineHeight: 1.7,
                        }}
                    >
                        {fmt(current.positive_count)}
                        {' '}dari{' '}
                        {fmt(current.scored)}
                        {' '}ulasan positif, dibandingkan
                        {' '}{fmt(previous.positive_count)}
                        {' '}dari{' '}
                        {fmt(previous.scored)}
                        {' '}ulasan sebelumnya.
                    </small>
                </div>

                {/* PERLU PERHATIAN */}

                <div>
                    <span>
                        Perlu perhatian (rating di bawah 3,0)
                    </span>

                    <strong>
                        {fmt(current.attention)}

                        {' '}

                        <small>
                            vs {fmt(previous.attention)}
                        </small>
                    </strong>

                    <em>
                        <ChangeIndicator
                            value={
                                comparison.attention_change
                            }
                            digits={0}
                            unit="ulasan"
                            goodWhen="down"
                        />
                    </em>

                    <small
                        style={{
                            display: 'block',
                            fontSize: 10,
                            lineHeight: 1.7,
                            color: '#8DA4B4',
                        }}
                    >
                        Perbandingan jumlah ulasan
                        dengan rata-rata di bawah 3,0.
                    </small>
                </div>
            </div>

            <p className="wvi-muted">
                Angka utama pada kartu ini berasal dari
                periode perbandingan di atas, bukan
                keseluruhan riwayat ulasan.
                Hari ini dapat masih berlangsung.
            </p>
        </section>
    );
}

/* ==========================================
   SERVICE IMPROVEMENT PRIORITIES
   ========================================== */

function ServicePriorities({
    categories,
    lowScores,
    totalScores,
    lowPercentage,
    reviewsHref,
}: {
    categories: Category[];
    lowScores: number;
    totalScores: number;
    lowPercentage: number | null;
    reviewsHref: string;
}) {
    return (
        <section className="wvi-panel">
            <div className="wvi-panel-head">
                <div>
                    <h2>
                        Prioritas Peningkatan Layanan
                    </h2>

                    <p>
                        Berdasarkan proporsi penilaian
                        1–3 bintang pada setiap aspek
                    </p>
                </div>

                <TriangleAlert
                    size={18}
                    className="wvi-warning-icon"
                    style={{
                        flexShrink: 0,
                    }}
                />
            </div>

            {/* TOTAL SKOR 1–3 */}

            <div className="wvi-low-value">
                {fmt(lowScores)}

                {' '}

                <small>
                    skor kategori
                </small>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 9,
                    marginBottom: 23,
                }}
            >
                <strong
                    style={{
                        background: '#FBF2E9',
                        color: '#B0795E',
                        fontSize: 11,
                        padding: '5px 8px',
                        borderRadius: 6,
                    }}
                >
                    {percentage(lowPercentage, 2)}
                </strong>

                <span
                    style={{
                        color: '#8DA4B4',
                        fontSize: 10,
                        lineHeight: 1.7,
                    }}
                >
                    dari {fmt(totalScores)}
                    {' '}penilaian kategori
                </span>
            </div>

            {/* SEMUA KATEGORI */}

            <div
                className="wvi-service-priorities"
                style={{
                    display: 'grid',
                    gap: 20,
                }}
            >
                {categories.length === 0 && (
                    <p className="wvi-muted">
                        Belum ada kategori penilaian.
                    </p>
                )}

                {categories.map((category) => {
                    const width = Math.min(
                        100,
                        Math.max(
                            0,
                            category.low_percentage ?? 0
                        )
                    );

                    return (
                        <div
                            key={category.id}
                            style={{
                                minWidth: 0,
                            }}
                        >
                            {/* NAMA DAN PERSENTASE */}

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent:
                                        'space-between',
                                    alignItems: 'center',
                                    gap: 10,
                                    marginBottom: 8,
                                }}
                            >
                                <span
                                    style={{
                                        color: '#62839B',
                                        fontSize: 11,
                                        fontWeight: 700,
                                    }}
                                >
                                    {category.name}

                                    {!category.active && (
                                        <small
                                            style={{
                                                display: 'block',
                                                fontSize: 9,
                                                color: '#9BAEBC',
                                                fontWeight: 400,
                                            }}
                                        >
                                            Nonaktif
                                        </small>
                                    )}
                                </span>

                                <strong
                                    style={{
                                        color: '#B0795E',
                                        fontSize: 12,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {percentage(
                                        category.low_percentage,
                                        2
                                    )}
                                </strong>
                            </div>

                            {/* PROGRESS BAR */}

                            <div
                                className="wvi-track"
                                role="img"
                                aria-label={
                                    category.rated_count > 0
                                        ? `${category.name}: ${percentage(
                                            category.low_percentage,
                                            2
                                        )} penilaian 1 sampai 3 bintang`
                                        : `${category.name}: belum ada penilaian`
                                }
                            >
                                <div
                                    style={{
                                        width: `${width}%`,
                                        background:
                                            'linear-gradient(90deg, #BC8B6C, #DFB397)',
                                        borderRadius: 'inherit',
                                    }}
                                />
                            </div>

                            {/* DASAR PERHITUNGAN */}

                            <div
                                style={{
                                    color: '#92A7B8',
                                    fontSize: 10,
                                    lineHeight: 1.7,
                                    marginTop: 7,
                                }}
                            >
                                {category.rated_count > 0
                                    ? `${fmt(category.low_count)} dari ${fmt(category.rated_count)} penilaian mendapat 1–3 bintang`
                                    : 'Belum ada penilaian pada periode ini.'}
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="wvi-muted">
                Kategori diurutkan berdasarkan
                persentase skor 1–3 terbesar,
                bukan hanya jumlah skornya.
                Bintang 3 menunjukkan masih ada
                ruang untuk peningkatan.
            </p>

            <Link
                href={reviewsHref}
                className="wvi-link"
            >
                Periksa ulasan pada periode ini

                <ArrowRight size={15} />
            </Link>
        </section>
    );
}

/* ==========================================
   ANALYTICS PAGE
   ========================================== */

export default function Analytics({
    hotel,
    period,
    filters,
    summary,
    comparison,
    review_distribution,
    review_groups,
    distribution,
    not_used,
    low_scores,
    total_scores,
    low_percentage,
    categories,
    service_priorities,
    trend,
    trend_bucket,
    trend_note,
}: Props) {
    const [from, setFrom] = useState(
        filters.from || ''
    );

    const [to, setTo] = useState(
        filters.to || ''
    );

    const [rangeError, setRangeError] =
        useState('');

    const [
        distributionMode,
        setDistributionMode,
    ] = useState<DistributionMode>(
        'review'
    );

    /* ======================================
       SYNCHRONIZE DATE FILTER
       ====================================== */

    useEffect(() => {
        setFrom(filters.from || '');
        setTo(filters.to || '');
        setRangeError('');
    }, [
        period,
        filters.from,
        filters.to,
    ]);

    /* ======================================
       DISTRIBUTION STATISTICS
       ====================================== */

    const totalAspectScores =
        distribution.reduce(
            (sum, item) => sum + item.count,
            0
        );

    const aspectAverage =
        totalAspectScores > 0
            ? distribution.reduce(
                (sum, item) =>
                    sum + item.score * item.count,
                0
            ) / totalAspectScores
            : null;

    const isReviewMode =
        distributionMode === 'review';

    const selectedDistribution =
        isReviewMode
            ? review_distribution
            : distribution;

    /* ======================================
       MANAGEMENT INSIGHT
       ====================================== */

    const topCategory = categories.find(
        (item) => item.average !== null
    );

    const topPriority = service_priorities.find(
        (item) =>
            item.low_percentage !== null &&
            item.low_count > 0
    );

    const ratedCategoryCount =
        categories.filter(
            (item) => item.rated_count > 0
        ).length;

    const reviewsHref =
        period === 'all'
            ? '/admin/reviews'
            : `/admin/reviews?${new URLSearchParams({
                from: comparison.current_from,
                to: comparison.current_to,
            }).toString()}`;

    /* ======================================
       CUSTOM DATE FILTER
       ====================================== */

    function submitRange(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !from ||
            !to ||
            from > to
        ) {
            setRangeError(
                'Isi tanggal awal dan akhir dengan urutan yang benar.'
            );

            return;
        }

        const start = Date.parse(
            `${from}T00:00:00Z`
        );

        const end = Date.parse(
            `${to}T00:00:00Z`
        );

        if (
            !Number.isFinite(start) ||
            !Number.isFinite(end)
        ) {
            setRangeError(
                'Tanggal tidak valid.'
            );

            return;
        }

        // Termasuk tanggal awal dan akhir.
        const days =
            Math.round(
                (end - start) / 86400000
            ) + 1;

        if (days > 1096) {
            setRangeError(
                'Rentang tanggal maksimal 1096 hari atau sekitar tiga tahun.'
            );

            return;
        }

        setRangeError('');

        router.get(
            '/admin/analytics',
            {
                period: 'custom',
                from,
                to,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,

                onError: (errors) => {
                    setRangeError(
                        errors.from ||
                        errors.to ||
                        errors.period ||
                        'Filter tanggal tidak dapat diterapkan.'
                    );
                },
            }
        );
    }

    return (
        <AdminShell
            hotel={hotel}
            section="analytics"
        >
            <Head
                title={`Analitik — ${hotel.hotel_name}`}
            />

            <div className="wvi-page">

                {/* ==============================
                    HEADER
                   ============================== */}

                <div className="wvi-header">
                    <div>
                        <div className="wvi-eyebrow">
                            GUEST INSIGHTS · DATA ULASAN
                        </div>

                        <h1>
                            Analitik Kepuasan
                            {' '}
                            <span>✳</span>
                        </h1>

                        <p>
                            Pelajari pola penilaian
                            dan prioritas peningkatan
                            pelayanan hotel.
                        </p>
                    </div>

                    <span className="wvi-data-tag">
                        <ChartNoAxesCombined
                            size={15}
                        />

                        Insight Layanan
                    </span>
                </div>

                {/* ==============================
                    PERIOD FILTER
                   ============================== */}

                <div className="wvi-toolbar">
                    <div className="wvi-periods">
                        {(
                            [
                                '7d',
                                '30d',
                                '90d',
                                'all',
                            ] as const
                        ).map((key) => (
                            <Link
                                key={key}
                                href={`/admin/analytics?period=${key}`}
                                className={
                                    period === key
                                        ? 'active'
                                        : ''
                                }
                                preserveScroll
                                preserveState
                            >
                                {{
                                    '7d': '7 Hari',
                                    '30d': '30 Hari',
                                    '90d': '90 Hari',
                                    all: 'Seluruh Data',
                                }[key]}
                            </Link>
                        ))}
                    </div>

                    <form
                        className="wvi-custom"
                        onSubmit={submitRange}
                    >
                        <label>
                            Dari

                            <input
                                type="date"
                                value={from}
                                onChange={(event) =>
                                    setFrom(
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Sampai

                            <input
                                type="date"
                                value={to}
                                min={from || undefined}
                                onChange={(event) =>
                                    setTo(
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <button type="submit">
                            Terapkan
                        </button>
                    </form>
                </div>

                {rangeError && (
                    <p
                        className="wvi-form-error"
                        role="alert"
                    >
                        {rangeError}
                    </p>
                )}

                {/* ==============================
                    INFORMATION
                   ============================== */}

                <div className="wvi-information">
                    <ShieldCheck size={17} />

                    <span>
                        Statistik mengikuti periode
                        yang dipilih. Kepuasan tamu
                        dihitung berdasarkan rata-rata
                        setiap ulasan, sedangkan
                        penilaian aspek dihitung
                        per kategori layanan.
                        Pilihan “Tidak Menggunakan
                        Layanan” tidak dihitung
                        sebagai skor nol.

                        {summary.scored < 10 && (
                            <>
                                {' '}
                                Jumlah ulasan dengan
                                rating masih terbatas,
                                sehingga hasil perlu
                                ditafsirkan dengan hati-hati.
                            </>
                        )}
                    </span>
                </div>

                {/* ==============================
                    MAIN ANALYTICS GRID
                   ============================== */}

                <div className="wvi-main-grid">

                    {/* DISTRIBUSI RATING */}

                    <section className="wvi-panel">
                        <div
                            className="wvi-panel-head"
                            style={{
                                flexWrap: 'wrap',
                                alignItems: 'center',
                            }}
                        >
                            <div>
                                <h2>
                                    Distribusi Rating
                                </h2>

                                <p>
                                    {isReviewMode
                                        ? `${fmt(summary.scored)} ulasan dengan rating`
                                        : `${fmt(totalAspectScores)} skor penilaian kategori`}
                                </p>
                            </div>

                            {/* SWITCH DISTRIBUSI */}

                            <div
                                role="group"
                                aria-label="Metode penghitungan distribusi rating"
                                style={{
                                    display: 'inline-flex',
                                    gap: 4,
                                    borderRadius: 9,
                                    padding: 4,
                                    background: '#F0F5F8',
                                    flexWrap: 'wrap',
                                }}
                            >
                                {([
                                    {
                                        key: 'review' as const,
                                        label: 'Per Ulasan',
                                    },
                                    {
                                        key: 'aspect' as const,
                                        label: 'Per Aspek',
                                    },
                                ]).map((option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        aria-pressed={
                                            distributionMode ===
                                            option.key
                                        }
                                        onClick={() =>
                                            setDistributionMode(
                                                option.key
                                            )
                                        }
                                        style={{
                                            border: 0,
                                            cursor: 'pointer',
                                            borderRadius: 7,
                                            padding: '8px 11px',
                                            fontSize: 11,
                                            fontWeight: 800,

                                            background:
                                                distributionMode ===
                                                    option.key
                                                    ? '#192C43'
                                                    : 'transparent',

                                            color:
                                                distributionMode ===
                                                    option.key
                                                    ? '#FFFFFF'
                                                    : '#64819A',
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Donut
                            distribution={
                                selectedDistribution
                            }
                            middleValue={
                                decimal(
                                    isReviewMode
                                        ? summary.overall
                                        : aspectAverage,
                                    1
                                )
                            }
                            middleLabel={
                                isReviewMode
                                    ? 'Rata-rata tamu'
                                    : 'Rata-rata aspek'
                            }
                            mode={distributionMode}
                        />

                        {isReviewMode ? (
                            <>
                                <p className="wvi-muted">
                                    Setiap ulasan dihitung
                                    satu kali berdasarkan
                                    rata-rata rating tamu,
                                    tanpa pembulatan untuk
                                    menentukan kelompok bintang.
                                </p>

                                <ReviewGroups
                                    groups={review_groups}
                                    scored={summary.scored}
                                />
                            </>
                        ) : (
                            <p className="wvi-muted">
                                Setiap aspek layanan
                                yang dinilai dihitung
                                sebagai satu skor kategori.

                                {' '}

                                {fmt(not_used)}
                                {' '}pilihan “Tidak
                                Menggunakan Layanan”
                                dikecualikan dari
                                perhitungan.
                            </p>
                        )}
                    </section>

                    {/* KATEGORI UNGGULAN */}

                    <section className="wvi-panel">
                        <div className="wvi-panel-head">
                            <div>
                                <h2>
                                    Kategori Unggulan
                                </h2>

                                <p>
                                    Diurutkan berdasarkan
                                    rata-rata rating
                                    pada periode terpilih
                                </p>
                            </div>
                        </div>

                        <div className="wvi-categories">
                            {categories.length === 0 && (
                                <p className="wvi-muted">
                                    Belum ada kategori.
                                </p>
                            )}

                            {categories.map((category) => (
                                <div
                                    className="wvi-category"
                                    key={category.id}
                                >
                                    <div className="wvi-category-top">
                                        <span>
                                            {category.name}

                                            {!category.active && (
                                                <em>
                                                    Nonaktif
                                                </em>
                                            )}
                                        </span>

                                        <strong>
                                            {decimal(
                                                category.average,
                                                2
                                            )}

                                            {' '}

                                            <small>
                                                / 5
                                            </small>
                                        </strong>
                                    </div>

                                    <div className="wvi-track">
                                        <div
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.max(
                                                        0,
                                                        (category.average ?? 0)
                                                        / 5 * 100
                                                    )
                                                )}%`,
                                            }}
                                        />
                                    </div>

                                    <div
                                        className="wvi-category-foot"
                                        style={{
                                            flexWrap: 'wrap',
                                            gap: 7,
                                        }}
                                    >
                                        <span>
                                            {fmt(
                                                category.rated_count
                                            )}
                                            {' '}rating

                                            {' · '}

                                            {fmt(
                                                category.not_used_count
                                            )}
                                            {' '}tidak digunakan
                                        </span>

                                        {category.change !== null && (
                                            <ChangeIndicator
                                                value={
                                                    category.change
                                                }
                                                digits={2}
                                                unit="poin"
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="wvi-muted">
                            Indikator perubahan kategori
                            ditampilkan jika kedua periode
                            memiliki minimal lima penilaian.
                        </p>
                    </section>
                </div>

                {/* ==============================
                    SATISFACTION TREND
                   ============================== */}

                <section className="wvi-panel wvi-trend-panel">
                    <div className="wvi-panel-head">
                        <div>
                            <h2>
                                Perkembangan Kepuasan
                            </h2>

                            <p>
                                Tren rata-rata rating
                                per tamu sepanjang
                                periode terpilih
                            </p>
                        </div>

                        <span className="wvi-mini-tag">
                            <ChartNoAxesCombined
                                size={14}
                            />

                            {{
                                day: 'Harian',
                                week: 'Mingguan',
                                month: 'Bulanan',
                            }[trend_bucket]}
                        </span>
                    </div>

                    <RatingLine
                        points={trend}
                    />

                    <p className="wvi-muted">
                        {trend_note}
                    </p>
                </section>

                {/* ==============================
                    ADVANCED ANALYTICS
                   ============================== */}

                <div className="wvi-bottom-grid">

                    {/* PERBANDINGAN PERIODE */}

                    <PeriodComparison
                        comparison={comparison}
                    />

                    {/* PRIORITAS PENINGKATAN */}

                    <ServicePriorities
                        categories={
                            service_priorities
                        }
                        lowScores={low_scores}
                        totalScores={total_scores}
                        lowPercentage={low_percentage}
                        reviewsHref={reviewsHref}
                    />

                    {/* INSIGHT MANAJEMEN */}

                    <section className="wvi-panel">
                        <div className="wvi-panel-head">
                            <div>
                                <h2>
                                    Insight Manajemen
                                </h2>

                                <p>
                                    Ringkasan kondisi
                                    pelayanan berdasarkan
                                    periode terpilih
                                </p>
                            </div>

                            <Star
                                size={18}
                                className="wvi-gold"
                            />
                        </div>

                        <div className="wvi-insight-list">

                            {/* KETERBATASAN DATA */}

                            {summary.scored < 10 && (
                                <div>
                                    <ClipboardList
                                        size={17}
                                    />

                                    <p>
                                        Data masih terbatas
                                        ({fmt(summary.scored)}
                                        {' '}ulasan dengan rating).
                                        Kumpulkan lebih banyak
                                        ulasan sebelum menarik
                                        kesimpulan pelayanan.
                                    </p>
                                </div>
                            )}

                            {/* JUMLAH ULASAN */}

                            <div>
                                <ClipboardList
                                    size={17}
                                />

                                <p>
                                    Terdapat{' '}
                                    <strong>
                                        {fmt(summary.scored)}
                                        {' '}ulasan dengan rating
                                    </strong>

                                    {' '}dari{' '}

                                    {fmt(summary.total)}
                                    {' '}ulasan pada periode ini.
                                </p>
                            </div>

                            {/* ULASAN POSITIF */}

                            <div>
                                <Star
                                    size={17}
                                    style={{
                                        color: '#287B5F',
                                    }}
                                />

                                <p>
                                    {summary.scored > 0 ? (
                                        <>
                                            <strong>
                                                {fmt(
                                                    summary.positive_count
                                                )}
                                                {' '}ulasan
                                                {' '}
                                                ({percentage(
                                                    summary.positive_percentage,
                                                    2
                                                )})
                                            </strong>

                                            {' '}tergolong positif,
                                            dengan rata-rata
                                            minimal 4,0.
                                        </>
                                    ) : (
                                        'Belum ada ulasan dengan rating untuk menghitung kepuasan.'
                                    )}
                                </p>
                            </div>

                            {/* KATEGORI TERBAIK */}

                            <div>
                                <TrendingUp
                                    size={17}
                                    style={{
                                        color: '#287B5F',
                                    }}
                                />

                                <p>
                                    {topCategory ? (
                                        <>
                                            Kategori dengan
                                            rata-rata tertinggi
                                            adalah{' '}

                                            <strong>
                                                {topCategory.name}
                                            </strong>

                                            {' '}

                                            ({decimal(
                                                topCategory.average,
                                                2
                                            )}/5).

                                            Berdasarkan{' '}

                                            {fmt(
                                                topCategory.rated_count
                                            )}

                                            {' '}penilaian.
                                        </>
                                    ) : (
                                        'Belum ada kategori dengan rating.'
                                    )}
                                </p>
                            </div>

                            {/* PERLU PENINGKATAN */}

                            <div>
                                <TriangleAlert
                                    size={17}
                                    style={{
                                        color: '#AD8440',
                                    }}
                                />

                                <p>
                                    {summary.improvement > 0 ? (
                                        <>
                                            <strong>
                                                {fmt(
                                                    summary.improvement
                                                )}
                                                {' '}ulasan
                                            </strong>

                                            {' '}memiliki rata-rata
                                            3,0 sampai kurang dari
                                            4,0 dan masih memerlukan
                                            peningkatan pelayanan.
                                        </>
                                    ) : (
                                        'Tidak ada ulasan pada kelompok 3,0 sampai kurang dari 4,0.'
                                    )}
                                </p>
                            </div>

                            {/* PERLU PERHATIAN */}

                            <div>
                                <TrendingDown
                                    size={17}
                                    style={{
                                        color: '#B6534B',
                                    }}
                                />

                                <p>
                                    {summary.attention > 0 ? (
                                        <>
                                            <strong>
                                                {fmt(
                                                    summary.attention
                                                )}
                                                {' '}ulasan
                                            </strong>

                                            {' '}memiliki rata-rata
                                            di bawah 3,0.

                                            Prioritaskan
                                            pemeriksaan keluhan
                                            dan masukan tamu.
                                        </>
                                    ) : (
                                        summary.scored > 0
                                            ? 'Tidak ada ulasan dengan rata-rata di bawah 3,0.'
                                            : 'Belum ada rating untuk menentukan ulasan yang memerlukan perhatian.'
                                    )}
                                </p>
                            </div>

                            {/* PRIORITAS LAYANAN */}

                            <div>
                                <TriangleAlert
                                    size={17}
                                    style={{
                                        color: '#B0795E',
                                    }}
                                />

                                <p>
                                    {topPriority ? (
                                        <>
                                            Aspek dengan proporsi
                                            skor 1–3 tertinggi
                                            adalah{' '}

                                            <strong>
                                                {topPriority.name}
                                            </strong>

                                            {' '}

                                            ({percentage(
                                                topPriority.low_percentage,
                                                2
                                            )}).

                                            {' '}

                                            {fmt(
                                                topPriority.low_count
                                            )}

                                            {' '}dari{' '}

                                            {fmt(
                                                topPriority.rated_count
                                            )}

                                            {' '}penilaian
                                            mendapat skor 1–3.

                                            {topPriority.rated_count < 5 && (
                                                <>
                                                    {' '}
                                                    Jumlah penilaian
                                                    kategori ini
                                                    masih terbatas.
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        ratedCategoryCount > 0
                                            ? 'Tidak ada skor kategori 1–3 pada periode ini.'
                                            : 'Belum ada penilaian kategori untuk menentukan prioritas layanan.'
                                    )}
                                </p>
                            </div>

                            {/* PRIVASI */}

                            <div>
                                <ShieldCheck
                                    size={17}
                                />

                                <p>
                                    Informasi identitas
                                    dan kontak tamu
                                    hanya dapat diakses
                                    oleh administrator
                                    yang berwenang.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* ==============================
                    FOOTER
                   ============================== */}

                <div className="wvi-footer">
                    <ShieldCheck
                        size={15}
                    />

                    WE HOTEL · Analitik internal
                    · Termasuk data DEMO jika masih tersimpan
                </div>
            </div>
        </AdminShell>
    );
}
