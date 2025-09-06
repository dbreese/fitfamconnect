import mongoose, { Schema } from 'mongoose';

export interface IGroup {
    name: string;
    primaryMemberId: Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const groupSchema = new mongoose.Schema<IGroup>(
    {
        name: { type: String, required: true },
        primaryMemberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true }
    },
    { timestamps: true }
);

const Group = mongoose.model<IGroup>('Group', groupSchema);
export { Group };
