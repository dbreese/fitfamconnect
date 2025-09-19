import type { IUser } from '../db/user';
import { User } from '../db/user';
import { clerkClient, getAuth, type AuthObject } from '@clerk/express';
import express, { Router, type NextFunction, type Request, type Response } from 'express';

export const router = Router();
router.use(express.json());

const defaultPreferences = {
    temperature: 'light'
};

// Extend Request to include Clerk's AuthObject and additional roles
export interface AuthenticatedRequest extends Request {
    auth?: AuthObject;
    user?: IUser;
}

// extend Request object with our cleark user type
// this was in top level express index.ts, moving here for now
// declare global {
//     namespace Express {
//         export interface Request {
//             user?: ClerkUserType;
//         }
//     }
// }

export const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const auth = getAuth(req);

    console.log('Authenticated user: ' + JSON.stringify(auth));

    // auth will always be returned, need to check userId
    if (!auth || !auth.userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    next();
};

export const authorizeRoles = (...roles: string[]) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const auth = getAuth(req as Request);

        if (!auth || !auth.userId) {
            res.status(401).json({ message: 'Unauthorized 2!' });
            return;
        }

        const userId = auth.userId;

        var localUser = await User.findOne({ remoteId: userId });
        if (!localUser) {
            const clerkUser = await clerkClient.users.getUser(userId);
            const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress;

            console.log('Creating user: ' + JSON.stringify(clerkUser));

            localUser = new User({
                remoteId: clerkUser.id,
                username: clerkUser.username ?? 'unknown',
                fullname: clerkUser.fullName ?? 'unknown',
                email: clerkEmail ?? 'unknown',
                preferences: defaultPreferences
            });
            await localUser.save();
        }

        const roleFound = localUser?.roles.some((role) => roles.includes(role));
        if (!roleFound) {
            console.log('Rejecting due to missing role');
            res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
            return;
        }

        // allowed
        req.user = localUser;
        next();
    };
};

router.get('/auth/user', authenticateUser, authorizeRoles('member', 'owner', 'root'), (req: AuthenticatedRequest, res: Response) => {
    console.log('Returning user: ' + JSON.stringify(req.user));
    res.json(req.user);
});
