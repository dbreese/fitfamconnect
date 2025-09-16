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
    static created(data: any, message: string = 'Created'): ServerResponse {
        return { responseCode: 201, body: { message, data } };
    }
    static error(message: string, code: number = 500): ServerResponse {
        return { responseCode: code, body: { message } };
    }
}

async function getCurrentUserGym(user: IUser | undefined) {
    if (!user) throw new Error('No user provided');
    const gym = await Gym.findOne({ ownerId: user._id });
    if (!gym) throw new Error('Gym not found for user');
    return gym;
}

// GET /coaches - get all current coaches
router.get(
    '/coaches',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('coachService.GET /coaches: Request received');
            const gym = await getCurrentUserGym(req.user);

            const coaches = await Member.find({
                gymId: gym._id,
                memberType: 'coach',
                status: 'approved'
            });

            console.log(`coachService.GET /coaches: Found ${coaches.length} coaches`);
            res.status(200).json(ResponseHelper.success(coaches, 'Coaches retrieved'));
        } catch (error) {
            console.error('coachService.GET /coaches error:', error);
            res.status(500).json(ResponseHelper.error('Failed to get coaches', 500));
        }
    }
);

// GET /coaches/search-members?q= - search for members (not coaches) to potentially add
router.get(
    '/coaches/search-members',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('coachService.GET /coaches/search-members: Request received', req.query);
            const { q } = req.query as { q?: string };
            const gym = await getCurrentUserGym(req.user);

            const query: any = {
                gymId: gym._id,
                memberType: 'member', // Only regular members
                status: 'approved'
            };

            if (q && q.trim()) {
                const rx = new RegExp(q.trim(), 'i');
                query.$or = [
                    { firstName: rx },
                    { lastName: rx },
                    { email: rx },
                    { phone: rx }
                ];
            }

            const members = await Member.find(query).limit(50);
            console.log(`coachService.GET /coaches/search-members: Found ${members.length} members`);
            res.status(200).json(ResponseHelper.success(members, 'Members retrieved'));
        } catch (error) {
            console.error('coachService.GET /coaches/search-members error:', error);
            res.status(500).json(ResponseHelper.error('Failed to search members', 500));
        }
    }
);

// POST /coaches/set { memberId }
router.post(
    '/coaches/set',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('coachService.POST /coaches/set: Request received', req.body);
            const { memberId } = req.body as { memberId?: string };
            if (!memberId) return res.status(400).json(ResponseHelper.error('memberId required', 400));

            const gym = await getCurrentUserGym(req.user);
            const member = await Member.findOne({ _id: memberId, gymId: gym._id });
            if (!member) return res.status(404).json(ResponseHelper.error('Member not found', 404));

            if (member.memberType === 'coach') {
                return res.status(400).json(ResponseHelper.error('Member is already a coach', 400));
            }

            member.memberType = 'coach';
            await member.save();
            console.log(`coachService.POST /coaches/set: Set member ${memberId} as coach`);
            res.status(200).json(ResponseHelper.success(member, 'Member set as coach'));
        } catch (error) {
            console.error('coachService.POST /coaches/set error:', error);
            res.status(500).json(ResponseHelper.error('Failed to set coach', 500));
        }
    }
);

// POST /coaches/unset { memberId }
router.post(
    '/coaches/unset',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('coachService.POST /coaches/unset: Request received', req.body);
            const { memberId } = req.body as { memberId?: string };
            if (!memberId) return res.status(400).json(ResponseHelper.error('memberId required', 400));

            const gym = await getCurrentUserGym(req.user);
            const member = await Member.findOne({ _id: memberId, gymId: gym._id });
            if (!member) return res.status(404).json(ResponseHelper.error('Member not found', 404));

            // Do not allow unsetting owner
            if (member.memberType === 'owner') {
                return res.status(400).json(ResponseHelper.error('Cannot change owner role', 400));
            }

            if (member.memberType !== 'coach') {
                return res.status(400).json(ResponseHelper.error('Member is not a coach', 400));
            }

            member.memberType = 'member';
            await member.save();
            console.log(`coachService.POST /coaches/unset: Unset member ${memberId} as coach`);
            res.status(200).json(ResponseHelper.success(member, 'Coach removed'));
        } catch (error) {
            console.error('coachService.POST /coaches/unset error:', error);
            res.status(500).json(ResponseHelper.error('Failed to remove coach', 500));
        }
    }
);

export { router as coachRouter };
