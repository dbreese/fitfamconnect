import mongoose, { Schema, Document } from 'mongoose';

// Document so we can extend Request
export type IUser = Document & {
    remoteId: string;
    username: string;
    fullname?: string;
    email: string;
    roles: ('member' | 'owner' | 'root')[];
    preferences: Record<string, any>;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};

const userSchema = new mongoose.Schema<IUser>({
    remoteId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    fullname: { type: String, required: false },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    roles: {
        type: [String],
        required: true,
        enum: ['member', 'owner', 'root'],
        default: ['member'],
        validate: {
            validator: function(roles: string[]) {
                return roles.length > 0; // Must have at least one role
            },
            message: 'User must have at least one role'
        }
    },
    preferences: { type: Map, of: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 }); // Unique index for email lookups
userSchema.index({ remoteId: 1 }); // Unique index for external ID lookups
userSchema.index({ username: 1 }); // Index for username searches
userSchema.index({ roles: 1 }); // Index for role-based queries
userSchema.index({ isActive: 1 }); // Index for active user queries
userSchema.index({ lastLoginAt: 1 }); // Index for login analytics
userSchema.index({ roles: 1, isActive: 1 }); // Compound index for role + active queries
userSchema.index({ email: 1, isActive: 1 }); // Compound index for email + active queries

// Virtual for display name
userSchema.virtual('displayName').get(function() {
    return this.fullname || this.username || this.email;
});

// Virtual to check if user has specific role
userSchema.methods.hasRole = function(role: string): boolean {
    return this.roles && this.roles.includes(role);
};

// Pre-save middleware
userSchema.pre('save', function(next) {
    // Ensure email is lowercase and trimmed
    if (this.email) {
        this.email = this.email.toLowerCase().trim();
    }

    // Ensure username is trimmed
    if (this.username) {
        this.username = this.username.trim();
    }

    // Trim fullname if provided
    if (this.fullname) {
        this.fullname = this.fullname.trim();
    }

    next();
});

// Static method to find users by role
userSchema.statics.findByRole = function(role: string) {
    return this.find({ roles: role, isActive: true });
};

// Static method to find active users
userSchema.statics.findActive = function() {
    return this.find({ isActive: true });
};

const User = mongoose.model<IUser>('User', userSchema);
export { User };
