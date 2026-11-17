<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ClearWeHotelDemoSeeder extends Seeder
{
    public function run(): void
    {
        /*
         * PENGAMAN:
         * Tidak boleh menghapus data demo
         * di luar database lokal WE HOTEL.
         */
        if (
            !app()->environment('local') ||
            DB::connection()->getDatabaseName()
                !== 'wehotel_guest_review'
        ) {
            throw new RuntimeException(
                'Pembersihan DEMO hanya boleh dilakukan ' .
                'di database lokal wehotel_guest_review.'
            );
        }

        /*
         * Ambil HANYA review yang memiliki
         * kedua penanda DEMO.
         */
        $demoIds = DB::table('guest_reviews')
            ->where('guest_name', 'like', '[DEMO] %')
            ->where('room_number', 'like', 'DEMO-%')
            ->pluck('id');

        if ($demoIds->isEmpty()) {
            $this->command?->info(
                'Tidak ada review DEMO untuk dihapus.'
            );

            return;
        }

        $total = $demoIds->count();

        DB::transaction(function () use ($demoIds): void {
            /*
             * Hapus rating milik review DEMO.
             */
            DB::table('review_ratings')
                ->whereIn(
                    'guest_review_id',
                    $demoIds
                )
                ->delete();

            /*
             * Hapus review DEMO.
             * Review asli tidak disentuh.
             */
            DB::table('guest_reviews')
                ->whereIn('id', $demoIds)
                ->delete();
        });

        $this->command?->info(
            $total . ' review DEMO berhasil dihapus.'
        );

        $this->command?->info(
            'Review asli tetap tersimpan.'
        );
    }
}
