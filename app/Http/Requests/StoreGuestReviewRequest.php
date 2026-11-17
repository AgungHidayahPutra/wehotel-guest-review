<?php

namespace App\Http\Requests;

use App\Models\RatingCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreGuestReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * UI hanya menampilkan satu kolom kontak.
     * Metode WhatsApp/email diturunkan di server, tidak dipercaya dari browser.
     */
    protected function prepareForValidation(): void
    {
        if (!$this->boolean('contact_consent')) {
            $this->merge([
                'contact_method' => null,
                'contact_value' => null,
            ]);

            return;
        }

        $value = $this->input('contact_value');

        if (!is_string($value)) {
            $this->merge(['contact_method' => null]);
            return;
        }

        $value = trim($value);

        $this->merge([
            'contact_method' => str_contains($value, '@') ? 'email' : 'whatsapp',
            'contact_value' => $value,
        ]);
    }

    public function rules(): array
    {
        return [
            'guest_name' => ['required', 'string', 'min:2', 'max:150'],
            'room_number' => ['required', 'string', 'regex:/^[a-zA-Z0-9-]{1,20}$/'],
            'hide_name' => ['required', 'boolean'],

            'ratings' => ['required', 'array', 'min:1'],
            'ratings.*.category_id' => ['required', 'integer', 'distinct', 'exists:rating_categories,id'],
            'ratings.*.status' => ['required', Rule::in(['rated', 'not_used'])],
            'ratings.*.score' => ['nullable', 'integer', 'between:1,5'],

            'answers' => ['required', 'array'],
            'answers.liked' => ['nullable', 'string', 'max:1500'],
            'answers.improvement' => ['nullable', 'string', 'max:1500'],
            'answers.unpleasant' => ['nullable', 'string', 'max:1500'],
            'answers.suggestions' => ['required', 'string', 'min:2', 'max:1500'],

            'contact_consent' => ['required', 'boolean'],
            'contact_method' => ['nullable', Rule::in(['whatsapp', 'email'])],
            'contact_value' => ['nullable', 'string', 'max:150'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                // Minimal satu dari tiga pertanyaan utama, ditambah saran wajib.
                $answers = [
                    $this->input('answers.liked', ''),
                    $this->input('answers.improvement', ''),
                    $this->input('answers.unpleasant', ''),
                ];

                $hasAnswer = collect($answers)->contains(
                    fn($answer) => is_string($answer) && trim($answer) !== ''
                );

                if (!$hasAnswer) {
                    $validator->errors()->add('answers', 'Isi minimal satu dari pertanyaan 1–3.');
                }

                $categories = RatingCategory::active()->get()->keyBy('id');
                $ratings = $this->input('ratings', []);

                if (!is_array($ratings)) {
                    return;
                }

                $submittedIds = collect($ratings)->pluck('category_id')
                    ->map(fn($id) => (int) $id)->sort()->values()->all();

                $activeIds = $categories->keys()
                    ->map(fn($id) => (int) $id)->sort()->values()->all();

                if ($submittedIds !== $activeIds) {
                    $validator->errors()->add('ratings', 'Semua kategori penilaian aktif wajib dijawab.');
                }

                foreach ($ratings as $index => $rating) {
                    if (!is_array($rating)) {
                        continue;
                    }

                    $category = $categories->get((int) ($rating['category_id'] ?? 0));
                    $status = $rating['status'] ?? null;
                    $score = $rating['score'] ?? null;

                    if (
                        $status === 'rated' &&
                        (!is_numeric($score) || (int) $score < 1 || (int) $score > 5)
                    ) {
                        $validator->errors()->add("ratings.$index.score", 'Pilih rating antara 1 sampai 5.');
                    }

                    if ($status === 'not_used') {
                        if (!$category?->allow_not_applicable) {
                            $validator->errors()->add("ratings.$index.status", 'Kategori ini tidak dapat dilewati.');
                        }

                        if ($score !== null && $score !== '') {
                            $validator->errors()->add("ratings.$index.score", 'Layanan yang tidak digunakan tidak boleh memiliki nilai.');
                        }
                    }
                }

                if ($this->boolean('contact_consent')) {
                    $method = $this->input('contact_method');
                    $contact = $this->input('contact_value');

                    if (
                        !is_string($contact) || trim($contact) === '' ||
                        !in_array($method, ['whatsapp', 'email'], true)
                    ) {
                        $validator->errors()->add('contact_value', 'Isi nomor WhatsApp atau email yang dapat dihubungi.');
                    } elseif ($method === 'email' && !filter_var($contact, FILTER_VALIDATE_EMAIL)) {
                        $validator->errors()->add('contact_value', 'Format email tidak valid.');
                    } elseif ($method === 'whatsapp') {
                        $digits = preg_replace('/\D/', '', $contact);

                        if (
                            !preg_match('/^\+?[0-9\s().-]+$/', $contact) ||
                            strlen($digits) < 9 || strlen($digits) > 15
                        ) {
                            $validator->errors()->add('contact_value', 'Nomor WhatsApp tidak valid.');
                        }
                    }
                }
            },
        ];
    }
}
