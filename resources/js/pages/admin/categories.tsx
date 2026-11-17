
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowDownUp,
    BedDouble,
    Building2,
    Check,
    Coffee,
    HeartHandshake,
    Pencil,
    Plus,
    ShieldCheck,
    Sparkles,
    Star,
    Trash2,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

import AdminShell from '../../components/admin-shell';
import type { AdminHotel } from '../../components/admin-shell';
import '../../../css/wehotel-categories.css';

type Category = {
    id: number;
    slug: string;
    name_id: string;
    name_en: string;
    description_id: string | null;
    description_en: string | null;
    icon_key: string;
    sort_order: number;
    allow_not_applicable: boolean;
    is_active: boolean;
    ratings_count: number;
};

type Props = {
    hotel: AdminHotel;
    categories: Category[];
};

type CategoryForm = {
    name_id: string;
    name_en: string;
    description_id: string;
    description_en: string;
    icon_key: string;
    sort_order: number;
    allow_not_applicable: boolean;
    is_active: boolean;
};

const icons = [
    {
        key: 'heart-handshake',
        label: 'Pelayanan',
        Icon: HeartHandshake,
    },
    {
        key: 'sparkles',
        label: 'Kebersihan',
        Icon: Sparkles,
    },
    {
        key: 'bed',
        label: 'Kenyamanan',
        Icon: BedDouble,
    },
    {
        key: 'building',
        label: 'Fasilitas',
        Icon: Building2,
    },
    {
        key: 'coffee',
        label: 'Resto',
        Icon: Coffee,
    },
    {
        key: 'star',
        label: 'Umum',
        Icon: Star,
    },
] as const;

function emptyForm(nextOrder: number): CategoryForm {
    return {
        name_id: '',
        name_en: '',
        description_id: '',
        description_en: '',
        icon_key: 'star',
        sort_order: nextOrder,
        allow_not_applicable: false,
        is_active: true,
    };
}

export default function Categories({
    hotel,
    categories,
}: Props) {
    const [editing, setEditing] = useState<Category | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const [filter, setFilter] = useState<
        'all' | 'active' | 'inactive'
    >('all');

    const [query, setQuery] = useState('');
    const [notice, setNotice] = useState('');

    const [toggleId, setToggleId] = useState<number | null>(null);

    // State untuk menghapus kategori
    const [deleting, setDeleting] = useState<Category | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const nextOrder =
        Math.max(
            0,
            ...categories.map((item) => item.sort_order)
        ) + 1;

    const form = useForm<CategoryForm>(
        emptyForm(nextOrder)
    );

    const activeCount = categories.filter(
        (item) => item.is_active
    ).length;

    const visible = categories.filter((category) => {
        if (filter === 'active' && !category.is_active) {
            return false;
        }

        if (filter === 'inactive' && category.is_active) {
            return false;
        }

        const term = query.trim().toLowerCase();

        return (
            !term ||
            [
                category.name_id,
                category.name_en,
                category.slug,
            ].some((value) =>
                value.toLowerCase().includes(term)
            )
        );
    });

    // Membuka modal tambah kategori
    function startCreate() {
        form.clearErrors();
        form.setData(emptyForm(nextOrder));

        setEditing(null);
        setModalOpen(true);
        setNotice('');
    }

    // Membuka modal edit kategori
    function startEdit(category: Category) {
        form.clearErrors();

        form.setData({
            name_id: category.name_id,
            name_en: category.name_en,
            description_id: category.description_id ?? '',
            description_en: category.description_en ?? '',
            icon_key: category.icon_key,
            sort_order: category.sort_order,
            allow_not_applicable:
                category.allow_not_applicable,
            is_active: category.is_active,
        });

        setEditing(category);
        setModalOpen(true);
        setNotice('');
    }

    // Menyimpan kategori baru atau perubahan
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const options = {
            preserveScroll: true,

            onSuccess: () => {
                setModalOpen(false);

                setNotice(
                    editing
                        ? 'Kategori berhasil diperbarui.'
                        : 'Kategori baru berhasil ditambahkan.'
                );
            },
        };

        if (editing) {
            form.put(
                `/admin/categories/${editing.id}`,
                options
            );
        } else {
            form.post('/admin/categories', options);
        }
    }

    // Mengaktifkan atau menonaktifkan kategori
    function toggle(category: Category) {
        setNotice('');
        setToggleId(category.id);

        router.patch(
            `/admin/categories/${category.id}/toggle`,
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    setNotice(
                        'Status kategori berhasil diubah.'
                    );
                },

                onError: (errors) => {
                    setNotice(
                        errors.is_active ||
                        'Gagal mengubah status kategori.'
                    );
                },

                onFinish: () => {
                    setToggleId(null);
                },
            }
        );
    }

    // Menghapus kategori setelah konfirmasi
    function confirmDelete() {
        if (!deleting || deleteBusy) {
            return;
        }

        setDeleteError('');
        setDeleteBusy(true);

        router.delete(
            `/admin/categories/${deleting.id}`,
            {
                preserveScroll: true,

                onSuccess: () => {
                    setDeleting(null);

                    setNotice(
                        'Kategori berhasil dihapus permanen.'
                    );
                },

                onError: (errors) => {
                    setDeleteError(
                        errors.category ||
                        errors.is_active ||
                        'Kategori gagal dihapus.'
                    );
                },

                onFinish: () => {
                    setDeleteBusy(false);
                },
            }
        );
    }

    return (
        <AdminShell
            hotel={hotel}
            section="categories"
        >
            <Head title="Kategori Penilaian — WE HOTEL" />

            <section className="whc-page">
                <div className="whc-eyebrow">
                    WE HOTEL · PENGATURAN
                </div>

                <div className="whc-heading">
                    <div>
                        <h1>
                            Kategori Penilaian{' '}
                            <span>✳</span>
                        </h1>

                        <p>
                            Atur aspek bintang yang akan
                            dinilai oleh tamu pada halaman
                            review.
                        </p>
                    </div>

                    <button
                        className="whc-primary"
                        type="button"
                        onClick={startCreate}
                    >
                        <Plus size={17} />
                        Tambah Kategori
                    </button>
                </div>

                {/* RINGKASAN KATEGORI */}
                <div className="whc-summary">
                    <div>
                        <span>Total kategori</span>
                        <strong>
                            {categories.length}
                        </strong>
                    </div>

                    <div>
                        <span>Kategori aktif</span>
                        <strong>
                            {activeCount}
                        </strong>
                    </div>

                    <div>
                        <span>Nonaktif</span>
                        <strong>
                            {categories.length - activeCount}
                        </strong>
                    </div>

                    <div className="whc-summary-info">
                        <ShieldCheck size={20} />

                        Ulasan lama tidak akan terhapus
                        saat kategori dinonaktifkan.
                    </div>
                </div>

                {/* DAFTAR KATEGORI */}
                <div className="whc-card">
                    <div className="whc-card-head">
                        <div>
                            <h2>Daftar kategori</h2>

                            <p>
                                Kategori aktif akan muncul
                                sesuai urutan pada formulir tamu.
                            </p>
                        </div>

                        <div className="whc-tools">
                            <input
                                aria-label="Cari kategori"
                                placeholder="Cari kategori..."
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                            />

                            <select
                                aria-label="Filter kategori"
                                value={filter}
                                onChange={(event) =>
                                    setFilter(
                                        event.target.value as typeof filter
                                    )
                                }
                            >
                                <option value="all">
                                    Semua status
                                </option>

                                <option value="active">
                                    Aktif
                                </option>

                                <option value="inactive">
                                    Nonaktif
                                </option>
                            </select>
                        </div>
                    </div>

                    {notice && (
                        <div
                            className="whc-notice"
                            role="status"
                        >
                            {notice}
                        </div>
                    )}

                    <div className="whc-list">
                        {visible.length === 0 && (
                            <p className="whc-empty">
                                Tidak ada kategori yang cocok
                                dengan pencarian.
                            </p>
                        )}

                        {visible.map((category) => {
                            const found = icons.find(
                                (icon) =>
                                    icon.key === category.icon_key
                            );

                            const Icon = found?.Icon ?? Star;

                            const cannotDelete =
                                category.ratings_count > 0 ||
                                (
                                    category.is_active &&
                                    activeCount === 1
                                );

                            return (
                                <article
                                    className="whc-item"
                                    key={category.id}
                                >
                                    <div className="whc-category-icon">
                                        <Icon size={21} />
                                    </div>

                                    <div className="whc-category-text">
                                        <div className="whc-title-line">
                                            <h3>
                                                {category.name_id}
                                            </h3>

                                            <span
                                                className={
                                                    category.is_active
                                                        ? 'whc-status active'
                                                        : 'whc-status'
                                                }
                                            >
                                                {category.is_active
                                                    ? 'Aktif'
                                                    : 'Nonaktif'}
                                            </span>
                                        </div>

                                        <p className="whc-english">
                                            {category.name_en}
                                        </p>

                                        <p>
                                            {category.description_id ||
                                                'Belum ada deskripsi.'}
                                        </p>

                                        <div className="whc-meta">
                                            <span>
                                                <ArrowDownUp size={13} />
                                                Urutan{' '}
                                                {category.sort_order}
                                            </span>

                                            <span>
                                                {category.ratings_count}{' '}
                                                penilaian tersimpan
                                            </span>

                                            {category.allow_not_applicable && (
                                                <span>
                                                    Tidak Menggunakan
                                                    Layanan diizinkan
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* AKSI KATEGORI */}
                                    <div className="whc-item-actions">
                                        <button
                                            type="button"
                                            className="whc-edit"
                                            onClick={() =>
                                                startEdit(category)
                                            }
                                        >
                                            <Pencil size={15} />
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            className="whc-delete"
                                            disabled={cannotDelete}
                                            title={
                                                category.ratings_count > 0
                                                    ? 'Kategori sudah memiliki penilaian. Nonaktifkan saja.'
                                                    : (
                                                        category.is_active &&
                                                        activeCount === 1
                                                    )
                                                        ? 'Kategori aktif terakhir tidak dapat dihapus.'
                                                        : `Hapus kategori ${category.name_id}`
                                            }
                                            aria-label={
                                                `Hapus kategori ${category.name_id}`
                                            }
                                            onClick={() => {
                                                setDeleteError('');
                                                setDeleting(category);
                                            }}
                                        >
                                            <Trash2 size={15} />
                                            Hapus
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                category.is_active
                                                    ? 'whc-toggle active'
                                                    : 'whc-toggle'
                                            }
                                            disabled={
                                                toggleId !== null ||
                                                (
                                                    category.is_active &&
                                                    activeCount === 1
                                                )
                                            }
                                            onClick={() =>
                                                toggle(category)
                                            }
                                            aria-label={
                                                `${category.is_active
                                                    ? 'Nonaktifkan'
                                                    : 'Aktifkan'
                                                } ${category.name_id}`
                                            }
                                            title={
                                                category.is_active &&
                                                    activeCount === 1
                                                    ? 'Minimal satu kategori harus aktif'
                                                    : undefined
                                            }
                                            aria-pressed={
                                                category.is_active
                                            }
                                        >
                                            <i />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* MODAL KONFIRMASI HAPUS */}
            {deleting && (
                <div
                    className="whc-modal-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !deleteBusy
                        ) {
                            setDeleting(null);
                        }
                    }}
                >
                    <div
                        className="whc-modal whc-delete-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="whc-delete-title"
                        aria-describedby="whc-delete-desc"
                    >
                        <div className="whc-modal-head">
                            <div>
                                <span>
                                    WE HOTEL · KONFIRMASI
                                </span>

                                <h2 id="whc-delete-title">
                                    Hapus kategori?
                                </h2>
                            </div>

                            <button
                                type="button"
                                aria-label="Tutup"
                                disabled={deleteBusy}
                                onClick={() =>
                                    setDeleting(null)
                                }
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="whc-delete-body">
                            <p id="whc-delete-desc">
                                Kategori{' '}
                                <strong>
                                    {deleting.name_id}
                                </strong>{' '}
                                akan dihapus secara permanen.
                                Tindakan ini tidak dapat dibatalkan.
                            </p>

                            <p className="whc-delete-explain">
                                Kategori yang sudah memiliki
                                penilaian tidak dapat dihapus
                                agar data review lama tetap aman.
                            </p>

                            {deleteError && (
                                <p
                                    className="whc-error"
                                    role="alert"
                                >
                                    {deleteError}
                                </p>
                            )}

                            <div className="whc-modal-actions">
                                <button
                                    type="button"
                                    className="whc-cancel"
                                    disabled={deleteBusy}
                                    onClick={() =>
                                        setDeleting(null)
                                    }
                                >
                                    Batal
                                </button>

                                <button
                                    type="button"
                                    className="whc-delete-danger"
                                    disabled={deleteBusy}
                                    onClick={confirmDelete}
                                >
                                    <Trash2 size={16} />

                                    {deleteBusy
                                        ? 'Menghapus...'
                                        : 'Ya, Hapus Permanen'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH / EDIT */}
            {modalOpen && (
                <div
                    className="whc-modal-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !form.processing
                        ) {
                            setModalOpen(false);
                        }
                    }}
                >
                    <div
                        className="whc-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="whc-modal-title"
                    >
                        <div className="whc-modal-head">
                            <div>
                                <span>
                                    WE HOTEL · KATEGORI
                                </span>

                                <h2 id="whc-modal-title">
                                    {editing
                                        ? 'Edit kategori penilaian'
                                        : 'Tambah kategori penilaian'}
                                </h2>
                            </div>

                            <button
                                type="button"
                                aria-label="Tutup"
                                disabled={form.processing}
                                onClick={() =>
                                    setModalOpen(false)
                                }
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={submit}
                            className="whc-form"
                        >
                            {/* NAMA INDONESIA / INGGRIS */}
                            <div className="whc-two-columns">
                                <label>
                                    Nama kategori (Indonesia) *

                                    <input
                                        value={form.data.name_id}
                                        onChange={(event) =>
                                            form.setData(
                                                'name_id',
                                                event.target.value
                                            )
                                        }
                                        maxLength={150}
                                        required
                                        placeholder="Contoh: Keamanan"
                                    />

                                    {form.errors.name_id && (
                                        <small className="whc-error">
                                            {form.errors.name_id}
                                        </small>
                                    )}
                                </label>

                                <label>
                                    Category name (English) *

                                    <input
                                        value={form.data.name_en}
                                        onChange={(event) =>
                                            form.setData(
                                                'name_en',
                                                event.target.value
                                            )
                                        }
                                        maxLength={150}
                                        required
                                        placeholder="Example: Security"
                                    />

                                    {form.errors.name_en && (
                                        <small className="whc-error">
                                            {form.errors.name_en}
                                        </small>
                                    )}
                                </label>
                            </div>

                            {/* DESKRIPSI */}
                            <div className="whc-two-columns">
                                <label>
                                    Deskripsi (Indonesia)

                                    <textarea
                                        value={
                                            form.data.description_id
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                'description_id',
                                                event.target.value
                                            )
                                        }
                                        maxLength={500}
                                        rows={3}
                                        placeholder="Contoh: Keamanan kamar, akses hotel, dan parkir."
                                    />

                                    {form.errors.description_id && (
                                        <small className="whc-error">
                                            {form.errors.description_id}
                                        </small>
                                    )}
                                </label>

                                <label>
                                    Description (English)

                                    <textarea
                                        value={
                                            form.data.description_en
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                'description_en',
                                                event.target.value
                                            )
                                        }
                                        maxLength={500}
                                        rows={3}
                                        placeholder="Example: Room safety, hotel access and parking."
                                    />

                                    {form.errors.description_en && (
                                        <small className="whc-error">
                                            {form.errors.description_en}
                                        </small>
                                    )}
                                </label>
                            </div>

                            {/* IKON DAN URUTAN */}
                            <div className="whc-two-columns">
                                <label>
                                    Ikon kategori

                                    <select
                                        value={form.data.icon_key}
                                        onChange={(event) =>
                                            form.setData(
                                                'icon_key',
                                                event.target.value
                                            )
                                        }
                                    >
                                        {icons.map(
                                            ({ key, label }) => (
                                                <option
                                                    key={key}
                                                    value={key}
                                                >
                                                    {label}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    {form.errors.icon_key && (
                                        <small className="whc-error">
                                            {form.errors.icon_key}
                                        </small>
                                    )}
                                </label>

                                <label>
                                    Urutan tampil

                                    <input
                                        type="number"
                                        value={
                                            form.data.sort_order
                                        }
                                        min={0}
                                        max={65535}
                                        onChange={(event) =>
                                            form.setData(
                                                'sort_order',
                                                Number(
                                                    event.target.value
                                                )
                                            )
                                        }
                                    />

                                    {form.errors.sort_order && (
                                        <small className="whc-error">
                                            {form.errors.sort_order}
                                        </small>
                                    )}
                                </label>
                            </div>

                            {/* STATUS DAN PENGECUALIAN */}
                            <div className="whc-switches">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={
                                            form.data.is_active
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                'is_active',
                                                event.target.checked
                                            )
                                        }
                                    />

                                    Kategori aktif di formulir tamu
                                </label>

                                <label>
                                    <input
                                        type="checkbox"
                                        checked={
                                            form.data.allow_not_applicable
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                'allow_not_applicable',
                                                event.target.checked
                                            )
                                        }
                                    />

                                    Boleh memilih
                                    “Tidak Menggunakan Layanan”
                                </label>
                            </div>

                            {form.errors.is_active && (
                                <p className="whc-error">
                                    {form.errors.is_active}
                                </p>
                            )}

                            <p className="whc-help">
                                Kategori yang sudah memiliki
                                penilaian tidak dihapus,
                                agar laporan historis tetap utuh.
                                Nama dan deskripsi ditampilkan
                                sesuai bahasa tamu.
                            </p>

                            <div className="whc-modal-actions">
                                <button
                                    type="button"
                                    className="whc-cancel"
                                    disabled={form.processing}
                                    onClick={() =>
                                        setModalOpen(false)
                                    }
                                >
                                    Batal
                                </button>

                                <button
                                    type="submit"
                                    className="whc-primary"
                                    disabled={form.processing}
                                >
                                    <Check size={17} />

                                    {form.processing
                                        ? 'Menyimpan...'
                                        : 'Simpan Kategori'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminShell>
    );
}
