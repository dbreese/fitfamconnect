import mongoose, { Schema } from 'mongoose';

export interface ISubLocation {
    name: string;
    description?: string;
    maxCapacity?: number;
    equipment?: string[];
    isActive: boolean;
}

export interface ILocation {
    _id?: string;
    name: string;
    description?: string;
    gymId: string; // Reference to Gym
    operatingHours: {
        dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
        openTime: string; // HH:MM format
        closeTime: string; // HH:MM format
        isClosed: boolean;
    }[];
    subLocations: ISubLocation[]; // Embedded sublocations
    maxMemberCount?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const subLocationSchema = new mongoose.Schema<ISubLocation>({
    name: { type: String, required: true },
    description: { type: String },
    maxCapacity: { type: Number },
    equipment: [{ type: String }],
    isActive: { type: Boolean, default: true }
});

const locationSchema = new mongoose.Schema<ILocation>(
    {
        name: { type: String, required: true },
        description: { type: String },
        gymId: { type: String, required: true }, // Reference to Gym._id
        operatingHours: [
            {
                dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
                openTime: { type: String, required: true },
                closeTime: { type: String, required: true },
                isClosed: { type: Boolean, default: false }
            }
        ],
        subLocations: [subLocationSchema], // Embedded sublocation documents
        maxMemberCount: { type: Number },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Indexes for performance
locationSchema.index({ gymId: 1 });
locationSchema.index({ isActive: 1 });
locationSchema.index({ 'subLocations.name': 1 });

// Pre-save middleware to create default "main" sublocation if none exist
locationSchema.pre('save', function (next) {
    if (this.isNew && (!this.subLocations || this.subLocations.length === 0)) {
        this.subLocations = [
            {
                name: 'Main',
                description: 'Main workout area',
                maxCapacity: this.maxMemberCount || 50,
                equipment: [],
                isActive: true
            }
        ];
    }
    next();
});

// Method to add a sublocation
locationSchema.methods.addSubLocation = function (subLocationData: Omit<ISubLocation, 'isActive'>) {
    // Check if sublocation with same name already exists
    const existingSub = this.subLocations.find((sub: ISubLocation) => sub.name === subLocationData.name);
    if (existingSub) {
        throw new Error(`Sublocation with name "${subLocationData.name}" already exists`);
    }

    this.subLocations.push({
        ...subLocationData,
        isActive: true
    });

    return this.save();
};

// Method to get active sublocations
locationSchema.methods.getActiveSubLocations = function () {
    return this.subLocations.filter((sub: ISubLocation) => sub.isActive);
};

// Method to find sublocation by name
locationSchema.methods.findSubLocation = function (name: string) {
    return this.subLocations.find((sub: ISubLocation) => sub.name === name);
};

// Method to update sublocation
locationSchema.methods.updateSubLocation = function (name: string, updateData: Partial<ISubLocation>) {
    const subLocation = this.subLocations.find((sub: ISubLocation) => sub.name === name);
    if (!subLocation) {
        throw new Error(`Sublocation with name "${name}" not found`);
    }

    Object.assign(subLocation, updateData);
    return this.save();
};

const Location = mongoose.model<ILocation>('Location', locationSchema);
export { Location };
