import mongoose, { Schema } from 'mongoose';

export interface ISchedule {
    classId: Schema.Types.ObjectId;
    subLocationId: Schema.Types.ObjectId;
    instructorId?: Schema.Types.ObjectId; // Reference to Member with coach role
    startDateTime: Date;
    endDateTime: Date;
    maxMembers?: number; // Override class default if needed
    registeredMembers: Schema.Types.ObjectId[];
    waitList: Schema.Types.ObjectId[];
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const scheduleSchema = new mongoose.Schema<ISchedule>(
    {
        classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
        subLocationId: { type: Schema.Types.ObjectId, ref: 'SubLocation', required: true },
        instructorId: { type: Schema.Types.ObjectId, ref: 'Member' },
        startDateTime: { type: Date, required: true },
        endDateTime: { type: Date, required: true },
        maxMembers: { type: Number, min: 1 },
        registeredMembers: [{ type: Schema.Types.ObjectId, ref: 'Member' }],
        waitList: [{ type: Schema.Types.ObjectId, ref: 'Member' }],
        status: {
            type: String,
            enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
            default: 'scheduled'
        },
        notes: { type: String }
    },
    { timestamps: true }
);

// Ensure no double booking of sublocation at same time
scheduleSchema.index(
    {
        subLocationId: 1,
        startDateTime: 1,
        endDateTime: 1
    },
    {
        unique: true,
        partialFilterExpression: { status: { $ne: 'cancelled' } }
    }
);

// Index for finding schedules by date range
scheduleSchema.index({ startDateTime: 1, endDateTime: 1 });

const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
export { Schedule };
