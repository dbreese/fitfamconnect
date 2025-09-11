import mongoose, { Schema } from 'mongoose';

export interface IProduct {
    _id?: string;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    price: number; // Price in cents to avoid floating point issues
    cost?: number; // Optional out-of-pocket cost to owner in cents
    gymId: string; // Reference to Gym
    createdAt: Date;
    updatedAt: Date;
}

const productSchema = new mongoose.Schema<IProduct>(
    {
        name: { type: String, required: true },
        description: { type: String },
        status: {
            type: String,
            required: true,
            enum: ['active', 'inactive'],
            default: 'active'
        },
        price: { type: Number, required: true, min: 0 }, // Price in cents
        cost: { type: Number, min: 0 }, // Optional cost in cents
        gymId: { type: String, required: true } // Reference to Gym._id
    },
    { timestamps: true }
);

// Indexes for performance
productSchema.index({ gymId: 1 });
productSchema.index({ status: 1 });
productSchema.index({ name: 1 });
productSchema.index({ gymId: 1, status: 1 }); // Compound index for gym queries
productSchema.index({ gymId: 1, name: 1 }); // For gym product name searches

const Product = mongoose.model<IProduct>('Product', productSchema);
export { Product };
