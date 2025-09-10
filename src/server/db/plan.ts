import mongoose, { Schema } from 'mongoose';

export interface IPlan {
    _id?: string;
    name: string;
    description?: string;
    price: number; // In cents to avoid floating point issues
    currency: string;
    startDateTime: Date; // Mandatory start date/time
    endDateTime?: Date; // Optional end date/time
    recurringPeriod: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    gymId: string; // Reference to Gym
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const planSchema = new mongoose.Schema<IPlan>(
    {
        name: { type: String, required: true },
        description: { type: String },
        price: { type: Number, required: true, min: 0 }, // Price in cents
        currency: { type: String, required: true, default: 'USD' },
        startDateTime: { type: Date, required: true },
        endDateTime: { type: Date },
        recurringPeriod: {
            type: String,
            enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
            required: true
        },
        gymId: { type: String, required: true }, // Reference to Gym._id
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Indexes for performance
planSchema.index({ gymId: 1 });
planSchema.index({ isActive: 1 });
planSchema.index({ recurringPeriod: 1 });
planSchema.index({ startDateTime: 1, endDateTime: 1 });

// Validation: end date must be after start date if provided
planSchema.pre('validate', function (next) {
    if (this.endDateTime && this.startDateTime >= this.endDateTime) {
        return next(new Error('Start date must be before end date'));
    }

    next();
});

// Virtual for formatted price
planSchema.virtual('formattedPrice').get(function () {
    return (this.price / 100).toFixed(2);
});

// Method to check if plan is currently active
planSchema.methods.isCurrentlyActive = function () {
    const now = new Date();

    if (!this.isActive) return false;

    // All plans are recurring, so check if within date range if end date is set
    if (this.endDateTime) {
        return now >= this.startDateTime && now <= this.endDateTime;
    }

    // If no end date, plan is active from start date onwards
    return now >= this.startDateTime;
};

const Plan = mongoose.model<IPlan>('Plan', planSchema);
export { Plan };
