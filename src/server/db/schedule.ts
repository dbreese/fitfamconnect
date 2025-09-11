import mongoose, { Schema } from 'mongoose';

export interface ISchedule {
    _id?: string;
    classId: string; // Reference to Class
    locationId: string; // Reference to Location
    coachId?: string; // Reference to Member (coach)

    // For one-time schedules
    startDateTime?: Date; // Single occurrence date/time
    endDateTime?: Date; // Single occurrence end time

    // For recurring schedules
    startDate?: Date; // When the recurring schedule starts
    endDate?: Date; // When the recurring schedule ends
    timeOfDay?: Date; // Time of day (Date field, only time portion used)

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

        // For one-time schedules
        startDateTime: { type: Date },
        endDateTime: { type: Date },

        // For recurring schedules
        startDate: { type: Date },
        endDate: { type: Date },
        timeOfDay: { type: Date }, // Date field, only time portion used

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
scheduleSchema.index({ startDate: 1 });
scheduleSchema.index({ isRecurring: 1 });

// Validation: ensure proper field usage based on schedule type
scheduleSchema.pre('validate', function (next) {
    // For one-time schedules
    if (!this.isRecurring) {
        if (!this.startDateTime) {
            return next(new Error('startDateTime is required for one-time schedules'));
        }
        if (this.endDateTime && this.startDateTime >= this.endDateTime) {
            return next(new Error('End time must be after start time'));
        }
    }

    // For recurring schedules
    if (this.isRecurring) {
        if (!this.startDate) {
            return next(new Error('startDate is required for recurring schedules'));
        }
        if (!this.timeOfDay) {
            return next(new Error('timeOfDay is required for recurring schedules'));
        }
        if (!this.recurringPattern) {
            return next(new Error('recurringPattern is required for recurring schedules'));
        }
    }

    next();
});

const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
export { Schedule };
