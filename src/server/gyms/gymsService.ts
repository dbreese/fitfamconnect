import express, { Router, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Gym } from '../db/gym';
import { User } from '../db/user';
import { type ServerResponse } from '../../shared/ServerResponse';
import { sanitizeGymUpdate } from '../gym/gymService';

// Root-level administration over ALL gyms. The owner-facing view of an owner's own gym
// (GET /gym, PUT /gym) lives in gym/gymService.ts. Both update paths share sanitizeGymUpdate().
export const router = Router();
router.use(express.json());

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

// Shape the frontend expects for an "owner" reference (gym owner / owner picker).
function toOwnerSummary(user: { _id: any; username: string; fullname?: string; email: string }) {
    return {
        _id: user._id,
        firstName: user.fullname ? user.fullname.split(' ')[0] || user.username : user.username,
        lastName: user.fullname ? user.fullname.split(' ').slice(1).join(' ') || '' : '',
        email: user.email,
        username: user.username
    };
}

// GET /gym/all - Get all gyms (root access only)
router.get('/gym/all', authenticateUser, authorizeRoles('root'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('gymsService.GET /gym/all: Request received');

        const gyms = await Gym.find({}).sort({ name: 1 });

        // Enrich with owner information from the User model
        const enrichedGyms = await Promise.all(gyms.map(async (gym) => {
            const owner = await User.findById(gym.ownerId);
            return {
                ...gym.toObject(),
                owner: owner ? toOwnerSummary(owner) : null
            };
        }));

        console.log(`gymsService.GET /gym/all: Found ${gyms.length} gyms`);
        res.status(200).json(ResponseHelper.success(enrichedGyms, 'Gyms retrieved successfully'));
    } catch (error) {
        console.error('gymsService.GET /gym/all: Error:', error);
        res.status(500).json(ResponseHelper.error('Failed to retrieve gyms', 500));
    }
});

// POST /gym/create - Create new gym (root access only)
router.post('/gym/create', authenticateUser, authorizeRoles('root'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('gymsService.POST /gym/create: Request received', req.body);

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

        console.log(`gymsService.POST /gym/create: Created gym ${savedGym.name} with ID ${savedGym._id}`);
        res.status(201).json(ResponseHelper.created(savedGym, 'Gym created successfully'));
    } catch (error) {
        console.error('gymsService.POST /gym/create: Error:', error);
        res.status(500).json(ResponseHelper.error('Failed to create gym', 500));
    }
});

// PUT /gym/:id - Update any gym (root access only)
router.put('/gym/:id', authenticateUser, authorizeRoles('root'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        console.log('gymsService.PUT /gym/:id: Request received', { id, updateData });

        // If ownerId is being reassigned, verify the new owner
        if (updateData.ownerId) {
            const owner = await User.findById(updateData.ownerId);
            if (!owner) {
                return res.status(400).json(ResponseHelper.error('Owner user not found', 400));
            }

            if (!owner.roles?.includes('owner')) {
                return res.status(400).json(ResponseHelper.error('Selected user must have "owner" role', 400));
            }

            // Check if the new owner already has a different gym
            const existingGym = await Gym.findOne({
                ownerId: updateData.ownerId,
                _id: { $ne: id }
            });
            if (existingGym) {
                return res.status(400).json(ResponseHelper.error('Selected owner already has another gym', 400));
            }
        }

        const safeUpdateData = sanitizeGymUpdate(updateData, { allowOwnerChange: true });

        const updatedGym = await Gym.findByIdAndUpdate(id, safeUpdateData, {
            new: true,
            runValidators: true
        });

        if (!updatedGym) {
            return res.status(404).json(ResponseHelper.error('Gym not found', 404));
        }

        console.log(`gymsService.PUT /gym/:id: Updated gym ${updatedGym.name}`);
        res.status(200).json(ResponseHelper.success(updatedGym, 'Gym updated successfully'));
    } catch (error) {
        console.error('gymsService.PUT /gym/:id: Error:', error);
        res.status(500).json(ResponseHelper.error('Failed to update gym', 500));
    }
});

// DELETE /gym/:id - Soft-delete a gym (root access only)
router.delete('/gym/:id', authenticateUser, authorizeRoles('root'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        console.log('gymsService.DELETE /gym/:id: Request received', { id });

        const gym = await Gym.findById(id);
        if (!gym) {
            return res.status(404).json(ResponseHelper.error('Gym not found', 404));
        }

        // Soft delete by setting isActive to false
        gym.isActive = false;
        await gym.save();

        console.log(`gymsService.DELETE /gym/:id: Soft deleted gym ${gym.name}`);
        res.status(200).json(ResponseHelper.success({}, 'Gym deleted successfully'));
    } catch (error) {
        console.error('gymsService.DELETE /gym/:id: Error:', error);
        res.status(500).json(ResponseHelper.error('Failed to delete gym', 500));
    }
});

// GET /gym/users/owners - List users with the 'owner' role for the gym owner picker (root access only)
router.get('/gym/users/owners', authenticateUser, authorizeRoles('root'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('gymsService.GET /gym/users/owners: Request received');

        const ownerUsers = await User.find({ roles: 'owner' }).select('_id username fullname email').sort({ fullname: 1 });
        const formattedOwners = ownerUsers.map(toOwnerSummary);

        console.log(`gymsService.GET /gym/users/owners: Found ${formattedOwners.length} owner users`);
        res.status(200).json(ResponseHelper.success(formattedOwners, 'Owner users retrieved successfully'));
    } catch (error) {
        console.error('gymsService.GET /gym/users/owners: Error:', error);
        res.status(500).json(ResponseHelper.error('Failed to retrieve owner users', 500));
    }
});

export { router as gymsRouter };
