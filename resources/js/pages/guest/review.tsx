import { Head, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BedDouble,
    Building2,
    Check,
    Coffee,
    HeartHandshake,
    LockKeyhole,
    ShieldCheck,
    Sparkles,
    Star,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import GuestShell from '../../components/guest-shell';
import type { Hotel, Language } from '../../components/guest-shell';

type RatingStatus = 'pending' | 'rated' | 'not_used';

type Category = {
    id: number;
    slug: string;
    name_id: string;
    name_en: string;
    description_id: string | null;
    description_en: string | null;
    icon_key: string;
    allow_not_applicable: boolean;
};

type Props = {
    hotel: Hotel;
    categories: Category[];
};

const translations = {
    id: {
        identity: 'Selamat datang di WE HOTEL',
        identitySub:
            'Sebelum memberikan penilaian, perkenalkan diri Anda terlebih dahulu.',
        name: 'Nama Anda',
        namePlaceholder: 'Contoh: Budi Hartono',
        room: 'Nomor kamar',
        roomPlaceholder: 'Contoh: 305',
        hideName: 'Sembunyikan nama saya',
        displayedName: 'Nama yang akan ditampilkan',
        anonymousName: 'Tamu Hotel',
        next: 'Lanjut Review',
        nextToFeedback: 'Lanjut ke Masukan',
        back: 'Kembali',

        rating: 'Bagaimana pengalaman menginap Anda?',
        ratingSub:
            'Luangkan satu menit untuk berbagi penilaian. Pendapat Anda sangat berarti bagi kami.',
        ratingSectionTitle: 'NILAI PENGALAMAN ANDA',
        ratingInstruction: 'Pilih jumlah bintang yang paling menggambarkan pengalaman Anda.',
        ratedCount: 'aspek dinilai',
        notUsed: 'Tidak Menggunakan Layanan',
        ratingScale: 'Arti penilaian',
        scale: [
            'Sangat Tidak Puas',
            'Tidak Puas',
            'Cukup Puas',
            'Puas',
            'Sangat Puas',
        ],

        feedback: 'Ceritakan pengalaman Anda',
        feedbackSub:
            'Masukan jujur Anda membantu kami meningkatkan kualitas pelayanan.',
        feedbackSectionTitle: 'Sedikit lagi, selesai!',
        questionsAnswered: 'pertanyaan utama terisi',
        questionHint: 'Minimal jawab satu dari tiga pertanyaan berikut.',
        q1: 'Apa hal yang paling Anda sukai selama menginap?',
        q2: 'Apa yang menurut Anda perlu kami tingkatkan?',
        q3: 'Apakah ada pengalaman yang kurang menyenangkan?',
        q4: 'Adakah saran atau masukan untuk WE HOTEL?',
        required: 'Wajib diisi',
        answerPlaceholder: 'Tulis pengalaman Anda di sini...',

        contactQuestion:
            'Apakah Anda bersedia dihubungi oleh pihak hotel terkait masukan Anda?',
        yes: 'Ya, saya bersedia',
        no: 'Tidak, terima kasih',
        contactValue: 'Nomor WhatsApp atau email',
        contactPlaceholder: 'Contoh: 08xxxxxxxxxx atau email@contoh.com',
        contactPrivacy:
            'Hanya digunakan untuk menindaklanjuti masukan Anda.',

        submit: 'Kirim penilaian',
        sending: 'Mengirim...',
        privacy:
            'Masukan Anda hanya dapat dilihat oleh tim manajemen WE HOTEL.',

        errorIdentity:
            'Mohon isi nama minimal dua karakter dan nomor kamar yang valid.',
        errorRating:
            'Mohon jawab semua kategori penilaian.',
        errorFeedback:
            'Isi minimal satu pertanyaan nomor 1–3 dan wajib isi saran pada nomor 4.',
        errorContact:
            'Mohon masukkan WhatsApp atau email yang valid.',
    },

    en: {
        identity: 'Welcome to WE HOTEL',
        identitySub:
            'Before sharing your feedback, please introduce yourself.',
        name: 'Your name',
        namePlaceholder: 'e.g. Budi Hartono',
        room: 'Room number',
        roomPlaceholder: 'e.g. 305',
        hideName: 'Hide my name',
        displayedName: 'Name to be displayed',
        anonymousName: 'Hotel Guest',
        next: 'Continue Review',
        nextToFeedback: 'Continue to Feedback',
        back: 'Back',

        rating: 'How was your stay?',
        ratingSub:
            'Take a minute to share your rating. Your opinion truly matters to us.',
        ratingSectionTitle: 'RATE YOUR EXPERIENCE',
        ratingInstruction: 'Select the number of stars that best reflects your experience.',
        ratedCount: 'categories rated',
        notUsed: 'Did Not Use This Service',
        ratingScale: 'Rating meanings',
        scale: [
            'Very dissatisfied',
            'Dissatisfied',
            'Fairly satisfied',
            'Satisfied',
            'Very satisfied',
        ],

        feedback: 'Tell us about your experience',
        feedbackSub:
            'Your honest feedback helps us improve the quality of our service.',
        feedbackSectionTitle: 'Almost there!',
        questionsAnswered: 'main questions answered',
        questionHint: 'Answer at least one of the following three questions.',
        q1: 'What did you enjoy most during your stay?',
        q2: 'What do you think we should improve?',
        q3: 'Did you have any unpleasant experiences?',
        q4: 'Do you have any suggestions for WE HOTEL?',
        required: 'Required',
        answerPlaceholder: 'Share your experience here...',

        contactQuestion:
            'May the hotel contact you regarding your feedback?',
        yes: 'Yes, I agree',
        no: 'No, thank you',
        contactValue: 'WhatsApp number or email',
        contactPlaceholder: 'e.g. +6281234567890 or name@example.com',
        contactPrivacy:
            'Only used to follow up on your feedback.',

        submit: 'Submit Review',
        sending: 'Sending...',
        privacy:
            'Only the WE HOTEL management team can view your feedback.',

        errorIdentity:
            'Please provide a name of at least two characters and a valid room number.',
        errorRating:
            'Please complete every rating category.',
        errorFeedback:
            'Answer at least one of questions 1–3 and complete question 4.',
        errorContact:
            'Please enter a valid WhatsApp number or email address.',
    },
};

const iconMap = {
    'heart-handshake': HeartHandshake,
    sparkles: Sparkles,
    bed: BedDouble,
    building: Building2,
    coffee: Coffee,
    star: Star,
};

function maskedName(
    value: string,
    hide: boolean,
    placeholder: string
): string {
    const chars = Array.from(value.trim());

    if (chars.length === 0) {
        return placeholder;
    }

    if (!hide || chars.length < 2) {
        return chars.join('');
    }

    return `${chars[0]}****${chars[chars.length - 1]}`;
}

function validContact(value: string): boolean {
    const contact = value.trim();

    if (contact.includes('@')) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    }

    const digits = contact.replace(/\D/g, '');

    return /^\+?[0-9\s().-]+$/.test(contact) &&
        digits.length >= 9 && digits.length <= 15;
}

export default function Review({ hotel, categories }: Props) {
    const [language, setLanguage] = useState<Language>('id');
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [localError, setLocalError] = useState('');
    const [animatedCategory, setAnimatedCategory] =
        useState<number | null>(null);

    const animationTimer = useRef<number | null>(null);

    const t = translations[language];

    const form = useForm({
        guest_name: '',
        room_number: '',
        hide_name: true,

        ratings: categories.map((category) => ({
            category_id: category.id,
            status: 'pending' as RatingStatus,
            score: null as number | null,
        })),

        answers: {
            liked: '',
            improvement: '',
            unpleasant: '',
            suggestions: '',
        },

        contact_consent: false,
        contact_value: '',
    });

    const canContinueIdentity =
        form.data.guest_name.trim().length >= 2 &&
        /^[a-zA-Z0-9-]{1,20}$/.test(form.data.room_number);

    const completedRatings = categories.filter((category) => {
        const rating = form.data.ratings.find((item) => item.category_id === category.id);

        return rating?.status === 'rated'
            ? rating.score !== null && Number.isInteger(rating.score) && rating.score >= 1 && rating.score <= 5
            : rating?.status === 'not_used' && category.allow_not_applicable && rating.score === null;
    }).length;

    const canContinueRating = categories.length > 0 && completedRatings === categories.length;

    const answeredMainQuestions = [
        form.data.answers.liked,
        form.data.answers.improvement,
        form.data.answers.unpleasant,
    ].filter((answer) => answer.trim().length > 0).length;

    const canSubmitReview = answeredMainQuestions >= 1 &&
        form.data.answers.suggestions.trim().length >= 2 &&
        (!form.data.contact_consent || validContact(form.data.contact_value)) &&
        !form.processing;

    const fieldErrors = form.errors as Record<
        string,
        string | undefined
    >;

    useEffect(() => {
        const stored = localStorage.getItem('wehotel-language');

        if (stored === 'id' || stored === 'en') {
            setLanguage(stored);
        }

        return () => {
            if (animationTimer.current !== null) {
                window.clearTimeout(animationTimer.current);
            }
        };
    }, []);

    function changeLanguage() {
        const next = language === 'id' ? 'en' : 'id';

        setLanguage(next);
        localStorage.setItem('wehotel-language', next);
    }

    function updateRating(
        categoryId: number,
        status: 'rated' | 'not_used',
        score: number | null
    ) {
        form.setData(
            'ratings',
            form.data.ratings.map((rating) =>
                rating.category_id === categoryId
                    ? { ...rating, status, score }
                    : rating
            )
        );

        setLocalError('');
        setAnimatedCategory(categoryId);

        if (animationTimer.current !== null) {
            window.clearTimeout(animationTimer.current);
        }

        animationTimer.current = window.setTimeout(() => {
            setAnimatedCategory(null);
        }, 380);
    }

    function goNext() {
        setLocalError('');

        if (step === 1) {
            if (!canContinueIdentity) {
                setLocalError(t.errorIdentity);
                return;
            }

            setStep(2);
        }

        if (step === 2) {
            if (!canContinueRating) {
                setLocalError(t.errorRating);
                return;
            }

            setStep(3);
        }

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }

    function goBack() {
        setLocalError('');

        if (step === 3) {
            setStep(2);
        } else if (step === 2) {
            setStep(1);
        }

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }

    function submitReview() {
        setLocalError('');

        const answers = form.data.answers;

        const hasAnswer = [
            answers.liked,
            answers.improvement,
            answers.unpleasant,
        ].some((answer) => answer.trim().length > 0);

        if (
            !hasAnswer ||
            answers.suggestions.trim().length < 2
        ) {
            setLocalError(t.errorFeedback);
            return;
        }

        if (form.data.contact_consent && !validContact(form.data.contact_value)) {
            setLocalError(t.errorContact);
            return;
        }

        form.post('/review', {
            preserveScroll: true,
            onError: (errors) => {
                if (
                    'ratings' in errors ||
                    Object.keys(errors).some((key) =>
                        key.startsWith('ratings.')
                    )
                ) {
                    setStep(2);
                }
            },
        });
    }

    return (
        <GuestShell
            hotel={hotel}
            language={language}
            onLanguageChange={changeLanguage}
            step={step}
        >
            <Head
                title={`${language === 'id'
                    ? 'Ulasan Tamu'
                    : 'Guest Review'
                    } — WE HOTEL`}
            />

            {/* LANGKAH 1: IDENTITAS */}
            {step === 1 && (
                <section className="wh-section wh-identity-section" key={`identity-${language}`}>
                    <div className="wh-kicker">
                        <span>✳</span>
                        WE VALUE YOUR VOICE
                    </div>

                    <h1>{t.identity}</h1>
                    <p className="wh-subtitle">{t.identitySub}</p>

                    <div className="wh-form-fields">
                        <div className="wh-field">
                            <label htmlFor="guest-name">
                                {t.name}
                                <b>*</b>
                            </label>

                            <input
                                id="guest-name"
                                type="text"
                                autoComplete="name"
                                maxLength={150}
                                placeholder={t.namePlaceholder}
                                value={form.data.guest_name}
                                onChange={(event) =>
                                    form.setData(
                                        'guest_name',
                                        event.target.value
                                    )
                                }
                            />

                            {form.errors.guest_name && (
                                <p className="wh-error">
                                    {form.errors.guest_name}
                                </p>
                            )}
                        </div>

                        <div className="wh-field">
                            <label htmlFor="room-number">
                                {t.room}
                                <b>*</b>
                            </label>

                            <input
                                id="room-number"
                                type="text"
                                maxLength={20}
                                placeholder={t.roomPlaceholder}
                                value={form.data.room_number}
                                onChange={(event) =>
                                    form.setData(
                                        'room_number',
                                        event.target.value
                                    )
                                }
                            />

                            {form.errors.room_number && (
                                <p className="wh-error">
                                    {form.errors.room_number}
                                </p>
                            )}
                        </div>

                        <label className="wh-privacy-toggle">
                            <span>
                                <LockKeyhole size={17} />
                                {t.hideName}
                            </span>

                            <input
                                type="checkbox"
                                checked={form.data.hide_name}
                                onChange={(event) =>
                                    form.setData(
                                        'hide_name',
                                        event.target.checked
                                    )
                                }
                            />

                            <i />
                        </label>

                        <div className="wh-name-preview">
                            <span>{t.displayedName}</span>

                            <strong>
                                {maskedName(
                                    form.data.guest_name,
                                    form.data.hide_name,
                                    t.anonymousName
                                )}
                            </strong>
                        </div>

                        {localError && (
                            <p role="alert" className="wh-error">
                                {localError}
                            </p>
                        )}

                        <button
                            type="button"
                            className="wh-primary-button"
                            disabled={!canContinueIdentity}
                            onClick={goNext}
                        >
                            {t.next}
                            <ArrowRight size={19} />
                        </button>
                    </div>
                </section>
            )}

            {/* LANGKAH 2: PENILAIAN BINTANG */}
            {step === 2 && (
                <section className="wh-section wh-review-rating" key={`rating-${language}`}>
                    <div className="wh-kicker">
                        <span>✳</span>
                        WE VALUE YOUR VOICE
                    </div>

                    <h1>{t.rating}</h1>
                    <p className="wh-subtitle">{t.ratingSub}</p>

                    <div className="wh-step-detail wh-rating-detail">
                        <div>
                            <span className="wh-step-index">02 / 03</span>
                            <h2>{t.ratingSectionTitle}</h2>
                            <p>{t.ratingInstruction}</p>
                        </div>
                        <div className="wh-rating-progress" aria-live="polite">
                            <span>{completedRatings}/{categories.length} {t.ratedCount}</span>
                            <div className="wh-rating-track" role="progressbar"
                                aria-label={t.ratedCount}
                                aria-valuenow={completedRatings}
                                aria-valuemin={0}
                                aria-valuemax={categories.length}>
                                <div style={{ width: `${categories.length ? (completedRatings / categories.length) * 100 : 0}%` }} />
                            </div>
                        </div>
                    </div>

                    <div className="wh-rating-list">
                        {categories.map((category) => {
                            const rating = form.data.ratings.find(
                                (item) =>
                                    item.category_id === category.id
                            );

                            const Icon =
                                iconMap[
                                category.icon_key as keyof typeof iconMap
                                ] ?? Star;

                            return (
                                <div
                                    key={category.id}
                                    className={`wh-rating-row ${animatedCategory === category.id
                                        ? 'wh-rating-animated'
                                        : ''
                                        }`}
                                >
                                    <div className="wh-rating-info">
                                        <div className="wh-rating-icon">
                                            <Icon size={21} />
                                        </div>

                                        <div>
                                            <h3>
                                                {language === 'id'
                                                    ? category.name_id
                                                    : category.name_en}
                                            </h3>

                                            <p>
                                                {language === 'id'
                                                    ? category.description_id
                                                    : category.description_en}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="wh-rating-action">
                                        <div
                                            className="wh-stars"
                                            role="group"
                                            aria-label={
                                                language === 'id'
                                                    ? category.name_id
                                                    : category.name_en
                                            }
                                        >
                                            {[1, 2, 3, 4, 5].map(
                                                (score) => {
                                                    const active =
                                                        rating?.status === 'rated' &&
                                                        (rating.score ?? 0) >= score;

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={score}
                                                            aria-label={`${score} - ${t.scale[score - 1]
                                                                }`}
                                                            aria-pressed={
                                                                rating?.status === 'rated' &&
                                                                rating.score === score
                                                            }
                                                            className={`wh-star ${active
                                                                ? 'selected'
                                                                : ''
                                                                } ${animatedCategory === category.id &&
                                                                    rating?.score === score
                                                                    ? 'pop'
                                                                    : ''
                                                                }`}
                                                            onClick={() =>
                                                                updateRating(
                                                                    category.id,
                                                                    'rated',
                                                                    score
                                                                )
                                                            }
                                                        >
                                                            <Star size={27} />
                                                        </button>
                                                    );
                                                }
                                            )}
                                        </div>

                                        <div
                                            className="wh-rating-result"
                                            aria-live="polite"
                                        >
                                            {rating?.status === 'rated' &&
                                                rating.score
                                                ? t.scale[rating.score - 1]
                                                : ''}
                                        </div>

                                        {category.allow_not_applicable && (
                                            <button
                                                type="button"
                                                className={`wh-not-used ${rating?.status === 'not_used'
                                                    ? 'active'
                                                    : ''
                                                    }`}
                                                aria-pressed={
                                                    rating?.status === 'not_used'
                                                }
                                                onClick={() =>
                                                    updateRating(
                                                        category.id,
                                                        'not_used',
                                                        null
                                                    )
                                                }
                                            >
                                                {rating?.status === 'not_used' &&
                                                    '✓ '}
                                                {t.notUsed}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="wh-rating-scale">
                        <strong>{t.ratingScale}</strong>

                        <div>
                            {t.scale.map((label, index) => (
                                <span key={label}>
                                    <b>{index + 1}</b>
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {localError && (
                        <p role="alert" className="wh-error">
                            {localError}
                        </p>
                    )}

                    {fieldErrors.ratings && (
                        <p role="alert" className="wh-error">
                            {fieldErrors.ratings}
                        </p>
                    )}

                    <div className="wh-navigation">
                        <button
                            type="button"
                            className="wh-back-button"
                            onClick={goBack}
                        >
                            <ArrowLeft size={17} />
                            {t.back}
                        </button>

                        <button
                            type="button"
                            className="wh-primary-button"
                            disabled={!canContinueRating}
                            onClick={goNext}
                        >
                            {t.nextToFeedback}
                            <ArrowRight size={19} />
                        </button>
                    </div>
                </section>
            )}

            {/* LANGKAH 3: PERTANYAAN DAN SARAN */}
            {step === 3 && (
                <section className="wh-section wh-review-feedback" key={`feedback-${language}`}>
                    <div className="wh-kicker">
                        <span>✳</span>
                        WE VALUE YOUR VOICE
                    </div>

                    <h1>{t.feedback}</h1>
                    <p className="wh-subtitle">{t.feedbackSub}</p>

                    <div className="wh-step-detail wh-feedback-detail">
                        <div>
                            <span className="wh-step-index">03 / 03</span>
                            <h2>{t.feedbackSectionTitle}</h2>
                        </div>
                        <span className="wh-feedback-count" aria-live="polite">
                            {answeredMainQuestions}/3 {t.questionsAnswered}
                        </span>
                    </div>

                    <div className="wh-info-note">
                        <Check size={18} />
                        {t.questionHint}
                    </div>

                    {(
                        [
                            ['liked', t.q1],
                            ['improvement', t.q2],
                            ['unpleasant', t.q3],
                            ['suggestions', t.q4],
                        ] as const
                    ).map(([key, question], index) => (
                        <div className="wh-field wh-answer-field" key={key}>
                            <label htmlFor={`answer-${key}`}>
                                <span className="wh-question-number">
                                    0{index + 1}
                                </span>

                                {question}

                                {key === 'suggestions' && (
                                    <b>
                                        * {t.required}
                                    </b>
                                )}
                            </label>

                            <textarea
                                id={`answer-${key}`}
                                rows={3}
                                maxLength={1500}
                                placeholder={t.answerPlaceholder}
                                value={form.data.answers[key]}
                                onChange={(event) =>
                                    form.setData('answers', {
                                        ...form.data.answers,
                                        [key]: event.target.value,
                                    })
                                }
                            />

                            {fieldErrors[`answers.${key}`] && (
                                <p className="wh-error">
                                    {fieldErrors[`answers.${key}`]}
                                </p>
                            )}
                        </div>
                    ))}

                    <div className="wh-contact-card">
                        <h3>{t.contactQuestion}</h3>

                        <div className="wh-radio-group">
                            <label>
                                <input
                                    type="radio"
                                    name="contact-consent"
                                    checked={form.data.contact_consent}
                                    onChange={() =>
                                        form.setData(
                                            'contact_consent',
                                            true
                                        )
                                    }
                                />
                                {t.yes}
                            </label>

                            <label>
                                <input
                                    type="radio"
                                    name="contact-consent"
                                    checked={!form.data.contact_consent}
                                    onChange={() =>
                                        form.setData(
                                            'contact_consent',
                                            false
                                        )
                                    }
                                />
                                {t.no}
                            </label>
                        </div>

                        {form.data.contact_consent && (
                            <div className="wh-contact-input wh-field">
                                <label htmlFor="contact-value">
                                    {t.contactValue}
                                    <b>*</b>
                                </label>

                                <input
                                    id="contact-value"
                                    type="text"
                                    autoComplete="off"
                                    maxLength={150}
                                    placeholder={t.contactPlaceholder}
                                    value={form.data.contact_value}
                                    onChange={(event) =>
                                        form.setData(
                                            'contact_value',
                                            event.target.value
                                        )
                                    }
                                />

                                {fieldErrors.contact_value && (
                                    <p className="wh-error">
                                        {fieldErrors.contact_value}
                                    </p>
                                )}
                                <p className="wh-contact-help">{t.contactPrivacy}</p>
                            </div>
                        )}
                    </div>

                    <p className="wh-contact-disclaimer">
                        <ShieldCheck size={17} />
                        {t.privacy}
                    </p>

                    {(localError ||
                        Object.keys(form.errors).length > 0) && (
                            <div role="alert" className="wh-error-box">
                                {localError ||
                                    Object.values(form.errors).join(' · ')}
                            </div>
                        )}

                    <div className="wh-navigation">
                        <button
                            type="button"
                            className="wh-back-button"
                            onClick={goBack}
                        >
                            <ArrowLeft size={17} />
                            {t.back}
                        </button>

                        <button
                            type="button"
                            className="wh-primary-button"
                            disabled={!canSubmitReview}
                            onClick={submitReview}
                        >
                            {form.processing ? t.sending : t.submit}

                            {!form.processing && <ArrowRight size={19} />}
                        </button>
                    </div>

                    <p className="wh-form-privacy">
                        <LockKeyhole size={14} />
                        {language === 'id'
                            ? 'Masukan Anda disimpan secara pribadi dan aman oleh WE HOTEL.'
                            : 'Your feedback is stored privately and securely by WE HOTEL.'}
                    </p>
                </section>
            )}
        </GuestShell>
    );
}
