import mongoose, { Schema } from 'mongoose';

export interface ICharge {
    _id?: string;
    memberId: string; // Reference to Member._id
    planId?: string; // Optional reference to Plan._id for plan-based charges
    productId?: string; // Optional reference to Product._id for product-based charges
    amount: number; // Charge amount (in cents to avoid floating point issues)
    note?: string; // Description of the charge (e.g., "Monthly membership", "Beverage purchase")
    chargeDate: Date; // When the charge occurred
    isBilled: boolean; // Whether this charge has been billed yet
    billedDate?: Date; // When the charge was billed (if applicable)
    billingId?: string; // Reference to Billing._id when this charge was billed
    createdAt: Date;
    updatedAt: Date;
}

const chargeSchema = new mongoose.Schema<ICharge>(
    {
        memberId: { type: String, required: true },
        planId: { type: String }, // Optional - for plan-based charges
        productId: { type: String }, // Optional - for product-based charges
        amount: { type: Number, required: true, min: 0 }, // Amount in cents
        note: { type: String },
        chargeDate: { type: Date, required: true, default: Date.now },
        isBilled: { type: Boolean, required: true, default: false },
        billedDate: { type: Date },
        billingId: { type: String } // Reference to Billing._id when this charge was billed
    },
    { timestamps: true }
);

// Indexes for performance
chargeSchema.index({ memberId: 1 });
chargeSchema.index({ planId: 1 });
chargeSchema.index({ productId: 1 });
chargeSchema.index({ chargeDate: 1 });
chargeSchema.index({ isBilled: 1 });
chargeSchema.index({ billingId: 1 });
chargeSchema.index({ memberId: 1, chargeDate: 1 }); // Compound index for member billing history
chargeSchema.index({ memberId: 1, isBilled: 1 }); // Compound index for member billing status
chargeSchema.index({ billingId: 1, isBilled: 1 }); // Compound index for billing run queries

// Pre-save middleware to set billedDate when isBilled becomes true
chargeSchema.pre('save', function (next) {
    if (this.isBilled && !this.billedDate) {
        this.billedDate = new Date();
    }
    next();
});

const Charge = mongoose.model<ICharge>('Charge', chargeSchema);
export { Charge };
