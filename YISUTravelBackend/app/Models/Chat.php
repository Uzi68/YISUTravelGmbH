<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Chat extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'id',
        'session_id',
        'user_id',
        'visitor_id',
        'visitor_session_id',
        'status',
        'assigned_to',
        'assigned_at',
        'closed_at',
        'close_reason',        // ✅ Hinzufügen
        'closed_by_agent',     // ✅ Hinzufügen
        'state',
        'context',
        'transfer_count',
        'last_agent_activity'
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'closed_at' => 'datetime',
        'chat_id' => 'string'
    ];


    public function visitor()
    {
        return $this->belongsTo(Visitor::class);
    }



    public function escalations()
    {
        return $this->hasMany(Escalation::class);
    }

    public function escalationPrompts()
    {
        return $this->hasMany(EscalationPrompt::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'human');
    }


    public function isBotChat(): bool
    {
        return $this->status === 'bot' && !$this->assigned_to;
    }

    public function isWaitingForHuman(): bool
    {
        return $this->status === 'human' && !$this->assigned_to;
    }

    public function isAssignedToAgent(): bool
    {
        return $this->assigned_to !== null;
    }


    /**
     * Scope für die Filterung von Chats.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param array $filters
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeFilter($query, $filters)
    {
        // Filter für session_id anwenden
        if (isset($filters['session_id'])) {
            $query->where('session_id', $filters['session_id']);
        }

        // Filter für user_id anwenden
        if (isset($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        // Filter für 'created_at' ab 'date_from' anwenden
        if (isset($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        // Filter für 'created_at' bis 'date_to' anwenden
        if (isset($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query;
    }

    /**
     * Beziehung zu den Nachrichten (Messages).
     * Ein Chat kann viele Nachrichten haben.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    /**
     * Beziehung zu User (optional, in dem Fall, dass du Chats mit Benutzern verknüpfen möchtest).
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }


    public function canUserWrite($userId = null): bool
    {
        $userId = $userId ?? auth()->id();

        // Nur der zugewiesene Agent darf schreiben
        return $this->assigned_to === $userId;
    }

    public function isAssigned(): bool
    {
        return !is_null($this->assigned_to);
    }

    public function assignTo(User $user): void
    {
        $this->update([
            'assigned_to' => $user->id,
            'assigned_at' => now(),
            'status' => 'in_progress'
        ]);
    }

    public function transferTo(User $newUser): void
    {
        $this->update([
            'assigned_to' => $newUser->id,
            'assigned_at' => now()
        ]);
    }

    public function unassign(): void
    {
        $this->update([
            'assigned_to' => null,
            'assigned_at' => null,
            'status' => 'human'
        ]);
    }
}
