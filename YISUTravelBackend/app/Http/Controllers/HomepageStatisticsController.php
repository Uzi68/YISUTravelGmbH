<?php

namespace App\Http\Controllers;

use App\Models\MetricCounter;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class HomepageStatisticsController extends Controller
{
    /**
     * The counters handled by this endpoint.
     *
     * @var array<string, array<string, mixed>>
     */
    private array $metrics = [
        'bookings' => [
            'seed' => 210000,
        ],
        'happyCustomers' => [
            'seed' => 210000,
        ],
    ];

    public function show(): JsonResponse
    {
        $today = Carbon::today();
        $payload = [];

        foreach ($this->metrics as $key => $config) {
            $counter = MetricCounter::firstOrCreate(
                ['key' => $key],
                [
                    'total' => $config['seed'],
                    'today_increment' => 0,
                    'last_increment_date' => $today->copy()->subDay(),
                ]
            );

            if (!$counter->last_increment_date || !$counter->last_increment_date->isSameDay($today)) {
                $increment = random_int(0, 9);
                $counter->total += $increment;
                $counter->today_increment = $increment;
                $counter->last_increment_date = $today;
                $counter->save();
            }

            $payload[$key] = [
                'total' => (int) $counter->total,
                'todayIncrement' => (int) $counter->today_increment,
            ];
        }

        return response()->json($payload);
    }
}

