import mongoose, { Schema } from 'mongoose';

export interface IGym {
    name: string;
    description?: string;
    gymCode: string; // Unique 6-character alphanumeric code
    ownerId: string; // Reference to Member with type 'owner'
    billingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    contact: {
        email: string;
        phone?: string;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const gymSchema = new mongoose.Schema<IGym>(
    {
        name: { type: String, required: true },
        description: { type: String },
        gymCode: {
            type: String,
            required: true,
            unique: true,
            length: 6,
            match: /^[A-Z0-9]{6}$/ // 6 character alphanumeric code
        },
        ownerId: { type: String, required: true }, // Reference to Member._id
        billingAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            zipCode: { type: String, required: true },
            country: { type: String, required: true, default: 'US' }
        },
        contact: {
            email: { type: String, required: true },
            phone: { type: String }
        },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Indexes for performance
gymSchema.index({ gymCode: 1 });
gymSchema.index({ ownerId: 1 });
gymSchema.index({ isActive: 1 });

// Pre-save middleware to generate gym code if not provided
gymSchema.pre('save', function (next) {
    if (this.isNew && !this.gymCode) {
        this.gymCode = generateGymCode();
    }
    next();
});

// Helper function to generate unique 6-character alphanumeric gym code
function generateGymCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const Gym = mongoose.model<IGym>('Gym', gymSchema);
export { Gym };
