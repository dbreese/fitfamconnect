import type { IUser } from '../db/user';
import express, { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import Feedback from '../db/feedback';
import { type ServerResponse } from '../../shared/ServerResponse';

export const router = Router();
router.use(express.json());

router.post('/feedback', authenticateUser, authorizeRoles('user', 'owner'), async (req: AuthenticatedRequest, res: Response) => {
    console.log(`feedback=${JSON.stringify(req.body)}`);
    const params = req.body;
    const user = req.user;
    const status = await saveFeedback(user, params);
    if (status === true) {
        const response: ServerResponse = {
            responseCode: 200,
            body: { message: 'Feedback saved' }
        };
        res.status(200).json(response); // i18n?
        console.log('Feedback saved');
    } else {
        console.error('Feedback error');
        res.status(500).json({ message: 'Feedback not saved' });
    }
});

/**
 * Save Feedback
 *
 * @returns promise indicating whether or not  were updated.
 */
export async function saveFeedback(user: IUser | undefined, params: Record<string, any>): Promise<boolean> {
    if (!user) {
        console.log('No user, couldnt save feedback');
        return Promise.resolve(false);
    }

    const newFeedback = new Feedback({
        userId: user._id,
        feedback: params.feedback
    });

    newFeedback.save();
    console.log('Feedback saved:', newFeedback);
    return Promise.resolve(true);
}
