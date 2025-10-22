<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class AppointmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'required|string|regex:/^[\+]?[0-9\s\-\(\)]{10,}$/',
            'appointment_date' => 'required|date|after_or_equal:today',
            'appointment_time' => 'required|date_format:H:i',
            'service_type' => 'required|in:beratung,buchung,visum,sonstiges',
            'travelers_count' => 'required|integer|min:1|max:20',
            'destination' => 'nullable|string|max:255',
            'budget_range' => 'nullable|string|max:100',
            'message' => 'nullable|string|max:1000',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Check business hours
            if ($this->appointment_date && $this->appointment_time) {
                $this->validateBusinessHours($validator);
            }

            // Check slot availability
            if ($this->appointment_date && $this->appointment_time) {
                $this->validateSlotAvailability($validator);
            }
        });
    }

    /**
     * Validate business hours
     */
    private function validateBusinessHours($validator): void
    {
        $date = Carbon::parse($this->appointment_date);
        $time = Carbon::parse($this->appointment_time);
        $dayOfWeek = $date->dayOfWeek;

        // Check if it's Sunday (closed)
        if ($dayOfWeek === 0) {
            $validator->errors()->add('appointment_date', 'Sonntags sind wir geschlossen.');
            return;
        }

        // Check business hours
        $isSaturday = $dayOfWeek === 6;
        $startTime = $isSaturday ? '10:30' : '10:00';
        $endTime = $isSaturday ? '15:00' : '17:30';

        if ($time->format('H:i') < $startTime || $time->format('H:i') > $endTime) {
            $dayName = $isSaturday ? 'Samstag' : 'Wochentag';
            $validator->errors()->add('appointment_time', 
                "Öffnungszeiten {$dayName}: {$startTime} - {$endTime} Uhr");
        }

        // Check if time is in 30-minute intervals
        $minutes = $time->minute;
        if ($minutes !== 0 && $minutes !== 30) {
            $validator->errors()->add('appointment_time', 
                'Termine sind nur in 30-Minuten-Intervallen möglich (z.B. 10:00, 10:30, 11:00).');
        }
    }

    /**
     * Validate slot availability
     */
    private function validateSlotAvailability($validator): void
    {
        $existingAppointment = \App\Models\Appointment::where('appointment_date', $this->appointment_date)
            ->where('appointment_time', $this->appointment_time)
            ->first();

        if ($existingAppointment) {
            $validator->errors()->add('appointment_time', 
                'Dieser Termin ist bereits vergeben. Bitte wählen Sie einen anderen Zeitpunkt.');
        }
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'customer_name.required' => 'Bitte geben Sie Ihren Namen ein.',
            'customer_email.required' => 'Bitte geben Sie Ihre E-Mail-Adresse ein.',
            'customer_email.email' => 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
            'customer_phone.required' => 'Bitte geben Sie Ihre Telefonnummer ein.',
            'customer_phone.regex' => 'Bitte geben Sie eine gültige Telefonnummer ein.',
            'appointment_date.required' => 'Bitte wählen Sie ein Datum aus.',
            'appointment_date.after_or_equal' => 'Das Datum muss heute oder in der Zukunft liegen.',
            'appointment_time.required' => 'Bitte wählen Sie eine Uhrzeit aus.',
            'appointment_time.date_format' => 'Bitte geben Sie eine gültige Uhrzeit ein.',
            'service_type.required' => 'Bitte wählen Sie eine Dienstleistung aus.',
            'service_type.in' => 'Bitte wählen Sie eine gültige Dienstleistung aus.',
            'travelers_count.required' => 'Bitte geben Sie die Anzahl der Reisenden an.',
            'travelers_count.integer' => 'Die Anzahl der Reisenden muss eine Zahl sein.',
            'travelers_count.min' => 'Mindestens eine Person muss reisen.',
            'travelers_count.max' => 'Maximal 20 Personen pro Termin.',
        ];
    }
}

