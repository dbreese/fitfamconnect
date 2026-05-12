import type { IUser } from '../db/user';
import express, { Router, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Gym, type IGym } from '../db/gym';
import { type ServerResponse } from '../../shared/ServerResponse';

// This router is the OWNER-facing view of an owner's own gym: GET /gym and PUT /gym.
// Root-level administration over all gyms (/gym/all, /gym/create, /gym/:id, /gym/users/owners)
// lives in gyms/gymsService.ts. Both update paths share sanitizeGymUpdate() below.
export const router = Router();
router.use(express.json());

// Owners may see/edit a gym only while it is active. `isActive: { $ne: false }` also matches
// legacy gym documents created before the field existed (those are treated as active).
const ACTIVE_GYM_FILTER = { $ne: false };

/**
 * Strip fields that must never be set through a gym update, regardless of who is calling:
 * `gymCode` is generated, `isActive` is managed via the delete endpoint, `lastBillingRunDate`
 * is owned by the billing engine, and `_id`/`createdAt`/`updatedAt` are managed by Mongoose.
 * `ownerId` may only be reassigned by root, so the owner-facing update passes
 * `allowOwnerChange: false` and the root admin passes `allowOwnerChange: true`.
 */
export function sanitizeGymUpdate(updateData: Partial<IGym>, opts: { allowOwnerChange: boolean }): Partial<IGym> {
    const { _id, gymCode, isActive, lastBillingRunDate, createdAt, updatedAt, ownerId, ...rest } = updateData;
    const safe: Partial<IGym> = { ...rest };
    if (opts.allowOwnerChange && ownerId !== undefined) {
        safe.ownerId = ownerId;
    }
    return safe;
}

// GET /gym - Get the current user's gym
router.get('/gym', authenticateUser, authorizeRoles('owner', 'root'), async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    try {
        const gym = await findGymByOwner(user);
        if (!gym) {
            console.log(`gymService.getGym: No gym found for user ${user?._id}`);
            res.status(404).json({ message: 'Gym not found' });
            return;
        }

        console.log(`gymService.getGym: Retrieved gym="${gym.name}" for user ${user?._id}`);
        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Gym retrieved successfully',
                data: gym
            }
        };
        res.status(200).json(response);
        console.log('gymService.getGym: Response sent successfully');
    } catch (error) {
        console.error('gymService.getGym: Error retrieving gym:', error);
        res.status(500).json({ message: 'Error retrieving gym' });
    }
});

// PUT /gym - Update the current user's gym
router.put('/gym', authenticateUser, authorizeRoles('owner', 'root'), async (req: AuthenticatedRequest, res: Response) => {
    console.log(`gymService.updateGym: API invoked with payload=${JSON.stringify(req.body)}`);
    const user = req.user;
    const updateData = req.body;

    try {
        const gym = await updateGymByOwner(user, updateData);
        if (!gym) {
            console.log(`gymService.updateGym: No gym found for user ${user?._id}`);
            res.status(404).json({ message: 'Gym not found' });
            return;
        }

        console.log(`gymService.updateGym: Updated gym="${gym.name}" for user ${user?._id}`);
        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Gym updated successfully',
                data: gym
            }
        };
        res.status(200).json(response);
        console.log('gymService.updateGym: Response sent successfully');
    } catch (error) {
        console.error(`gymService.updateGym: Error updating gym for user ${user?._id}:`, error);
        res.status(500).json({ message: 'Error updating gym' });
    }
});

/**
 * Find the active gym owned by this user.
 */
async function findGymByOwner(user: IUser | undefined): Promise<IGym | null> {
    if (!user) {
        console.log('gymService.findGymByOwner: No user provided');
        return null;
    }

    console.log(`gymService.findGymByOwner: Looking for gym owned by user ${user._id}`);
    const gym = await Gym.findOne({ ownerId: user._id, isActive: ACTIVE_GYM_FILTER });

    console.log('gymService.findGymByOwner: Found gym ', gym);
    return gym;
}

/**
 * Update the active gym owned by this user, after stripping fields owners may not change.
 */
async function updateGymByOwner(user: IUser | undefined, updateData: Partial<IGym>): Promise<IGym | null> {
    if (!user) {
        console.log('gymService.updateGymByOwner: No user provided');
        return null;
    }

    console.log(`gymService.updateGymByOwner: Updating gym for user ${user._id}`);

    // Security: only the active gym that belongs to this user.
    const gym = await Gym.findOne({ ownerId: user._id, isActive: ACTIVE_GYM_FILTER });
    if (!gym) {
        console.log(`gymService.updateGymByOwner: User ${user._id} does not own any active gym`);
        return null;
    }

    const safeUpdateData = sanitizeGymUpdate(updateData, { allowOwnerChange: false });
    console.log(`gymService.updateGymByOwner: Applying safe updates to gym ${gym._id}:`, safeUpdateData);

    const updatedGym = await Gym.findByIdAndUpdate(gym._id, safeUpdateData, { new: true, runValidators: true });

    if (updatedGym) {
        console.log(`gymService.updateGymByOwner: Successfully updated gym "${updatedGym.name}"`);
    }

    return updatedGym;
}
