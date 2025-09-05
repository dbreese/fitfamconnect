import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const MAX_RECENTS = 10;

export const ToolEnum = {
    TextLeveler: 'leveler',
    LetterWriter: 'letter',
    Grammar: 'grammar',
    Newsletter: 'newsletter',
    Quiz: 'quiz',
    Rubric: 'rubric'
};
export type ToolType = (typeof ToolEnum)[keyof typeof ToolEnum];

export const ResultEnum = {
    Saved: 'saved',
    Recent: 'recent'
};
export type ResultType = (typeof ResultEnum)[keyof typeof ResultEnum];

const ResultSchema = new mongoose.Schema(
    {
        id: { type: String, default: uuidv4, unique: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        tool: {
            type: String,
            enum: Object.values(ToolEnum),
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: Object.values(ResultEnum),
            required: true,
            index: true
        },
        title: { type: String },
        query: { type: String, required: true },
        params: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
        config: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
        results: { type: String, required: true }
    },
    { timestamps: true }
);

// Pre-save hook to enforce FIFO limit per userId and tool type
ResultSchema.pre('save', async function (next) {
    const filter = { userId: this.userId, tool: this.tool };
    const count = await mongoose.model('Result').countDocuments(filter);

    if (count >= MAX_RECENTS) {
        await mongoose.model('Result').findOneAndDelete(filter, { sort: { createdAt: 1 } });
    }

    next();
});

const Result = mongoose.model('Result', ResultSchema);

export default Result;
