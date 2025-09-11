import type { IUser } from '../db/user';
import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Charge } from '../db/charge';
import { Member } from '../db/member';
import { Gym } from '../db/gym';
import type { ICharge } from '../db/charge';
import type { ServerResponse } from '../../shared/ServerResponse';

export const router = Router();
router.use(express.json());

// GET /charges/member/:memberId - Get all charges for a specific member
router.get(
    '/charges/member/:memberId',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log(`chargeService.getChargesByMember: API invoked with memberId=${req.params.memberId}`);
        const user = req.user;
        const { memberId } = req.params;

        try {
            const charges = await findChargesByMember(user, memberId);
            console.log(`chargeService.getChargesByMember: Retrieved ${charges.length} charges for member ${memberId}`);

            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Charges retrieved successfully',
                    data: charges
                }
            };
            res.status(200).json(response);
            console.log('chargeService.getChargesByMember: Response sent successfully');
        } catch (error) {
            console.error('chargeService.getChargesByMember: Error retrieving charges:', error);
            res.status(500).json({ message: 'Error retrieving charges' });
        }
    }
);

// POST /charges - Create a new charge
router.post('/charges', authenticateUser, authorizeRoles('owner'), async (req: AuthenticatedRequest, res: Response) => {
    console.log(`chargeService.createCharge: API invoked with payload=${JSON.stringify(req.body)}`);
    const user = req.user;
    const chargeData = req.body;

    try {
        const newCharge = await createChargeForOwner(user, chargeData);
        console.log(`chargeService.createCharge: Created charge ${newCharge._id} for member ${newCharge.memberId}`);

        const response: ServerResponse = {
            responseCode: 201,
            body: {
                message: 'Charge created successfully',
                data: newCharge
            }
        };
        res.status(201).json(response);
        console.log('chargeService.createCharge: Response sent successfully');
    } catch (error) {
        console.error('chargeService.createCharge: Error creating charge:', error);
        res.status(500).json({ message: 'Error creating charge' });
    }
});

// GET /charges/:id - Get a specific charge by ID
router.get(
    '/charges/:id',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log(`chargeService.getChargeById: API invoked with chargeId=${req.params.id}`);
        const user = req.user;
        const { id: chargeId } = req.params;

        try {
            const charge = await findChargeByIdAndOwner(user, chargeId);
            if (!charge) {
                console.log(`chargeService.getChargeById: No charge found with ID ${chargeId}`);
                res.status(404).json({ message: 'Charge not found' });
                return;
            }

            console.log(`chargeService.getChargeById: Retrieved charge ${chargeId} for member ${charge.memberId}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Charge retrieved successfully',
                    data: charge
                }
            };
            res.status(200).json(response);
            console.log('chargeService.getChargeById: Response sent successfully');
        } catch (error) {
            console.error('chargeService.getChargeById: Error retrieving charge:', error);
            res.status(500).json({ message: 'Error retrieving charge' });
        }
    }
);

// PUT /charges/:id - Update a specific charge
router.put(
    '/charges/:id',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log(
            `chargeService.updateCharge: API invoked with chargeId=${req.params.id}, payload=${JSON.stringify(req.body)}`
        );
        const user = req.user;
        const { id: chargeId } = req.params;
        const updateData = req.body;

        try {
            const updatedCharge = await updateChargeByIdAndOwner(user, chargeId, updateData);
            if (!updatedCharge) {
                console.log(`chargeService.updateCharge: No charge found with ID ${chargeId}`);
                res.status(404).json({ message: 'Charge not found' });
                return;
            }

            console.log(`chargeService.updateCharge: Updated charge ${chargeId} for member ${updatedCharge.memberId}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Charge updated successfully',
                    data: updatedCharge
                }
            };
            res.status(200).json(response);
            console.log('chargeService.updateCharge: Response sent successfully');
        } catch (error) {
            console.error('chargeService.updateCharge: Error updating charge:', error);
            res.status(500).json({ message: 'Error updating charge' });
        }
    }
);

// DELETE /charges/:id - Delete a specific charge
router.delete(
    '/charges/:id',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log(`chargeService.deleteCharge: API invoked with chargeId=${req.params.id}`);
        const user = req.user;
        const { id: chargeId } = req.params;

        try {
            const deleted = await deleteChargeByIdAndOwner(user, chargeId);
            if (!deleted) {
                console.log(`chargeService.deleteCharge: No charge found with ID ${chargeId}`);
                res.status(404).json({ message: 'Charge not found' });
                return;
            }

            console.log(`chargeService.deleteCharge: Deleted charge ${chargeId}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Charge deleted successfully',
                    data: null
                }
            };
            res.status(200).json(response);
            console.log('chargeService.deleteCharge: Response sent successfully');
        } catch (error) {
            console.error('chargeService.deleteCharge: Error deleting charge:', error);
            res.status(500).json({ message: 'Error deleting charge' });
        }
    }
);

/**
 * Find charges by member ID (owner access only)
 * @param user - Authenticated user
 * @param memberId - Member ID to get charges for
 * @returns Array of charge documents
 */
async function findChargesByMember(user: IUser | undefined, memberId: string): Promise<ICharge[]> {
    if (!user) {
        console.log('chargeService.findChargesByMember: No user provided');
        return [];
    }

    console.log(`chargeService.findChargesByMember: Looking for charges for member ${memberId} by user ${user._id}`);

    // Get user's gym
    const gym = await Gym.findOne({ ownerId: user._id });
    if (!gym) {
        console.log(`chargeService.findChargesByMember: No gym found for user ${user._id}`);
        return [];
    }

    // Verify member belongs to gym
    const member = await Member.findOne({ _id: memberId, gymId: gym._id });
    if (!member) {
        console.log(`chargeService.findChargesByMember: Member ${memberId} not found in gym ${gym._id}`);
        return [];
    }

    const charges = await Charge.find({ memberId }).sort({ chargeDate: -1 });
    console.log(`chargeService.findChargesByMember: Found ${charges.length} charges for member ${memberId}`);

    return charges;
}

/**
 * Create charge for owner
 * @param user - Authenticated user
 * @param chargeData - Charge data
 * @returns Created charge document
 */
async function createChargeForOwner(user: IUser | undefined, chargeData: Partial<ICharge>): Promise<ICharge> {
    if (!user) {
        throw new Error('No user provided');
    }

    console.log(
        `chargeService.createChargeForOwner: Creating charge for member ${chargeData.memberId} by user ${user._id}`
    );

    // Get user's gym
    const gym = await Gym.findOne({ ownerId: user._id });
    if (!gym) {
        throw new Error('Gym not found for user');
    }

    // Verify member belongs to gym
    const member = await Member.findOne({ _id: chargeData.memberId, gymId: gym._id });
    if (!member) {
        throw new Error('Member not found or access denied');
    }

    const newCharge = new Charge({
        ...chargeData,
        memberId: chargeData.memberId
    });

    const savedCharge = await newCharge.save();
    console.log(
        `chargeService.createChargeForOwner: Created charge ${savedCharge._id} for member ${savedCharge.memberId}`
    );

    return savedCharge;
}

/**
 * Find charge by ID and verify owner access
 * @param user - Authenticated user
 * @param chargeId - Charge ID
 * @returns Charge document or null
 */
async function findChargeByIdAndOwner(user: IUser | undefined, chargeId: string): Promise<ICharge | null> {
    if (!user) {
        console.log('chargeService.findChargeByIdAndOwner: No user provided');
        return null;
    }

    console.log(`chargeService.findChargeByIdAndOwner: Looking for charge ${chargeId} by user ${user._id}`);

    // Get user's gym
    const gym = await Gym.findOne({ ownerId: user._id });
    if (!gym) {
        console.log(`chargeService.findChargeByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    const charge = await Charge.findById(chargeId);
    if (!charge) {
        console.log(`chargeService.findChargeByIdAndOwner: Charge ${chargeId} not found`);
        return null;
    }

    // Verify member belongs to gym
    const member = await Member.findOne({ _id: charge.memberId, gymId: gym._id });
    if (!member) {
        console.log(`chargeService.findChargeByIdAndOwner: Member ${charge.memberId} not found in gym ${gym._id}`);
        return null;
    }

    console.log(`chargeService.findChargeByIdAndOwner: Found charge ${chargeId} for member ${charge.memberId}`);
    return charge;
}

/**
 * Update charge by ID and verify owner access
 * @param user - Authenticated user
 * @param chargeId - Charge ID
 * @param updateData - Update data
 * @returns Updated charge document or null
 */
async function updateChargeByIdAndOwner(
    user: IUser | undefined,
    chargeId: string,
    updateData: Partial<ICharge>
): Promise<ICharge | null> {
    if (!user) {
        console.log('chargeService.updateChargeByIdAndOwner: No user provided');
        return null;
    }

    console.log(`chargeService.updateChargeByIdAndOwner: Updating charge ${chargeId} by user ${user._id}`);

    // Get user's gym
    const gym = await Gym.findOne({ ownerId: user._id });
    if (!gym) {
        console.log(`chargeService.updateChargeByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    const charge = await Charge.findById(chargeId);
    if (!charge) {
        console.log(`chargeService.updateChargeByIdAndOwner: Charge ${chargeId} not found`);
        return null;
    }

    // Verify member belongs to gym
    const member = await Member.findOne({ _id: charge.memberId, gymId: gym._id });
    if (!member) {
        console.log(`chargeService.updateChargeByIdAndOwner: Member ${charge.memberId} not found in gym ${gym._id}`);
        return null;
    }

    // Remove fields that shouldn't be updated
    const { memberId, createdAt, updatedAt, ...safeUpdateData } = updateData;

    // Handle billedDate removal when isBilled is false
    let updateOperation: any = { ...safeUpdateData };
    if (safeUpdateData.isBilled === false && safeUpdateData.billedDate === undefined) {
        updateOperation = {
            ...safeUpdateData,
            $unset: { billedDate: 1 }
        };
    }

    const updatedCharge = await Charge.findByIdAndUpdate(chargeId, updateOperation, { new: true, runValidators: true });
    console.log(`chargeService.updateChargeByIdAndOwner: Updated charge ${chargeId} for member ${charge.memberId}`);

    return updatedCharge;
}

/**
 * Delete charge by ID and verify owner access
 * @param user - Authenticated user
 * @param chargeId - Charge ID
 * @returns Boolean indicating success
 */
async function deleteChargeByIdAndOwner(user: IUser | undefined, chargeId: string): Promise<boolean> {
    if (!user) {
        console.log('chargeService.deleteChargeByIdAndOwner: No user provided');
        return false;
    }

    console.log(`chargeService.deleteChargeByIdAndOwner: Deleting charge ${chargeId} by user ${user._id}`);

    // Get user's gym
    const gym = await Gym.findOne({ ownerId: user._id });
    if (!gym) {
        console.log(`chargeService.deleteChargeByIdAndOwner: No gym found for user ${user._id}`);
        return false;
    }

    const charge = await Charge.findById(chargeId);
    if (!charge) {
        console.log(`chargeService.deleteChargeByIdAndOwner: Charge ${chargeId} not found`);
        return false;
    }

    // Verify member belongs to gym
    const member = await Member.findOne({ _id: charge.memberId, gymId: gym._id });
    if (!member) {
        console.log(`chargeService.deleteChargeByIdAndOwner: Member ${charge.memberId} not found in gym ${gym._id}`);
        return false;
    }

    await Charge.findByIdAndDelete(chargeId);
    console.log(`chargeService.deleteChargeByIdAndOwner: Deleted charge ${chargeId} for member ${charge.memberId}`);

    return true;
}
