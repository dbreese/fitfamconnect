import mongoose, { Schema } from 'mongoose';

export interface IMembership {
    _id?: string;
    memberId: string; // Reference to Member
    planId: string; // Reference to Plan - single plan per row
    notes?: string; // Optional notes for this specific plan assignment
    createdAt: Date;
    updatedAt: Date;
}

const membershipSchema = new mongoose.Schema<IMembership>(
    {
        memberId: { type: String, required: true },
        planId: { type: String, required: true },
        notes: { type: String }
    },
    { timestamps: true }
);

// Indexes for performance
membershipSchema.index({ memberId: 1 });
membershipSchema.index({ planId: 1 });
membershipSchema.index({ memberId: 1, planId: 1 }, { unique: true }); // Prevent duplicate plan assignments

const Membership = mongoose.model<IMembership>('Membership', membershipSchema);
export { Membership };
