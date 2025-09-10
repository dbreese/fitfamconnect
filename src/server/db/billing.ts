import mongoose, { Schema } from 'mongoose';

export interface IBilling {
    _id?: string;
    memberId: string; // Reference to Member._id (person who ran billing)
    billingDate: Date; // Date the billing run was created
    startDate: Date; // Start date of the billing cycle period
    endDate: Date; // End date of the billing cycle period
    createdAt: Date;
    updatedAt: Date;
}

const billingSchema = new mongoose.Schema<IBilling>(
    {
        memberId: { type: String, required: true },
        billingDate: { type: Date, required: true, default: Date.now },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true }
    },
    { timestamps: true }
);

// Indexes for performance
billingSchema.index({ memberId: 1 });
billingSchema.index({ billingDate: 1 });
billingSchema.index({ startDate: 1 });
billingSchema.index({ endDate: 1 });
billingSchema.index({ memberId: 1, billingDate: 1 }); // Compound index for member billing history
billingSchema.index({ startDate: 1, endDate: 1 }); // Compound index for billing period queries

// Validation to ensure endDate is after startDate
billingSchema.pre('save', function (next) {
    if (this.endDate <= this.startDate) {
        const error = new Error('End date must be after start date');
        return next(error);
    }
    next();
});

const Billing = mongoose.model<IBilling>('Billing', billingSchema);
export { Billing };
