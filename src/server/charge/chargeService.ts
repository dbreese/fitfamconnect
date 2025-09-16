import type { IUser } from '../db/user';
import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Charge } from '../db/charge';
import { Member } from '../db/member';
import { Gym } from '../db/gym';
import { Plan } from '../db/plan';
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

// GET /charges/unbilled - Get unbilled charges for the current user (member access)
router.get(
    '/charges/unbilled',
    authenticateUser,
    authorizeRoles('member', 'owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log('chargeService.getUnbilledCharges: API invoked for user', req.user?.email);
        const user = req.user;

        try {
            const unbilledCharges = await findUnbilledChargesForUser(user);
            console.log(`chargeService.getUnbilledCharges: Retrieved ${unbilledCharges.length} unbilled charges`);

            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Unbilled charges retrieved successfully',
                    data: unbilledCharges
                }
            };
            res.status(200).json(response);
            console.log('chargeService.getUnbilledCharges: Response sent successfully');
        } catch (error) {
            console.error('chargeService.getUnbilledCharges: Error retrieving unbilled charges:', error);
            res.status(500).json({ message: 'Error retrieving unbilled charges' });
        }
    }
);

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

/**
 * Find unbilled charges for the current user (member access)
 * @param user - Authenticated user
 * @returns Array of formatted unbilled charge documents
 */
async function findUnbilledChargesForUser(user: IUser | undefined): Promise<any[]> {
    if (!user) {
        console.log('chargeService.findUnbilledChargesForUser: No user provided');
        return [];
    }

    console.log(`chargeService.findUnbilledChargesForUser: Looking for unbilled charges for user ${user.email}`);
    console.log(`chargeService.findUnbilledChargesForUser: User object:`, { id: user._id, email: user.email, roles: user.roles });

    // Find member records for this user (both approved and pending)
    const memberRecords = await Member.find({
        email: user.email,
        status: { $in: ['approved', 'pending'] } // Show charges for both approved and pending memberships
    });

    console.log(`chargeService.findUnbilledChargesForUser: Found ${memberRecords.length} member records for user ${user.email}`);
    console.log(`chargeService.findUnbilledChargesForUser: Member records:`, memberRecords.map(m => ({ id: m._id, email: m.email, status: m.status, gymId: m.gymId })));

    if (memberRecords.length === 0) {
        console.log(`chargeService.findUnbilledChargesForUser: No member records found for user ${user.email}`);
        return [];
    }

    const memberIds = memberRecords.map(member => member._id?.toString()).filter(Boolean);
    const gymIds = [...new Set(memberRecords.map(member => member.gymId))];

    console.log(`chargeService.findUnbilledChargesForUser: Looking for charges with memberIds: ${memberIds.join(', ')}`);

    // First, let's check if there are ANY charges for these members
    const allCharges = await Charge.find({
        memberId: { $in: memberIds }
    }).sort({ chargeDate: -1 });

    console.log(`chargeService.findUnbilledChargesForUser: Found ${allCharges.length} total charges for these members`);
    if (allCharges.length > 0) {
        console.log(`chargeService.findUnbilledChargesForUser: Sample charges:`, allCharges.slice(0, 3).map(c => ({ id: c._id, memberId: c.memberId, amount: c.amount, isBilled: c.isBilled, note: c.note })));
    }

    // Get unbilled charges for these members
    const unbilledCharges = await Charge.find({
        memberId: { $in: memberIds },
        isBilled: false
    }).sort({ chargeDate: -1 });

    console.log(`chargeService.findUnbilledChargesForUser: Found ${unbilledCharges.length} unbilled charges`);

    if (unbilledCharges.length === 0) {
        return [];
    }

    // Get gym and plan information
    const gyms = await Gym.find({ _id: { $in: gymIds } });
    const planIds = unbilledCharges.map(charge => charge.planId).filter(Boolean);
    const plans = await Plan.find({ _id: { $in: planIds } });

    // Format the response
    const formattedCharges = unbilledCharges.map(charge => {
        const member = memberRecords.find(m => m._id?.toString() === charge.memberId);
        const gym = gyms.find(g => g._id?.toString() === member?.gymId);
        const plan = plans.find(p => p._id?.toString() === charge.planId);

        return {
            _id: charge._id,
            date: charge.chargeDate,
            description: charge.note || 'Charge',
            amount: charge.amount, // Keep in cents for consistency
            type: charge.planId ? 'recurring' : 'one-time',
            planName: plan?.name,
            gymName: gym?.name || 'Unknown Gym',
            gymId: gym?._id
        };
    });

    return formattedCharges;
}
