import mongoose, { Schema } from 'mongoose';

export interface ISignup {
    _id?: string;
    memberId: string | mongoose.Types.ObjectId; // Reference to Member._id
    scheduleId: string; // Reference to Schedule._id
    classDate: Date; // The specific date this signup is for
    signupDate: Date; // When the member signed up
    status: 'active' | 'cancelled' | 'done'; // Whether the signup is active, cancelled, or checked in
    createdAt: Date;
    updatedAt: Date;
}

const signupSchema = new mongoose.Schema<ISignup>(
    {
        memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
        scheduleId: { type: String, required: true },
        classDate: { type: Date, required: true }, // The specific date this signup is for
        signupDate: { type: Date, required: true, default: Date.now },
        status: {
            type: String,
            required: true,
            enum: ['active', 'cancelled', 'done'],
            default: 'active'
        }
    },
    { timestamps: true }
);

// Indexes for performance
signupSchema.index({ memberId: 1 });
signupSchema.index({ scheduleId: 1 });
signupSchema.index({ classDate: 1 });
signupSchema.index({ signupDate: 1 });
signupSchema.index({ status: 1 });
signupSchema.index({ memberId: 1, scheduleId: 1, classDate: 1 }, { unique: true }); // Prevent duplicate signups for same date
signupSchema.index({ memberId: 1, classDate: 1 }); // For member signup history by date
signupSchema.index({ scheduleId: 1, classDate: 1, status: 1 }); // For class attendance lists by date

const Signup = mongoose.model<ISignup>('Signup', signupSchema);
export { Signup };
