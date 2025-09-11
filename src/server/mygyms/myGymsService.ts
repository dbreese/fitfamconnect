import express, { type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import type { IUser } from '../db/user';
import { Gym } from '../db/gym';
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

// GET /mygyms - get all gyms where user has a member entry
router.get(
    '/mygyms',
    authenticateUser,
    authorizeRoles('member', 'owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('myGymsService.GET /mygyms: Request received for user', req.user?.email);

            if (!req.user?.email) {
                return res.status(400).json(ResponseHelper.error('User email not found', 400));
            }

            // Find all member records for this user's email
            const memberRecords = await Member.find({
                email: req.user.email,
                status: { $in: ['approved', 'pending'] } // Include approved and pending memberships
            });

            console.log(`myGymsService.GET /mygyms: Found ${memberRecords.length} member records for ${req.user.email}`);

            if (memberRecords.length === 0) {
                return res.status(200).json(ResponseHelper.success([], 'No gym memberships found'));
            }

            // Get unique gym IDs
            const gymIds = [...new Set(memberRecords.map(member => member.gymId))];
            console.log(`myGymsService.GET /mygyms: Looking up ${gymIds.length} unique gyms`);

            // Find all gyms for these member records
            const gyms = await Gym.find({ _id: { $in: gymIds } });

            // Combine gym data with member status
            const gymMemberships = gyms.map(gym => {
                const memberRecord = memberRecords.find(member => member.gymId === gym._id.toString());
                return {
                    gym: {
                        _id: gym._id,
                        name: gym.name,
                        description: gym.description,
                        billingAddress: gym.billingAddress,
                        contact: gym.contact,
                        isActive: gym.isActive
                    },
                    membership: {
                        _id: memberRecord?._id,
                        memberType: memberRecord?.memberType,
                        status: memberRecord?.status,
                        startDate: memberRecord?.startDate,
                        joinRequestDate: memberRecord?.joinRequestDate,
                        approvedAt: memberRecord?.approvedAt,
                        notes: memberRecord?.notes
                    }
                };
            });

            console.log(`myGymsService.GET /mygyms: Returning ${gymMemberships.length} gym memberships`);
            res.status(200).json(ResponseHelper.success(gymMemberships, 'Gym memberships retrieved successfully'));
        } catch (error) {
            console.error('myGymsService.GET /mygyms error:', error);
            res.status(500).json(ResponseHelper.error('Failed to get gym memberships', 500));
        }
    }
);

// POST /mygyms/lookup-gym { gymCode }
router.post(
    '/mygyms/lookup-gym',
    authenticateUser,
    authorizeRoles('member', 'owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('myGymsService.POST /mygyms/lookup-gym: Request received', req.body);
            const { gymCode } = req.body as { gymCode?: string };

            if (!gymCode || !gymCode.trim()) {
                return res.status(400).json(ResponseHelper.error('Gym code is required', 400));
            }

            // Validate gym code format (6 character alphanumeric)
            if (!/^[A-Z0-9]{6}$/.test(gymCode.trim().toUpperCase())) {
                return res.status(400).json(ResponseHelper.error('Gym code must be 6 alphanumeric characters', 400));
            }

            // Find gym by code
            const gym = await Gym.findOne({
                gymCode: gymCode.trim().toUpperCase(),
                isActive: true
            });

            if (!gym) {
                return res.status(404).json(ResponseHelper.error('Gym not found with this code', 404));
            }

            console.log(`myGymsService.POST /mygyms/lookup-gym: Found gym ${gym.name} with code ${gymCode}`);

            // Return gym details
            const gymDetails = {
                _id: gym._id,
                name: gym.name,
                description: gym.description,
                gymCode: gym.gymCode,
                billingAddress: gym.billingAddress,
                contact: gym.contact
            };

            res.status(200).json(ResponseHelper.success(gymDetails, 'Gym found successfully'));
        } catch (error) {
            console.error('myGymsService.POST /mygyms/lookup-gym error:', error);
            res.status(500).json(ResponseHelper.error('Failed to lookup gym', 500));
        }
    }
);

// POST /mygyms/join-gym { gymId }
router.post(
    '/mygyms/join-gym',
    authenticateUser,
    authorizeRoles('member', 'owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('myGymsService.POST /mygyms/join-gym: Request received', req.body);
            const { gymId } = req.body as { gymId?: string };

            if (!gymId) {
                return res.status(400).json(ResponseHelper.error('Gym ID is required', 400));
            }

            if (!req.user?.email) {
                return res.status(400).json(ResponseHelper.error('User email not found', 400));
            }

            // Verify gym exists and is active
            const gym = await Gym.findOne({ _id: gymId, isActive: true });
            if (!gym) {
                return res.status(404).json(ResponseHelper.error('Gym not found or inactive', 404));
            }

            // Check if user already has a membership at this gym
            const existingMember = await Member.findOne({
                email: req.user.email,
                gymId: gymId
            });

            if (existingMember) {
                return res.status(400).json(ResponseHelper.error('You already have a membership at this gym', 400));
            }

            // Create new member record
            const newMember = new Member({
                email: req.user.email,
                firstName: req.user.fullname?.split(' ')[0] || 'Unknown',
                lastName: req.user.fullname?.split(' ').slice(1).join(' ') || '',
                gymId: gymId,
                memberType: 'member',
                status: 'pending', // Requires gym owner approval
                startDate: new Date(),
                joinRequestDate: new Date(),
                isActive: true
            });

            const savedMember = await newMember.save();
            console.log(`myGymsService.POST /mygyms/join-gym: Created member record ${savedMember._id} for gym ${gym.name}`);

            res.status(201).json(ResponseHelper.success(savedMember, 'Join request submitted successfully'));
        } catch (error) {
            console.error('myGymsService.POST /mygyms/join-gym error:', error);
            res.status(500).json(ResponseHelper.error('Failed to join gym', 500));
        }
    }
);

export { router as myGymsRouter };
