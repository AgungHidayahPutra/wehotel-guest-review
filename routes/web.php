<?php

use App\Http\Controllers\GuestReviewController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ReviewsController;
use App\Http\Controllers\Admin\RatingCategoriesController;
use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\HotelSettingsController;
use App\Http\Middleware\EnsureHotelAdmin;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::get('/dashboard', function () {
    return redirect()->route('admin.dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified', EnsureHotelAdmin::class])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/dashboard', DashboardController::class)->name('dashboard');
        Route::get('/reviews', [ReviewsController::class, 'index'])->name('reviews.index');

        Route::get('/analytics', AnalyticsController::class)
            ->name('analytics');

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


        Route::get('/hotel-settings', [HotelSettingsController::class, 'index'])
            ->name('hotel-settings.index');

        Route::post('/hotel-settings', [HotelSettingsController::class, 'update'])
            ->name('hotel-settings.update');
    });


// Halaman review tamu - tidak memerlukan login
Route::get('/review', [GuestReviewController::class, 'create'])
    ->name('review.create');

// Menyimpan review tamu
Route::post('/review', [GuestReviewController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('review.store');

// Halaman setelah review berhasil dikirim
Route::get('/review/thanks', [GuestReviewController::class, 'thanks'])
    ->name('review.thanks');

require __DIR__ . '/settings.php';
