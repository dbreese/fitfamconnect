import express, { type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Member } from '../db/member';
import type { ServerResponse } from '../../shared/ServerResponse';

const router = express.Router();

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

export { router as memberRouter };
