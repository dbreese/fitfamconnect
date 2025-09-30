import mongoose, { Schema } from 'mongoose';

export interface IMembership {
    _id?: string;
    memberId: string; // Reference to Member
    planId: string; // Reference to Plan - single plan per row
    startDate: Date; // When this plan assignment starts for the member
    endDate?: Date; // When this plan assignment ends (null/undefined = active/ongoing)
    lastBilledDate?: Date; // Last time this membership was billed
    nextBilledDate?: Date; // Next scheduled billing date for this membership
    createdAt: Date;
    updatedAt: Date;
}

const membershipSchema = new mongoose.Schema<IMembership>(
    {
        memberId: { type: String, required: true },
        planId: { type: String, required: true },
        startDate: { type: Date, required: true, default: Date.now },
        endDate: { type: Date },
        lastBilledDate: { type: Date },
        nextBilledDate: { type: Date }
    },
    { timestamps: true }
);

// Indexes for performance
membershipSchema.index({ memberId: 1 });
membershipSchema.index({ planId: 1 });
membershipSchema.index({ startDate: 1 });
membershipSchema.index({ endDate: 1 });
membershipSchema.index({ lastBilledDate: 1 });
membershipSchema.index({ nextBilledDate: 1 });
membershipSchema.index({ memberId: 1, endDate: 1 }); // Active memberships for a member (endDate null = active)
membershipSchema.index({ planId: 1, endDate: 1 }); // Active memberships for a plan

// No unique constraints - members can have multiple active memberships for different plans
// and historical records for the same plan over time

const Membership = mongoose.model<IMembership>('Membership', membershipSchema);
export { Membership };
