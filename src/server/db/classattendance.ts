import mongoose, { Schema } from 'mongoose';

export interface IClassAttendance {
    _id?: string;
    memberId: string; // Reference to Member
    scheduleId: string; // Reference to Schedule
    classId: string; // Reference to Class (for easier reporting)
    gymId: string; // Reference to Gym (for sharding/reporting)
    attendanceDate: Date;
    status: 'registered' | 'attended' | 'no_show' | 'cancelled';
    checkedInAt?: Date;
    checkedOutAt?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const classAttendanceSchema = new mongoose.Schema<IClassAttendance>(
    {
        memberId: { type: String, required: true },
        scheduleId: { type: String, required: true },
        classId: { type: String, required: true },
        gymId: { type: String, required: true }, // For sharding and reporting
        attendanceDate: { type: Date, required: true },
        status: {
            type: String,
            required: true,
            enum: ['registered', 'attended', 'no_show', 'cancelled'],
            default: 'registered'
        },
        checkedInAt: { type: Date },
        checkedOutAt: { type: Date },
        notes: { type: String }
    },
    { timestamps: true }
);

// Indexes for performance and reporting
classAttendanceSchema.index({ memberId: 1 });
classAttendanceSchema.index({ scheduleId: 1 });
classAttendanceSchema.index({ classId: 1 });
classAttendanceSchema.index({ gymId: 1 });
classAttendanceSchema.index({ attendanceDate: 1 });
classAttendanceSchema.index({ status: 1 });

// Compound indexes for reporting
classAttendanceSchema.index({ gymId: 1, attendanceDate: 1 });
classAttendanceSchema.index({ memberId: 1, attendanceDate: 1 });
classAttendanceSchema.index({ classId: 1, attendanceDate: 1 });

// Unique constraint to prevent duplicate registrations
classAttendanceSchema.index({ memberId: 1, scheduleId: 1 }, { unique: true });

// Virtual for session duration
classAttendanceSchema.virtual('sessionDuration').get(function () {
    if (this.checkedInAt && this.checkedOutAt) {
        return this.checkedOutAt.getTime() - this.checkedInAt.getTime();
    }
    return null;
});

// Method to mark attendance
classAttendanceSchema.methods.checkIn = function () {
    this.checkedInAt = new Date();
    this.status = 'attended';
    return this.save();
};

// Method to check out
classAttendanceSchema.methods.checkOut = function () {
    this.checkedOutAt = new Date();
    return this.save();
};

const ClassAttendance = mongoose.model<IClassAttendance>('ClassAttendance', classAttendanceSchema);
export { ClassAttendance };
