<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppointmentRequest;
use App\Models\Appointment;
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

        // Filter out booked slots
        $availableSlots = array_diff($allSlots, $bookedSlots);

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

        $blockedAppointment = Appointment::create([
            'customer_name' => 'Admin Block',
            'customer_email' => 'admin@yisu-travel.de',
            'customer_phone' => '0000000000',
            'appointment_date' => $request->date,
            'appointment_time' => $request->time,
            'service_type' => 'sonstiges',
            'travelers_count' => 0,
            'status' => 'confirmed',
            'blocked_by_admin' => true
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Termin erfolgreich blockiert',
            'appointment' => $blockedAppointment
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
}

