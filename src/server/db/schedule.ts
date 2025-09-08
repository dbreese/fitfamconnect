import mongoose, { Schema } from 'mongoose';

export interface ISchedule {
    _id?: string;
    classId: string; // Reference to Class
    locationId: string; // Reference to Location
    instructorId?: string; // Reference to Member (coach)
    startDateTime: Date;
    endDateTime?: Date;
    maxAttendees?: number; // Override class max if needed
    notes?: string;
    recurringPattern?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number; // e.g., every 2 weeks = frequency: 'weekly', interval: 2
        daysOfWeek?: number[]; // For weekly: [1,3,5] = Monday, Wednesday, Friday
        endDate?: Date; // When to stop recurring
    };
    isRecurring: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const scheduleSchema = new mongoose.Schema<ISchedule>(
    {
        classId: { type: String, required: true },
        locationId: { type: String, required: true },
        instructorId: { type: String },
        startDateTime: { type: Date, required: true },
        endDateTime: { type: Date },
        maxAttendees: { type: Number },
        notes: { type: String },
        recurringPattern: {
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'monthly']
            },
            interval: { type: Number, min: 1 },
            daysOfWeek: [{ type: Number, min: 0, max: 6 }],
            endDate: { type: Date }
        },
        isRecurring: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Indexes for performance
scheduleSchema.index({ classId: 1 });
scheduleSchema.index({ locationId: 1 });
scheduleSchema.index({ instructorId: 1 });
scheduleSchema.index({ startDateTime: 1 });

// Validation: end time must be after start time
scheduleSchema.pre('validate', function (next) {
    if (this.endDateTime && this.startDateTime >= this.endDateTime) {
        return next(new Error('End time must be after start time'));
    }
    next();
});

const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
export { Schedule };
