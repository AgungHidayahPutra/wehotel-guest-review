<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveRatingCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    public function rules(): array
    {
        return [
            'name_id' => ['required', 'string', 'min:2', 'max:150'],
            'name_en' => ['required', 'string', 'min:2', 'max:150'],
            'description_id' => ['nullable', 'string', 'max:500'],
            'description_en' => ['nullable', 'string', 'max:500'],
            'icon_key' => [
                'required',
                Rule::in(['heart-handshake', 'sparkles', 'bed', 'building', 'coffee', 'star']),
            ],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
            'allow_not_applicable' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name_id' => 'nama kategori (Indonesia)',
            'name_en' => 'nama kategori (Inggris)',
            'description_id' => 'deskripsi Indonesia',
            'description_en' => 'deskripsi Inggris',
            'sort_order' => 'urutan tampilan',
            'icon_key' => 'ikon',
        ];
    }
}
