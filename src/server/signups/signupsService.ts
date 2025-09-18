import express, { type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import type { IUser } from '../db/user';
import { Gym } from '../db/gym';
import { Member } from '../db/member';
import { Schedule } from '../db/schedule';
import { Class } from '../db/class';
import { Location } from '../db/location';
import { Signup } from '../db/signup';
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

// GET /signups/classes?gymId=&date= - get available classes for a gym on a specific date
router.get(
    '/signups/classes',
    authenticateUser,
    authorizeRoles('member', 'owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('signupsService.GET /signups/classes: Request received', req.query);
            const { gymId, date } = req.query as { gymId?: string; date?: string };

            if (!gymId || !date) {
                return res.status(400).json(ResponseHelper.error('Gym ID and date are required', 400));
            }

            if (!req.user?.email) {
                return res.status(400).json(ResponseHelper.error('User email not found', 400));
            }

            // Verify user is a member of this gym
            const member = await Member.findOne({
                email: req.user.email,
                gymId: gymId,
                status: 'approved'
            });

            if (!member) {
                return res.status(403).json(ResponseHelper.error('You are not an approved member of this gym', 403));
            }

            // Parse the date string as local date to avoid timezone issues
            const [year, month, day] = date.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
            const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
            const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

            console.log(`signupsService.GET /signups/classes: Looking for classes on ${selectedDate.toDateString()} (${date}) for gym ${gymId}`);

            // Find all classes for this gym
            const classes = await Class.find({ gymId: gymId, isActive: true });
            const classIds = classes.map(c => c._id.toString());

            // Find schedules for these classes on the selected date
            const schedules = await Schedule.find({
                classId: { $in: classIds },
                $or: [
                    // One-time schedules on this date
                    {
                        isRecurring: false,
                        startDateTime: { $gte: dayStart, $lte: dayEnd }
                    },
                    // Recurring schedules that could have instances on this date
                    {
                        isRecurring: true,
                        startDate: { $lte: dayEnd },
                        $or: [
                            { endDate: { $exists: false } },
                            { endDate: null },
                            { endDate: { $gte: dayStart } }
                        ]
                    }
                ]
            });

            console.log(`signupsService.GET /signups/classes: Found ${schedules.length} schedules`);

            // Get all signups for this specific date (not just current user)
            const allSignups = await Signup.find({
                classDate: { $gte: dayStart, $lte: dayEnd },
                status: { $in: ['active', 'done'] }
            }).populate('memberId', 'firstName lastName email phone');

            // Create map for efficient lookup
            const signupsBySchedule = new Map<string, any[]>();

            // Group signups by schedule ID
            allSignups.forEach(signup => {
                const scheduleId = signup.scheduleId.toString();
                if (!signupsBySchedule.has(scheduleId)) {
                    signupsBySchedule.set(scheduleId, []);
                }
                const memberData = signup.memberId as any; // Type assertion for populated data
                signupsBySchedule.get(scheduleId)!.push({
                    _id: signup._id,
                    signupDate: signup.signupDate,
                    classDate: signup.classDate,
                    status: signup.status,
                    member: {
                        _id: memberData._id,
                        firstName: memberData.firstName,
                        lastName: memberData.lastName,
                        email: memberData.email,
                        phone: memberData.phone
                    }
                });
            });

            // Enrich schedules with class, location, and signup info
            const enrichedSchedules = await Promise.all(schedules.map(async (schedule) => {
                const classObj = classes.find(c => c._id.toString() === schedule.classId);
                const location = await Location.findById(schedule.locationId);
                const coach = schedule.coachId ? await Member.findById(schedule.coachId) : null;

                // For recurring schedules, check if they actually occur on the selected date
                let actualStartTime = null;
                let actualEndTime = null;

                if (schedule.isRecurring && schedule.timeOfDay) {
                    // Check if this recurring schedule occurs on the selected day of week
                    const selectedDayOfWeek = selectedDate.getDay(); // 0=Sunday, 1=Monday, etc.

                    // If this is a weekly recurring schedule with specific days
                    if (schedule.recurringPattern?.frequency === 'weekly' &&
                        schedule.recurringPattern?.daysOfWeek &&
                        schedule.recurringPattern.daysOfWeek.length > 0) {

                        // Check if the selected date's day of week is in the schedule's days
                        if (!schedule.recurringPattern.daysOfWeek.includes(selectedDayOfWeek)) {
                            console.log(`signupsService: Skipping schedule ${schedule._id} - not scheduled for day ${selectedDayOfWeek}`);
                            return null; // This schedule doesn't occur on this day
                        }
                    }

                    // Calculate actual time for this date
                    const timeOfDay = new Date(schedule.timeOfDay);
                    actualStartTime = new Date(selectedDate);
                    actualStartTime.setHours(timeOfDay.getHours(), timeOfDay.getMinutes(), 0, 0);

                    if (classObj) {
                        actualEndTime = new Date(actualStartTime.getTime() + classObj.duration * 60000);
                    }
                } else if (!schedule.isRecurring) {
                    actualStartTime = schedule.startDateTime;
                    actualEndTime = schedule.endDateTime;
                }

                return {
                    _id: schedule._id,
                    classId: schedule.classId,
                    locationId: schedule.locationId,
                    coachId: schedule.coachId,
                    isRecurring: schedule.isRecurring,
                    startDateTime: actualStartTime,
                    endDateTime: actualEndTime,
                    maxAttendees: schedule.maxAttendees,
                    notes: schedule.notes,
                    class: classObj ? {
                        _id: classObj._id,
                        name: classObj.name,
                        description: classObj.description,
                        duration: classObj.duration,
                        category: classObj.category
                    } : null,
                    location: location ? {
                        _id: location._id,
                        name: location.name,
                        description: location.description
                    } : null,
                    coach: coach ? {
                        _id: coach._id,
                        firstName: coach.firstName,
                        lastName: coach.lastName
                    } : null,
                    signups: signupsBySchedule.get(schedule._id.toString()) || []
                };
            }));

            // Filter out schedules that don't actually occur on the selected date
            const validSchedules = enrichedSchedules.filter(schedule => {
                // Skip null schedules (recurring schedules that don't occur on this day)
                if (!schedule) return false;
                if (!schedule.startDateTime) return false;
                const scheduleDate = new Date(schedule.startDateTime);
                return scheduleDate >= dayStart && scheduleDate <= dayEnd;
            });

            console.log(`signupsService.GET /signups/classes: Returning ${validSchedules.length} valid classes for ${selectedDate.toDateString()}`);
            res.status(200).json(ResponseHelper.success(validSchedules, 'Classes retrieved successfully'));
        } catch (error) {
            console.error('signupsService.GET /signups/classes error:', error);
            res.status(500).json(ResponseHelper.error('Failed to get classes', 500));
        }
    }
);

// POST /signups/toggle { scheduleId, classDate, memberId?,status? }
router.post(
    '/signups/toggle',
    authenticateUser,
    authorizeRoles('member', 'owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('signupsService.POST /signups/toggle: Request received', req.body);
            console.log('signupsService.POST /signups/toggle: Requesting user email:', req.user?.email);
            const { scheduleId, classDate, status, memberId } = req.body as {
                scheduleId?: string;
                classDate?: string;
                status?: 'active' | 'cancelled' | 'done';
                memberId?: string;
            };

            if (!scheduleId || !classDate) {
                return res.status(400).json(ResponseHelper.error('Schedule ID and class date are required', 400));
            }

            // Validate status if provided
            if (status && !['active', 'cancelled', 'done'].includes(status)) {
                return res.status(400).json(ResponseHelper.error('Invalid status. Must be active, cancelled, or done', 400));
            }

            if (!req.user?.email) {
                return res.status(400).json(ResponseHelper.error('User email not found', 400));
            }

            // Find the schedule and verify it exists
            const schedule = await Schedule.findById(scheduleId);
            if (!schedule) {
                return res.status(404).json(ResponseHelper.error('Schedule not found', 404));
            }

            // Find the class to get gym information
            const classObj = await Class.findById(schedule.classId);
            if (!classObj) {
                return res.status(404).json(ResponseHelper.error('Class not found', 404));
            }

            // Find the requesting member (the one making the request)
            const requestMember = await Member.findOne({
                email: req.user.email,
                gymId: classObj.gymId,
                status: 'approved'
            });

            if (!requestMember) {
                return res.status(403).json(ResponseHelper.error('You are not an approved member of this gym', 403));
            }

            // Determine the target member (the one whose signup status we're changing)
            let statusMember;
            if (memberId) {
                // If memberId is provided, find that specific member
                statusMember = await Member.findOne({
                    _id: memberId,
                    gymId: classObj.gymId,
                    status: 'approved'
                });

                if (!statusMember) {
                    return res.status(404).json(ResponseHelper.error('Target member not found or not approved for this gym', 404));
                }

                // If requesting member is different from target member, check authorization
                if (requestMember._id.toString() !== statusMember._id.toString()) {
                    // Check if requestMember is owner or coach
                    const isOwner = req.user.roles?.includes('owner') || req.user.roles?.includes('root');
                    const isCoach = requestMember.memberType === 'coach';

                    if (!isOwner && !isCoach) {
                        return res.status(403).json(ResponseHelper.error('Only owners and coaches can modify other members\' signups', 403));
                    }
                }
            } else {
                // If no memberId provided, target member is the same as requesting member
                statusMember = requestMember;
            }

            console.log('signupsService.POST /signups/toggle: Request member:', requestMember._id, 'Target member:', statusMember._id);

            // Parse the class date
            const [year, month, day] = classDate.split('-').map(Number);
            const parsedClassDate = new Date(year, month - 1, day);

            // Check if target member has any signup record for this specific date
            const existingSignup = await Signup.findOne({
                memberId: statusMember._id,
                scheduleId: scheduleId,
                classDate: parsedClassDate
            });

            if (existingSignup) {
                // Prevent changes to 'done' status
                if (existingSignup.status === 'done') {
                    return res.status(400).json(ResponseHelper.error('Cannot modify signup that has been checked in (done status)', 400));
                }

                if (status) {
                    // Use the provided status
                    existingSignup.status = status;
                    if (status === 'active') {
                        existingSignup.signupDate = new Date(); // Update signup date when reactivating
                    }
                    await existingSignup.save();
                    console.log(`signupsService.POST /signups/toggle: Updated signup ${existingSignup._id} to status ${status}`);
                    res.status(200).json(ResponseHelper.success({
                        isSignedUp: status === 'active' || status === 'done',
                        status: status
                    }, `Successfully updated signup to ${status}`));
                } else {
                    // Toggle between active and cancelled (original behavior)
                    if (existingSignup.status === 'active') {
                        // User is signed up - toggle to cancelled
                        existingSignup.status = 'cancelled';
                        await existingSignup.save();
                        console.log(`signupsService.POST /signups/toggle: Cancelled signup ${existingSignup._id}`);
                        res.status(200).json(ResponseHelper.success({ isSignedUp: false }, 'Successfully cancelled signup'));
                    } else {
                        // User has cancelled signup - reactivate it
                        existingSignup.status = 'active';
                        existingSignup.signupDate = new Date(); // Update signup date
                        await existingSignup.save();
                        console.log(`signupsService.POST /signups/toggle: Reactivated signup ${existingSignup._id}`);
                        res.status(200).json(ResponseHelper.success({ isSignedUp: true }, 'Successfully signed up for class'));
                    }
                }
            } else {
                // No signup record exists - create new signup
                const newStatus = status || 'active'; // Default to 'active' if no status provided
                const newSignup = new Signup({
                    memberId: statusMember._id,
                    scheduleId: scheduleId,
                    classDate: parsedClassDate,
                    signupDate: new Date(),
                    status: newStatus
                });

                const savedSignup = await newSignup.save();
                console.log(`signupsService.POST /signups/toggle: Created signup ${savedSignup._id} with status ${newStatus}`);
                res.status(201).json(ResponseHelper.created({
                    isSignedUp: newStatus === 'active' || newStatus === 'done',
                    status: newStatus
                }, `Successfully signed up for class with status ${newStatus}`));
            }
        } catch (error) {
            console.error('signupsService.POST /signups/toggle error:', error);
            res.status(500).json(ResponseHelper.error('Failed to toggle signup', 500));
        }
    }
);

// GET /signups/upcoming - get user's upcoming signups (today and future)
router.get(
    '/signups/upcoming',
    authenticateUser,
    authorizeRoles('member', 'owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('signupsService.GET /signups/upcoming: Request received');

            if (!req.user?.email) {
                return res.status(400).json(ResponseHelper.error('User email not found', 400));
            }

            // Find all approved memberships for this user
            const members = await Member.find({
                email: req.user.email,
                status: 'approved'
            });

            if (members.length === 0) {
                return res.status(200).json(ResponseHelper.success([], 'No gym memberships found'));
            }

            const memberIds = members.map(m => m._id);

            // Get today's date at start of day
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Find all active signups for today and future dates
            const upcomingSignups = await Signup.find({
                memberId: { $in: memberIds },
                classDate: { $gte: today },
                status: { $in: ['active', 'done'] }
            }).populate('memberId', 'firstName lastName email phone').sort({ classDate: 1, signupDate: 1 });

            console.log(`signupsService.GET /signups/upcoming: Found ${upcomingSignups.length} upcoming signups`);

            // Enrich with schedule, class, location, and gym details
            const enrichedSignups = await Promise.all(upcomingSignups.map(async (signup) => {
                const schedule = await Schedule.findById(signup.scheduleId);
                if (!schedule) return null;

                const classObj = await Class.findById(schedule.classId);
                if (!classObj) return null;

                const location = await Location.findById(schedule.locationId);
                const gym = await Gym.findById(classObj.gymId);
                const coach = schedule.coachId ? await Member.findById(schedule.coachId) : null;

                // Calculate actual class time for the signup date
                let actualStartTime = null;
                let actualEndTime = null;

                if (schedule.isRecurring && schedule.timeOfDay) {
                    const timeOfDay = new Date(schedule.timeOfDay);
                    actualStartTime = new Date(signup.classDate);
                    actualStartTime.setHours(timeOfDay.getHours(), timeOfDay.getMinutes(), 0, 0);

                    if (classObj) {
                        actualEndTime = new Date(actualStartTime.getTime() + classObj.duration * 60000);
                    }
                } else if (!schedule.isRecurring) {
                    actualStartTime = schedule.startDateTime;
                    actualEndTime = schedule.endDateTime;
                }

                const memberData = signup.memberId as any; // Type assertion for populated data
                return {
                    signup: {
                        _id: signup._id,
                        signupDate: signup.signupDate,
                        classDate: signup.classDate,
                        status: signup.status,
                        member: {
                            _id: memberData._id,
                            firstName: memberData.firstName,
                            lastName: memberData.lastName,
                            email: memberData.email,
                            phone: memberData.phone
                        }
                    },
                    schedule: {
                        _id: schedule._id,
                        startDateTime: actualStartTime,
                        endDateTime: actualEndTime,
                        maxAttendees: schedule.maxAttendees,
                        notes: schedule.notes
                    },
                    class: {
                        _id: classObj._id,
                        name: classObj.name,
                        description: classObj.description,
                        duration: classObj.duration,
                        category: classObj.category
                    },
                    location: location ? {
                        _id: location._id,
                        name: location.name,
                        description: location.description
                    } : null,
                    gym: gym ? {
                        _id: gym._id,
                        name: gym.name
                    } : null,
                    coach: coach ? {
                        _id: coach._id,
                        firstName: coach.firstName,
                        lastName: coach.lastName
                    } : null
                };
            }));

            // Filter out null results and sort by class date/time
            const validSignups = enrichedSignups.filter(signup => signup !== null);

            console.log(`signupsService.GET /signups/upcoming: Returning ${validSignups.length} valid upcoming signups`);
            res.status(200).json(ResponseHelper.success(validSignups, 'Upcoming signups retrieved successfully'));
        } catch (error) {
            console.error('signupsService.GET /signups/upcoming error:', error);
            res.status(500).json(ResponseHelper.error('Failed to get upcoming signups', 500));
        }
    }
);

export { router as signupsRouter };
