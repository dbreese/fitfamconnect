import mongoose, { Schema, Document } from 'mongoose';

// Document so we can extend Request
export type IUser = Document & {
    remoteId: string;
    username: string;
    fullname: string;
    email: string;
    roles: ('member' | 'owner' | 'root')[];
    preferences: Record<string, any>;
};

const userSchema = new mongoose.Schema<IUser>({
    remoteId: { type: String, required: true },
    username: { type: String, required: true },
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    roles: { type: [String], required: true, enum: ['member', 'owner', 'root'], default: ['member'] },
    preferences: { type: Map, of: Schema.Types.Mixed, default: {} }
});

const User = mongoose.model<IUser>('User', userSchema);
export { User };
