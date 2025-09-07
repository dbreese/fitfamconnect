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

// GET /memberships - Get all memberships for the current user's gym
router.get(
    '/memberships',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log('membershipService.getMemberships: API invoked');
        const user = req.user;

        try {
            const memberships = await findMembershipsByOwner(user);
            console.log(
                `membershipService.getMemberships: Retrieved ${memberships.length} memberships for user ${user?._id}`
            );

            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Memberships retrieved successfully',
                    data: memberships
                }
            };
            res.status(200).json(response);
            console.log('membershipService.getMemberships: Response sent successfully');
        } catch (error) {
            console.error('membershipService.getMemberships: Error retrieving memberships:', error);
            res.status(500).json({ message: 'Error retrieving memberships' });
        }
    }
);

// GET /memberships/:id - Get membership by ID (if it belongs to user's gym)
router.get(
    '/memberships/:id',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`membershipService.getMembership: API invoked with id=${id}`);
        const user = req.user;

        try {
            const membership = await findMembershipByIdAndOwner(id, user);
            if (!membership) {
                console.log(`membershipService.getMembership: Membership not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Membership not found' });
                return;
            }

            console.log(
                `membershipService.getMembership: Retrieved membership for member ${membership.memberId} with id=${id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Membership retrieved successfully',
                    data: membership
                }
            };
            res.status(200).json(response);
            console.log('membershipService.getMembership: Response sent successfully');
        } catch (error) {
            console.error(`membershipService.getMembership: Error retrieving membership with id=${id}:`, error);
            res.status(500).json({ message: 'Error retrieving membership' });
        }
    }
);

// POST /memberships - Create new membership for user's gym
router.post(
    '/memberships',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log(`membershipService.createMembership: API invoked with payload=${JSON.stringify(req.body)}`);
        const user = req.user;
        const membershipData = req.body;

        try {
            const newMembership = await createMembershipForOwner(user, membershipData);
            if (!newMembership) {
                console.log(
                    `membershipService.createMembership: Failed to create membership - no gym found for user ${user?._id}`
                );
                res.status(404).json({ message: 'No gym found for user' });
                return;
            }

            console.log(
                `membershipService.createMembership: Created membership for member ${newMembership.memberId} with id=${newMembership._id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Membership created successfully',
                    data: newMembership
                }
            };
            res.status(201).json(response);
            console.log('membershipService.createMembership: Response sent successfully');
        } catch (error) {
            console.error(`membershipService.createMembership: Error creating membership:`, error);
            res.status(500).json({ message: 'Error creating membership' });
        }
    }
);

// PUT /memberships/:id - Update membership (if it belongs to user's gym)
router.put(
    '/memberships/:id',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(
            `membershipService.updateMembership: API invoked with id=${id} and payload=${JSON.stringify(req.body)}`
        );
        const user = req.user;
        const updateData = req.body;

        try {
            const updatedMembership = await updateMembershipByIdAndOwner(id, user, updateData);
            if (!updatedMembership) {
                console.log(`membershipService.updateMembership: Membership not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Membership not found' });
                return;
            }

            console.log(
                `membershipService.updateMembership: Updated membership for member ${updatedMembership.memberId} with id=${id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Membership updated successfully',
                    data: updatedMembership
                }
            };
            res.status(200).json(response);
            console.log('membershipService.updateMembership: Response sent successfully');
        } catch (error) {
            console.error(`membershipService.updateMembership: Error updating membership with id=${id}:`, error);
            res.status(500).json({ message: 'Error updating membership' });
        }
    }
);

/**
 * Create new membership for user's gym
 */
async function createMembershipForOwner(
    user: IUser | undefined,
    membershipData: Partial<IMembership>
): Promise<IMembership | null> {
    if (!user) {
        console.log('membershipService.createMembershipForOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.createMembershipForOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`membershipService.createMembershipForOwner: Creating membership for gym ${gym._id}`);

    // Remove sensitive fields and set gymId and gymCode
    const { gymId, gymCode, createdAt, updatedAt, ...safeMembershipData } = membershipData;
    const newMembershipData = {
        ...safeMembershipData,
        gymId: gym._id,
        gymCode: gym.gymCode,
        status: 'pending' // Default to pending for new memberships
    };

    const newMembership = new Membership(newMembershipData);
    const savedMembership = await newMembership.save();

    console.log(
        `membershipService.createMembershipForOwner: Created membership for member ${savedMembership.memberId} with id ${savedMembership._id}`
    );
    return savedMembership;
}

/**
 * Find all memberships for the user's gym with member and plan details
 */
async function findMembershipsByOwner(user: IUser | undefined): Promise<any[]> {
    if (!user) {
        console.log('membershipService.findMembershipsByOwner: No user provided');
        return [];
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.findMembershipsByOwner: No gym found for user ${user._id}`);
        return [];
    }

    console.log(
        `membershipService.findMembershipsByOwner: Looking for memberships in gym ${gym._id} (code: ${gym.gymCode}) for user ${user._id}`
    );

    // Find all memberships for this gym
    const memberships = await Membership.find({ gymId: gym._id }).sort({ joinRequestDate: -1 });

    // Enrich with member and plan details
    const enrichedMemberships = await Promise.all(
        memberships.map(async (membership) => {
            // Get member details
            const member = await Member.findById(membership.memberId);

            // Get plan details
            const plans = await Promise.all(membership.planIds.map((planId) => Plan.findById(planId)));

            return {
                ...membership.toObject(),
                member: member
                    ? {
                          _id: member._id,
                          firstName: member.firstName,
                          lastName: member.lastName,
                          email: member.email,
                          phone: member.phone,
                          memberType: member.memberType
                      }
                    : null,
                plans: plans
                    .filter((plan) => plan !== null)
                    .map((plan) => ({
                        _id: plan!._id,
                        name: plan!.name,
                        price: plan!.price,
                        currency: plan!.currency
                    }))
            };
        })
    );

    console.log(
        `membershipService.findMembershipsByOwner: Found ${enrichedMemberships.length} memberships for gym ${gym.name}`
    );
    return enrichedMemberships;
}

/**
 * Find membership by ID if it belongs to user's gym
 */
async function findMembershipByIdAndOwner(membershipId: string, user: IUser | undefined): Promise<any | null> {
    if (!user) {
        console.log('membershipService.findMembershipByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.findMembershipByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(
        `membershipService.findMembershipByIdAndOwner: Looking for membership ${membershipId} in gym ${gym._id}`
    );
    const membership = await Membership.findOne({ _id: membershipId, gymId: gym._id });

    if (!membership) {
        console.log(
            `membershipService.findMembershipByIdAndOwner: Membership not found or doesn't belong to user's gym`
        );
        return null;
    }

    // Enrich with member and plan details
    const member = await Member.findById(membership.memberId);
    const plans = await Promise.all(membership.planIds.map((planId) => Plan.findById(planId)));

    const enrichedMembership = {
        ...membership.toObject(),
        member: member
            ? {
                  _id: member._id,
                  firstName: member.firstName,
                  lastName: member.lastName,
                  email: member.email,
                  phone: member.phone,
                  memberType: member.memberType
              }
            : null,
        plans: plans
            .filter((plan) => plan !== null)
            .map((plan) => ({
                _id: plan!._id,
                name: plan!.name,
                price: plan!.price,
                currency: plan!.currency
            }))
    };

    console.log(
        `membershipService.findMembershipByIdAndOwner: Found membership for member "${member?.firstName} ${member?.lastName}"`
    );
    return enrichedMembership;
}

/**
 * Update membership by ID if it belongs to user's gym
 */
async function updateMembershipByIdAndOwner(
    membershipId: string,
    user: IUser | undefined,
    updateData: Partial<IMembership>
): Promise<IMembership | null> {
    if (!user) {
        console.log('membershipService.updateMembershipByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`membershipService.updateMembershipByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Verify membership belongs to user's gym
    const membership = await Membership.findOne({ _id: membershipId, gymId: gym._id });
    if (!membership) {
        console.log(
            `membershipService.updateMembershipByIdAndOwner: Membership ${membershipId} not found or doesn't belong to user's gym`
        );
        return null;
    }

    console.log(
        `membershipService.updateMembershipByIdAndOwner: Updating membership ${membershipId} for gym ${gym._id}`
    );

    // Remove fields that shouldn't be updated
    const { memberId, gymId, gymCode, joinRequestDate, createdAt, updatedAt, ...safeUpdateData } = updateData;

    // If status is being changed to approved, set approvedBy and approvedAt
    if (updateData.status === 'approved' && membership.status !== 'approved') {
        (safeUpdateData as any).approvedBy = user._id;
        (safeUpdateData as any).approvedAt = new Date();
    }

    const updatedMembership = await Membership.findByIdAndUpdate(membershipId, safeUpdateData, {
        new: true,
        runValidators: true
    });

    if (updatedMembership) {
        console.log(
            `membershipService.updateMembershipByIdAndOwner: Successfully updated membership status to "${updatedMembership.status}"`
        );
    }

    return updatedMembership;
}
