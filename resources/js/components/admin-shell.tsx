import { Link, router } from '@inertiajs/react';

import {
    ArrowLeft,
    Building2,
    ChartNoAxesCombined,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings2,
    ShieldCheck,
    X,
} from 'lucide-react';

import {
    useState,
    type ReactNode,
} from 'react';

import '../../css/wehotel-admin.css';

/* ==========================================
   TYPES
   ========================================== */

export type AdminHotel = {
    hotel_name: string;
    logo_url: string | null;
};

type Section =
    | 'dashboard'
    | 'reviews'
    | 'analytics'
    | 'categories'
    | 'hotel-settings';

type Props = {
    hotel: AdminHotel;
    section: Section;
    count?: number;
    children: ReactNode;
};

/* ==========================================
   NAVIGATION
   ========================================== */

const menu = [
    {
        section: 'dashboard',
        label: 'Ringkasan',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
    },
    {
        section: 'reviews',
        label: 'Semua Ulasan',
        href: '/admin/reviews',
        icon: ClipboardList,
    },
    {
        section: 'analytics',
        label: 'Analitik',
        href: '/admin/analytics',
        icon: ChartNoAxesCombined,
    },
] as const;

const settingsMenu = [
    {
        section: 'categories',
        label: 'Kategori Penilaian',
        href: '/admin/categories',
        icon: Settings2,
    },
    {
        section: 'hotel-settings',
        label: 'Pengaturan Hotel',
        href: '/admin/hotel-settings',
        icon: Building2,
    },
] as const;

/* ==========================================
   ADMIN SHELL
   ========================================== */

export default function AdminShell({
    hotel,
    section,
    count,
    children,
}: Props) {
    const [mobileOpen, setMobileOpen] =
        useState(false);

    const current = [
        ...menu,
        ...settingsMenu,
    ].find(
        (item) => item.section === section
    );

    return (
        <div className="wha">

            {/* MOBILE BACKDROP */}
            {mobileOpen && (
                <button
                    type="button"
                    className="wha-backdrop"
                    onClick={() =>
                        setMobileOpen(false)
                    }
                    aria-label="Tutup menu"
                />
            )}

            {/* SIDEBAR */}
            <aside
                className={
                    `wha-sidebar ${mobileOpen
                        ? 'wha-sidebar-open'
                        : ''
                    }`
                }
            >

                {/* BRAND */}
                <Link
                    href="/admin/dashboard"
                    className="wha-brand"
                >
                    <span className="wha-brand-logo">
                        {hotel.logo_url ? (
                            <img
                                src={hotel.logo_url}
                                alt="Logo WE HOTEL"
                            />
                        ) : (
                            'WE'
                        )}
                    </span>

                    <span className="wha-brand-copy">
                        <strong>
                            {hotel.hotel_name}
                        </strong>

                        <small>
                            GUEST EXPERIENCE
                        </small>
                    </span>
                </Link>

                {/* WORKSPACE */}
                <div className="wha-sidebar-label">
                    WORKSPACE
                </div>

                <nav
                    className="wha-nav"
                    aria-label="Navigasi admin"
                >
                    {menu.map(({
                        section: key,
                        label,
                        href,
                        icon: Icon,
                    }) => (
                        <Link
                            key={key}
                            href={href}
                            className={
                                `wha-nav-link ${section === key
                                    ? 'active'
                                    : ''
                                }`
                            }
                            aria-current={
                                section === key
                                    ? 'page'
                                    : undefined
                            }
                            onClick={() =>
                                setMobileOpen(false)
                            }
                        >
                            <Icon
                                size={19}
                                strokeWidth={1.9}
                            />

                            <span>{label}</span>

                            {key === 'reviews' &&
                                typeof count ===
                                'number' && (
                                    <span className="wha-nav-count">
                                        {count}
                                    </span>
                                )}
                        </Link>
                    ))}
                </nav>

                {/* SETTINGS */}
                <div className="wha-sidebar-label">
                    PENGATURAN
                </div>

                <nav
                    className="wha-nav"
                    aria-label="Pengaturan hotel"
                >
                    {settingsMenu.map(({
                        section: key,
                        label,
                        href,
                        icon: Icon,
                    }) => (
                        <Link
                            key={key}
                            href={href}
                            className={
                                `wha-nav-link ${section === key
                                    ? 'active'
                                    : ''
                                }`
                            }
                            aria-current={
                                section === key
                                    ? 'page'
                                    : undefined
                            }
                            onClick={() =>
                                setMobileOpen(false)
                            }
                        >
                            <Icon
                                size={19}
                                strokeWidth={1.9}
                            />

                            <span>{label}</span>
                        </Link>
                    ))}
                </nav>

                {/* SIDEBAR FOOTER */}
                <div className="wha-sidebar-bottom">

                    {/* PRIVACY INFORMATION */}
                    <div className="wha-privacy-card">
                        <ShieldCheck size={21} />

                        <span>
                            <strong>
                                Private workspace
                            </strong>

                            <small>
                                Masukan tamu hanya dapat
                                dibaca oleh tim yang
                                berwenang.
                            </small>
                        </span>
                    </div>

                    {/* GUEST REVIEW LINK */}
                    <Link
                        href="/review"
                        className="wha-secondary-link"
                    >
                        <ArrowLeft size={17} />
                        Lihat halaman tamu
                    </Link>

                    {/* LOGOUT */}
                    <button
                        type="button"
                        className="wha-secondary-link"
                        onClick={() =>
                            router.post('/logout')
                        }
                    >
                        <LogOut size={17} />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="wha-body">

                {/* TOP BAR */}
                <header className="wha-topbar">
                    <div className="wha-breadcrumb">

                        {/* MOBILE MENU BUTTON */}
                        <button
                            type="button"
                            className="wha-menu-button"
                            onClick={() =>
                                setMobileOpen(!mobileOpen)
                            }
                            aria-label={
                                mobileOpen
                                    ? 'Tutup navigasi'
                                    : 'Buka navigasi'
                            }
                            aria-expanded={mobileOpen}
                        >
                            {mobileOpen ? (
                                <X size={20} />
                            ) : (
                                <Menu size={20} />
                            )}
                        </button>

                        {/* BREADCRUMB */}
                        <span>
                            {hotel.hotel_name}
                        </span>

                        <span className="wha-separator">
                            /
                        </span>

                        <strong>
                            {current?.label}
                        </strong>
                    </div>

                    {/* ADMIN INFORMATION */}
                    <div className="wha-topbar-end">

                        <span className="wha-admin-badge">
                            <i />
                            ADMIN PANEL
                        </span>

                        <span className="wha-avatar">
                            WE
                        </span>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <main className="wha-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
