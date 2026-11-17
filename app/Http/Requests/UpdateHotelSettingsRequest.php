<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHotelSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null
            && (bool) $this->user()->is_admin;
    }

    public function rules(): array
    {
        return [
            'hotel_name' => [
                'required',
                'string',
                'min:2',
                'max:120',
            ],

            'logo' => [
                'nullable',
                'file',
                'image',
                'mimes:png,jpg,jpeg,webp',
                'max:3072',
            ],

            'hero_image' => [
                'nullable',
                'file',
                'image',
                'mimes:png,jpg,jpeg,webp',
                'max:6144',
            ],

            'remove_logo' => [
                'sometimes',
                'boolean',
            ],

            'remove_hero_image' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'hotel_name.required' =>
            'Nama hotel wajib diisi.',

            'hotel_name.min' =>
            'Nama hotel minimal 2 karakter.',

            'hotel_name.max' =>
            'Nama hotel maksimal 120 karakter.',

            'logo.image' =>
            'Logo harus berupa gambar.',

            'logo.mimes' =>
            'Logo harus PNG, JPG, atau WebP.',

            'logo.max' =>
            'Ukuran logo maksimal 3 MB.',

            'hero_image.image' =>
            'Foto hotel harus berupa gambar.',

            'hero_image.mimes' =>
            'Foto hotel harus PNG, JPG, atau WebP.',

            'hero_image.max' =>
            'Ukuran foto maksimal 6 MB.',
        ];
    }
}
