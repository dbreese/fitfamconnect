import mongoose, { Schema } from 'mongoose';

export interface IPlan {
    _id?: string;
    name: string;
    description?: string;
    price: number; // In cents to avoid floating point issues
    currency: string;
    startDateTime: Date; // Mandatory start date/time
    endDateTime?: Date; // Optional end date/time
    isRecurring: boolean;
    recurringPeriod?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
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
        isRecurring: { type: Boolean, required: true, default: true },
        recurringPeriod: {
            type: String,
            enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
            required: function () {
                return this.isRecurring;
            }
        },
        gymId: { type: String, required: true }, // Reference to Gym._id
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Indexes for performance
planSchema.index({ gymId: 1 });
planSchema.index({ isActive: 1 });
planSchema.index({ isRecurring: 1 });
planSchema.index({ startDateTime: 1, endDateTime: 1 });

// Validation: if not recurring, must have end date
planSchema.pre('validate', function (next) {
    if (!this.isRecurring && !this.endDateTime) {
        return next(new Error('Non-recurring plans must have an end date'));
    }

    if (this.endDateTime && this.startDateTime >= this.endDateTime) {
        return next(new Error('Start date must be before end date'));
    }

    next();
});

// Virtual for formatted price
planSchema.virtual('formattedPrice').get(function () {
    return (this.price / 100).toFixed(2);
});

// Method to check if plan is currently active (for time-based plans)
planSchema.methods.isCurrentlyActive = function () {
    const now = new Date();

    if (!this.isActive) return false;

    if (this.isRecurring) return true;

    if (this.startDateTime && this.endDateTime) {
        return now >= this.startDateTime && now <= this.endDateTime;
    }

    return true;
};

const Plan = mongoose.model<IPlan>('Plan', planSchema);
export { Plan };
