
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    KeyRound,
    LoaderCircle,
    ShieldCheck,
    Smartphone,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

import '../../../css/wehotel-login.css';

type Props = {
    hotel: {
        hotel_name: string;
        logo_url: string;
    };
};

function ChallengeLayout({
    children,
}: {
    children: ReactNode;
}) {
    return <>{children}</>;
}

export default function TwoFactorChallenge({ hotel }: Props) {
    const [isRecovery, setIsRecovery] = useState(false);

    const form = useForm({
        code: '',
        recovery_code: '',
    });

    const logo =
        hotel?.logo_url || '/images/wehotel/hotel-logo.png';

    const canSubmit = isRecovery
        ? form.data.recovery_code.trim().length > 0
        : /^\d{6}$/.test(form.data.code);

    function changeMode() {
        setIsRecovery((previous) => !previous);
        form.reset();
        form.clearErrors();
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSubmit || form.processing) {
            return;
        }

        form.post('/two-factor-challenge', {
            preserveScroll: true,
            onFinish: () => {
                form.reset('code', 'recovery_code');
            },
        });
    }

    return (
        <>
            <Head title="Verifikasi Dua Langkah" />

            <main className="whl-page">
                {/* LEFT PANEL */}

                <aside className="whl-brand-panel">
                    <div className="whl-brand">
                        <div className="whl-logo">
                            <img src={logo} alt="Logo WE HOTEL" />
                        </div>

                        <div className="whl-brand-copy">
                            <strong>GUEST EXPERIENCE</strong>
                            <span>MANAGEMENT SYSTEM</span>
                        </div>
                    </div>

                    <div className="whl-brand-content">
                        <div className="whl-eyebrow">
                            <i />
                            WE HOTEL · ACCOUNT SECURITY
                        </div>

                        <h2>
                            Keamanan untuk setiap
                            akses administrator.
                        </h2>

                        <p>
                            WE HOTEL melindungi informasi
                            dan masukan tamu melalui
                            verifikasi tambahan sebelum
                            memberikan akses ke sistem.
                        </p>

                        <span className="whl-location">
                            LUBUKLINGGAU · INDONESIA
                        </span>
                    </div>

                    <div className="whl-brand-footer">
                        <ShieldCheck size={18} />

                        <div>
                            <strong>Two-Factor Authentication</strong>
                            <span>
                                Verifikasi akses administrator
                            </span>
                        </div>
                    </div>
                </aside>

                {/* RIGHT PANEL */}

                <section className="whl-main">
                    <header className="whl-header">
                        <div className="whl-header-brand">
                            <img src={logo} alt="WE HOTEL" />
                            <span>VERIFIKASI KEAMANAN</span>
                        </div>

                        <span className="whl-secure">
                            <ShieldCheck size={15} />
                            Akses terbatas
                        </span>
                    </header>

                    <div className="whl-main-content">
                        <div className="whl-login-card">
                            <div className="whl-login-icon">
                                {isRecovery ? (
                                    <KeyRound size={27} />
                                ) : (
                                    <Smartphone size={27} />
                                )}
                            </div>

                            <div className="whl-login-heading">
                                <span>
                                    TWO-STEP VERIFICATION
                                </span>

                                <h1>
                                    Verifikasi identitas Anda.
                                </h1>

                                <p>
                                    {isRecovery
                                        ? 'Masukkan salah satu kode pemulihan yang telah Anda simpan.'
                                        : 'Buka aplikasi autentikator di HP, lalu masukkan kode keamanan enam digit.'}
                                </p>
                            </div>

                            <form
                                className="whl-form"
                                onSubmit={submit}
                            >
                                <div className="whl-field">
                                    <label
                                        htmlFor={
                                            isRecovery
                                                ? 'recovery_code'
                                                : 'code'
                                        }
                                    >
                                        {isRecovery
                                            ? 'Kode pemulihan'
                                            : 'Kode autentikator'}
                                    </label>

                                    <div
                                        className={
                                            'whl-input-wrapper' +
                                            (
                                                form.errors.code ||
                                                    form.errors.recovery_code
                                                    ? ' has-error'
                                                    : ''
                                            )
                                        }
                                    >
                                        {isRecovery ? (
                                            <KeyRound
                                                size={19}
                                                className="whl-input-icon"
                                            />
                                        ) : (
                                            <ShieldCheck
                                                size={19}
                                                className="whl-input-icon"
                                            />
                                        )}

                                        {isRecovery ? (
                                            <input
                                                id="recovery_code"
                                                type="text"
                                                name="recovery_code"
                                                autoComplete="off"
                                                spellCheck={false}
                                                autoFocus
                                                required
                                                placeholder="Masukkan kode pemulihan"
                                                value={
                                                    form.data.recovery_code
                                                }
                                                onChange={(event) =>
                                                    form.setData(
                                                        'recovery_code',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        ) : (
                                            <input
                                                id="code"
                                                type="text"
                                                name="code"
                                                inputMode="numeric"
                                                pattern="[0-9]{6}"
                                                maxLength={6}
                                                autoComplete="one-time-code"
                                                autoFocus
                                                required
                                                placeholder="000000"
                                                value={form.data.code}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'code',
                                                        event.target.value
                                                            .replace(/\D/g, '')
                                                            .slice(0, 6)
                                                    )
                                                }
                                            />
                                        )}
                                    </div>

                                    {(form.errors.code ||
                                        form.errors.recovery_code) && (
                                            <p
                                                className="whl-error"
                                                role="alert"
                                            >
                                                {form.errors.code ||
                                                    form.errors.recovery_code}
                                            </p>
                                        )}
                                </div>

                                <button
                                    type="submit"
                                    className="whl-submit"
                                    disabled={
                                        form.processing || !canSubmit
                                    }
                                >
                                    {form.processing ? (
                                        <>
                                            <LoaderCircle
                                                size={19}
                                                className="whl-spinner"
                                            />
                                            Memverifikasi...
                                        </>
                                    ) : (
                                        <>
                                            Verifikasi dan Masuk
                                            <ArrowRight size={19} />
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    className="whl-back-link"
                                    onClick={changeMode}
                                    disabled={form.processing}
                                >
                                    <KeyRound size={16} />

                                    {isRecovery
                                        ? 'Gunakan kode autentikator'
                                        : 'Gunakan kode pemulihan'}
                                </button>
                            </form>

                            <div className="whl-privacy">
                                <ShieldCheck size={18} />

                                <p>
                                    Jangan pernah membagikan
                                    kode verifikasi atau kode
                                    pemulihan kepada siapa pun.
                                </p>
                            </div>

                            <Link
                                href="/"
                                className="whl-back-link"
                            >
                                Kembali ke halaman utama
                            </Link>
                        </div>
                    </div>

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

TwoFactorChallenge.layout = [ChallengeLayout];
