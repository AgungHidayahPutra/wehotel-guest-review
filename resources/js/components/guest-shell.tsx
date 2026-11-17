
import { Link } from '@inertiajs/react';
import { Globe2 } from 'lucide-react';
import type { ReactNode } from 'react';

import '../../css/wehotel-guest.css';

/* ==========================================
   TYPES
   ========================================== */

export type Language = 'id' | 'en';

export type Hotel = {
    name: string;
    logo_url: string | null;
    hero_image_url: string | null;
};

type Props = {
    hotel: Hotel;
    language: Language;
    onLanguageChange: () => void;
    step: 0 | 1 | 2 | 3;
    showProgress?: boolean;
    children: ReactNode;
};

/* ==========================================
   GUEST SHELL
   ========================================== */

export default function GuestShell({
    hotel,
    language,
    onLanguageChange,
    step,
    showProgress = true,
    children,
}: Props) {
    const isId = language === 'id';

    /* Hotel images from database.
       Default images remain available
       when no custom image is uploaded. */

    const logo =
        hotel.logo_url ||
        '/images/wehotel/hotel-logo.png';

    const hero =
        hotel.hero_image_url ||
        '/images/wehotel/hotel-front.jpeg';

    return (
        <div className="wh-guest">

            {/* ===================================
                HOTEL HERO
               =================================== */}

            <aside className="wh-hero">
                <img
                    className="wh-hero-image"
                    src={hero}
                    alt="Bangunan WE HOTEL"
                />

                <div className="wh-hero-overlay" />

                {/* HOTEL BRAND */}
                <Link
                    href="/review"
                    className="wh-hero-brand"
                >
                    <div className="wh-hero-logo-box">
                        <img
                            src={logo}
                            alt="Logo WE HOTEL"
                        />
                    </div>

                    <div className="wh-hero-brand-copy">
                        <strong>
                            GUEST EXPERIENCE
                        </strong>

                        <small>
                            WE HOTEL REVIEWS
                        </small>
                    </div>
                </Link>

                {/* HERO CONTENT */}
                {/* Only the text transitions when
                    switching languages.
                    The hotel image stays mounted. */}

                <div
                    className={
                        'wh-hero-content wh-language-enter'
                    }
                    key={`hero-${language}`}
                >
                    <span className="wh-photo-eyebrow">
                        <i />
                        WE HOTEL · GUEST EXPERIENCE
                    </span>

                    <h2>
                        {isId
                            ? 'Pengalaman yang baik dimulai dari mendengarkan.'
                            : 'Great experiences begin with listening.'}
                    </h2>

                    <p>
                        {isId
                            ? 'Setiap cerita dari tamu membantu kami menciptakan pengalaman menginap yang lebih berkesan.'
                            : 'Every guest story helps us create a more memorable stay.'}
                    </p>

                    <span className="wh-location">
                        LUBUKLINGGAU · INDONESIA
                    </span>
                </div>

                {/* STEP COUNTER */}
                {step > 0 && (
                    <div className="wh-hero-counter">
                        {String(step).padStart(2, '0')}
                        <span>/</span>
                        03
                    </div>
                )}
            </aside>

            {/* ===================================
                MAIN CONTENT
               =================================== */}

            <div className="wh-main">

                {/* HEADER */}
                <header className="wh-header">

                    <div className="wh-header-brand">
                        <img
                            src={logo}
                            alt="WE HOTEL"
                        />

                        <span
                            className="wh-language-enter"
                            key={`brand-${language}`}
                        >
                            {isId
                                ? 'PENGALAMAN TAMU'
                                : 'GUEST EXPERIENCE'}
                        </span>
                    </div>

                    {/* HEADER ACTIONS */}
                    <div className="wh-header-actions">

                        <span className="wh-preview-note">
                            <i />
                            {isId
                                ? 'PRATINJAU DESAIN'
                                : 'DESIGN PREVIEW'}
                        </span>

                        {/* LANGUAGE SWITCH */}
                        <button
                            type="button"
                            className="wh-language"
                            onClick={onLanguageChange}
                            aria-label={
                                isId
                                    ? 'Switch to English'
                                    : 'Ganti ke Bahasa Indonesia'
                            }
                        >
                            <Globe2 size={16} />

                            {isId ? 'EN' : 'ID'}
                        </button>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <main className="wh-content">

                    {/* =================================
                        REVIEW STEP PROGRESS
                       ================================= */}

                    {step > 0 && showProgress && (
                        <div
                            className={
                                'wh-progress wh-language-enter'
                            }
                            key={`progress-${language}`}
                            aria-label="Review progress"
                        >
                            <span
                                className={
                                    step >= 1 ? 'active' : ''
                                }
                            >
                                01
                                <em>
                                    {isId
                                        ? 'Identitas'
                                        : 'Identity'}
                                </em>
                            </span>

                            <i />

                            <span
                                className={
                                    step >= 2 ? 'active' : ''
                                }
                            >
                                02
                                <em>Rating</em>
                            </span>

                            <i />

                            <span
                                className={
                                    step >= 3 ? 'active' : ''
                                }
                            >
                                03
                                <em>
                                    {isId
                                        ? 'Masukan'
                                        : 'Feedback'}
                                </em>
                            </span>
                        </div>
                    )}

                    {/* REVIEW PAGE CONTENT */}
                    {children}

                    {/* FOOTER */}
                    <footer className="wh-footer">
                        <span>
                            © {hotel.name}
                        </span>

                        <span>
                            Thoughtful stays.
                            Meaningful experiences.
                        </span>
                    </footer>
                </main>
            </div>
        </div>
    );
}
