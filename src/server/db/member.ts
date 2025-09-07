import mongoose, { Schema } from 'mongoose';

export interface IMember {
    _id?: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    memberType: 'owner' | 'coach' | 'member';
    startDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const memberSchema = new mongoose.Schema<IMember>(
    {
        email: { type: String, required: true, unique: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            zipCode: { type: String, required: true },
            country: { type: String, required: true, default: 'US' }
        },
        memberType: {
            type: String,
            required: true,
            enum: ['owner', 'coach', 'member'],
            default: 'member'
        },
        startDate: { type: Date, required: true, default: Date.now },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Indexes for performance
memberSchema.index({ email: 1 });
memberSchema.index({ memberType: 1 });
memberSchema.index({ isActive: 1 });

const Member = mongoose.model<IMember>('Member', memberSchema);
export { Member };
