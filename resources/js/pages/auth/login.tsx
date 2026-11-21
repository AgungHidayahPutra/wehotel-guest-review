import { Form, Head, Link } from '@inertiajs/react';

import {
    ArrowLeft,
    ArrowRight,
    Eye,
    EyeOff,
    LoaderCircle,
    LockKeyhole,
    Mail,
    ShieldCheck,
} from 'lucide-react';

import { useState, type ReactNode } from 'react';

import { store } from '@/routes/login';

import '../../../css/wehotel-login.css';

type Props = {
    hotel: {
        hotel_name: string;
        logo_url: string;
    };
    status?: string;
};

/* ==========================================
   CUSTOM LOGIN LAYOUT
   ========================================== */

function LoginLayout({
    children,
}: {
    children: ReactNode;
}) {
    return <>{children}</>;
}

/* ==========================================
   LOGIN PAGE
   ========================================== */

export default function Login({
    hotel,
    status,
}: Props) {
    const [showPassword, setShowPassword] =
        useState(false);

    const logo =
        hotel?.logo_url ||
        '/images/wehotel/hotel-logo.png';

    return (
        <>
            <Head title="Masuk Administrator" />

            <main className="whl-page">

                {/* ==================================
                    LEFT PANEL
                   ================================== */}

                <aside className="whl-brand-panel">

                    {/* DECORATION */}

                    <div className="whl-ring whl-ring-one" />
                    <div className="whl-ring whl-ring-two" />
                    <div className="whl-ring whl-ring-three" />

                    {/* HOTEL BRAND */}

                    <div className="whl-brand">
                        <div className="whl-logo">
                            <img
                                src={logo}
                                alt="Logo WE HOTEL"
                            />
                        </div>

                        <div className="whl-brand-copy">
                            <strong>
                                GUEST EXPERIENCE
                            </strong>

                            <span>
                                MANAGEMENT SYSTEM
                            </span>
                        </div>
                    </div>

                    {/* MAIN MESSAGE */}

                    <div className="whl-brand-content">
                        <div className="whl-eyebrow">
                            <i />
                            WE HOTEL · MANAGEMENT PORTAL
                        </div>

                        <h2>
                            Pelayanan terbaik dimulai
                            dari setiap masukan.
                        </h2>

                        <p>
                            Kelola ulasan, pantau kepuasan
                            tamu, dan tingkatkan kualitas
                            pelayanan untuk menciptakan
                            pengalaman menginap yang
                            lebih berkesan.
                        </p>

                        <span className="whl-location">
                            LUBUKLINGGAU · INDONESIA
                        </span>
                    </div>

                    {/* LEFT FOOTER */}

                    <div className="whl-brand-footer">
                        <ShieldCheck size={18} />

                        <div>
                            <strong>
                                Private & Secure Workspace
                            </strong>

                            <span>
                                Khusus manajemen WE HOTEL
                            </span>
                        </div>
                    </div>
                </aside>

                {/* ==================================
                    RIGHT PANEL
                   ================================== */}

                <section className="whl-main">

                    {/* HEADER */}

                    <header className="whl-header">
                        <div className="whl-header-brand">
                            <img
                                src={logo}
                                alt="WE HOTEL"
                            />

                            <span>
                                ADMINISTRATOR
                            </span>
                        </div>

                        <span className="whl-secure">
                            <ShieldCheck size={15} />
                            Akses terbatas
                        </span>
                    </header>

                    {/* LOGIN CONTENT */}

                    <div className="whl-main-content">
                        <div className="whl-login-card">

                            {/* LOGIN HEADING */}

                            <div className="whl-login-icon">
                                <LockKeyhole size={27} />
                            </div>

                            <div className="whl-login-heading">
                                <span>
                                    ADMIN WORKSPACE
                                </span>

                                <h1>
                                    Selamat datang kembali.
                                </h1>

                                <p>
                                    Masuk ke ruang kerja
                                    administrator WE HOTEL
                                    untuk mengelola pengalaman
                                    tamu.
                                </p>
                            </div>

                            {/* STATUS MESSAGE */}

                            {status && (
                                <div
                                    className="whl-status"
                                    role="status"
                                >
                                    <ShieldCheck size={18} />
                                    {status}
                                </div>
                            )}

                            {/* LOGIN FORM */}

                            <Form
                                {...store.form()}
                                resetOnSuccess={['password']}
                                className="whl-form"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        {/* EMAIL FIELD */}

                                        <div className="whl-field">
                                            <label htmlFor="email">
                                                Alamat email
                                            </label>

                                            <div
                                                className={
                                                    'whl-input-wrapper' +
                                                    (errors.email
                                                        ? ' has-error'
                                                        : '')
                                                }
                                            >
                                                <Mail
                                                    size={19}
                                                    className="whl-input-icon"
                                                />

                                                <input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    required
                                                    autoFocus
                                                    autoComplete="email"
                                                    placeholder="Masukkan alamat email"
                                                    aria-invalid={
                                                        Boolean(errors.email)
                                                    }
                                                    aria-describedby={
                                                        errors.email
                                                            ? 'whl-email-error'
                                                            : undefined
                                                    }
                                                />
                                            </div>

                                            {errors.email && (
                                                <p
                                                    id="whl-email-error"
                                                    className="whl-error"
                                                    role="alert"
                                                >
                                                    {errors.email}
                                                </p>
                                            )}
                                        </div>

                                        {/* PASSWORD FIELD */}

                                        <div className="whl-field">
                                            <div className="whl-field-heading">
                                                <label htmlFor="password">
                                                    Kata sandi
                                                </label>
                                            </div>

                                            <div
                                                className={
                                                    'whl-input-wrapper' +
                                                    (errors.password
                                                        ? ' has-error'
                                                        : '')
                                                }
                                            >
                                                <LockKeyhole
                                                    size={19}
                                                    className="whl-input-icon"
                                                />

                                                <input
                                                    id="password"
                                                    name="password"
                                                    type={
                                                        showPassword
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    required
                                                    autoComplete="current-password"
                                                    placeholder="Masukkan kata sandi"
                                                    aria-invalid={
                                                        Boolean(errors.password)
                                                    }
                                                    aria-describedby={
                                                        errors.password
                                                            ? 'whl-password-error'
                                                            : undefined
                                                    }
                                                />

                                                <button
                                                    type="button"
                                                    className="whl-password-toggle"
                                                    onClick={() =>
                                                        setShowPassword(
                                                            !showPassword
                                                        )
                                                    }
                                                    aria-label={
                                                        showPassword
                                                            ? 'Sembunyikan kata sandi'
                                                            : 'Tampilkan kata sandi'
                                                    }
                                                    aria-pressed={showPassword}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff size={19} />
                                                    ) : (
                                                        <Eye size={19} />
                                                    )}
                                                </button>
                                            </div>

                                            {errors.password && (
                                                <p
                                                    id="whl-password-error"
                                                    className="whl-error"
                                                    role="alert"
                                                >
                                                    {errors.password}
                                                </p>
                                            )}
                                        </div>

                                        {/* REMEMBER ME */}

                                        <label className="whl-remember">
                                            <input
                                                id="remember"
                                                name="remember"
                                                type="checkbox"
                                                value="1"
                                            />

                                            <span>
                                                Ingat saya
                                            </span>
                                        </label>

                                        {/* LOGIN BUTTON */}

                                        <button
                                            type="submit"
                                            className="whl-submit"
                                            disabled={processing}
                                            data-test="login-button"
                                        >
                                            {processing ? (
                                                <>
                                                    <LoaderCircle
                                                        size={19}
                                                        className="whl-spinner"
                                                    />

                                                    Sedang masuk...
                                                </>
                                            ) : (
                                                <>
                                                    Masuk ke Dashboard

                                                    <ArrowRight size={19} />
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </Form>

                            {/* SECURITY INFORMATION */}

                            <div className="whl-privacy">
                                <ShieldCheck size={18} />

                                <p>
                                    Halaman ini diperuntukkan
                                    bagi administrator yang
                                    berwenang.
                                </p>
                            </div>

                            {/* BACK TO GUEST REVIEW */}

                            <Link
                                href="/"
                                className="whl-back-link"
                            >
                                <ArrowLeft size={15} />

                                Kembali ke halaman ulasan tamu
                            </Link>
                        </div>
                    </div>

                    {/* FOOTER */}

                    <footer className="whl-footer">
                        <span>
                            © {new Date().getFullYear()} WE HOTEL
                        </span>

                        <span>
                            Guest Experience Management
                        </span>
                    </footer>
                </section>
            </main>
        </>
    );
}

Login.layout = [LoginLayout];
