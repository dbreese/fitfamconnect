import mongoose, { Schema } from 'mongoose';

export interface IClass {
    name: string;
    description?: string;
    duration: number; // Duration in minutes
    maxMembers?: number;
    category?: string; // e.g., 'Cardio', 'Strength', 'Yoga', 'Spinning'
    equipment?: string[]; // Required equipment
    gymId: string; // Reference to Gym
    instructorId?: string; // Reference to Member with type 'coach'
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const classSchema = new mongoose.Schema<IClass>(
    {
        name: { type: String, required: true },
        description: { type: String },
        duration: { type: Number, required: true, min: 1 }, // Duration in minutes
        maxMembers: { type: Number, min: 1 },
        category: { type: String },
        equipment: [{ type: String }],
        gymId: { type: String, required: true }, // Reference to Gym._id
        instructorId: { type: String }, // Reference to Member._id (coach)
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Indexes for performance
classSchema.index({ gymId: 1 });
classSchema.index({ instructorId: 1 });
classSchema.index({ category: 1 });
classSchema.index({ isActive: 1 });

// Compound index for gym and class name uniqueness
classSchema.index({ gymId: 1, name: 1 }, { unique: true });

const Class = mongoose.model<IClass>('Class', classSchema);
export { Class };
