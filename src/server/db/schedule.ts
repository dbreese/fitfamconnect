import mongoose, { Schema } from 'mongoose';

export interface ISchedule {
    _id?: string;
    classId: string; // Reference to Class
    locationId: string; // Reference to Location
    coachId?: string; // Reference to Member (coach)

    // Unified date/time fields
    startDateTime: Date; // Start date and time for both one-time and recurring schedules
    endDate?: Date; // Optional end date (when the schedule should stop recurring)

    maxAttendees?: number; // Override class max if needed
    notes?: string;

    // Recurring pattern
    recurringPattern?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number; // e.g., every 2 weeks = frequency: 'weekly', interval: 2
        daysOfWeek?: number[]; // For weekly: [1,3,5] = Monday, Wednesday, Friday (0=Sunday, 1=Monday, etc.)
    };

    isRecurring: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const scheduleSchema = new mongoose.Schema<ISchedule>(
    {
        classId: { type: String, required: true },
        locationId: { type: String, required: true },
        coachId: { type: String },

        // Unified date/time fields
        startDateTime: { type: Date, required: true },
        endDate: { type: Date }, // Optional end date for recurring schedules

        maxAttendees: { type: Number },
        notes: { type: String },

        recurringPattern: {
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'monthly']
            },
            interval: { type: Number, min: 1 },
            daysOfWeek: [{ type: Number, min: 0, max: 6 }] // 0=Sunday, 1=Monday, etc.
        },

        isRecurring: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Indexes for performance
scheduleSchema.index({ classId: 1 });
scheduleSchema.index({ locationId: 1 });
scheduleSchema.index({ coachId: 1 });
scheduleSchema.index({ startDateTime: 1 });
scheduleSchema.index({ endDate: 1 });
scheduleSchema.index({ isRecurring: 1 });

// Validation: ensure proper field usage based on schedule type
scheduleSchema.pre('validate', function (next) {
    // startDateTime is always required (handled by schema required: true)

    // For recurring schedules
    if (this.isRecurring) {
        if (!this.recurringPattern) {
            return next(new Error('recurringPattern is required for recurring schedules'));
        }
        if (this.recurringPattern.frequency === 'weekly' && (!this.recurringPattern.daysOfWeek || this.recurringPattern.daysOfWeek.length === 0)) {
            return next(new Error('daysOfWeek is required for weekly recurring schedules'));
        }
    }

    // Validate endDate is after startDateTime if provided
    if (this.endDate && this.startDateTime >= this.endDate) {
        return next(new Error('End date must be after start date/time'));
    }

    next();
});

const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
export { Schedule };
