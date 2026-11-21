<?php

use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\AuthenticatorRotationController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\HotelSettingsController;
use App\Http\Controllers\Admin\RatingCategoriesController;
use App\Http\Controllers\Admin\ReviewExportController;
use App\Http\Controllers\Admin\ReviewsController;
use App\Http\Controllers\Admin\SecurityController;
use App\Http\Controllers\GuestReviewController;
use App\Http\Middleware\EnsureHotelAdmin;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PUBLIC GUEST REVIEW
|--------------------------------------------------------------------------
*/

Route::get('/', [GuestReviewController::class, 'create'])
    ->name('home');

Route::post('/', [GuestReviewController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('review.store');

Route::get('/thanks', [GuestReviewController::class, 'thanks'])
    ->name('review.thanks');

/*
|--------------------------------------------------------------------------
| DASHBOARD REDIRECT
|--------------------------------------------------------------------------
*/

Route::get('/dashboard', function () {
    return redirect()->route('admin.dashboard');
})->middleware([
    'auth',
    'verified',
    EnsureHotelAdmin::class,
])->name('dashboard');

/*
|--------------------------------------------------------------------------
| ADMINISTRATOR WORKSPACE
|--------------------------------------------------------------------------
*/

Route::middleware([
    'auth',
    'verified',
    EnsureHotelAdmin::class,
])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {

        /*
        |----------------------------------------------------------
        | DASHBOARD
        |----------------------------------------------------------
        */

        Route::get('/dashboard', DashboardController::class)
            ->name('dashboard');

        /*
        |----------------------------------------------------------
        | GUEST REVIEWS
        |----------------------------------------------------------
        */

        Route::get('/reviews', [ReviewsController::class, 'index'])
            ->name('reviews.index');

        Route::post('/reviews/export', ReviewExportController::class)
            ->middleware('throttle:5,1')
            ->name('reviews.export');

        /*
        |----------------------------------------------------------
        | ANALYTICS
        |----------------------------------------------------------
        */

        Route::get('/analytics', AnalyticsController::class)
            ->name('analytics');

        /*
        |----------------------------------------------------------
        | RATING CATEGORIES
        |----------------------------------------------------------
        */

        Route::get('/categories', [RatingCategoriesController::class, 'index'])
            ->name('categories.index');

        Route::post('/categories', [RatingCategoriesController::class, 'store'])
            ->name('categories.store');

        Route::put('/categories/{category}', [RatingCategoriesController::class, 'update'])
            ->name('categories.update');

        Route::patch('/categories/{category}/toggle', [RatingCategoriesController::class, 'toggle'])
            ->name('categories.toggle');

        Route::delete('/categories/{category}', [RatingCategoriesController::class, 'destroy'])
            ->name('categories.destroy');

        /*
        |----------------------------------------------------------
        | HOTEL SETTINGS
        |----------------------------------------------------------
        */

        Route::get('/hotel-settings', [HotelSettingsController::class, 'index'])
            ->name('hotel-settings.index');

        Route::post('/hotel-settings', [HotelSettingsController::class, 'update'])
            ->name('hotel-settings.update');

        /*
        |----------------------------------------------------------
        | ACCOUNT SECURITY
        |----------------------------------------------------------
        */

        Route::get('/security', SecurityController::class)
            ->name('security');

        /*
        |----------------------------------------------------------
        | AUTHENTICATOR ROTATION / RECOVERY
        |----------------------------------------------------------
        */

        Route::post(
            '/security/authenticator/prepare',
            [AuthenticatorRotationController::class, 'prepare']
        )
            ->middleware('throttle:5,1')
            ->name('security.authenticator.prepare');

        Route::post(
            '/security/authenticator/confirm',
            [AuthenticatorRotationController::class, 'confirm']
        )
            ->middleware('throttle:5,1')
            ->name('security.authenticator.confirm');

        Route::post(
            '/security/authenticator/cancel',
            [AuthenticatorRotationController::class, 'cancel']
        )
            ->middleware('throttle:10,1')
            ->name('security.authenticator.cancel');
    });

/*
|--------------------------------------------------------------------------
| ACCOUNT SETTINGS
|--------------------------------------------------------------------------
*/

require __DIR__.'/settings.php';
