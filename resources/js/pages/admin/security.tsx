
import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    KeyRound,
    LoaderCircle,
    LockKeyhole,
    RefreshCw,
    XCircle,
    ShieldCheck,
    Smartphone,
} from 'lucide-react';

import {
    useState,
    type FormEvent,
} from 'react';

import AdminShell, {
    type AdminHotel,
} from '../../components/admin-shell';

import '../../../css/wehotel-security.css';
import '../../../css/wehotel-security-rotation.css';

type Props = {
    hotel: AdminHotel;
    two_factor: {
        enabled: boolean;
        pending: boolean;
    };
};

type JsonData = {
    confirmed?: boolean;
    svg?: string;
    codes?: string[];
    expires_in_seconds?: number;
    recovery_code_replaced?: boolean;
    message?: string;
    errors?: Record<string, string[]>;
};

/* ==========================================
   CSRF HEADERS
   ========================================== */

function csrfHeaders(): Record<string, string> {
    const metaToken = document
        .querySelector<HTMLMetaElement>(
            'meta[name="csrf-token"]'
        )
        ?.getAttribute('content');

    if (metaToken) {
        return {
            'X-CSRF-TOKEN': metaToken,
        };
    }

    const xsrfCookie = document.cookie
        .split(';')
        .map((item) => item.trim())
        .find((item) =>
            item.startsWith('XSRF-TOKEN=')
        );

    if (xsrfCookie) {
        return {
            'X-XSRF-TOKEN': decodeURIComponent(
                xsrfCookie.substring(
                    'XSRF-TOKEN='.length
                )
            ),
        };
    }

    return {};
}

/* ==========================================
   FORTIFY REQUEST
   ========================================== */

async function fortifyRequest(
    url: string,
    method: 'GET' | 'POST',
    payload?: Record<string, string>
): Promise<JsonData> {
    const response = await fetch(url, {
        method,

        credentials: 'same-origin',

        cache: 'no-store',

        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',

            ...(method === 'POST'
                ? {
                    'Content-Type':
                        'application/json',
                    ...csrfHeaders(),
                }
                : {}),
        },

        ...(method === 'POST'
            ? {
                body: JSON.stringify(
                    payload ?? {}
                ),
            }
            : {}),
    });

    if (response.redirected) {
        throw new Error(
            'Sesi autentikasi perlu diperbarui. Muat ulang halaman dan konfirmasikan kata sandi kembali.'
        );
    }

    // Baca respons walaupun Content-Type berbeda dari application/json.
    // Beberapa respons error atau middleware dapat memakai tipe lain.
    const contentType = response.headers.get('content-type') || 'tidak ada';
    const rawBody = await response.text();
    let parsedBody: unknown = null;

    if (rawBody.trim()) {
        try {
            parsedBody = JSON.parse(rawBody) as unknown;

            // Antisipasi JSON yang terkirim sebagai string berisi JSON.
            if (typeof parsedBody === 'string') {
                const nested = parsedBody.trim();
                if (nested.startsWith('[') || nested.startsWith('{')) {
                    try {
                        parsedBody = JSON.parse(nested) as unknown;
                    } catch {
                        // Biarkan sebagai string dan laporkan format tak dikenal.
                    }
                }
            }
        } catch {
            parsedBody = null;
        }
    }

    const data: JsonData =
        parsedBody !== null &&
            typeof parsedBody === 'object' &&
            !Array.isArray(parsedBody)
            ? (parsedBody as JsonData)
            : {};

    if (!response.ok) {
        if (response.status === 419) {
            throw new Error('Sesi kedaluwarsa. Muat ulang halaman.');
        }

        if (response.status === 429) {
            throw new Error('Terlalu banyak percobaan. Coba kembali beberapa saat lagi.');
        }

        if (response.status === 401 || response.status === 403) {
            throw new Error('Akses tidak diizinkan atau sesi perlu dikonfirmasi ulang.');
        }

        if (response.status === 423) {
            throw new Error(data.message || 'Konfirmasi ulang password administrator diperlukan.');
        }

        const validationMessage = data.errors
            ? Object.values(data.errors).flat().join(' ')
            : '';

        throw new Error(
            validationMessage ||
            data.message ||
            `Permintaan gagal (HTTP ${response.status}).`
        );
    }

    if (url === '/user/two-factor-recovery-codes') {
        // Fortify biasanya mengirim array JSON langsung, bukan { codes: [...] }.
        // Pertahankan dukungan bentuk objek agar lebih tahan perubahan.
        const candidate: unknown = Array.isArray(parsedBody)
            ? parsedBody
            : data.codes;

        if (
            !Array.isArray(candidate) ||
            !candidate.every((item: unknown) => typeof item === 'string')
        ) {
            throw new Error(
                `Respons recovery codes tidak sesuai (HTTP ${response.status}, Content-Type: ${contentType}). ` +
                'Periksa status di tab Network tanpa membagikan isi Response.'
            );
        }

        return { codes: candidate as string[] };
    }

    return data;
}

/* ==========================================
   SECURITY PAGE
   ========================================== */

export default function Security({
    hotel,
    two_factor,
}: Props) {
    const [password, setPassword] =
        useState('');

    const [
        passwordConfirmed,
        setPasswordConfirmed,
    ] = useState(false);

    const [pending, setPending] =
        useState(two_factor.pending);

    const [enabled, setEnabled] =
        useState(two_factor.enabled);

    const [qrSource, setQrSource] =
        useState('');

    const [code, setCode] =
        useState('');

    const [recoveryCodes, setRecoveryCodes] =
        useState<string[]>([]);

    const [busy, setBusy] =
        useState(false);

    const [error, setError] =
        useState('');

    const [notice, setNotice] =
        useState('');

    // Alur penggantian autentikator: tidak memodifikasi secret lama
    // sampai kode dari QR baru berhasil diverifikasi oleh server.
    const [rotationStep, setRotationStep] =
        useState<'idle' | 'verify' | 'scan'>('idle');
    const [rotationFactor, setRotationFactor] =
        useState<'code' | 'recovery'>('code');
    const [rotationProof, setRotationProof] = useState('');
    const [rotationQrSource, setRotationQrSource] = useState('');
    const [rotationCode, setRotationCode] = useState('');

    function clearMessages() {
        setError('');
        setNotice('');
    }

    /* ======================================
       LOAD QR CODE
       ====================================== */

    async function loadQrCode() {
        const data = await fortifyRequest(
            '/user/two-factor-qr-code',
            'GET'
        );

        if (!data.svg) {
            throw new Error(
                'QR Code tidak tersedia. Periksa status aktivasi 2FA.'
            );
        }

        // SVG dari endpoint Fortify ditampilkan
        // sebagai gambar, bukan disisipkan
        // sebagai HTML ke halaman.
        setQrSource(
            'data:image/svg+xml;charset=utf-8,' +
            encodeURIComponent(data.svg)
        );
    }

    /* ======================================
       CONFIRM CURRENT PASSWORD
       ====================================== */

    async function confirmPassword(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!password.trim() || busy) {
            return;
        }

        clearMessages();
        setBusy(true);

        try {
            const data = await fortifyRequest(
                '/user/confirm-password',
                'POST',
                { password }
            );

            if (data.confirmed === false) {
                throw new Error(
                    'Konfirmasi kata sandi tidak berhasil.'
                );
            }

            setPassword('');
            setPasswordConfirmed(true);

            if (pending && !enabled) {
                await loadQrCode();
            }

            setNotice(
                'Kata sandi berhasil dikonfirmasi. Silakan lanjutkan pengaturan keamanan.'
            );
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Konfirmasi kata sandi gagal.'
            );
        } finally {
            setPassword('');
            setBusy(false);
        }
    }

    /* ======================================
       ENABLE TWO-FACTOR
       ====================================== */

    async function enableTwoFactor() {
        if (busy || enabled || pending) {
            return;
        }

        clearMessages();
        setBusy(true);

        try {
            await fortifyRequest(
                '/user/two-factor-authentication',
                'POST'
            );

            setPending(true);

            await loadQrCode();

            setNotice(
                'Pindai QR Code menggunakan aplikasi autentikator, kemudian masukkan kode enam digit untuk menyelesaikan aktivasi.'
            );
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Gagal memulai aktivasi 2FA.'
            );
        } finally {
            setBusy(false);
        }
    }

    /* ======================================
       RESUME PENDING SETUP
       ====================================== */

    async function resumeSetup() {
        if (busy) return;

        clearMessages();
        setBusy(true);

        try {
            await loadQrCode();
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Gagal memuat QR Code.'
            );
        } finally {
            setBusy(false);
        }
    }

    /* ======================================
       LOAD RECOVERY CODES
       ====================================== */

    async function loadRecoveryCodes() {
        const data = await fortifyRequest(
            '/user/two-factor-recovery-codes',
            'GET'
        );

        if (!Array.isArray(data.codes)) {
            throw new Error('Format kode pemulihan tidak dikenali.');
        }

        if (data.codes.length === 0) {
            throw new Error(
                'Server belum mengembalikan kode pemulihan. ' +
                'Jangan logout; periksa apakah recovery codes tersimpan di database.'
            );
        }

        setRecoveryCodes(data.codes);
    }

    /* ======================================
       CONFIRM TWO-FACTOR
       ====================================== */

    async function confirmTwoFactor(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!/^\d{6}$/.test(code) || busy) {
            return;
        }

        clearMessages();
        setBusy(true);

        try {
            await fortifyRequest(
                '/user/confirmed-two-factor-authentication',
                'POST',
                { code }
            );

            setEnabled(true);
            setPending(false);
            setCode('');
            setQrSource('');

            setNotice(
                'Autentikasi dua langkah berhasil diaktifkan.'
            );

            try {
                await loadRecoveryCodes();
            } catch (exception) {
                setError(
                    '2FA sudah aktif. ' +
                    (exception instanceof Error
                        ? exception.message
                        : 'Kode pemulihan belum berhasil dimuat.')
                );
            }
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Kode autentikator tidak valid.'
            );
        } finally {
            setBusy(false);
        }
    }

    /* ======================================
       REVEAL RECOVERY CODES
       ====================================== */

    async function revealRecoveryCodes() {
        if (busy) return;

        clearMessages();
        setBusy(true);

        try {
            await loadRecoveryCodes();
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Gagal memuat kode pemulihan.'
            );
        } finally {
            setBusy(false);
        }
    }

    /* ======================================
       ROTATE / RECOVER AUTHENTICATOR
       ====================================== */

    async function prepareRotation(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy || !rotationProof.trim()) return;
        clearMessages();
        setBusy(true);

        try {
            const proof = rotationProof.trim();

            const payload: Record<string, string> =
                rotationFactor === 'code'
                    ? { code: proof }
                    : { recovery_code: proof };

            const data = await fortifyRequest(
                '/admin/security/authenticator/prepare',
                'POST',
                payload
            );

            if (!data.svg || typeof data.svg !== 'string') {
                throw new Error('QR Code baru tidak diterima dari server.');
            }

            setRotationQrSource(
                'data:image/svg+xml;charset=utf-8,' +
                encodeURIComponent(data.svg)
            );
            setRotationStep('scan');
            setRotationProof('');
            setRotationCode('');

            setNotice(data.recovery_code_replaced
                ? 'QR Code baru disiapkan. Recovery code yang dipakai untuk verifikasi sudah diganti oleh Fortify; setelah selesai, simpan daftar terbaru.'
                : 'QR Code baru siap. Autentikator lama masih aktif sampai QR baru berhasil diverifikasi.');
        } catch (exception) {
            if (exception instanceof Error && exception.message.includes('Konfirmasi ulang password')) {
                setPasswordConfirmed(false);
                setRotationStep('idle');
            }
            setError(exception instanceof Error
                ? exception.message
                : 'Tidak dapat menyiapkan autentikator baru.');
        } finally {
            setBusy(false);
        }
    }

    async function confirmRotation(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy || !/^\d{6}$/.test(rotationCode)) return;
        clearMessages();
        setBusy(true);

        try {
            const data = await fortifyRequest(
                '/admin/security/authenticator/confirm',
                'POST',
                { code: rotationCode }
            );

            setRotationQrSource('');
            setRotationCode('');
            setRotationProof('');
            setRotationStep('idle');
            setEnabled(true);
            setPending(false);
            setRecoveryCodes(Array.isArray(data.codes) ? data.codes : []);
            setNotice('Autentikator baru berhasil diaktifkan. QR lama dan recovery codes lama sudah tidak berlaku. Simpan delapan recovery codes baru di bawah ini sebelum logout.');

            if (!Array.isArray(data.codes)) {
                try {
                    await loadRecoveryCodes();
                } catch {
                    setError('Autentikator sudah berganti, tetapi kode pemulihan belum termuat. Klik Tampilkan Kode Pemulihan untuk mencoba lagi.');
                }
            }
        } catch (exception) {
            if (exception instanceof Error && exception.message.includes('Konfirmasi ulang password')) {
                setPasswordConfirmed(false);
            }
            setError(exception instanceof Error
                ? exception.message
                : 'Penggantian tidak dapat dikonfirmasi. Periksa status 2FA sebelum mencoba ulang.');
        } finally {
            setBusy(false);
        }
    }

    async function cancelRotation() {
        if (busy) return;
        clearMessages();
        setBusy(true);

        try {
            await fortifyRequest(
                '/admin/security/authenticator/cancel',
                'POST'
            );
            setRotationQrSource('');
            setRotationCode('');
            setRotationProof('');
            setRotationStep('idle');
            setNotice('Penggantian dibatalkan. Autentikator lama tetap aktif.');
        } catch (exception) {
            setError(exception instanceof Error
                ? exception.message
                : 'Gagal membatalkan. Muat ulang halaman untuk memulai ulang.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <AdminShell
            hotel={hotel}
            section="security"
        >
            <Head title="Keamanan Akun — WE HOTEL" />

            <main className="whsec-page">
                <header className="whsec-heading">
                    <span className="whsec-eyebrow">
                        WE HOTEL · ACCOUNT SECURITY
                    </span>

                    <h1>
                        Keamanan Akun
                        <span> ✳</span>
                    </h1>

                    <p>
                        Lindungi akun administrator
                        dengan autentikasi dua langkah
                        menggunakan aplikasi autentikator.
                    </p>
                </header>

                <section className="whsec-panel">
                    <div className="whsec-panel-heading">
                        <div className="whsec-panel-icon">
                            <ShieldCheck size={23} />
                        </div>

                        <div>
                            <h2>
                                Two-Factor Authentication
                            </h2>

                            <p>
                                Lapisan keamanan tambahan
                                untuk melindungi akses
                                administrator WE HOTEL.
                            </p>
                        </div>

                        <span
                            className={
                                'whsec-badge ' +
                                (enabled
                                    ? 'is-enabled'
                                    : 'is-disabled')
                            }
                        >
                            {enabled
                                ? '2FA Aktif'
                                : pending
                                    ? 'Belum Dikonfirmasi'
                                    : 'Belum Aktif'}
                        </span>
                    </div>

                    {/* ALERTS */}

                    {error && (
                        <div
                            className="whsec-alert is-error"
                            role="alert"
                        >
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {notice && (
                        <div
                            className="whsec-alert is-success"
                            role="status"
                        >
                            <CheckCircle2 size={18} />
                            <span>{notice}</span>
                        </div>
                    )}

                    {/* PASSWORD VERIFICATION */}

                    {!passwordConfirmed && (
                        <form
                            className="whsec-section"
                            onSubmit={confirmPassword}
                        >
                            <div className="whsec-step-title">
                                <span>01</span>

                                <div>
                                    <h3>
                                        Konfirmasi Kata Sandi
                                    </h3>

                                    <p>
                                        Masukkan kata sandi
                                        administrator untuk
                                        mengakses pengaturan
                                        keamanan.
                                    </p>
                                </div>
                            </div>

                            <label
                                className="whsec-label"
                                htmlFor="security-password"
                            >
                                Kata sandi saat ini
                            </label>

                            <div className="whsec-input-wrap">
                                <LockKeyhole size={18} />

                                <input
                                    id="security-password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(
                                            event.target.value
                                        )
                                    }
                                    required
                                    placeholder="Masukkan kata sandi"
                                />
                            </div>

                            <button
                                type="submit"
                                className="whsec-button"
                                disabled={
                                    busy || !password.trim()
                                }
                            >
                                {busy ? (
                                    <LoaderCircle
                                        className="whsec-spin"
                                        size={17}
                                    />
                                ) : (
                                    <KeyRound size={17} />
                                )}

                                Konfirmasi Kata Sandi
                            </button>
                        </form>
                    )}

                    {/* ACTIVATE 2FA */}

                    {passwordConfirmed &&
                        !enabled &&
                        !pending && (
                            <div className="whsec-section">
                                <div className="whsec-step-title">
                                    <span>02</span>

                                    <div>
                                        <h3>
                                            Aktifkan Autentikator
                                        </h3>

                                        <p>
                                            Hubungkan akun
                                            dengan Google
                                            Authenticator
                                            atau Microsoft
                                            Authenticator.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="whsec-button"
                                    disabled={busy}
                                    onClick={enableTwoFactor}
                                >
                                    {busy ? (
                                        <LoaderCircle
                                            size={17}
                                            className="whsec-spin"
                                        />
                                    ) : (
                                        <Smartphone size={17} />
                                    )}

                                    Mulai Aktivasi 2FA

                                    <ChevronRight size={17} />
                                </button>
                            </div>
                        )}

                    {/* SCAN QR */}

                    {passwordConfirmed &&
                        pending &&
                        !enabled && (
                            <div className="whsec-section">
                                <div className="whsec-step-title">
                                    <span>02</span>

                                    <div>
                                        <h3>
                                            Hubungkan Aplikasi
                                            Autentikator
                                        </h3>

                                        <p>
                                            Pindai QR Code
                                            menggunakan HP,
                                            lalu masukkan
                                            kode enam digit.
                                        </p>
                                    </div>
                                </div>

                                {!qrSource ? (
                                    <button
                                        type="button"
                                        className="whsec-button"
                                        disabled={busy}
                                        onClick={resumeSetup}
                                    >
                                        {busy ? (
                                            <LoaderCircle
                                                size={17}
                                                className="whsec-spin"
                                            />
                                        ) : (
                                            <Smartphone size={17} />
                                        )}

                                        Tampilkan QR Code
                                    </button>
                                ) : (
                                    <>
                                        <div className="whsec-qr">
                                            <img
                                                src={qrSource}
                                                alt="QR Code aktivasi autentikator WE HOTEL"
                                            />
                                        </div>

                                        <p className="whsec-private-note">
                                            QR Code ini bersifat
                                            rahasia. Jangan
                                            membagikannya
                                            kepada siapa pun.
                                        </p>

                                        <form
                                            onSubmit={
                                                confirmTwoFactor
                                            }
                                            className="whsec-code-form"
                                        >
                                            <label
                                                className="whsec-label"
                                                htmlFor="security-code"
                                            >
                                                Kode autentikator
                                            </label>

                                            <input
                                                id="security-code"
                                                className="whsec-code-input"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                maxLength={6}
                                                pattern="[0-9]{6}"
                                                required
                                                placeholder="000000"
                                                value={code}
                                                onChange={(event) =>
                                                    setCode(
                                                        event.target.value
                                                            .replace(/\D/g, '')
                                                            .slice(0, 6)
                                                    )
                                                }
                                            />

                                            <button
                                                type="submit"
                                                className="whsec-button"
                                                disabled={
                                                    busy ||
                                                    !/^\d{6}$/.test(code)
                                                }
                                            >
                                                {busy ? (
                                                    <LoaderCircle
                                                        size={17}
                                                        className="whsec-spin"
                                                    />
                                                ) : (
                                                    <ShieldCheck
                                                        size={17}
                                                    />
                                                )}

                                                Verifikasi dan Aktifkan
                                            </button>
                                        </form>
                                    </>
                                )}
                            </div>
                        )}

                    {/* ACTIVE 2FA */}

                    {passwordConfirmed && enabled && (
                        <div className="whsec-section">
                            <div className="whsec-active">
                                <CheckCircle2 size={24} />

                                <div>
                                    <h3>
                                        Autentikasi Dua
                                        Langkah Aktif
                                    </h3>

                                    <p>
                                        Saat login dari sesi
                                        baru, administrator
                                        perlu memasukkan
                                        kode autentikator.
                                    </p>
                                </div>
                            </div>

                            <div className="whsec-recovery">
                                <h3>
                                    Kode Pemulihan
                                </h3>

                                <p>
                                    Simpan kode-kode ini
                                    di tempat aman yang
                                    terpisah dari HP.
                                    Setiap kode hanya
                                    dapat digunakan sekali.
                                </p>

                                {recoveryCodes.length === 0 ? (
                                    <button
                                        type="button"
                                        className="whsec-button"
                                        disabled={busy}
                                        onClick={
                                            revealRecoveryCodes
                                        }
                                    >
                                        {busy ? (
                                            <LoaderCircle
                                                size={17}
                                                className="whsec-spin"
                                            />
                                        ) : (
                                            <KeyRound size={17} />
                                        )}

                                        Tampilkan Kode Pemulihan
                                    </button>
                                ) : (
                                    <>
                                        <div className="whsec-codes">
                                            {recoveryCodes.map(
                                                (recovery, index) => (
                                                    <code
                                                        key={index}
                                                    >
                                                        {recovery}
                                                    </code>
                                                )
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            className="whsec-secondary"
                                            onClick={() =>
                                                setRecoveryCodes([])
                                            }
                                        >
                                            Sembunyikan Kode
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* AUTHENTICATOR REPLACEMENT */}
                            <div className="whsec-rotation">
                                <div className="whsec-rotation-heading">
                                    <RefreshCw size={19} />
                                    <div>
                                        <h3>Ganti / Pulihkan Autentikator</h3>
                                        <p>Untuk HP baru atau saat aplikasi autentikator lama hilang. QR lama tetap berlaku hingga penggantian selesai.</p>
                                    </div>
                                </div>

                                {rotationStep === 'idle' && (
                                    <button
                                        type="button"
                                        className="whsec-secondary whsec-rotation-button"
                                        disabled={busy}
                                        onClick={() => {
                                            clearMessages();
                                            setRotationFactor('code');
                                            setRotationProof('');
                                            setRecoveryCodes([]);
                                            setRotationStep('verify');
                                        }}
                                    >
                                        <RefreshCw size={17} />
                                        Mulai Ganti / Pulihkan Autentikator
                                    </button>
                                )}

                                {rotationStep === 'verify' && (
                                    <form onSubmit={prepareRotation} className="whsec-rotation-form">
                                        <p className="whsec-rotation-info">
                                            Konfirmasi ulang faktor keamanan sebelum menampilkan QR baru. Password admin sudah dikonfirmasi pada langkah pertama.
                                        </p>

                                        <div className="whsec-rotation-options">
                                            <button
                                                type="button"
                                                className={rotationFactor === 'code' ? 'is-selected' : ''}
                                                onClick={() => { setRotationFactor('code'); setRotationProof(''); }}
                                                disabled={busy}
                                            >
                                                Kode autentikator lama
                                            </button>
                                            <button
                                                type="button"
                                                className={rotationFactor === 'recovery' ? 'is-selected' : ''}
                                                onClick={() => { setRotationFactor('recovery'); setRotationProof(''); }}
                                                disabled={busy}
                                            >
                                                Recovery code
                                            </button>
                                        </div>

                                        <label className="whsec-label" htmlFor="rotation-proof">
                                            {rotationFactor === 'code'
                                                ? 'Masukkan 6 digit dari autentikator lama'
                                                : 'Masukkan recovery code yang belum digunakan'}
                                        </label>
                                        <div className="whsec-input-wrap">
                                            <KeyRound size={18} />
                                            <input
                                                id="rotation-proof"
                                                type="text"
                                                autoComplete="off"
                                                spellCheck={false}
                                                inputMode={rotationFactor === 'code' ? 'numeric' : 'text'}
                                                maxLength={rotationFactor === 'code' ? 6 : 100}
                                                value={rotationProof}
                                                onChange={(event) => setRotationProof(
                                                    rotationFactor === 'code'
                                                        ? event.target.value.replace(/\D/g, '').slice(0, 6)
                                                        : event.target.value
                                                )}
                                                placeholder={rotationFactor === 'code' ? '000000' : 'Recovery code'}
                                                required
                                            />
                                        </div>
                                        <div className="whsec-rotation-actions">
                                            <button
                                                type="submit"
                                                className="whsec-button"
                                                disabled={busy || (
                                                    rotationFactor === 'code'
                                                        ? !/^\d{6}$/.test(rotationProof)
                                                        : !rotationProof.trim()
                                                )}
                                            >
                                                {busy ? <LoaderCircle size={17} className="whsec-spin" /> : <ShieldCheck size={17} />}
                                                Verifikasi &amp; Buat QR Baru
                                            </button>
                                            <button
                                                type="button"
                                                className="whsec-secondary"
                                                disabled={busy}
                                                onClick={() => { setRotationProof(''); setRotationStep('idle'); }}
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {rotationStep === 'scan' && (
                                    <div className="whsec-rotation-form">
                                        <p className="whsec-rotation-info">
                                            Pindai QR ini di aplikasi autentikator baru. QR berlaku 10 menit. <strong>Jangan hapus akun autentikator lama dahulu.</strong>
                                        </p>
                                        <div className="whsec-qr whsec-rotation-qr">
                                            <img src={rotationQrSource} alt="QR Code autentikator pengganti WE HOTEL" />
                                        </div>
                                        <p className="whsec-private-note">
                                            QR Code ini rahasia. Jika tidak jadi mengganti, tekan Batal; 2FA lama tidak berubah.
                                        </p>
                                        <form onSubmit={confirmRotation} className="whsec-code-form">
                                            <label className="whsec-label" htmlFor="rotation-new-code">
                                                Kode 6 digit dari autentikator BARU
                                            </label>
                                            <input
                                                id="rotation-new-code"
                                                className="whsec-code-input"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                pattern="[0-9]{6}"
                                                maxLength={6}
                                                required
                                                value={rotationCode}
                                                placeholder="000000"
                                                onChange={(event) => setRotationCode(
                                                    event.target.value.replace(/\D/g, '').slice(0, 6)
                                                )}
                                            />
                                            <div className="whsec-rotation-actions">
                                                <button
                                                    type="submit"
                                                    className="whsec-button"
                                                    disabled={busy || !/^\d{6}$/.test(rotationCode)}
                                                >
                                                    {busy ? <LoaderCircle size={17} className="whsec-spin" /> : <CheckCircle2 size={17} />}
                                                    Aktifkan Autentikator Baru
                                                </button>
                                                <button
                                                    type="button"
                                                    className="whsec-secondary"
                                                    disabled={busy}
                                                    onClick={cancelRotation}
                                                >
                                                    <XCircle size={17} /> Batal
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                <aside className="whsec-footer-note">
                    <ShieldCheck size={17} />

                    <p>
                        Pengaturan keamanan hanya dapat
                        diakses oleh administrator.
                        Jangan membagikan kata sandi,
                        QR Code, atau recovery codes.
                    </p>
                </aside>
            </main>
        </AdminShell>
    );
}
