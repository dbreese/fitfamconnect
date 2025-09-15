import type { IUser } from '../db/user';
import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Membership, type IMembership } from '../db/membership';
import { Member, type IMember } from '../db/member';
import { Plan, type IPlan } from '../db/plan';
import { Gym } from '../db/gym';
import { type ServerResponse } from '../../shared/ServerResponse';

export const router = Router();
router.use(express.json());

// GET /memberships - Get all members for the current user's gym with their plan assignments
router.get(
    '/memberships',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log('membershipService.getMemberships: API invoked');
        const user = req.user;

        try {
            const members = await findMembersByOwner(user);
            console.log(`membershipService.getMemberships: Retrieved ${members.length} members for user ${user?._id}`);

            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Members retrieved successfully',
                    data: members
                }
            };
            res.status(200).json(response);
            console.log('membershipService.getMemberships: Response sent successfully');
        } catch (error) {
            console.error('membershipService.getMemberships: Error retrieving members:', error);
            res.status(500).json({ message: 'Error retrieving members' });
        }
    }
);

// GET /memberships/:id - Get member by ID (if they belong to user's gym)
router.get(
    '/memberships/:id',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`membershipService.getMember: API invoked with id=${id}`);
        const user = req.user;

        try {
            const member = await findMemberByIdAndOwner(id, user);
            if (!member) {
                console.log(`membershipService.getMember: Member not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Member not found' });
                return;
            }

            console.log(
                `membershipService.getMember: Retrieved member ${member.firstName} ${member.lastName} with id=${id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Member retrieved successfully',
                    data: member
                }
            };
            res.status(200).json(response);
            console.log('membershipService.getMember: Response sent successfully');
        } catch (error) {
            console.error(`membershipService.getMember: Error retrieving member with id=${id}:`, error);
            res.status(500).json({ message: 'Error retrieving member' });
        }
    }
);

// POST /memberships - Create new member for user's gym
router.post(
    '/memberships',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log(`membershipService.createMember: API invoked with payload=${JSON.stringify(req.body)}`);
        const user = req.user;
        const memberData = req.body;

        try {
            const newMember = await createMemberForOwner(user, memberData);
            if (!newMember) {
                console.log(
                    `membershipService.createMember: Failed to create member - no gym found for user ${user?._id}`
                );
                res.status(404).json({ message: 'No gym found for user' });
                return;
            }

            console.log(
                `membershipService.createMember: Created member ${newMember.firstName} ${newMember.lastName} with id=${newMember._id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Member created successfully',
                    data: newMember
                }
            };
            res.status(201).json(response);
            console.log('membershipService.createMember: Response sent successfully');
        } catch (error) {
            console.error(`membershipService.createMember: Error creating member:`, error);
            res.status(500).json({ message: 'Error creating member' });
        }
    }
);

// PUT /memberships/:id - Update member (if they belong to user's gym)
router.put(
    '/memberships/:id',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(
            `membershipService.updateMember: API invoked with id=${id} and payload=${JSON.stringify(req.body)}`
        );
        const user = req.user;
        const updateData = req.body;

        try {
            const updatedMember = await updateMemberByIdAndOwner(id, user, updateData);
            if (!updatedMember) {
                console.log(`membershipService.updateMember: Member not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Member not found' });
                return;
            }

            console.log(
                `membershipService.updateMember: Updated member ${updatedMember.firstName} ${updatedMember.lastName} with id=${id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Member updated successfully',
                    data: updatedMember
                }
            };
            res.status(200).json(response);
            console.log('membershipService.updateMember: Response sent successfully');
        } catch (error) {
            console.error(`membershipService.updateMember: Error updating member with id=${id}:`, error);
            res.status(500).json({ message: 'Error updating member' });
        }
    }
);

// POST /memberships/:memberId/plans - Assign plan to member
router.post(
    '/memberships/:memberId/plans',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { memberId } = req.params;
        const { planId, startDate, endDate, notes } = req.body;
        console.log(`membershipService.assignPlan: API invoked for member=${memberId}, plan=${planId}`, {
            startDate,
            endDate,
            notes
        });
        const user = req.user;

        try {
            const membership = await assignPlanToMember(memberId, planId, {
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : undefined,
                notes
            }, user);
            if (!membership) {
                console.log(`membershipService.assignPlan: Failed to assign plan - member not found or access denied`);
                res.status(404).json({ message: 'Member not found or access denied' });
                return;
            }

            console.log(`membershipService.assignPlan: Assigned plan ${planId} to member ${memberId}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Plan assigned successfully',
                    data: membership
                }
            };
            res.status(201).json(response);
            console.log('membershipService.assignPlan: Response sent successfully');
        } catch (error) {
            console.error(`membershipService.assignPlan: Error assigning plan:`, error);
            res.status(500).json({ message: 'Error assigning plan' });
        }
    }
);

// PUT /memberships/:memberId/plans/:planId/end - End membership (set endDate)
router.put(
    '/memberships/:memberId/plans/:planId/end',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { memberId, planId } = req.params;
        console.log(`membershipService.endMembership: API invoked for member=${memberId}, plan=${planId}`);
        const user = req.user;

        try {
            const success = await endMembershipByOwner(memberId, planId, user);
            if (!success) {
                console.log(`membershipService.endMembership: Failed to end membership - not found or access denied`);
                res.status(404).json({ message: 'Membership not found or access denied' });
                return;
            }

            console.log(`membershipService.endMembership: Ended membership for member ${memberId}, plan ${planId}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Membership ended successfully'
                }
            };
            res.status(200).json(response);
            console.log('membershipService.endMembership: Response sent successfully');
        } catch (error) {
            console.error(`membershipService.endMembership: Error ending membership:`, error);
            res.status(500).json({ message: 'Error ending membership' });
        }
    }
);

// DELETE /memberships/:memberId/plans/:planId - Remove plan from member
router.delete(
    '/memberships/:memberId/plans/:planId',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { memberId, planId } = req.params;
        console.log(`membershipService.removePlan: API invoked for member=${memberId}, plan=${planId}`);
        const user = req.user;

        try {
            const success = await removePlanFromMember(memberId, planId, user);
            if (!success) {
                console.log(`membershipService.removePlan: Failed to remove plan - member not found or access denied`);
                res.status(404).json({ message: 'Member not found or access denied' });
                return;
            }

            console.log(`membershipService.removePlan: Removed plan ${planId} from member ${memberId}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Plan removed successfully'
                }
            };
            res.status(200).json(response);
            console.log('membershipService.removePlan: Response sent successfully');
        } catch (error) {
            console.error(`membershipService.removePlan: Error removing plan:`, error);
            res.status(500).json({ message: 'Error removing plan' });
        }
    }
);

/**
 * Create new member for user's gym
 */
async function createMemberForOwner(user: IUser | undefined, memberData: Partial<IMember>): Promise<IMember | null> {
    if (!user) {
        console.log('membershipService.createMemberForOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.createMemberForOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`membershipService.createMemberForOwner: Creating member for gym ${gym._id}`);

    // Remove sensitive fields and set gymId
    const { gymId, status, approvedBy, approvedAt, joinRequestDate, createdAt, updatedAt, ...safeMemberData } =
        memberData;
    const newMemberData = {
        ...safeMemberData,
        gymId: gym._id,
        status: 'pending' // Default to pending for new members
    };

    const newMember = new Member(newMemberData);
    const savedMember = await newMember.save();

    console.log(
        `membershipService.createMemberForOwner: Created member ${savedMember.firstName} ${savedMember.lastName} with id ${savedMember._id}`
    );
    return savedMember;
}

/**
 * Find all members for the user's gym with their plan assignments
 */
async function findMembersByOwner(user: IUser | undefined): Promise<any[]> {
    if (!user) {
        console.log('membershipService.findMembersByOwner: No user provided');
        return [];
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.findMembersByOwner: No gym found for user ${user._id}`);
        return [];
    }

    console.log(
        `membershipService.findMembersByOwner: Looking for members in gym ${gym._id} (code: ${gym.gymCode}) for user ${user._id}`
    );

    // Find all members for this gym
    const members = await Member.find({ gymId: gym._id }).sort({ joinRequestDate: -1 });

    // Enrich with ACTIVE plan assignments only
    const enrichedMembers = await Promise.all(
        members.map(async (member) => {
            // Get ONLY active plan assignments for this member (no endDate)
            const activeMemberships = await Membership.find({ 
                memberId: member._id,
                $or: [
                    { endDate: { $exists: false } }, // No endDate field
                    { endDate: null } // Explicitly null endDate
                ]
            });
            
            const plans = await Promise.all(activeMemberships.map((membership) => Plan.findById(membership.planId)));

            return {
                ...member.toObject(),
                plans: plans
                    .filter((plan) => plan !== null)
                    .map((plan, index) => ({
                        _id: plan!._id,
                        name: plan!.name,
                        price: plan!.price,
                        currency: plan!.currency,
                        startDate: activeMemberships[index].startDate // Include membership start date
                    }))
            };
        })
    );

    console.log(`membershipService.findMembersByOwner: Found ${enrichedMembers.length} members for gym ${gym.name}`);
    return enrichedMembers;
}

/**
 * Find member by ID if they belong to user's gym
 */
async function findMemberByIdAndOwner(memberId: string, user: IUser | undefined): Promise<any | null> {
    if (!user) {
        console.log('membershipService.findMemberByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.findMemberByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`membershipService.findMemberByIdAndOwner: Looking for member ${memberId} in gym ${gym._id}`);
    const member = await Member.findOne({ _id: memberId, gymId: gym._id });

    if (!member) {
        console.log(`membershipService.findMemberByIdAndOwner: Member not found or doesn't belong to user's gym`);
        return null;
    }

    // Enrich with plan assignments
    const memberships = await Membership.find({ memberId: member._id });
    const plans = await Promise.all(memberships.map((membership) => Plan.findById(membership.planId)));

    const enrichedMember = {
        ...member.toObject(),
        plans: plans
            .filter((plan) => plan !== null)
            .map((plan) => ({
                _id: plan!._id,
                name: plan!.name,
                price: plan!.price,
                currency: plan!.currency
            }))
    };

    console.log(`membershipService.findMemberByIdAndOwner: Found member "${member.firstName} ${member.lastName}"`);
    return enrichedMember;
}

/**
 * Update member by ID if they belong to user's gym
 */
async function updateMemberByIdAndOwner(
    memberId: string,
    user: IUser | undefined,
    updateData: Partial<IMember>
): Promise<IMember | null> {
    if (!user) {
        console.log('membershipService.updateMemberByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.updateMemberByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Verify member belongs to user's gym
    const member = await Member.findOne({ _id: memberId, gymId: gym._id });
    if (!member) {
        console.log(
            `membershipService.updateMemberByIdAndOwner: Member ${memberId} not found or doesn't belong to user's gym`
        );
        return null;
    }

    console.log(`membershipService.updateMemberByIdAndOwner: Updating member ${memberId} for gym ${gym._id}`);

    // Remove fields that shouldn't be updated
    const { _id, gymId, joinRequestDate, createdAt, updatedAt, ...safeUpdateData } = updateData;

    // If status is being changed to approved, set approvedBy and approvedAt
    if (updateData.status === 'approved' && member.status !== 'approved') {
        (safeUpdateData as any).approvedBy = user._id;
        (safeUpdateData as any).approvedAt = new Date();
    }

    const updatedMember = await Member.findByIdAndUpdate(memberId, safeUpdateData, {
        new: true,
        runValidators: true
    });

    if (updatedMember) {
        console.log(
            `membershipService.updateMemberByIdAndOwner: Successfully updated member status to "${updatedMember.status}"`
        );
    }

    return updatedMember;
}

/**
 * Assign plan to member
 */
async function assignPlanToMember(
    memberId: string,
    planId: string,
    membershipData: {
        startDate?: Date;
        endDate?: Date;
        notes?: string;
    },
    user: IUser | undefined
): Promise<IMembership | null> {
    if (!user) {
        console.log('membershipService.assignPlanToMember: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.assignPlanToMember: No gym found for user ${user._id}`);
        return null;
    }

    // Verify member belongs to user's gym
    const member = await Member.findOne({ _id: memberId, gymId: gym._id });
    if (!member) {
        console.log(
            `membershipService.assignPlanToMember: Member ${memberId} not found or doesn't belong to user's gym`
        );
        return null;
    }

    // Verify plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
        console.log(`membershipService.assignPlanToMember: Plan ${planId} not found`);
        return null;
    }

    console.log(`membershipService.assignPlanToMember: Assigning plan ${planId} to member ${memberId}`);

    // ALWAYS end ALL existing active memberships for this member (for historical tracking)
    // This ensures we create a new record instead of updating existing ones
    const activeMemberships = await Membership.find({
        memberId,
        $or: [
            { endDate: { $exists: false } }, // No endDate field
            { endDate: null } // Explicitly null endDate
        ]
    });

    if (activeMemberships.length > 0) {
        console.log(`membershipService.assignPlanToMember: Found ${activeMemberships.length} active memberships to end for member ${memberId}`);

        // End all active memberships by setting endDate to now
        const endDate = new Date();
        const updateResult = await Membership.updateMany(
            {
                memberId,
                $or: [
                    { endDate: { $exists: false } },
                    { endDate: null }
                ]
            },
            {
                $set: { endDate }
            }
        );

        console.log(`membershipService.assignPlanToMember: Ended ${updateResult.modifiedCount} active memberships for member ${memberId}`);
    } else {
        console.log(`membershipService.assignPlanToMember: No active memberships found for member ${memberId}`);
    }

    // Create new membership record
    const newMembershipData = {
        memberId,
        planId,
        startDate: membershipData.startDate || new Date(),
        endDate: membershipData.endDate
    };

    console.log(`membershipService.assignPlanToMember: Creating new membership record:`, newMembershipData);

    try {
        const membership = new Membership(newMembershipData);
        const savedMembership = await membership.save();

        console.log(`membershipService.assignPlanToMember: Successfully created new membership ${savedMembership._id} for member ${memberId} with plan ${planId}`);
        console.log(`membershipService.assignPlanToMember: New membership details:`, savedMembership.toObject());

        return savedMembership;
    } catch (saveError) {
        console.error(`membershipService.assignPlanToMember: Error saving new membership:`, saveError);
        throw saveError;
    }
}

/**
 * End membership by setting endDate
 */
async function endMembershipByOwner(memberId: string, planId: string, user: IUser | undefined): Promise<boolean> {
    if (!user) {
        console.log('membershipService.endMembershipByOwner: No user provided');
        return false;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.endMembershipByOwner: No gym found for user ${user._id}`);
        return false;
    }

    // Verify member belongs to user's gym
    const member = await Member.findOne({ _id: memberId, gymId: gym._id });
    if (!member) {
        console.log(
            `membershipService.endMembershipByOwner: Member ${memberId} not found or doesn't belong to user's gym`
        );
        return false;
    }

    console.log(`membershipService.endMembershipByOwner: Ending membership for member ${memberId}, plan ${planId}`);

    // Find and update the active membership
    const membership = await Membership.findOne({
        memberId,
        planId,
        endDate: { $exists: false } // Only active memberships (no end date)
    });

    if (!membership) {
        console.log(`membershipService.endMembershipByOwner: No active membership found for member ${memberId}, plan ${planId}`);
        return false;
    }

    // Set endDate to now
    membership.endDate = new Date();
    await membership.save();

    console.log(`membershipService.endMembershipByOwner: Ended membership ${membership._id}`);
    return true;
}

/**
 * Remove plan from member
 */
async function removePlanFromMember(memberId: string, planId: string, user: IUser | undefined): Promise<boolean> {
    if (!user) {
        console.log('membershipService.removePlanFromMember: No user provided');
        return false;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.removePlanFromMember: No gym found for user ${user._id}`);
        return false;
    }

    // Verify member belongs to user's gym
    const member = await Member.findOne({ _id: memberId, gymId: gym._id });
    if (!member) {
        console.log(
            `membershipService.removePlanFromMember: Member ${memberId} not found or doesn't belong to user's gym`
        );
        return false;
    }

    console.log(`membershipService.removePlanFromMember: Removing plan ${planId} from member ${memberId}`);

    const result = await Membership.deleteOne({ memberId, planId });
    console.log(`membershipService.removePlanFromMember: Deleted ${result.deletedCount} membership records`);

    return result.deletedCount > 0;
}
