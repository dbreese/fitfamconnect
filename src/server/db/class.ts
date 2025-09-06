import mongoose from 'mongoose';

export interface IClass {
    name: string;
    description?: string;
    duration: number; // Duration in minutes
    maxMembers: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const classSchema = new mongoose.Schema<IClass>(
    {
        name: { type: String, required: true },
        description: { type: String },
        duration: { type: Number, required: true, min: 1 }, // Duration in minutes
        maxMembers: { type: Number, required: true, min: 1 },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const Class = mongoose.model<IClass>('Class', classSchema);
export { Class };
