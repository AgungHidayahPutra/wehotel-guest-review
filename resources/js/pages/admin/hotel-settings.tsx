
import { Head, Link, useForm } from '@inertiajs/react';

import {
    ArrowUpRight,
    Check,
    Image as ImageIcon,
    RotateCcw,
    Save,
    Settings2,
    ShieldCheck,
    UploadCloud,
} from 'lucide-react';

import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from 'react';

import AdminShell, {
    type AdminHotel,
} from '../../components/admin-shell';

import '../../../css/wehotel-hotel-settings.css';

type Settings = {
    hotel_name: string;
    logo_url: string;
    hero_image_url: string;
    has_custom_logo: boolean;
    has_custom_hero: boolean;
};

type Props = {
    hotel: AdminHotel;
    settings: Settings;
};

type SettingsForm = {
    hotel_name: string;
    logo: File | null;
    hero_image: File | null;
    remove_logo: boolean;
    remove_hero_image: boolean;
};

export default function HotelSettings({
    hotel,
    settings,
}: Props) {
    const form = useForm<SettingsForm>({
        hotel_name: settings.hotel_name,
        logo: null,
        hero_image: null,
        remove_logo: false,
        remove_hero_image: false,
    });

    const {
        data,
        setData,
        processing,
        errors,
        recentlySuccessful,
    } = form;

    const logoInput = useRef<HTMLInputElement>(null);
    const heroInput = useRef<HTMLInputElement>(null);

    const [logoPreview, setLogoPreview] =
        useState<string | null>(null);

    const [heroPreview, setHeroPreview] =
        useState<string | null>(null);

    // Preview logo yang dipilih.
    useEffect(() => {
        if (!data.logo) {
            setLogoPreview(null);
            return;
        }

        const url = URL.createObjectURL(data.logo);
        setLogoPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [data.logo]);

    // Preview foto utama yang dipilih.
    useEffect(() => {
        if (!data.hero_image) {
            setHeroPreview(null);
            return;
        }

        const url = URL.createObjectURL(
            data.hero_image
        );

        setHeroPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [data.hero_image]);

    const defaultLogo =
        '/images/wehotel/hotel-logo.png';

    const defaultHero =
        '/images/wehotel/hotel-front.jpeg';

    const currentLogo =
        logoPreview ??
        (data.remove_logo
            ? defaultLogo
            : settings.logo_url);

    const currentHero =
        heroPreview ??
        (data.remove_hero_image
            ? defaultHero
            : settings.hero_image_url);

    function selectLogo(file: File | null) {
        if (!file) return;

        setData((previous) => ({
            ...previous,
            logo: file,
            remove_logo: false,
        }));
    }

    function selectHero(file: File | null) {
        if (!file) return;

        setData((previous) => ({
            ...previous,
            hero_image: file,
            remove_hero_image: false,
        }));
    }

    function restoreLogo() {
        setData((previous) => ({
            ...previous,
            logo: null,
            remove_logo: !previous.remove_logo,
        }));

        if (logoInput.current) {
            logoInput.current.value = '';
        }
    }

    function restoreHero() {
        setData((previous) => ({
            ...previous,
            hero_image: null,
            remove_hero_image: !previous.remove_hero_image,
        }));

        if (heroInput.current) {
            heroInput.current.value = '';
        }
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (processing) return;

        form.clearErrors();

        form.post('/admin/hotel-settings', {
            forceFormData: true,
            preserveScroll: true,

            onSuccess: () => {
                if (logoInput.current) {
                    logoInput.current.value = '';
                }

                if (heroInput.current) {
                    heroInput.current.value = '';
                }

                // Bersihkan hanya input upload.
                // Nama hotel yang disimpan tetap ada.
                setData((previous) => ({
                    ...previous,
                    logo: null,
                    hero_image: null,
                    remove_logo: false,
                    remove_hero_image: false,
                }));
            },

            onError: (validationErrors) => {
                console.error(
                    'Gagal menyimpan pengaturan:',
                    validationErrors
                );
            },
        });
    }

    return (
        <AdminShell
            hotel={hotel}
            section="hotel-settings"
        >
            <Head
                title={`Pengaturan Hotel — ${hotel.hotel_name}`}
            />

            <form
                className="whs-page"
                onSubmit={submit}
            >
                {/* HEADER */}
                <div className="whs-heading">
                    <div>
                        <p className="whs-eyebrow">
                            WE HOTEL · PENGATURAN
                        </p>

                        <h1>
                            Pengaturan Hotel
                            <span>✳</span>
                        </h1>

                        <p>
                            Kelola identitas, logo,
                            dan foto utama hotel.
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="whs-preview-link"
                    >
                        Lihat halaman tamu
                        <ArrowUpRight size={15} />
                    </Link>
                </div>

                {/* INFORMASI */}
                <div className="whs-info">
                    <ShieldCheck size={18} />

                    <span>
                        Perubahan hanya diterapkan
                        setelah disimpan oleh admin.
                        Review dan data tamu
                        tidak akan berubah.
                    </span>
                </div>

                {/* PESAN VALIDASI */}
                {Object.keys(errors).length > 0 && (
                    <div
                        className="whs-validation-alert"
                        role="alert"
                    >
                        <strong>
                            Pengaturan belum berhasil
                            disimpan.
                        </strong>

                        <ul>
                            {Object.entries(errors).map(
                                ([field, message]) => (
                                    <li key={field}>
                                        {message}
                                    </li>
                                )
                            )}
                        </ul>
                    </div>
                )}

                {/* IDENTITAS HOTEL */}
                <section className="whs-card">
                    <div className="whs-card-heading">
                        <div className="whs-icon">
                            <Settings2 size={20} />
                        </div>

                        <div>
                            <h2>Identitas Hotel</h2>

                            <p>
                                Informasi yang digunakan
                                pada halaman tamu
                                dan dashboard admin.
                            </p>
                        </div>
                    </div>

                    <div className="whs-field">
                        <label htmlFor="hotel_name">
                            Nama Hotel
                            <span> *</span>
                        </label>

                        <input
                            id="hotel_name"
                            type="text"
                            maxLength={120}
                            value={data.hotel_name}
                            onChange={(event) =>
                                setData(
                                    'hotel_name',
                                    event.target.value
                                )
                            }
                            placeholder="WE HOTEL"
                            required
                        />

                        {errors.hotel_name && (
                            <small className="whs-error">
                                {errors.hotel_name}
                            </small>
                        )}
                    </div>
                </section>

                {/* PENGATURAN GAMBAR */}
                <div className="whs-media-grid">

                    {/* LOGO HOTEL */}
                    <section className="whs-card">
                        <div className="whs-card-heading">
                            <div className="whs-icon">
                                <ImageIcon size={20} />
                            </div>

                            <div>
                                <h2>Logo Hotel</h2>

                                <p>
                                    Identitas visual
                                    WE HOTEL.
                                </p>
                            </div>
                        </div>

                        <div className="whs-logo-preview">
                            <img
                                src={currentLogo}
                                alt="Preview logo hotel"
                            />
                        </div>

                        <label
                            htmlFor="hotel_logo"
                            className="whs-upload-label"
                        >
                            <UploadCloud size={17} />
                            Pilih logo baru
                        </label>

                        <input
                            ref={logoInput}
                            id="hotel_logo"
                            className="whs-file-input"
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp"
                            onChange={(event) =>
                                selectLogo(
                                    event.target.files?.[0]
                                    ?? null
                                )
                            }
                        />

                        {data.logo && (
                            <p className="whs-filename">
                                {data.logo.name}
                            </p>
                        )}

                        {errors.logo && (
                            <small className="whs-error">
                                {errors.logo}
                            </small>
                        )}

                        <p className="whs-helper">
                            PNG, JPG atau WebP.
                            Maksimal 3 MB.
                        </p>

                        {(settings.has_custom_logo ||
                            data.logo !== null) && (
                                <button
                                    type="button"
                                    className="whs-reset-link"
                                    onClick={restoreLogo}
                                >
                                    <RotateCcw size={14} />

                                    {data.remove_logo
                                        ? 'Batalkan pengembalian'
                                        : 'Gunakan logo bawaan'}
                                </button>
                            )}
                    </section>

                    {/* FOTO UTAMA */}
                    <section className="whs-card">
                        <div className="whs-card-heading">
                            <div className="whs-icon">
                                <ImageIcon size={20} />
                            </div>

                            <div>
                                <h2>Foto Utama</h2>

                                <p>
                                    Foto bangunan pada
                                    halaman review tamu.
                                </p>
                            </div>
                        </div>

                        <div className="whs-hero-preview">
                            <img
                                src={currentHero}
                                alt="Preview bangunan hotel"
                            />

                            <div>
                                <span>WE HOTEL</span>

                                <strong>
                                    Guest Experience
                                </strong>
                            </div>
                        </div>

                        <label
                            htmlFor="hotel_hero"
                            className="whs-upload-label"
                        >
                            <UploadCloud size={17} />
                            Pilih foto baru
                        </label>

                        <input
                            ref={heroInput}
                            id="hotel_hero"
                            className="whs-file-input"
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp"
                            onChange={(event) =>
                                selectHero(
                                    event.target.files?.[0]
                                    ?? null
                                )
                            }
                        />

                        {data.hero_image && (
                            <p className="whs-filename">
                                {data.hero_image.name}
                            </p>
                        )}

                        {errors.hero_image && (
                            <small className="whs-error">
                                {errors.hero_image}
                            </small>
                        )}

                        <p className="whs-helper">
                            PNG, JPG atau WebP.
                            Maksimal 6 MB.
                            Disarankan foto vertikal.
                        </p>

                        {(settings.has_custom_hero ||
                            data.hero_image !== null) && (
                                <button
                                    type="button"
                                    className="whs-reset-link"
                                    onClick={restoreHero}
                                >
                                    <RotateCcw size={14} />

                                    {data.remove_hero_image
                                        ? 'Batalkan pengembalian'
                                        : 'Gunakan foto bawaan'}
                                </button>
                            )}
                    </section>
                </div>

                {/* TOMBOL SIMPAN */}
                <div className="whs-save-bar">
                    <div className="whs-save-status">
                        {recentlySuccessful ? (
                            <span className="whs-success">
                                <Check size={16} />
                                Pengaturan berhasil disimpan.
                            </span>
                        ) : (
                            <span>
                                <ShieldCheck size={16} />
                                Hanya admin dapat
                                mengubah pengaturan ini.
                            </span>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="whs-save-button"
                        disabled={processing}
                    >
                        <Save size={17} />

                        {processing
                            ? 'Menyimpan...'
                            : 'Simpan Pengaturan'}
                    </button>
                </div>

                {/* PROGRESS UPLOAD */}
                {form.progress && (
                    <div className="whs-progress">
                        <div
                            style={{
                                width:
                                    `${form.progress.percentage}%`,
                            }}
                        />

                        <span>
                            Upload {form.progress.percentage}%
                        </span>
                    </div>
                )}
            </form>
        </AdminShell>
    );
}
