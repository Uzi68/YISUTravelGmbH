<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppointmentRequest;
use App\Models\Appointment;
use App\Models\BlockedSlot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class AppointmentController extends Controller
{
    /**
     * Store a new appointment
     */
    public function store(AppointmentRequest $request): JsonResponse
    {
        $appointment = Appointment::create($request->validated());
        
        return response()->json([
            'success' => true,
            'message' => 'Termin erfolgreich gebucht!',
            'appointment' => $appointment
        ], 201);
    }

    /**
     * Get all appointments (admin only)
     */
    public function index(Request $request): JsonResponse
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
    public function getAvailableSlots(Request $request): JsonResponse
    {
        $date = $request->input('date');
        
        if (!$date) {
            return response()->json(['error' => 'Date is required'], 400);
        }

        $carbonDate = Carbon::parse($date);
        $dayOfWeek = $carbonDate->dayOfWeek; // 0 = Sunday, 1 = Monday, etc.

        // Check if it's Sunday (closed)
        if ($dayOfWeek === 0) {
            return response()->json(['slots' => []]);
        }

        // Define business hours
        $isSaturday = $dayOfWeek === 6;
        $startTime = $isSaturday ? '10:30' : '10:00';
        $endTime = $isSaturday ? '15:00' : '17:30';

        // Generate all possible 30-minute slots
        $allSlots = $this->generateTimeSlots($startTime, $endTime);

        // Get booked slots for this date
        $bookedSlots = Appointment::where('appointment_date', $date)
            ->pluck('appointment_time')
            ->map(function ($time) {
                return Carbon::parse($time)->format('H:i');
            })
            ->toArray();

        // Get blocked slots for this date
        $blockedSlots = BlockedSlot::getBlockedSlotsForDate($date);

        // Filter out booked and blocked slots
        $unavailableSlots = array_merge($bookedSlots, $blockedSlots);
        $availableSlots = array_diff($allSlots, $unavailableSlots);

        return response()->json([
            'slots' => array_values($availableSlots),
            'business_hours' => [
                'start' => $startTime,
                'end' => $endTime
            ]
        ]);
    }

    /**
     * Admin blocks a specific slot
     */
    public function blockSlot(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'time' => 'required|date_format:H:i'
        ]);

        // Check if slot is already booked
        $existingAppointment = Appointment::where('appointment_date', $request->date)
            ->where('appointment_time', $request->time)
            ->first();

        if ($existingAppointment) {
            return response()->json([
                'error' => 'Dieser Termin ist bereits gebucht'
            ], 400);
        }

        // Check if slot is already blocked
        if (BlockedSlot::isBlocked($request->date, $request->time)) {
            return response()->json([
                'error' => 'Dieser Zeit-Slot ist bereits blockiert'
            ], 400);
        }

        // Block the slot
        $blockedSlot = BlockedSlot::blockSlot($request->date, $request->time, 'Admin blockiert');

        return response()->json([
            'success' => true,
            'message' => 'Zeit-Slot erfolgreich blockiert',
            'blocked_slot' => $blockedSlot
        ]);
    }

    /**
     * Admin unblocks a slot
     */
    public function unblockSlot(int $id): JsonResponse
    {
        $appointment = Appointment::findOrFail($id);

        if (!$appointment->blocked_by_admin) {
            return response()->json([
                'error' => 'Dieser Termin wurde nicht von einem Admin blockiert'
            ], 400);
        }

        $appointment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Termin erfolgreich freigegeben'
        ]);
    }

    /**
     * Get blocked slots for a specific date
     */
    public function getBlockedSlots(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date'
        ]);

        $blockedSlots = BlockedSlot::getBlockedSlotsForDate($request->date);

        return response()->json([
            'success' => true,
            'blocked_slots' => $blockedSlots
        ]);
    }

    /**
     * Update appointment status
     */
    public function updateStatus(Request $request, int $id): JsonResponse
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
            'time' => 'required|string'
        ]);

        $date = $request->input('date');
        $time = $request->input('time');

        try {
            // Check if slot is actually blocked
            $blockedSlot = BlockedSlot::where('blocked_date', $date)
                ->where('blocked_time', Carbon::parse($time)->format('H:i:s'))
                ->first();

            if (!$blockedSlot) {
                return response()->json([
                    'success' => false,
                    'message' => 'Slot ist nicht blockiert'
                ], 400);
            }

            // Remove the blocked slot
            $blockedSlot->delete();

            return response()->json([
                'success' => true,
                'message' => 'Slot erfolgreich freigegeben'
            ]);

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
            'times.*' => 'required|string'
        ]);

        $date = $request->input('date');
        $times = $request->input('times');

        try {
            $unblockedCount = 0;
            $errors = [];

            foreach ($times as $time) {
                $blockedSlot = BlockedSlot::where('blocked_date', $date)
                    ->where('blocked_time', Carbon::parse($time)->format('H:i:s'))
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
    public function releaseAppointment($id): JsonResponse
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
    public function restoreAppointment($id): JsonResponse
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
}


