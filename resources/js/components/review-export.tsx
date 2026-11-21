
import {
    AlertCircle,
    Download,
    FileSpreadsheet,
    FileText,
    FileType,
    LoaderCircle,
    LockKeyhole,
    ShieldCheck,
    X,
} from 'lucide-react';

import {
    useId,
    useRef,
    useState,
    type FormEvent,
} from 'react';

/* ==========================================
   TYPES
   ========================================== */

type ExportFormat =
    | 'xlsx'
    | 'pdf-summary'
    | 'pdf-detail'
    | 'csv';

type ExportScope = 'filtered' | 'all';

type Filters = {
    search: string;
    star: string;
    from: string;
    to: string;
};

type Props = {
    filters: Filters;
    filteredTotal: number;
    totalReviews: number;
};

/* ==========================================
   EXPORT FORMATS
   ========================================== */

const formats = [
    {
        value: 'xlsx' as const,
        title: 'Microsoft Excel',
        description: '4 worksheet lengkap untuk analisis data',
        extension: '.xlsx',
        icon: FileSpreadsheet,
        color: '#217346',
    },
    {
        value: 'pdf-summary' as const,
        title: 'PDF Ringkasan',
        description: 'Statistik kepuasan dan insight manajemen',
        extension: '.pdf',
        icon: FileText,
        color: '#B6534B',
    },
    {
        value: 'pdf-detail' as const,
        title: 'PDF Detail',
        description: 'Ringkasan dan rincian setiap ulasan tamu',
        extension: '.pdf',
        icon: FileText,
        color: '#B6534B',
    },
    {
        value: 'csv' as const,
        title: 'CSV',
        description: 'Data untuk pengolahan lebih lanjut',
        extension: '.csv',
        icon: FileType,
        color: '#527F9E',
    },
];

const MAX_PDF_DETAIL = 200;
const MAX_EXPORT = 10000;

/* ==========================================
   NUMBER FORMAT
   ========================================== */

function fmt(value: number): string {
    return value.toLocaleString('id-ID');
}

/* ==========================================
   CSRF PROTECTION
   ========================================== */

function csrfHeaders(): Record<string, string> {
    const token = document
        .querySelector<HTMLMetaElement>(
            'meta[name="csrf-token"]'
        )
        ?.getAttribute('content');

    if (token) {
        return {
            'X-CSRF-TOKEN': token,
        };
    }

    const cookie = document.cookie
        .split(';')
        .map((item) => item.trim())
        .find((item) =>
            item.startsWith('XSRF-TOKEN=')
        );

    if (cookie) {
        return {
            'X-XSRF-TOKEN': decodeURIComponent(
                cookie.substring(
                    'XSRF-TOKEN='.length
                )
            ),
        };
    }

    return {};
}

/* ==========================================
   DOWNLOAD FILENAME
   ========================================== */

function getFilename(
    response: Response,
    format: ExportFormat
): string {
    const disposition =
        response.headers.get(
            'Content-Disposition'
        ) || '';

    const encoded = disposition.match(
        /filename\*=UTF-8''([^;]+)/i
    );

    let filename = '';

    if (encoded?.[1]) {
        try {
            filename = decodeURIComponent(
                encoded[1].trim()
            );
        } catch {
            filename = '';
        }
    }

    if (!filename) {
        const plain = disposition.match(
            /filename="?([^";]+)"?/i
        );

        filename = plain?.[1]?.trim() || '';
    }

    const extension = format.startsWith('pdf')
        ? 'pdf'
        : format;

    /*
     * Fallback jika nama file tidak tersedia.
     */
    if (!filename) {
        const timestamp = new Intl.DateTimeFormat(
            'sv-SE',
            {
                timeZone: 'Asia/Jakarta',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }
        )
            .format(new Date())
            .replace(' ', '_')
            .replace(/:/g, '');

        filename =
            `we-hotel-laporan-${timestamp}.${extension}`;
    }

    return filename.replace(
        /[\\/:*?"<>|\u0000-\u001f]/g,
        '-'
    );
}

/* ==========================================
   EXPORT ERROR HANDLING
   ========================================== */

async function getErrorMessage(
    response: Response
): Promise<string> {
    if (response.status === 401) {
        return 'Sesi login telah berakhir. Silakan login kembali.';
    }

    if (response.status === 403) {
        return 'Kamu tidak memiliki izin untuk melakukan export.';
    }

    if (response.status === 419) {
        return 'Sesi telah kedaluwarsa. Muat ulang halaman dan coba kembali.';
    }

    if (response.status === 429) {
        return 'Terlalu banyak permintaan export. Silakan coba kembali beberapa saat lagi.';
    }

    if (response.status === 422) {
        try {
            const result = await response.json();

            const errors = result.errors as
                | Record<string, string[]>
                | undefined;

            if (errors) {
                const messages =
                    Object.values(errors).flat();

                if (messages.length > 0) {
                    return messages.join(' ');
                }
            }

            return (
                result.message ||
                'Pilihan export tidak valid.'
            );
        } catch {
            return 'Pilihan export tidak valid.';
        }
    }

    return 'Laporan gagal dibuat. Silakan coba kembali atau periksa server.';
}

/* ==========================================
   REVIEW EXPORT COMPONENT
   ========================================== */

export default function ReviewExport({
    filters,
    filteredTotal,
    totalReviews,
}: Props) {
    const dialogRef =
        useRef<HTMLDialogElement>(null);

    const titleId = useId();

    const busyRef = useRef(false);

    const [format, setFormat] =
        useState<ExportFormat>('xlsx');

    const [scope, setScope] =
        useState<ExportScope>('filtered');

    const [includePrivate, setIncludePrivate] =
        useState(false);

    const [processing, setProcessing] =
        useState(false);

    const [error, setError] =
        useState('');

    /* ======================================
       SELECTED DATA
       ====================================== */

    const selectedCount =
        scope === 'all'
            ? totalReviews
            : filteredTotal;

    const isPdfSummary =
        format === 'pdf-summary';

    const isPdfDetail =
        format === 'pdf-detail';

    const limit = isPdfDetail
        ? MAX_PDF_DETAIL
        : MAX_EXPORT;

    const exceedsLimit =
        selectedCount > limit;

    const hasFilters = Boolean(
        filters.search ||
        filters.star ||
        filters.from ||
        filters.to
    );

    /* ======================================
       OPEN AND CLOSE MODAL
       ====================================== */

    function openModal() {
        if (busyRef.current) return;

        setFormat('xlsx');
        setScope('filtered');
        setIncludePrivate(false);
        setError('');

        dialogRef.current?.showModal();
    }

    function closeModal() {
        if (busyRef.current) return;

        dialogRef.current?.close();
    }

    function selectFormat(value: ExportFormat) {
        setFormat(value);
        setError('');

        /*
         * PDF Ringkasan tidak membutuhkan
         * informasi privat tamu.
         */
        if (value === 'pdf-summary') {
            setIncludePrivate(false);
        }
    }

    /* ======================================
       DOWNLOAD REPORT
       ====================================== */

    async function submitExport(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            busyRef.current ||
            exceedsLimit
        ) {
            return;
        }

        setError('');

        busyRef.current = true;
        setProcessing(true);

        try {
            /*
             * Sesuaikan payload dengan
             * ReviewExportController.
             */
            const payload: Record<
                string,
                string | boolean
            > = {
                format: format.startsWith('pdf')
                    ? 'pdf'
                    : format,

                scope,

                report_type: isPdfDetail
                    ? 'detail'
                    : 'summary',

                include_private:
                    !isPdfSummary && includePrivate,
            };

            /*
             * Gunakan filter yang sudah
             * diterapkan pada halaman.
             *
             * Bukan input yang belum diterapkan.
             */
            if (scope === 'filtered') {
                if (filters.search) {
                    payload.search = filters.search;
                }

                if (filters.star) {
                    payload.star = String(
                        filters.star
                    );
                }

                if (filters.from) {
                    payload.from = filters.from;
                }

                if (filters.to) {
                    payload.to = filters.to;
                }
            }

            const response = await fetch(
                '/admin/reviews/export',
                {
                    method: 'POST',

                    credentials: 'same-origin',

                    headers: {
                        Accept: 'application/json',

                        'Content-Type':
                            'application/json',

                        'X-Requested-With':
                            'XMLHttpRequest',

                        ...csrfHeaders(),
                    },

                    body: JSON.stringify(payload),
                }
            );

            /*
             * Hindari mengunduh halaman login
             * sebagai file laporan.
             */
            if (response.redirected) {
                throw new Error(
                    'Sesi login mungkin telah berakhir. Muat ulang halaman dan coba kembali.'
                );
            }

            /*
             * Tangani validasi Laravel.
             */
            if (!response.ok) {
                throw new Error(
                    await getErrorMessage(response)
                );
            }

            const contentType =
                response.headers.get(
                    'Content-Type'
                ) || '';

            const disposition =
                response.headers.get(
                    'Content-Disposition'
                ) || '';

            /*
             * Pastikan server mengirim file,
             * bukan halaman HTML atau JSON.
             */
            if (
                contentType.includes('text/html') ||
                contentType.includes('application/json') ||
                !/attachment/i.test(disposition)
            ) {
                throw new Error(
                    'Server tidak mengirimkan file laporan yang valid.'
                );
            }

            const blob = await response.blob();

            if (blob.size === 0) {
                throw new Error(
                    'File laporan yang dihasilkan kosong.'
                );
            }

            const filename = getFilename(
                response,
                format
            );

            const objectUrl =
                window.URL.createObjectURL(blob);

            const anchor =
                document.createElement('a');

            try {
                anchor.href = objectUrl;
                anchor.download = filename;

                document.body.appendChild(anchor);

                anchor.click();
            } finally {
                anchor.remove();

                /*
                 * Berikan kesempatan browser
                 * memulai download sebelum URL
                 * dibersihkan dari memori.
                 */
                window.setTimeout(() => {
                    window.URL.revokeObjectURL(
                        objectUrl
                    );
                }, 1000);
            }

            /*
             * Tutup modal setelah browser
             * menerima file download.
             */
            dialogRef.current?.close();
        } catch (exception) {
            setError(
                exception instanceof TypeError
                    ? 'Koneksi ke server gagal. Periksa koneksi dan coba kembali.'
                    : exception instanceof Error
                        ? exception.message
                        : 'Terjadi kesalahan saat membuat laporan.'
            );
        } finally {
            busyRef.current = false;
            setProcessing(false);
        }
    }

    return (
        <>
            {/* ==============================
                EXPORT TRIGGER
               ============================== */}

            <button
                type="button"
                className="whr-primary-button whr-export-trigger"
                onClick={openModal}
                aria-haspopup="dialog"
            >
                <Download size={16} />

                Export Data
            </button>

            {/* ==============================
                EXPORT MODAL
               ============================== */}

            <dialog
                ref={dialogRef}
                className="whr-export-dialog"
                aria-labelledby={titleId}
                onCancel={(event) => {
                    if (busyRef.current) {
                        event.preventDefault();
                    }
                }}
            >
                <form
                    className="whr-export-form"
                    onSubmit={submitExport}
                    aria-busy={processing}
                >
                    {/* MODAL HEADER */}

                    <div className="whr-export-header">
                        <div className="whr-export-header-icon">
                            <Download size={23} />
                        </div>

                        <div className="whr-export-heading">
                            <h2 id={titleId}>
                                Export Ulasan Tamu
                            </h2>

                            <p>
                                Unduh laporan untuk
                                kebutuhan evaluasi
                                pelayanan hotel.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="whr-export-close"
                            aria-label="Tutup dialog export"
                            onClick={closeModal}
                            disabled={processing}
                        >
                            <X size={19} />
                        </button>
                    </div>

                    {/* MODAL BODY */}

                    <div className="whr-export-body">

                        <fieldset disabled={processing}>

                            {/* FORMAT REPORT */}

                            <legend>
                                FORMAT LAPORAN
                            </legend>

                            <div className="whr-export-formats">
                                {formats.map((item) => {
                                    const Icon = item.icon;

                                    const selected =
                                        format === item.value;

                                    return (
                                        <label
                                            key={item.value}
                                            className={
                                                'whr-export-option' +
                                                (selected
                                                    ? ' is-selected'
                                                    : '')
                                            }
                                        >
                                            <div
                                                className="whr-export-format-icon"
                                                style={{
                                                    color: item.color,
                                                }}
                                            >
                                                <Icon size={23} />
                                            </div>

                                            <div className="whr-export-option-content">
                                                <strong>
                                                    {item.title}
                                                </strong>

                                                <small>
                                                    {item.description}
                                                </small>
                                            </div>

                                            <span className="whr-export-extension">
                                                {item.extension}
                                            </span>

                                            <input
                                                type="radio"
                                                name="export_format"
                                                value={item.value}
                                                checked={selected}
                                                onChange={() =>
                                                    selectFormat(
                                                        item.value
                                                    )
                                                }
                                            />
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {/* EXPORT SCOPE */}

                        <fieldset disabled={processing}>
                            <legend>
                                CAKUPAN DATA
                            </legend>

                            <div className="whr-export-scopes">
                                <label
                                    className={
                                        'whr-export-scope' +
                                        (scope === 'filtered'
                                            ? ' is-selected'
                                            : '')
                                    }
                                >
                                    <input
                                        type="radio"
                                        name="export_scope"
                                        checked={
                                            scope === 'filtered'
                                        }
                                        onChange={() => {
                                            setScope('filtered');
                                            setError('');
                                        }}
                                    />

                                    <div>
                                        <strong>
                                            Sesuai filter aktif
                                        </strong>

                                        <small>
                                            {fmt(filteredTotal)}
                                            {' '}ulasan
                                        </small>
                                    </div>
                                </label>

                                <label
                                    className={
                                        'whr-export-scope' +
                                        (scope === 'all'
                                            ? ' is-selected'
                                            : '')
                                    }
                                >
                                    <input
                                        type="radio"
                                        name="export_scope"
                                        checked={scope === 'all'}
                                        onChange={() => {
                                            setScope('all');
                                            setError('');
                                        }}
                                    />

                                    <div>
                                        <strong>
                                            Seluruh ulasan
                                        </strong>

                                        <small>
                                            {fmt(totalReviews)}
                                            {' '}ulasan
                                        </small>
                                    </div>
                                </label>
                            </div>

                            <p className="whr-export-hint">
                                {scope === 'filtered'
                                    ? hasFilters
                                        ? 'Seluruh hasil filter yang diterapkan akan disertakan, bukan hanya halaman yang sedang dibuka.'
                                        : 'Tidak ada filter aktif. Seluruh ulasan akan disertakan.'
                                    : 'Semua filter pencarian, rating, dan tanggal akan diabaikan.'}
                            </p>
                        </fieldset>

                        {/* PRIVATE DATA */}

                        <div className="whr-export-privacy">
                            <div className="whr-export-privacy-title">
                                <LockKeyhole size={16} />

                                <strong>
                                    Informasi Privat
                                </strong>
                            </div>

                            <label className="whr-export-checkbox">
                                <input
                                    type="checkbox"
                                    checked={
                                        !isPdfSummary &&
                                        includePrivate
                                    }
                                    disabled={
                                        processing ||
                                        isPdfSummary
                                    }
                                    onChange={(event) =>
                                        setIncludePrivate(
                                            event.target.checked
                                        )
                                    }
                                />

                                <span>
                                    Sertakan identitas lengkap,
                                    nomor kamar, dan kontak tamu
                                </span>
                            </label>

                            <p>
                                {isPdfSummary
                                    ? 'PDF Ringkasan tidak menyertakan identitas maupun kontak tamu.'
                                    : 'Kontak hanya disertakan jika tamu memberikan persetujuan untuk dihubungi.'}
                            </p>

                            <p>
                                {includePrivate && !isPdfSummary
                                    ? 'Laporan berisi informasi privat. Jaga kerahasiaan file setelah diunduh.'
                                    : 'Nama tamu disamarkan secara sistematis. Jawaban bebas tetap dapat mengandung informasi pribadi.'}
                            </p>
                        </div>

                        {/* LIMIT INFORMATION */}

                        {isPdfDetail && (
                            <div className="whr-export-notice">
                                <AlertCircle size={17} />

                                <span>
                                    PDF Detail maksimal{' '}
                                    {fmt(MAX_PDF_DETAIL)}
                                    {' '}ulasan dalam satu file.
                                    Gunakan Excel atau
                                    persempit filter jika
                                    jumlahnya melebihi batas.
                                </span>
                            </div>
                        )}

                        {exceedsLimit && (
                            <div
                                className="whr-export-error"
                                role="alert"
                            >
                                <AlertCircle size={17} />

                                <span>
                                    Terdapat{' '}
                                    {fmt(selectedCount)}
                                    {' '}ulasan, melebihi
                                    batas export{' '}
                                    {fmt(limit)}
                                    {' '}ulasan.
                                </span>
                            </div>
                        )}

                        {/* SERVER ERROR */}

                        {error && (
                            <div
                                className="whr-export-error"
                                role="alert"
                            >
                                <AlertCircle size={17} />

                                <span>
                                    {error}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* MODAL FOOTER */}

                    <div className="whr-export-footer">

                        <div className="whr-export-total">
                            <ShieldCheck size={17} />

                            <span>
                                <strong>
                                    {fmt(selectedCount)}
                                    {' '}ulasan
                                </strong>

                                <small>
                                    akan disertakan
                                </small>
                            </span>
                        </div>

                        <div className="whr-export-actions">
                            <button
                                type="button"
                                className="whr-export-cancel"
                                onClick={closeModal}
                                disabled={processing}
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                className="whr-export-download"
                                disabled={
                                    processing ||
                                    exceedsLimit
                                }
                            >
                                {processing ? (
                                    <LoaderCircle
                                        size={17}
                                        className="whr-export-spinner"
                                    />
                                ) : (
                                    <Download size={17} />
                                )}

                                {processing
                                    ? 'Membuat laporan...'
                                    : 'Download Laporan'}
                            </button>
                        </div>

                        {processing && (
                            <div
                                className="whr-export-processing"
                                role="status"
                            >
                                Dokumen sedang diproses.
                                Jangan tutup halaman ini.
                            </div>
                        )}
                    </div>
                </form>
            </dialog>
        </>
    );
}
