import express, { type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Member } from '../db/member';
import { Gym } from '../db/gym';
import { Membership } from '../db/membership';
import { Plan } from '../db/plan';
import type { IMember } from '../db/member';
import type { IUser } from '../db/user';
import type { ServerResponse } from '../../shared/ServerResponse';

// This router owns the Member entity: a user's record within a single gym. It covers both
// member self-service (PUT /member, GET /member/profile) and owner-side member management
// (GET/POST/PUT /memberships). The member<->plan join rows live in membership/membershipService.ts.
const router = express.Router();
router.use(express.json());

class ResponseHelper {
    static success(data: any, message: string = 'Success'): ServerResponse {
        return { responseCode: 200, body: { message, data } };
    }
    static error(message: string, code: number = 500): ServerResponse {
        return { responseCode: code, body: { message } };
    }
}

// PUT /member { phone?, address?, pinCode? }
router.put(
    '/member',
    authenticateUser,
    authorizeRoles('member', 'owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('memberService.PUT /member: Request received', req.body);
            const { phone, address, pinCode } = req.body as {
                phone?: string;
                address?: {
                    street?: string;
                    city?: string;
                    state?: string;
                    zipCode?: string;
                    country?: string;
                };
                pinCode?: string;
            };

            if (!req.user?.email) {
                return res.status(400).json(ResponseHelper.error('User email not found', 400));
            }

            // Validate pin code format if provided
            if (pinCode && !/^\d{4,6}$/.test(pinCode)) {
                return res.status(400).json(ResponseHelper.error('Pin code must be 4-6 digits', 400));
            }

            // Find all member records for this user
            const memberRecords = await Member.find({
                email: req.user.email,
                status: 'approved'
            });

            if (memberRecords.length === 0) {
                return res.status(404).json(ResponseHelper.error('No approved member records found', 404));
            }

            // Build update object with only provided fields
            const updateData: any = {};
            if (phone !== undefined) updateData.phone = phone;
            if (address !== undefined) updateData.address = address;
            if (pinCode !== undefined) updateData.pinCode = pinCode || null;

            // Update all member records for this user
            const updatePromises = memberRecords.map(member =>
                Member.findByIdAndUpdate(
                    member._id,
                    updateData,
                    { new: true }
                )
            );

            const updatedMembers = await Promise.all(updatePromises);

            console.log(`memberService.PUT /member: Updated ${Object.keys(updateData).join(', ')} for ${updatedMembers.length} member records`);

            // Return updated profile data (without sensitive information)
            const profileData = updatedMembers.filter(member => member !== null).map(member => ({
                _id: member!._id,
                email: member!.email,
                firstName: member!.firstName,
                lastName: member!.lastName,
                phone: member!.phone,
                address: member!.address,
                memberType: member!.memberType,
                status: member!.status,
                gymId: member!.gymId,
                hasPinCode: !!member!.pinCode,
                joinRequestDate: member!.joinRequestDate,
                approvedAt: member!.approvedAt
            }));

            res.status(200).json(ResponseHelper.success({
                updatedCount: updatedMembers.length,
                profile: profileData
            }, 'Member profile updated successfully'));

        } catch (error) {
            console.error('memberService.PUT /member error:', error);
            res.status(500).json(ResponseHelper.error('Failed to update member profile', 500));
        }
    }
);

// GET /member/profile - get current user's member profile information
router.get(
    '/member/profile',
    authenticateUser,
    authorizeRoles('member', 'owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('memberService.GET /member/profile: Request received for user', req.user?.email);

            if (!req.user?.email) {
                return res.status(400).json(ResponseHelper.error('User email not found', 400));
            }

            // Find all member records for this user
            const memberRecords = await Member.find({
                email: req.user.email,
                status: { $in: ['approved', 'pending'] }
            });

            if (memberRecords.length === 0) {
                return res.status(404).json(ResponseHelper.error('No member records found', 404));
            }

            // Return member profile information (without sensitive data)
            const profileData = memberRecords.map(member => ({
                _id: member._id,
                email: member.email,
                firstName: member.firstName,
                lastName: member.lastName,
                phone: member.phone,
                address: member.address,
                memberType: member.memberType,
                status: member.status,
                gymId: member.gymId,
                hasPinCode: !!member.pinCode, // Only indicate if pin code exists, don't return the value
                joinRequestDate: member.joinRequestDate,
                approvedAt: member.approvedAt
            }));

            console.log(`memberService.GET /member/profile: Returning profile for ${profileData.length} member records`);

            res.status(200).json(ResponseHelper.success(profileData, 'Member profile retrieved successfully'));

        } catch (error) {
            console.error('memberService.GET /member/profile error:', error);
            res.status(500).json(ResponseHelper.error('Failed to get member profile', 500));
        }
    }
);

// ---------------------------------------------------------------------------
// Owner-side member management: CRUD over the Member records in the owner's gym.
// (Kept on the /memberships path for backwards compatibility with existing clients;
//  the member<->plan join routes /memberships/:memberId/plans live in membershipService.ts.)
// ---------------------------------------------------------------------------

// GET /memberships - Get all members for the current user's gym with their plan assignments
router.get(
    '/memberships',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log('memberService.getMemberships: API invoked');
        const user = req.user;

        try {
            const members = await findMembersByOwner(user);
            console.log(`memberService.getMemberships: Retrieved ${members.length} members for user ${user?._id}`);

            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Members retrieved successfully',
                    data: members
                }
            };
            res.status(200).json(response);
            console.log('memberService.getMemberships: Response sent successfully');
        } catch (error) {
            console.error('memberService.getMemberships: Error retrieving members:', error);
            res.status(500).json({ message: 'Error retrieving members' });
        }
    }
);

// GET /memberships/:id - Get member by ID (if they belong to user's gym)
router.get(
    '/memberships/:id',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`memberService.getMember: API invoked with id=${id}`);
        const user = req.user;

        try {
            const member = await findMemberByIdAndOwner(id, user);
            if (!member) {
                console.log(`memberService.getMember: Member not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Member not found' });
                return;
            }

            console.log(
                `memberService.getMember: Retrieved member ${member.firstName} ${member.lastName} with id=${id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Member retrieved successfully',
                    data: member
                }
            };
            res.status(200).json(response);
            console.log('memberService.getMember: Response sent successfully');
        } catch (error) {
            console.error(`memberService.getMember: Error retrieving member with id=${id}:`, error);
            res.status(500).json({ message: 'Error retrieving member' });
        }
    }
);

// POST /memberships - Create new member for user's gym
router.post(
    '/memberships',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log(`memberService.createMember: API invoked with payload=${JSON.stringify(req.body)}`);
        const user = req.user;
        const memberData = req.body;

        try {
            const newMember = await createMemberForOwner(user, memberData);
            if (!newMember) {
                console.log(
                    `memberService.createMember: Failed to create member - no gym found for user ${user?._id}`
                );
                res.status(404).json({ message: 'No gym found for user' });
                return;
            }

            console.log(
                `memberService.createMember: Created member ${newMember.firstName} ${newMember.lastName} with id=${newMember._id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Member created successfully',
                    data: newMember
                }
            };
            res.status(201).json(response);
            console.log('memberService.createMember: Response sent successfully');
        } catch (error) {
            console.error(`memberService.createMember: Error creating member:`, error);
            res.status(500).json({ message: 'Error creating member' });
        }
    }
);

// PUT /memberships/:id - Update member (if they belong to user's gym)
router.put(
    '/memberships/:id',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(
            `memberService.updateMember: API invoked with id=${id} and payload=${JSON.stringify(req.body)}`
        );
        const user = req.user;
        const updateData = req.body;

        try {
            const updatedMember = await updateMemberByIdAndOwner(id, user, updateData);
            if (!updatedMember) {
                console.log(`memberService.updateMember: Member not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Member not found' });
                return;
            }

            console.log(
                `memberService.updateMember: Updated member ${updatedMember.firstName} ${updatedMember.lastName} with id=${id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Member updated successfully',
                    data: updatedMember
                }
            };
            res.status(200).json(response);
            console.log('memberService.updateMember: Response sent successfully');
        } catch (error) {
            console.error(`memberService.updateMember: Error updating member with id=${id}:`, error);
            res.status(500).json({ message: 'Error updating member' });
        }
    }
);

/**
 * Create new member for user's gym
 */
async function createMemberForOwner(user: IUser | undefined, memberData: Partial<IMember>): Promise<IMember | null> {
    if (!user) {
        console.log('memberService.createMemberForOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`memberService.createMemberForOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`memberService.createMemberForOwner: Creating member for gym ${gym._id}`);

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
        `memberService.createMemberForOwner: Created member ${savedMember.firstName} ${savedMember.lastName} with id ${savedMember._id}`
    );
    return savedMember;
}

/**
 * Find all members for the user's gym with their plan assignments
 */
async function findMembersByOwner(user: IUser | undefined): Promise<any[]> {
    if (!user) {
        console.log('memberService.findMembersByOwner: No user provided');
        return [];
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`memberService.findMembersByOwner: No gym found for user ${user._id}`);
        return [];
    }

    console.log(
        `memberService.findMembersByOwner: Looking for members in gym ${gym._id} (code: ${gym.gymCode}) for user ${user._id}`
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

    console.log(`memberService.findMembersByOwner: Found ${enrichedMembers.length} members for gym ${gym.name}`);
    return enrichedMembers;
}

/**
 * Find member by ID if they belong to user's gym
 */
async function findMemberByIdAndOwner(memberId: string, user: IUser | undefined): Promise<any | null> {
    if (!user) {
        console.log('memberService.findMemberByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`memberService.findMemberByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`memberService.findMemberByIdAndOwner: Looking for member ${memberId} in gym ${gym._id}`);
    const member = await Member.findOne({ _id: memberId, gymId: gym._id });

    if (!member) {
        console.log(`memberService.findMemberByIdAndOwner: Member not found or doesn't belong to user's gym`);
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

    console.log(`memberService.findMemberByIdAndOwner: Found member "${member.firstName} ${member.lastName}"`);
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
        console.log('memberService.updateMemberByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`memberService.updateMemberByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Verify member belongs to user's gym
    const member = await Member.findOne({ _id: memberId, gymId: gym._id });
    if (!member) {
        console.log(
            `memberService.updateMemberByIdAndOwner: Member ${memberId} not found or doesn't belong to user's gym`
        );
        return null;
    }

    console.log(`memberService.updateMemberByIdAndOwner: Updating member ${memberId} for gym ${gym._id}`);

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
            `memberService.updateMemberByIdAndOwner: Successfully updated member status to "${updatedMember.status}"`
        );
    }

    return updatedMember;
}

export { router as memberRouter };
