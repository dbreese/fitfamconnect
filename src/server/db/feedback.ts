import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const FeedbackSchema = new mongoose.Schema(
    {
        id: { type: String, default: uuidv4, unique: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        feedback: { type: String }
    },
    { timestamps: true }
);

const Feedback = mongoose.model('Feedback', FeedbackSchema);

export default Feedback;
