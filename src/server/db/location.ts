import mongoose, { Schema } from 'mongoose';

export interface ILocation {
    name: string;
    description?: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    operatingHours: {
        dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
        openTime: string; // HH:MM format
        closeTime: string; // HH:MM format
        isClosed: boolean;
    }[];
    contact: {
        email?: string;
        phone?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const locationSchema = new mongoose.Schema<ILocation>(
    {
        name: { type: String, required: true },
        description: { type: String },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            zipCode: { type: String, required: true },
            country: { type: String, required: true, default: 'US' }
        },
        operatingHours: [
            {
                dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
                openTime: { type: String, required: true },
                closeTime: { type: String, required: true },
                isClosed: { type: Boolean, default: false }
            }
        ],
        contact: {
            email: { type: String },
            phone: { type: String }
        }
    },
    { timestamps: true }
);

const Location = mongoose.model<ILocation>('Location', locationSchema);
export { Location };
