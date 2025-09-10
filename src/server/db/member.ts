import mongoose, { Schema } from 'mongoose';

export interface IMember {
    _id?: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    memberType: 'owner' | 'coach' | 'member';
    startDate: Date;
    isActive: boolean;
    gymId: string; // Reference to Gym
    status: 'pending' | 'approved' | 'denied' | 'inactive';
    approvedBy?: string; // Reference to Member._id (owner who approved)
    approvedAt?: Date;
    joinRequestDate: Date;
    notes?: string; // General notes about the member
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
            street: { type: String },
            city: { type: String },
            state: { type: String },
            zipCode: { type: String },
            country: { type: String, default: 'US' }
        },
        memberType: {
            type: String,
            required: true,
            enum: ['owner', 'coach', 'member'],
            default: 'member'
        },
        startDate: { type: Date, required: true, default: Date.now },
        isActive: { type: Boolean, default: true },
        gymId: { type: String, required: true },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'approved', 'denied', 'inactive'],
            default: 'pending'
        },
        approvedBy: { type: String }, // Member._id of owner who approved
        approvedAt: { type: Date },
        joinRequestDate: { type: Date, required: true, default: Date.now },
        notes: { type: String }
    },
    { timestamps: true }
);

// Indexes for performance
memberSchema.index({ email: 1 });
memberSchema.index({ memberType: 1 });
memberSchema.index({ isActive: 1 });
memberSchema.index({ gymId: 1 });
memberSchema.index({ status: 1 });
memberSchema.index({ approvedBy: 1 });
memberSchema.index({ gymId: 1, status: 1 }); // Compound index for gym queries

// Pre-save middleware to set approval timestamp
memberSchema.pre('save', function (next) {
    if (this.status === 'approved' && !this.approvedAt) {
        this.approvedAt = new Date();
    }
    next();
});

const Member = mongoose.model<IMember>('Member', memberSchema);
export { Member };
