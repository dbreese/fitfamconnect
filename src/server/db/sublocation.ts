import mongoose, { Schema } from 'mongoose';

export interface ISubLocation {
    name: string;
    description?: string;
    locationId: Schema.Types.ObjectId;
    maxMembers: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const subLocationSchema = new mongoose.Schema<ISubLocation>(
    {
        name: { type: String, required: true },
        description: { type: String },
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
        maxMembers: { type: Number, required: true, min: 1 },
        isDefault: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Ensure only one default sublocation per location
subLocationSchema.index(
    { locationId: 1, isDefault: 1 },
    {
        unique: true,
        partialFilterExpression: { isDefault: true }
    }
);

const SubLocation = mongoose.model<ISubLocation>('SubLocation', subLocationSchema);
export { SubLocation };
