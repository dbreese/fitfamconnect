import mongoose, { Schema } from 'mongoose';

export interface IMember {
    userId?: Schema.Types.ObjectId; // Reference to User if they have an account
    role: 'owner' | 'coach' | 'member';
    profile: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        dateOfBirth?: Date;
        address?: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
        };
    };
    groupId?: Schema.Types.ObjectId;
    startDate: Date;
    isActive: boolean;
    attendedClasses: Schema.Types.ObjectId[]; // References to attended Schedule instances
    createdAt: Date;
    updatedAt: Date;
}

const memberSchema = new mongoose.Schema<IMember>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['owner', 'coach', 'member'], required: true, default: 'member' },
        profile: {
            firstName: { type: String, required: true },
            lastName: { type: String, required: true },
            email: { type: String, required: true },
            phone: { type: String },
            dateOfBirth: { type: Date },
            address: {
                street: { type: String },
                city: { type: String },
                state: { type: String },
                zipCode: { type: String },
                country: { type: String, default: 'US' }
            }
        },
        groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
        startDate: { type: Date, required: true, default: Date.now },
        isActive: { type: Boolean, default: true },
        attendedClasses: [{ type: Schema.Types.ObjectId, ref: 'Schedule' }]
    },
    { timestamps: true }
);

// Index for email lookups
memberSchema.index({ 'profile.email': 1 });

const Member = mongoose.model<IMember>('Member', memberSchema);
export { Member };
