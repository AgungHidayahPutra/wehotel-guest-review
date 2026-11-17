import { Head, Link } from '@inertiajs/react';
import { ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import GuestShell from '../../components/guest-shell';
import type { Hotel, Language } from '../../components/guest-shell';

type RatingSummary = {
    average: number | null;
    rated_count: number;
    category_count: number;
};

type Props = {
    hotel: Hotel;
    rating_summary: RatingSummary | null;
};

export default function Thanks({ hotel, rating_summary }: Props) {
    const [language, setLanguage] = useState<Language>('id');

    useEffect(() => {
        const saved = window.localStorage.getItem('wehotel-language');

        if (saved === 'id' || saved === 'en') {
            setLanguage(saved);
        }
    }, []);

    function changeLanguage() {
        const next = language === 'id' ? 'en' : 'id';

        setLanguage(next);
        window.localStorage.setItem('wehotel-language', next);
    }

    const isId = language === 'id';
    const average = rating_summary?.average ?? null;
    const filledStars = average === null ? 0 : Math.round(average);

    return (
        <GuestShell
            hotel={hotel}
            language={language}
            onLanguageChange={changeLanguage}
            step={3}
            showProgress={false}
        >
            <Head title={`${isId ? 'Terima Kasih' : 'Thank You'} — ${hotel.name}`} />

            <section className="wh-thanks wh-section" key={`thanks-${language}`}>
                <div
                    className="wh-thanks-check-circle"
                    role="img"
                    aria-label={isId ? 'Penilaian berhasil dikirim' : 'Review successfully submitted'}
                >
                    <div className="wh-thanks-check-inner">
                        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
                            <path
                                className="wh-thanks-check-stroke"
                                d="M14 32 L27 44 L50 20"
                                pathLength={100}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={4.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </div>

                <span className="wh-thanks-eyebrow">REVIEW RECEIVED</span>

                <h1>
                    {isId
                        ? 'Terima kasih telah berbagi!'
                        : 'Thank you for sharing!'}
                </h1>

                <p className="wh-thanks-description">
                    {isId
                        ? 'Setiap masukan membawa kami selangkah lebih dekat pada pengalaman menginap yang lebih baik.'
                        : 'Every review brings us one step closer to creating a better stay for our guests.'}
                </p>

                {average !== null && (
                    <div
                        className="wh-thanks-rating-card"
                        aria-label={isId
                            ? `Rata-rata penilaian ${average.toFixed(1)} dari 5`
                            : `Average rating ${average.toFixed(1)} out of 5`}
                    >
                        <span className="wh-thanks-rating-title">
                            {isId ? 'Rata-rata penilaian' : 'Average rating'}
                        </span>

                        <div className="wh-thanks-rating-number">
                            <strong>{average.toFixed(1)}</strong>
                            <span>/ 5.0</span>
                        </div>

                        <div className="wh-thanks-stars" aria-hidden="true">
                            {[1, 2, 3, 4, 5].map((score) => (
                                <Star
                                    key={score}
                                    size={22}
                                    className={score <= filledStars ? 'filled' : ''}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <p className="wh-thanks-privacy">
                    <ShieldCheck size={17} />
                    {isId
                        ? 'Penilaian Anda telah dikirim secara pribadi kepada manajemen WE HOTEL.'
                        : 'Your review has been sent privately to WE HOTEL management.'}
                </p>

                <Link className="wh-primary-button wh-thanks-new-review" href="/review">
                    {isId ? 'Tulis penilaian baru' : 'Write another review'}
                    <ArrowRight size={18} />
                </Link>
            </section>
        </GuestShell>
    );
}
