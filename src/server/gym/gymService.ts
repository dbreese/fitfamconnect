import type { IUser } from '../db/user';
import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Gym, type IGym } from '../db/gym';
import { type ServerResponse } from '../../shared/ServerResponse';

export const router = Router();
router.use(express.json());

// GET /gym - Get the current user's gym
router.get('/gym', authenticateUser, authorizeRoles('owner', 'root'), async (req: AuthenticatedRequest, res: Response) => {
    console.log('DUSTIN WAS HERE');
    console.log('gymService.getGym: API invoked');
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
 * Find gym by owner user ID
 * @param user - Authenticated user
 * @returns Gym document or null
 */
async function findGymByOwner(user: IUser | undefined): Promise<IGym | null> {
    if (!user) {
        console.log('gymService.findGymByOwner: No user provided');
        return null;
    }

    console.log(`gymService.findGymByOwner: Looking for gym owned by user ${user._id}`);
    // const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    const gym = await Gym.findOne({ ownerId: user._id });

    if (gym) {
        console.log(`gymService.findGymByOwner: Found gym "${gym.name}" with code ${gym.gymCode}`);
    } else {
        console.log(`gymService.findGymByOwner: No active gym found for user ${user._id}`);
    }

    return gym;
}

/**
 * Update gym by owner user ID
 * @param user - Authenticated user
 * @param updateData - Data to update
 * @returns Updated gym document or null
 */
async function updateGymByOwner(user: IUser | undefined, updateData: Partial<IGym>): Promise<IGym | null> {
    if (!user) {
        console.log('gymService.updateGymByOwner: No user provided');
        return null;
    }

    console.log(`gymService.updateGymByOwner: Updating gym for user ${user._id}`);

    // Security: Only allow updating gym that belongs to this user
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`gymService.updateGymByOwner: User ${user._id} does not own any active gym`);
        return null;
    }

    // Remove fields that shouldn't be updated via this endpoint
    const { ownerId, gymCode, isActive, createdAt, updatedAt, ...safeUpdateData } = updateData;

    console.log(`gymService.updateGymByOwner: Applying safe updates to gym ${gym._id}:`, safeUpdateData);

    const updatedGym = await Gym.findByIdAndUpdate(gym._id, safeUpdateData, { new: true, runValidators: true });

    if (updatedGym) {
        console.log(`gymService.updateGymByOwner: Successfully updated gym "${updatedGym.name}"`);
    }

    return updatedGym;
}
