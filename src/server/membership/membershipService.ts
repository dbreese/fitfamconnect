import type { IUser } from '../db/user';
import express, { Router, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Membership, type IMembership } from '../db/membership';
import { Member } from '../db/member';
import { Plan } from '../db/plan';
import { Gym } from '../db/gym';
import { type ServerResponse } from '../../shared/ServerResponse';

// This router owns the Membership entity: the member<->plan join rows (plan assignments
// with start/end dates and billing tracking). CRUD for the Member records themselves lives
// in member/memberService.ts.
export const router = Router();
router.use(express.json());

// POST /memberships/:memberId/plans - Assign plan to member
router.post(
    '/memberships/:memberId/plans',
    authenticateUser,
    authorizeRoles('owner', 'root'),
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
    authorizeRoles('owner', 'root'),
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
    authorizeRoles('owner', 'root'),
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

    const requestedStartDate = membershipData.startDate || new Date();

    // Check if there's an existing active membership with the same start date
    const existingMembershipSameDate = await Membership.findOne({
        memberId,
        startDate: {
            $gte: new Date(requestedStartDate.getFullYear(), requestedStartDate.getMonth(), requestedStartDate.getDate()),
            $lt: new Date(requestedStartDate.getFullYear(), requestedStartDate.getMonth(), requestedStartDate.getDate() + 1)
        },
        $or: [
            { endDate: { $exists: false } }, // No endDate field
            { endDate: null } // Explicitly null endDate
        ]
    });

    if (existingMembershipSameDate) {
        console.log(`membershipService.assignPlanToMember: Found existing membership with same start date, updating it instead of creating new record`);

        // Update the existing membership with new plan and end date
        existingMembershipSameDate.planId = planId;
        existingMembershipSameDate.endDate = membershipData.endDate;

        const updatedMembership = await existingMembershipSameDate.save();
        console.log(`membershipService.assignPlanToMember: Updated existing membership ${updatedMembership._id}`);

        return updatedMembership;
    }

    // If no existing membership with same start date, end all active memberships and create new one
    const activeMemberships = await Membership.find({
        memberId,
        $or: [
            { endDate: { $exists: false } }, // No endDate field
            { endDate: null } // Explicitly null endDate
        ]
    });

    if (activeMemberships.length > 0) {
        console.log(`membershipService.assignPlanToMember: Found ${activeMemberships.length} active memberships with different start dates, ending them for historical tracking`);

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
