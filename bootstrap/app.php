
<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        /*
        |--------------------------------------------------------------------------
        | Cookie Encryption
        |--------------------------------------------------------------------------
        */

        $middleware->encryptCookies(
            except: [
                'appearance',
                'sidebar_state',
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Web Middleware
        |--------------------------------------------------------------------------
        */

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        /*
        |--------------------------------------------------------------------------
        | JSON Exception Responses
        |--------------------------------------------------------------------------
        |
        | Pertahankan konfigurasi bawaan proyek.
        | Permintaan API dan permintaan yang mengharapkan
        | JSON akan mendapatkan respons JSON.
        |
        */

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') ||
                $request->expectsJson()
        );

        /*
        |--------------------------------------------------------------------------
        | Custom Exception Responses
        |--------------------------------------------------------------------------
        |
        | Menangani error 429 pada login administrator
        | yang dikirim menggunakan Inertia.
        |
        | Error ditampilkan langsung pada form login,
        | bukan melalui modal HTML Inertia.
        |
        */

        $exceptions->respond(function (
            Response $response,
            Throwable $exception,
            Request $request
        ) {
            /*
             * Hanya tangani:
             *
             * - HTTP 429
             * - POST /management-access
             * - Permintaan Inertia
             *
             * Tidak mengubah rate limiting.
             */

            if (
                $response->getStatusCode() === 429 &&
                $request->is('management-access') &&
                $request->isMethod('POST') &&
                $request->header('X-Inertia') === 'true'
            ) {
                return redirect()
                    ->route('login')
                    ->withErrors([
                        'email' => 'Terlalu banyak percobaan masuk. '
                            .'Silakan tunggu beberapa saat '
                            .'sebelum mencoba kembali.',
                    ]);
            }

            return $response;
        });
    })
    ->create();
