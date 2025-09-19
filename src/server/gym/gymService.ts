import type { IUser } from '../db/user';
import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Gym, type IGym } from '../db/gym';
import { Member } from '../db/member';
import { User } from '../db/user';
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

// Helper class for creating server responses
class ResponseHelper {
    static success(data: any, message: string = 'Success'): ServerResponse {
        return { responseCode: 200, body: { message, data } };
    }
    static created(data: any, message: string = 'Created'): ServerResponse {
        return { responseCode: 201, body: { message, data } };
    }
    static error(message: string, code: number = 500): ServerResponse {
        return { responseCode: code, body: { message } };
    }
}

/**
 * ROOT-LEVEL GYM MANAGEMENT ENDPOINTS
 */

// GET /gym/all - Get all gyms (root access only)
router.get('/gym/all', authenticateUser, authorizeRoles('root'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('gymService.GET /gym/all: Request received');

        const gyms = await Gym.find({}).sort({ name: 1 });

        // Enrich with owner information from User model
        const enrichedGyms = await Promise.all(gyms.map(async (gym) => {
            const owner = await User.findById(gym.ownerId);
            return {
                ...gym.toObject(),
                owner: owner ? {
                    _id: owner._id,
                    firstName: owner.fullname.split(' ')[0] || owner.username,
                    lastName: owner.fullname.split(' ').slice(1).join(' ') || '',
                    email: owner.email,
                    username: owner.username
                } : null
            };
        }));

        console.log(`gymService.GET /gym/all: Found ${gyms.length} gyms`);
        res.status(200).json(ResponseHelper.success(enrichedGyms, 'Gyms retrieved successfully'));
    } catch (error) {
        console.error('gymService.GET /gym/all: Error:', error);
        res.status(500).json(ResponseHelper.error('Failed to retrieve gyms', 500));
    }
});

// POST /gym/create - Create new gym (root access only)
router.post('/gym/create', authenticateUser, authorizeRoles('root'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('gymService.POST /gym/create: Request received', req.body);

        const gymData = req.body;

        // Validate required fields
        if (!gymData.name || !gymData.ownerId || !gymData.billingAddress || !gymData.contact) {
            return res.status(400).json(ResponseHelper.error('Name, ownerId, billingAddress, and contact are required', 400));
        }

        // Verify owner exists and has 'owner' role
        const owner = await User.findById(gymData.ownerId);
        if (!owner) {
            return res.status(400).json(ResponseHelper.error('Owner user not found', 400));
        }

        if (!owner.roles?.includes('owner')) {
            return res.status(400).json(ResponseHelper.error('Selected user must have "owner" role', 400));
        }

        // Check if owner already has a gym
        const existingGym = await Gym.findOne({ ownerId: gymData.ownerId });
        if (existingGym) {
            return res.status(400).json(ResponseHelper.error('Owner already has a gym', 400));
        }

        const newGym = new Gym(gymData);
        const savedGym = await newGym.save();

        console.log(`gymService.POST /gym/create: Created gym ${savedGym.name} with ID ${savedGym._id}`);
        res.status(201).json(ResponseHelper.created(savedGym, 'Gym created successfully'));
    } catch (error) {
        console.error('gymService.POST /gym/create: Error:', error);
        res.status(500).json(ResponseHelper.error('Failed to create gym', 500));
    }
});

// PUT /gym/:id - Update gym (root access only)
router.put('/gym/:id', authenticateUser, authorizeRoles('root'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        console.log('gymService.PUT /gym/:id: Request received', { id, updateData });

        // If ownerId is being updated, verify the new owner
        if (updateData.ownerId) {
            const owner = await User.findById(updateData.ownerId);
            if (!owner) {
                return res.status(400).json(ResponseHelper.error('Owner user not found', 400));
            }

            if (!owner.roles?.includes('owner')) {
                return res.status(400).json(ResponseHelper.error('Selected user must have "owner" role', 400));
            }

            // Check if new owner already has a gym (excluding current gym)
            const existingGym = await Gym.findOne({
                ownerId: updateData.ownerId,
                _id: { $ne: id }
            });
            if (existingGym) {
                return res.status(400).json(ResponseHelper.error('Selected owner already has another gym', 400));
            }
        }

        // Remove fields that shouldn't be updated
        const { createdAt, updatedAt, ...safeUpdateData } = updateData;

        const updatedGym = await Gym.findByIdAndUpdate(id, safeUpdateData, {
            new: true,
            runValidators: true
        });

        if (!updatedGym) {
            return res.status(404).json(ResponseHelper.error('Gym not found', 404));
        }

        console.log(`gymService.PUT /gym/:id: Updated gym ${updatedGym.name}`);
        res.status(200).json(ResponseHelper.success(updatedGym, 'Gym updated successfully'));
    } catch (error) {
        console.error('gymService.PUT /gym/:id: Error:', error);
        res.status(500).json(ResponseHelper.error('Failed to update gym', 500));
    }
});

// DELETE /gym/:id - Delete gym (root access only)
router.delete('/gym/:id', authenticateUser, authorizeRoles('root'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        console.log('gymService.DELETE /gym/:id: Request received', { id });

        const gym = await Gym.findById(id);
        if (!gym) {
            return res.status(404).json(ResponseHelper.error('Gym not found', 404));
        }

        // Soft delete by setting isActive to false
        gym.isActive = false;
        await gym.save();

        console.log(`gymService.DELETE /gym/:id: Soft deleted gym ${gym.name}`);
        res.status(200).json(ResponseHelper.success({}, 'Gym deleted successfully'));
    } catch (error) {
        console.error('gymService.DELETE /gym/:id: Error:', error);
        res.status(500).json(ResponseHelper.error('Failed to delete gym', 500));
    }
});

// GET /gym/users/owners - Get all users with owner role for selection (root access only)
router.get('/gym/users/owners', authenticateUser, authorizeRoles('root'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('gymService.GET /gym/users/owners: Request received');

        // Get users with 'owner' role from User collection
        const ownerUsers = await User.find({
            roles: 'owner'
        }).select('_id username fullname email').sort({ fullname: 1 });

        // Format for frontend consumption
        const formattedOwners = ownerUsers.map(user => ({
            _id: user._id,
            firstName: user.fullname.split(' ')[0] || user.username,
            lastName: user.fullname.split(' ').slice(1).join(' ') || '',
            email: user.email,
            username: user.username
        }));

        console.log(`gymService.GET /gym/users/owners: Found ${formattedOwners.length} owner users`);
        res.status(200).json(ResponseHelper.success(formattedOwners, 'Owner users retrieved successfully'));
    } catch (error) {
        console.error('gymService.GET /gym/users/owners: Error:', error);
        res.status(500).json(ResponseHelper.error('Failed to retrieve owner users', 500));
    }
});
