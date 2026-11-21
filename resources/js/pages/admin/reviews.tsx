import ReviewExport from '../../components/review-export';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    EyeOff,
    LockKeyhole,
    MessageSquareText,
    RotateCcw,
    Search,
    ShieldCheck,
    Star,
} from 'lucide-react';
import {
    useEffect,
    useState,
    type FormEvent,
} from 'react';

import AdminShell, {
    type AdminHotel,
} from '../../components/admin-shell';

import '../../../css/wehotel-reviews.css';

type Rating = {
    id: number;
    category: string;
    category_en: string;
    score: number | null;
    status: 'rated' | 'not_used';
};

type Review = {
    id: number;
    name: string;
    guest_name: string;
    hide_name: boolean;
    room_number: string;
    date: string | null;
    average: number | null;
    rated_count: number;

    liked: string | null;
    improvement: string | null;
    unpleasant: string | null;
    suggestions: string;

    contact_consent: boolean;
    contact_method: string | null;
    contact_value: string | null;

    ratings: Rating[];
};

type Paginated<T> = {
    data: T[];
    total: number;
    from: number | null;
    to: number | null;
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Filters = {
    search: string;
    star: string;
    from: string;
    to: string;
};

type Props = {
    hotel: AdminHotel;
    reviews: Paginated<Review>;
    totalReviews: number;
    filters: Filters;
};

const questions = [
    {
        key: 'liked',
        number: '01',
        title: 'Apa hal yang paling Anda sukai selama menginap?',
    },
    {
        key: 'improvement',
        number: '02',
        title: 'Apa yang menurut Anda perlu kami tingkatkan?',
    },
    {
        key: 'unpleasant',
        number: '03',
        title: 'Apakah ada pengalaman yang kurang menyenangkan?',
    },
    {
        key: 'suggestions',
        number: '04',
        title: 'Adakah saran atau masukan untuk WE HOTEL?',
    },
] as const;

function formatDate(date: string | null): string {
    if (!date) return '—';

    try {
        return (
            new Intl.DateTimeFormat('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Jakarta',
            }).format(new Date(date)) + ' WIB'
        );
    } catch {
        return '—';
    }
}


function scoreText(score: number | null): string {
    if (score === null) return '—';

    return score.toLocaleString('id-ID', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
    });
}

function ratingLabel(score: number | null): string {
    if (score === null) return 'Tidak dinilai';

    const group = Math.max(
        1,
        Math.min(5, Math.floor(score))
    );

    const labels = [
        '',
        'Sangat Tidak Puas',
        'Tidak Puas',
        'Cukup Puas',
        'Puas',
        'Sangat Puas',
    ];

    return labels[group];
}


function RatingStars({
    value,
    size = 16,
}: {
    value: number | null;
    size?: number;
}) {
    const actualValue =
        value === null
            ? 0
            : Math.max(0, Math.min(5, value));

    return (
        <span
            className="whr-stars"
            role="img"
            aria-label={
                value === null
                    ? 'Belum dinilai'
                    : `${scoreText(value)} dari 5 bintang`
            }
        >
            {[1, 2, 3, 4, 5].map((starNumber) => {
                const fillAmount = Math.max(
                    0,
                    Math.min(
                        1,
                        actualValue - (starNumber - 1)
                    )
                );

                return (
                    <span
                        key={starNumber}
                        aria-hidden="true"
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: size,
                            height: size,
                            flexShrink: 0,
                        }}
                    >
                        <Star
                            size={size}
                            strokeWidth={1.6}
                            fill="none"
                            className="whr-star-empty"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                            }}
                        />

                        {fillAmount > 0 && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width:
                                        `${fillAmount * 100}%`,
                                    height: size,
                                    overflow: 'hidden',
                                }}
                            >
                                <Star
                                    size={size}
                                    strokeWidth={1.6}
                                    fill="currentColor"
                                    className="whr-star-filled"
                                    style={{
                                        display: 'block',
                                        minWidth: size,
                                        maxWidth: 'none',
                                    }}
                                />
                            </span>
                        )}
                    </span>
                );
            })}
        </span>
    );
}

export default function Reviews({
    hotel,
    reviews,
    totalReviews,
    filters,
}: Props) {
    const [search, setSearch] = useState(
        filters.search || ''
    );

    const [star, setStar] = useState(
        filters.star || ''
    );

    const [from, setFrom] = useState(
        filters.from || ''
    );

    const [to, setTo] = useState(
        filters.to || ''
    );

    const [expandedId, setExpandedId] = useState<
        number | null
    >(null);

    const [filterError, setFilterError] = useState('');

    // Sinkronkan input dengan URL saat pagination / navigasi
    useEffect(() => {
        setSearch(filters.search || '');
        setStar(filters.star || '');
        setFrom(filters.from || '');
        setTo(filters.to || '');
    }, [
        filters.search,
        filters.star,
        filters.from,
        filters.to,
    ]);

    const hasFilters = Boolean(
        filters.search ||
        filters.star ||
        filters.from ||
        filters.to
    );

    function submitFilters(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (from && to && from > to) {
            setFilterError(
                'Tanggal awal tidak boleh melewati tanggal akhir.'
            );
            return;
        }

        setFilterError('');
        setExpandedId(null);

        const params: Record<string, string> = {};

        if (search.trim()) {
            params.search = search.trim();
        }

        if (star) params.star = star;
        if (from) params.from = from;
        if (to) params.to = to;

        router.get('/admin/reviews', params, {
            preserveScroll: true,
            replace: true,
        });
    }

    function clearFilters() {
        setSearch('');
        setStar('');
        setFrom('');
        setTo('');
        setFilterError('');
        setExpandedId(null);

        router.get(
            '/admin/reviews',
            {},
            {
                preserveScroll: true,
                replace: true,
            }
        );
    }

    return (
        <AdminShell
            hotel={hotel}
            section="reviews"
            count={totalReviews}
        >
            <Head
                title={`Semua Ulasan — ${hotel.hotel_name}`}
            />

            <div className="whr-page">
                {/* JUDUL */}
                <div className="whr-header">
                    <div>
                        <div className="whr-eyebrow">
                            WE HOTEL · GUEST EXPERIENCE
                        </div>

                        <h1>
                            Semua Ulasan Tamu
                            <span> ✳</span>
                        </h1>

                        <p>
                            Lihat penilaian, pengalaman,
                            dan masukan tamu yang telah
                            diterima oleh WE HOTEL.
                        </p>
                    </div>

                    <Link
                        href="/admin/dashboard"
                        className="whr-outline-button"
                    >
                        <ArrowLeft size={15} />
                        Ringkasan
                    </Link>
                </div>

                {/* KARTU INFORMASI */}
                <div className="whr-summary">
                    <div className="whr-summary-card">
                        <div className="whr-summary-icon">
                            <ClipboardList size={19} />
                        </div>

                        <span>Total Ulasan</span>

                        <strong>
                            {totalReviews.toLocaleString(
                                'id-ID'
                            )}
                        </strong>

                        <small>
                            Semua review yang diterima
                        </small>
                    </div>

                    <div className="whr-summary-card">
                        <div className="whr-summary-icon">
                            <Search size={19} />
                        </div>

                        <span>Hasil Pencarian</span>

                        <strong>
                            {reviews.total.toLocaleString(
                                'id-ID'
                            )}
                        </strong>

                        <small>
                            Review sesuai filter
                        </small>
                    </div>

                    <div className="whr-summary-info">
                        <ShieldCheck size={22} />

                        <div>
                            <strong>Data tamu privat</strong>

                            <p>
                                Identitas lengkap, nomor kamar,
                                dan informasi kontak hanya
                                dapat dilihat oleh admin.
                            </p>
                        </div>
                    </div>
                </div>

                {/* FILTER */}
                <section className="whr-panel">
                    <div className="whr-panel-head">
                        <div>
                            <h2>Temukan Ulasan</h2>

                            <p>
                                Cari berdasarkan identitas,
                                rating, atau tanggal.
                            </p>
                        </div>
                    </div>

                    <form
                        className="whr-filter-form"
                        onSubmit={submitFilters}
                    >
                        <label className="whr-field whr-search">
                            <span>Nama tamu / nomor kamar</span>

                            <div className="whr-input-icon">
                                <Search size={16} />

                                <input
                                    type="search"
                                    value={search}
                                    maxLength={100}
                                    placeholder="Cari nama atau kamar..."
                                    onChange={(event) =>
                                        setSearch(
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                        </label>

                        <label className="whr-field">
                            <span>Rating</span>

                            <select
                                value={star}
                                onChange={(event) =>
                                    setStar(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Semua rating
                                </option>

                                {[5, 4, 3, 2, 1].map(
                                    (number) => (
                                        <option
                                            key={number}
                                            value={number}
                                        >

                                            {number === 5
                                                ? '5 Bintang (5,0)'
                                                : `${number} Bintang (${number},0–<${number + 1},0)`}
                                        </option>
                                    )
                                )}
                            </select>
                        </label>

                        <label className="whr-field">
                            <span>Dari tanggal</span>

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

                        <label className="whr-field">
                            <span>Sampai tanggal</span>

                            <input
                                type="date"
                                min={from || undefined}
                                value={to}
                                onChange={(event) =>
                                    setTo(
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <div className="whr-filter-actions">
                            <button
                                type="submit"
                                className="whr-primary-button"
                            >
                                <Search size={15} />
                                Terapkan
                            </button>

                            <button
                                type="button"
                                className="whr-outline-button"
                                onClick={clearFilters}
                            >
                                <RotateCcw size={14} />
                                Reset
                            </button>
                        </div>
                    </form>

                    {filterError && (
                        <p className="whr-error" role="alert">
                            {filterError}
                        </p>
                    )}
                </section>

                {/* DAFTAR ULASAN */}
                <section className="whr-panel">
                    <div className="whr-panel-head">
                        <div>
                            <h2>Daftar Penilaian</h2>

                            <p>
                                {reviews.total.toLocaleString(
                                    'id-ID'
                                )}{' '}
                                ulasan ditemukan
                                {hasFilters
                                    ? ' berdasarkan filter.'
                                    : '.'}
                            </p>
                        </div>

                        <div className="whr-panel-actions">
                            <span className="whr-private-badge">
                                <LockKeyhole size={13} />
                                Khusus Admin
                            </span>

                            <ReviewExport
                                filters={filters}
                                filteredTotal={reviews.total}
                                totalReviews={totalReviews}
                            />
                        </div>
                    </div>

                    {reviews.data.length === 0 ? (
                        <div className="whr-empty">
                            <MessageSquareText
                                size={31}
                            />

                            <h3>
                                Belum ada ulasan
                            </h3>

                            <p>
                                {hasFilters
                                    ? 'Tidak ada review yang cocok dengan filter yang dipilih.'
                                    : 'Ulasan tamu akan muncul di sini setelah formulir review dikirim.'}
                            </p>

                            {hasFilters && (
                                <button
                                    type="button"
                                    className="whr-outline-button"
                                    onClick={clearFilters}
                                >
                                    Reset filter
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="whr-list">
                            {reviews.data.map((review) => {
                                const expanded =
                                    expandedId === review.id;

                                return (
                                    <article
                                        className="whr-review"
                                        key={review.id}
                                    >
                                        {/* IDENTITAS DAN RATING */}
                                        <div className="whr-review-top">
                                            <div className="whr-person">
                                                <div className="whr-avatar">
                                                    {review.name
                                                        .charAt(0)
                                                        .toUpperCase() || 'T'}
                                                </div>

                                                <div>
                                                    <div className="whr-person-name">
                                                        <strong>
                                                            {review.name}
                                                        </strong>

                                                        {review.hide_name && (
                                                            <span className="whr-hidden-badge">
                                                                <EyeOff size={12} />
                                                                Disamarkan
                                                            </span>
                                                        )}
                                                    </div>

                                                    <small>
                                                        Kamar{' '}
                                                        {review.room_number}
                                                        {' · '}
                                                        {formatDate(
                                                            review.date
                                                        )}
                                                    </small>
                                                </div>
                                            </div>

                                            <div className="whr-score">
                                                <RatingStars
                                                    value={review.average}
                                                />

                                                <strong>
                                                    {scoreText(
                                                        review.average
                                                    )}
                                                    <small> / 5.0</small>
                                                </strong>
                                            </div>
                                        </div>

                                        {/* SARAN UTAMA */}
                                        <div className="whr-review-message">
                                            <span>
                                                Saran atau Masukan
                                            </span>

                                            <p>
                                                {review.suggestions ||
                                                    'Tidak ada saran.'}
                                            </p>
                                        </div>

                                        {/* INFORMASI RINGKAS */}
                                        <div className="whr-review-bottom">
                                            <span className="whr-rating-count">
                                                <Star size={14} />
                                                {review.rated_count}{' '}
                                                aspek dinilai
                                            </span>

                                            <span className="whr-review-label">
                                                {ratingLabel(
                                                    review.average
                                                )}
                                            </span>

                                            <button
                                                type="button"
                                                className="whr-detail-button"
                                                aria-expanded={expanded}
                                                aria-controls={
                                                    `review-detail-${review.id}`
                                                }
                                                onClick={() =>
                                                    setExpandedId(
                                                        expanded
                                                            ? null
                                                            : review.id
                                                    )
                                                }
                                            >
                                                {expanded
                                                    ? 'Tutup Detail'
                                                    : 'Lihat Detail'}

                                                {expanded ? (
                                                    <ChevronUp
                                                        size={15}
                                                    />
                                                ) : (
                                                    <ChevronDown
                                                        size={15}
                                                    />
                                                )}
                                            </button>
                                        </div>

                                        {/* DETAIL REVIEW */}
                                        {expanded && (
                                            <div
                                                className="whr-details"
                                                id={
                                                    `review-detail-${review.id}`
                                                }
                                            >
                                                <h3>
                                                    Rincian Penilaian
                                                </h3>

                                                <div className="whr-rating-grid">
                                                    {review.ratings.map(
                                                        (rating) => (
                                                            <div
                                                                className="whr-rating-row"
                                                                key={rating.id}
                                                            >
                                                                <div>
                                                                    <strong>
                                                                        {rating.category}
                                                                    </strong>

                                                                    <small>
                                                                        {rating.category_en}
                                                                    </small>
                                                                </div>

                                                                {rating.status ===
                                                                    'not_used' ? (
                                                                    <span className="whr-not-used">
                                                                        Tidak Menggunakan Layanan
                                                                    </span>
                                                                ) : (
                                                                    <div className="whr-rating-value">
                                                                        <RatingStars
                                                                            value={
                                                                                rating.score
                                                                            }
                                                                            size={15}
                                                                        />

                                                                        <strong>
                                                                            {rating.score ?? '—'}
                                                                            /5
                                                                        </strong>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    )}
                                                </div>

                                                <h3>
                                                    Jawaban Tamu
                                                </h3>

                                                <div className="whr-answers">
                                                    {questions.map(
                                                        (question) => (
                                                            <div
                                                                key={
                                                                    question.key
                                                                }
                                                                className="whr-answer"
                                                            >
                                                                <span>
                                                                    {question.number}
                                                                </span>

                                                                <div>
                                                                    <strong>
                                                                        {question.title}
                                                                    </strong>

                                                                    <p>
                                                                        {review[
                                                                            question.key
                                                                        ]?.trim() ||
                                                                            'Tidak diisi'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>

                                                {/* INFORMASI KHUSUS ADMIN */}
                                                <div className="whr-contact">
                                                    <div className="whr-contact-title">
                                                        <LockKeyhole
                                                            size={17}
                                                        />

                                                        <strong>
                                                            Informasi Internal
                                                        </strong>
                                                    </div>

                                                    <div className="whr-contact-grid">
                                                        <div>
                                                            <span>
                                                                Nama lengkap
                                                            </span>

                                                            <strong>
                                                                {review.guest_name}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                Nomor kamar
                                                            </span>

                                                            <strong>
                                                                {review.room_number}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                Persetujuan dihubungi
                                                            </span>

                                                            <strong>
                                                                {review.contact_consent
                                                                    ? 'Bersedia'
                                                                    : 'Tidak bersedia'}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                Kontak tamu
                                                            </span>

                                                            <strong>
                                                                {review.contact_consent &&
                                                                    review.contact_value
                                                                    ? review.contact_value
                                                                    : 'Tidak tersedia'}
                                                            </strong>

                                                            {review.contact_consent &&
                                                                review.contact_method && (
                                                                    <small>
                                                                        {review.contact_method ===
                                                                            'whatsapp'
                                                                            ? 'WhatsApp'
                                                                            : 'Email'}
                                                                    </small>
                                                                )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {/* PAGINATION */}
                    {reviews.last_page > 1 && (
                        <div className="whr-pagination">
                            <span>
                                Menampilkan{' '}
                                {reviews.from ?? 0}–
                                {reviews.to ?? 0} dari{' '}
                                {reviews.total} ulasan
                            </span>

                            <div className="whr-page-buttons">
                                {reviews.prev_page_url ? (
                                    <Link
                                        href={
                                            reviews.prev_page_url
                                        }
                                        className="whr-outline-button"
                                        preserveScroll
                                    >
                                        <ArrowLeft size={14} />
                                        Sebelumnya
                                    </Link>
                                ) : (
                                    <span className="whr-page-disabled">
                                        <ArrowLeft size={14} />
                                        Sebelumnya
                                    </span>
                                )}

                                <span className="whr-page-number">
                                    {reviews.current_page}
                                    {' / '}
                                    {reviews.last_page}
                                </span>

                                {reviews.next_page_url ? (
                                    <Link
                                        href={
                                            reviews.next_page_url
                                        }
                                        className="whr-outline-button"
                                        preserveScroll
                                    >
                                        Berikutnya
                                        <ArrowRight size={14} />
                                    </Link>
                                ) : (
                                    <span className="whr-page-disabled">
                                        Berikutnya
                                        <ArrowRight size={14} />
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                <footer className="whr-footer">
                    <ShieldCheck size={15} />

                    Seluruh informasi tamu hanya dapat
                    diakses oleh administrator WE HOTEL.
                </footer>
            </div>
        </AdminShell>
    );
}
