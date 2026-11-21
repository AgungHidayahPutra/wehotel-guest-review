<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;
use Laravel\Fortify\RecoveryCode;

/**
 * Replace a confirmed TOTP secret without disabling the existing authenticator
 * until the replacement is proven and atomically committed.
 *
 * All routes MUST remain inside auth + admin middleware, and be rate-limited.
 */
class AuthenticatorRotationController extends Controller
{
    private const SESSION_KEY = 'wehotel.security.pending_authenticator_rotation';

    private const PASSWORD_MAX_AGE_SECONDS = 600;

    private const SETUP_TTL_SECONDS = 600;

    public function prepare(Request $request, TwoFactorAuthenticationProvider $provider): JsonResponse
    {
        if ($error = $this->requireRecentPassword($request)) {
            return $error;
        }

        $validated = $request->validate([
            'code' => ['nullable', 'regex:/^\d{6}$/'],
            'recovery_code' => ['nullable', 'string', 'max:100'],
        ]);

        $code = trim((string) ($validated['code'] ?? ''));
        $recoveryCode = trim((string) ($validated['recovery_code'] ?? ''));

        if (($code === '') === ($recoveryCode === '')) {
            throw ValidationException::withMessages([
                'code' => ['Masukkan salah satu: kode autentikator atau recovery code.'],
            ]);
        }

        // The lock also protects replacement of a consumed recovery code.
        $snapshot = DB::transaction(function () use ($request, $provider, $code, $recoveryCode): array {
            /** @var User $user */
            $user = User::query()->whereKey($request->user()->getAuthIdentifier())
                ->lockForUpdate()->firstOrFail();

            if (! $user->hasEnabledTwoFactorAuthentication() || ! $user->two_factor_secret) {
                abort(409, '2FA belum aktif pada akun ini.');
            }

            if ($code !== '') {
                $currentSecret = Fortify::currentEncrypter()->decrypt($user->two_factor_secret);
                if (! $provider->verify($currentSecret, $code)) {
                    throw ValidationException::withMessages([
                        'code' => ['Kode autentikator lama tidak valid.'],
                    ]);
                }
            } else {
                $validRecovery = collect($user->recoveryCodes())->first(
                    fn ($value) => is_string($value) && hash_equals($value, $recoveryCode)
                );

                if (! $validRecovery) {
                    throw ValidationException::withMessages([
                        'recovery_code' => ['Recovery code tidak valid atau sudah digunakan.'],
                    ]);
                }

                // Fortify consumes the submitted code and replaces that slot.
                $user->replaceRecoveryCode($validRecovery);
            }

            return ['secret_fingerprint' => hash('sha256', $user->two_factor_secret)];
        });

        $secretLength = (int) config('fortify-options.two-factor-authentication.secret-length', 16);
        $newSecret = $provider->generateSecretKey($secretLength);

        $request->session()->put(self::SESSION_KEY, [
            'user_id' => (string) $request->user()->getAuthIdentifier(),
            'secret' => Fortify::currentEncrypter()->encrypt($newSecret),
            'secret_fingerprint' => $snapshot['secret_fingerprint'],
            'expires_at' => now()->addSeconds(self::SETUP_TTL_SECONDS)->timestamp,
        ]);

        $url = $provider->qrCodeUrl(
            (string) config('app.name', 'WE HOTEL'),
            (string) $request->user()->{Fortify::username()},
            $newSecret
        );

        $svg = (new Writer(new ImageRenderer(
            new RendererStyle(192), new SvgImageBackEnd
        )))->writeString($url);

        // Match Fortify's SVG handling: omit the XML declaration when present.
        if (str_starts_with($svg, '<?xml') && str_contains($svg, "\n")) {
            $svg = substr($svg, strpos($svg, "\n") + 1);
        }

        return response()->json([
            'svg' => trim($svg),
            'expires_in_seconds' => self::SETUP_TTL_SECONDS,
            'recovery_code_replaced' => $recoveryCode !== '',
        ])->header('Cache-Control', 'no-store, private');
    }

    public function confirm(Request $request, TwoFactorAuthenticationProvider $provider): JsonResponse
    {
        if ($error = $this->requireRecentPassword($request)) {
            return $error;
        }

        $validated = $request->validate([
            'code' => ['required', 'regex:/^\d{6}$/'],
        ]);

        $pending = $request->session()->get(self::SESSION_KEY);

        if (! is_array($pending)
            || ($pending['user_id'] ?? null) !== (string) $request->user()->getAuthIdentifier()
            || ! is_string($pending['secret'] ?? null)
            || ! is_string($pending['secret_fingerprint'] ?? null)
            || (int) ($pending['expires_at'] ?? 0) <= now()->timestamp
        ) {
            $request->session()->forget(self::SESSION_KEY);

            return response()->json([
                'message' => 'QR Code baru sudah kedaluwarsa atau belum dibuat. Mulai kembali proses penggantian.',
            ], 409);
        }

        $newSecret = Fortify::currentEncrypter()->decrypt($pending['secret']);
        if (! $provider->verify($newSecret, $validated['code'])) {
            throw ValidationException::withMessages([
                'code' => ['Kode dari autentikator BARU tidak valid.'],
            ]);
        }

        $codes = DB::transaction(function () use ($request, $pending, $newSecret): array {
            /** @var User $user */
            $user = User::query()->whereKey($request->user()->getAuthIdentifier())
                ->lockForUpdate()->firstOrFail();

            $currentFingerprint = $user->two_factor_secret
                ? hash('sha256', $user->two_factor_secret)
                : '';

            if (! $user->hasEnabledTwoFactorAuthentication()
                || ! hash_equals($pending['secret_fingerprint'], $currentFingerprint)
            ) {
                abort(409, 'Konfigurasi 2FA berubah. Mulai ulang proses penggantian.');
            }

            $newCodes = Collection::times(8, fn () => RecoveryCode::generate())->all();

            // One transaction commits the new TOTP, confirmation and all new codes.
            $user->forceFill([
                'two_factor_secret' => Fortify::currentEncrypter()->encrypt($newSecret),
                'two_factor_recovery_codes' => Fortify::currentEncrypter()->encrypt(
                    json_encode($newCodes, JSON_THROW_ON_ERROR)
                ),
                'two_factor_confirmed_at' => now(),
            ])->save();

            return $newCodes;
        });

        $request->session()->forget(self::SESSION_KEY);

        // Revoke other sessions when using the database session driver.
        // This affects only this admin account, and preserves the current session.
        if (config('session.driver') === 'database') {
            try {
                DB::table(config('session.table', 'sessions'))
                    ->where('user_id', $request->user()->getAuthIdentifier())
                    ->where('id', '!=', $request->session()->getId())
                    ->delete();
            } catch (\Throwable $exception) {
                // Do not claim other sessions were revoked if storage is misconfigured.
                report($exception);
            }
        }

        return response()->json([
            'message' => 'Autentikator baru aktif. Autentikator lama dan recovery codes lama tidak berlaku lagi.',
            'codes' => $codes,
        ])->header('Cache-Control', 'no-store, private');
    }

    public function cancel(Request $request): JsonResponse
    {
        $request->session()->forget(self::SESSION_KEY);

        return response()->json([
            'message' => 'Penggantian dibatalkan. Autentikator lama tetap aktif.',
        ])->header('Cache-Control', 'no-store, private');
    }

    private function requireRecentPassword(Request $request): ?JsonResponse
    {
        $confirmedAt = (int) $request->session()->get('auth.password_confirmed_at', 0);

        if ($confirmedAt <= now()->timestamp - self::PASSWORD_MAX_AGE_SECONDS) {
            $request->session()->forget(self::SESSION_KEY);

            return response()->json([
                'message' => 'Konfirmasi ulang password administrator sebelum melanjutkan.',
            ], 423);
        }

        return null;
    }
}
