<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveRatingCategoryRequest;
use App\Models\HotelSetting;
use App\Models\RatingCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RatingCategoriesController extends Controller
{
    /**
     * Menampilkan halaman kategori penilaian.
     */
    public function index(): Response
    {
        $hotel = HotelSetting::current();

        return Inertia::render('admin/categories', [
            'hotel' => [
                'hotel_name' => $hotel->hotel_name,

                'logo_url' => $hotel->logo_path
                    ? asset('storage/' . $hotel->logo_path)
                    : asset('images/wehotel/hotel-logo.png'),
            ],

            'categories' => RatingCategory::query()
                ->withCount('ratings')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get([
                    'id',
                    'slug',
                    'name_id',
                    'name_en',
                    'description_id',
                    'description_en',
                    'icon_key',
                    'sort_order',
                    'allow_not_applicable',
                    'is_active',
                ]),
        ]);
    }

    /**
     * Menambahkan kategori penilaian baru.
     */
    public function store(
        SaveRatingCategoryRequest $request
    ): RedirectResponse {
        $data = $request->validated();

        $this->guardAtLeastOneActive(
            $data['is_active']
        );

        // Membuat slug unik berdasarkan nama kategori
        $data['slug'] = $this->uniqueSlug(
            $data['name_id']
        );

        RatingCategory::create($data);

        return redirect()
            ->route('admin.categories.index')
            ->with(
                'success',
                'Kategori baru berhasil ditambahkan.'
            );
    }

    /**
     * Memperbarui kategori penilaian.
     */
    public function update(
        SaveRatingCategoryRequest $request,
        RatingCategory $category
    ): RedirectResponse {
        $data = $request->validated();

        // Mencegah kategori aktif terakhir dinonaktifkan
        if (
            $category->is_active &&
            !$data['is_active']
        ) {
            $this->guardAtLeastOneActive(
                false,
                $category->id
            );
        }

        // Slug lama tetap dipertahankan
        $category->update($data);

        return redirect()
            ->route('admin.categories.index')
            ->with(
                'success',
                'Kategori berhasil diperbarui.'
            );
    }

    /**
     * Mengaktifkan atau menonaktifkan kategori.
     */
    public function toggle(
        RatingCategory $category
    ): RedirectResponse {
        if ($category->is_active) {
            $this->guardAtLeastOneActive(
                false,
                $category->id
            );
        }

        $category->update([
            'is_active' => !$category->is_active,
        ]);

        return redirect()
            ->route('admin.categories.index')
            ->with(
                'success',
                'Status kategori berhasil diubah.'
            );
    }

    /**
     * Menghapus kategori secara permanen.
     *
     * Kategori hanya boleh dihapus apabila:
     * 1. Belum memiliki riwayat penilaian.
     * 2. Tidak menjadi satu-satunya kategori aktif.
     */
    public function destroy(
        RatingCategory $category
    ): RedirectResponse {
        DB::transaction(function () use ($category): void {

            // Mengunci kategori selama proses penghapusan
            $locked = RatingCategory::query()
                ->lockForUpdate()
                ->findOrFail($category->id);

            // Cek apakah kategori sudah pernah dinilai
            if ($locked->ratings()->exists()) {
                throw ValidationException::withMessages([
                    'category' =>
                    'Kategori sudah memiliki penilaian. '
                        . 'Nonaktifkan saja agar riwayat '
                        . 'ulasan tidak hilang.',
                ]);
            }

            // Cegah penghapusan kategori aktif terakhir
            if ($locked->is_active) {
                $this->guardAtLeastOneActive(
                    false,
                    $locked->id
                );
            }

            // Hapus kategori
            $locked->delete();
        });

        return redirect()
            ->route('admin.categories.index')
            ->with(
                'success',
                'Kategori berhasil dihapus permanen.'
            );
    }

    /**
     * Memastikan minimal satu kategori tetap aktif.
     */
    private function guardAtLeastOneActive(
        bool $willBeActive,
        ?int $exceptId = null
    ): void {
        if ($willBeActive) {
            return;
        }

        $remaining = RatingCategory::query()
            ->where('is_active', true)
            ->when(
                $exceptId !== null,
                fn($query) => $query->where(
                    'id',
                    '!=',
                    $exceptId
                )
            )
            ->exists();

        if (!$remaining) {
            throw ValidationException::withMessages([
                'is_active' =>
                'Minimal satu kategori penilaian '
                    . 'harus tetap aktif.',
            ]);
        }
    }

    /**
     * Membuat slug unik untuk kategori baru.
     */
    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'kategori';

        $slug = $base;
        $suffix = 2;

        while (
            RatingCategory::query()
            ->where('slug', $slug)
            ->exists()
        ) {
            $slug = $base . '-' . $suffix;
            $suffix++;
        }

        return $slug;
    }
}
