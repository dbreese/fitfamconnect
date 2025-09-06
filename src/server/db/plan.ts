import mongoose from 'mongoose';

export interface IPlan {
    name: string;
    description?: string;
    price: number;
    currency: string;
    isRecurring: boolean;
    recurringPeriod?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const planSchema = new mongoose.Schema<IPlan>(
    {
        name: { type: String, required: true },
        description: { type: String },
        price: { type: Number, required: true, min: 0 },
        currency: { type: String, required: true, default: 'USD' },
        isRecurring: { type: Boolean, required: true, default: true },
        recurringPeriod: {
            type: String,
            enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
            required: function (this: IPlan) {
                return this.isRecurring;
            }
        },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const Plan = mongoose.model<IPlan>('Plan', planSchema);
export { Plan };
