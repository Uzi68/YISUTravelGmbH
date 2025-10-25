<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppointmentRequest;
use App\Models\Appointment;
use App\Models\BlockedSlot;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AppointmentController extends Controller
{
    /**
     * Store a new appointment
     */
    public function store(AppointmentRequest $request): \Illuminate\Http\JsonResponse
    {
        try {
            $appointment = Appointment::create($request->validated());
            
            // Send emails using IONOS-compatible mail system
            $this->sendAppointmentEmailsIonos($appointment);
            
            \Log::info('Appointment booked successfully', [
                'appointment_id' => $appointment->id,
                'customer_email' => $appointment->customer_email
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Termin erfolgreich gebucht! Bestätigungsemail wurde versendet.',
                'appointment' => $appointment
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('Appointment booking failed', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Erstellen des Termins: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all appointments (admin only)
     */
    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        $query = Appointment::query();

        // Date range filter
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('appointment_date', [
                $request->start_date,
                $request->end_date
            ]);
        }

        // Status filter
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Pagination
        $appointments = $query->orderBy('appointment_date', 'desc')
                            ->orderBy('appointment_time', 'desc')
                            ->paginate(20);

        return response()->json($appointments);
    }

    /**
     * Get available time slots for a specific date
     */
    public function getAvailableSlots(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'date' => 'required|date|after_or_equal:today'
        ]);

        $date = $request->date;
        $availableSlots = [];

        // Generate time slots (9:00 - 18:00, every 30 minutes)
        $timeSlots = $this->generateTimeSlots('09:00', '18:00');

        foreach ($timeSlots as $time) {
            // Convert time to database format (H:i:s)
            $timeFormatted = $time . ':00';
            
            // Check if slot is already booked
            $isBooked = Appointment::where('appointment_date', $date)
                ->where('appointment_time', $timeFormatted)
                ->where('status', '!=', 'cancelled')
                ->exists();

            // Check if slot is blocked
            $isBlocked = BlockedSlot::where('blocked_date', $date)
                ->where('blocked_time', $timeFormatted)
                ->exists();

            if (!$isBooked && !$isBlocked) {
                $availableSlots[] = $time;
            }
        }

        return response()->json([
            'success' => true,
            'date' => $date,
            'available_slots' => $availableSlots
        ]);
    }

    /**
     * Block a time slot (admin only)
     */
    public function blockSlot(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'date' => 'required|date',
            'time' => 'required|date_format:H:i',
            'reason' => 'nullable|string|max:255'
        ]);

        try {
            // Convert time to database format (H:i:s)
            $timeFormatted = $request->time . ':00';
            
            $blockedSlot = BlockedSlot::create([
                'blocked_date' => $request->date,
                'blocked_time' => $timeFormatted,
                'reason' => $request->reason ?? 'Manually blocked'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Zeitslot erfolgreich blockiert',
                'blocked_slot' => $blockedSlot
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Blockieren des Slots: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unblock a time slot (admin only)
     */
    public function unblockSlot($id): \Illuminate\Http\JsonResponse
    {
        try {
            $blockedSlot = BlockedSlot::findOrFail($id);
            $blockedSlot->delete();

            return response()->json([
                'success' => true,
                'message' => 'Zeitslot erfolgreich freigegeben'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Freigeben des Slots: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get blocked slots for a specific date
     */
    public function getBlockedSlots(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'date' => 'required|date'
        ]);

        $blockedSlots = BlockedSlot::where('blocked_date', $request->date)->get();
        
        \Log::info('getBlockedSlots debug:', [
            'date' => $request->date,
            'raw_slots' => $blockedSlots->toArray(),
            'slot_count' => $blockedSlots->count()
        ]);
        
        // Format times for frontend (remove seconds)
        $formattedSlots = $blockedSlots->map(function($slot) {
            \Log::info('Processing slot:', [
                'id' => $slot->id,
                'raw_time' => $slot->blocked_time,
                'time_type' => gettype($slot->blocked_time),
                'time_length' => strlen($slot->blocked_time ?? ''),
                'formatted_time' => date('H:i', strtotime($slot->blocked_time))
            ]);
            
            return [
                'id' => $slot->id,
                'time' => date('H:i', strtotime($slot->blocked_time)), // Format as HH:MM
                'reason' => $slot->reason
            ];
        });

        \Log::info('Final formatted slots:', $formattedSlots->toArray());

        return response()->json([
            'success' => true,
            'blocked_slots' => $formattedSlots
        ]);
    }

    /**
     * Update appointment status
     */
    public function updateStatus(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'status' => 'required|in:confirmed,cancelled,completed'
        ]);

        $appointment = Appointment::findOrFail($id);
        $appointment->update(['status' => $request->status]);

        return response()->json([
            'success' => true,
            'message' => 'Status erfolgreich aktualisiert',
            'appointment' => $appointment
        ]);
    }

    /**
     * Unblock a specific time slot by date and time
     */
    public function unblockSlotByDateTime(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'time' => 'required|date_format:H:i'
        ]);

        try {
            // Convert time to database format (H:i:s)
            $timeFormatted = $request->time . ':00';
            
            $blockedSlot = BlockedSlot::where('blocked_date', $request->date)
                ->where('blocked_time', $timeFormatted)
                ->first();

            if ($blockedSlot) {
                $blockedSlot->delete();
                return response()->json([
                    'success' => true,
                    'message' => 'Slot erfolgreich freigegeben'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Slot war nicht blockiert'
                ], 404);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Freigeben des Slots: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unblock multiple time slots
     */
    public function unblockMultipleSlots(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'times' => 'required|array',
            'times.*' => 'date_format:H:i'
        ]);

        $date = $request->date;
        $times = $request->times;

        try {
            $unblockedCount = 0;
            $errors = [];

            foreach ($times as $time) {
                // Convert time to database format (H:i:s)
                $timeFormatted = $time . ':00';
                
                $blockedSlot = BlockedSlot::where('blocked_date', $date)
                    ->where('blocked_time', $timeFormatted)
                    ->first();

                if ($blockedSlot) {
                    $blockedSlot->delete();
                    $unblockedCount++;
                } else {
                    $errors[] = "Slot {$time} war nicht blockiert";
                }
            }

            return response()->json([
                'success' => true,
                'message' => "{$unblockedCount} Slots erfolgreich freigegeben",
                'unblocked_count' => $unblockedCount,
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Freigeben der Slots: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate time slots between start and end time
     */
    private function generateTimeSlots(string $startTime, string $endTime): array
    {
        $slots = [];
        $start = Carbon::parse($startTime);
        $end = Carbon::parse($endTime);

        while ($start->lt($end)) {
            $slots[] = $start->format('H:i');
            $start->addMinutes(30);
        }

        return $slots;
    }

    /**
     * Release a booked appointment (admin can free up slots when customers cancel)
     */
    public function releaseAppointment($id): \Illuminate\Http\JsonResponse
    {
        $appointment = Appointment::findOrFail($id);

        // Check if appointment is confirmed or pending (not already cancelled)
        if ($appointment->status === 'cancelled') {
            return response()->json([
                'error' => 'Dieser Termin wurde bereits storniert'
            ], 400);
        }

        // Update status to cancelled
        $appointment->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancelled_by' => 'admin'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Termin erfolgreich freigegeben - Slot ist wieder verfügbar',
            'appointment' => $appointment
        ]);
    }

    /**
     * Restore a cancelled appointment (admin can restore if customer rebooks)
     */
    public function restoreAppointment($id): \Illuminate\Http\JsonResponse
    {
        $appointment = Appointment::findOrFail($id);

        // Check if appointment is cancelled
        if ($appointment->status !== 'cancelled') {
            return response()->json([
                'error' => 'Dieser Termin ist nicht storniert'
            ], 400);
        }

        // Restore to pending status
        $appointment->update([
            'status' => 'confirmed',
            'cancelled_at' => null,
            'cancelled_by' => null
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Termin erfolgreich wiederhergestellt',
            'appointment' => $appointment
        ]);
    }

    /**
     * Send appointment emails using simple PHP mail() function (IONOS compatible)
     */
    private function sendAppointmentEmailsIonos($appointment): void
    {
        try {
            // Format date for display
            $formattedDate = \Carbon\Carbon::parse($appointment->appointment_date)->format('d.m.Y');
            $serviceTypeLabel = $this->getServiceTypeLabel($appointment->service_type);
            
            // Send emails
            $this->sendSimpleAppointmentEmails($appointment, $formattedDate, $serviceTypeLabel);
            
            \Log::info('Appointment emails sent successfully', [
                'appointment_id' => $appointment->id,
                'customer_email' => $appointment->customer_email
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to send appointment emails', [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Send simple text-based emails (IONOS compatible)
     */
    private function sendSimpleAppointmentEmails($appointment, $formattedDate, $serviceTypeLabel): void
    {
        // Admin notification email
        $adminMessage = "Neue Terminvereinbarung von www.yisu-travel.de\n\n";
        $adminMessage .= "Name: {$appointment->customer_name}\n";
        $adminMessage .= "E-Mail: {$appointment->customer_email}\n";
        $adminMessage .= "Telefon: {$appointment->customer_phone}\n";
        $adminMessage .= "Datum: $formattedDate\n";
        $adminMessage .= "Uhrzeit: {$appointment->appointment_time}\n";
        $adminMessage .= "Service: $serviceTypeLabel\n";
        if ($appointment->message) {
            $adminMessage .= "Nachricht: {$appointment->message}\n";
        }
        $adminMessage .= "\nZeit: " . date('Y-m-d H:i:s') . "\n";
        
        // Customer confirmation email
        $customerMessage = "Vielen Dank für Ihre Terminvereinbarung an YISU Travel!\n\n";
        $customerMessage .= "Ihre Termindetails:\n";
        $customerMessage .= "Name: {$appointment->customer_name}\n";
        $customerMessage .= "E-Mail: {$appointment->customer_email}\n";
        $customerMessage .= "Telefon: {$appointment->customer_phone}\n";
        $customerMessage .= "Datum: $formattedDate\n";
        $customerMessage .= "Uhrzeit: {$appointment->appointment_time}\n";
        $customerMessage .= "Service: $serviceTypeLabel\n";
        if ($appointment->message) {
            $customerMessage .= "Ihre Nachricht: {$appointment->message}\n";
        }
        $customerMessage .= "\nWir werden uns so schnell wie möglich bei Ihnen melden.\n\n";
        $customerMessage .= "Mit freundlichen Grüßen\nIhr YISU Travel Team\n\n";
        $customerMessage .= "Kontakt:\n";
        $customerMessage .= "E-Mail: info@yisu-travel.de\n";
        $customerMessage .= "Web: https://yisu-travel.de";
        
        // Email headers
        $headers = "From: info@yisu-travel.de\r\n";
        $headers .= "Reply-To: info@yisu-travel.de\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        
        // Send admin email
        $adminResult = mail('info@yisu-travel.de', 'Neue Terminvereinbarung YISU Travel', $adminMessage, $headers);
        
        // Send customer email
        $customerResult = mail($appointment->customer_email, 'Terminbestätigung YISU Travel', $customerMessage, $headers);
        
        // Log results
        \Log::info('Email sending completed', [
            'admin_success' => $adminResult,
            'customer_success' => $customerResult,
            'appointment_id' => $appointment->id
        ]);
    }

    /**
     * Get service type label
     */
    private function getServiceTypeLabel($serviceType): string
    {
        $serviceTypes = [
            'flight' => 'Flugbuchung',
            'hotel' => 'Hotelbuchung',
            'package' => 'Pauschalreise',
            'custom' => 'Individuelle Reise',
            'consultation' => 'Reiseberatung',
            'beratung' => 'Reiseberatung',
            'buchung' => 'Buchung',
            'visum' => 'Visum-Service',
            'sonstiges' => 'Sonstiges'
        ];
        
        return $serviceTypes[$serviceType] ?? $serviceType;
    }
}