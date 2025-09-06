import mongoose, { Schema } from 'mongoose';

export interface IMembership {
    memberId: string; // Reference to Member
    locationId: string; // Reference to Location
    gymCode: string; // The gym code used to join
    status: 'pending' | 'approved' | 'denied' | 'inactive';
    approvedBy?: string; // Reference to Member._id (owner who approved)
    approvedAt?: Date;
    planIds: string[]; // Array of Plan references - multiple plans can be active
    joinRequestDate: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const membershipSchema = new mongoose.Schema<IMembership>(
    {
        memberId: { type: String, required: true },
        locationId: { type: String, required: true },
        gymCode: { type: String, required: true },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'approved', 'denied', 'inactive'],
            default: 'pending'
        },
        approvedBy: { type: String }, // Member._id of owner who approved
        approvedAt: { type: Date },
        planIds: [{ type: String }], // Array of Plan._id references
        joinRequestDate: { type: Date, required: true, default: Date.now },
        notes: { type: String }
    },
    { timestamps: true }
);

// Compound indexes
membershipSchema.index({ memberId: 1, locationId: 1 }, { unique: true });
membershipSchema.index({ gymCode: 1 });
membershipSchema.index({ status: 1 });
membershipSchema.index({ approvedBy: 1 });

// Pre-save middleware to set approval timestamp
membershipSchema.pre('save', function (next) {
    if (this.status === 'approved' && !this.approvedAt) {
        this.approvedAt = new Date();
    }
    next();
});

const Membership = mongoose.model<IMembership>('Membership', membershipSchema);
export { Membership };
