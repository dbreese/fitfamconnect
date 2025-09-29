import type { IUser } from '../db/user';
import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Schedule, type ISchedule } from '../db/schedule';
import { Class, type IClass } from '../db/class';
import { Location, type ILocation } from '../db/location';
import { Member, type IMember } from '../db/member';
import { Gym } from '../db/gym';
import { type ServerResponse } from '../../shared/ServerResponse';
import { SchedulingEngine } from './engine';

export const router = Router();
router.use(express.json());

// GET /schedules - Get all schedules for the current user's gym
router.get('/schedules', authenticateUser, authorizeRoles('owner', 'root'), async (req: AuthenticatedRequest, res: Response) => {
    console.log('scheduleService.getSchedules: API invoked');
    const user = req.user;
    const { startDate, endDate } = req.query;

    try {
        let schedules;
        if (startDate && endDate) {
            schedules = await findSchedulesByDateRange(user, startDate as string, endDate as string);
        } else {
            schedules = await findSchedulesByOwner(user);
        }

        console.log(`scheduleService.getSchedules: Retrieved ${schedules.length} schedules for user ${user?._id}`);

        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Schedules retrieved successfully',
                data: schedules
            }
        };
        res.status(200).json(response);
        console.log('scheduleService.getSchedules: Response sent successfully');
    } catch (error) {
        console.error('scheduleService.getSchedules: Error retrieving schedules:', error);
        res.status(500).json({ message: 'Error retrieving schedules' });
    }
});

// GET /schedules/:gymId - Get augmented schedules for a specific gym (available to members and owners)
router.get('/schedules/:gymId', authenticateUser, authorizeRoles('member', 'owner', 'root'), async (req: AuthenticatedRequest, res: Response) => {
    console.log('scheduleService.getAugmentedSchedules: API invoked');
    const user = req.user;
    const { gymId } = req.params;

    try {
        // Verify user has access to this gym
        const member = await Member.findOne({
            email: user?.email,
            gymId: gymId,
            isActive: true
        });

        if (!member) {
            console.log('scheduleService.getAugmentedSchedules: User not authorized for gym', { gymId, email: user?.email });
            return res.status(403).json({ message: 'Access denied to this gym' });
        }

        const schedules = await findAugmentedSchedulesByGym(gymId);

        console.log(`scheduleService.getAugmentedSchedules: Retrieved ${schedules.length} augmented schedules for gym ${gymId}`);

        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Augmented schedules retrieved successfully',
                data: schedules
            }
        };
        res.status(200).json(response);
        console.log('scheduleService.getAugmentedSchedules: Response sent successfully');
    } catch (error) {
        console.error('scheduleService.getAugmentedSchedules: Error retrieving augmented schedules:', error);
        res.status(500).json({ message: 'Error retrieving augmented schedules' });
    }
});

// GET /schedules/:id - Get schedule by ID (if it belongs to user's gym)
router.get(
    '/schedules/:id',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`scheduleService.getSchedule: API invoked with id=${id}`);
        const user = req.user;

        try {
            const schedule = await findScheduleByIdAndOwner(id, user);
            if (!schedule) {
                console.log(`scheduleService.getSchedule: Schedule not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Schedule not found' });
                return;
            }

            console.log(`scheduleService.getSchedule: Retrieved schedule for class ${schedule.classId} with id=${id}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Schedule retrieved successfully',
                    data: schedule
                }
            };
            res.status(200).json(response);
            console.log('scheduleService.getSchedule: Response sent successfully');
        } catch (error) {
            console.error(`scheduleService.getSchedule: Error retrieving schedule with id=${id}:`, error);
            res.status(500).json({ message: 'Error retrieving schedule' });
        }
    }
);

// POST /schedules - Create new schedule for user's gym
router.post(
    '/schedules',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log(`scheduleService.createSchedule: API invoked with payload=${JSON.stringify(req.body)}`);
        const user = req.user;
        const scheduleData = req.body;

        try {
            const newSchedule = await createScheduleForOwner(user, scheduleData);
            if (!newSchedule) {
                console.log(
                    `scheduleService.createSchedule: Failed to create schedule - no gym found for user ${user?._id}`
                );
                res.status(404).json({ message: 'No gym found for user' });
                return;
            }

            console.log(
                `scheduleService.createSchedule: Created schedule for class ${newSchedule.classId} with id=${newSchedule._id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Schedule created successfully',
                    data: newSchedule
                }
            };
            res.status(201).json(response);
            console.log('scheduleService.createSchedule: Response sent successfully');
        } catch (error) {
            console.error(`scheduleService.createSchedule: Error creating schedule:`, error);
            res.status(500).json({ message: 'Error creating schedule' });
        }
    }
);

// PUT /schedules/:id - Update schedule (if it belongs to user's gym)
router.put(
    '/schedules/:id',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(
            `scheduleService.updateSchedule: API invoked with id=${id} and payload=${JSON.stringify(req.body)}`
        );
        const user = req.user;
        const updateData = req.body;

        try {
            const updatedSchedule = await updateScheduleByIdAndOwner(id, user, updateData);
            if (!updatedSchedule) {
                console.log(`scheduleService.updateSchedule: Schedule not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Schedule not found' });
                return;
            }

            console.log(
                `scheduleService.updateSchedule: Updated schedule for class ${updatedSchedule.classId} with id=${id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Schedule updated successfully',
                    data: updatedSchedule
                }
            };
            res.status(200).json(response);
            console.log('scheduleService.updateSchedule: Response sent successfully');
        } catch (error) {
            console.error(`scheduleService.updateSchedule: Error updating schedule with id=${id}:`, error);
            res.status(500).json({ message: 'Error updating schedule' });
        }
    }
);

// DELETE /schedules/:id - Delete schedule (if it belongs to user's gym)
router.delete(
    '/schedules/:id',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`scheduleService.deleteSchedule: API invoked with id=${id}`);
        const user = req.user;

        try {
            const deletedSchedule = await deleteScheduleByIdAndOwner(id, user);
            if (!deletedSchedule) {
                console.log(`scheduleService.deleteSchedule: Schedule not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Schedule not found' });
                return;
            }

            console.log(
                `scheduleService.deleteSchedule: Deleted schedule for class ${deletedSchedule.classId} with id=${id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Schedule deleted successfully',
                    data: deletedSchedule
                }
            };
            res.status(200).json(response);
            console.log('scheduleService.deleteSchedule: Response sent successfully');
        } catch (error) {
            console.error(`scheduleService.deleteSchedule: Error deleting schedule with id=${id}:`, error);
            res.status(500).json({ message: 'Error deleting schedule' });
        }
    }
);



/**
 * Create new schedule for user's gym
 */
async function createScheduleForOwner(
    user: IUser | undefined,
    scheduleData: Partial<ISchedule>
): Promise<ISchedule | null> {
    if (!user) {
        console.log('scheduleService.createScheduleForOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`scheduleService.createScheduleForOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`scheduleService.createScheduleForOwner: Creating schedule for gym ${gym._id}`);

    // Validate that the class belongs to this gym
    const classObj = await Class.findOne({ _id: scheduleData.classId, gymId: gym._id, isActive: true });
    if (!classObj) {
        console.log(
            `scheduleService.createScheduleForOwner: Class ${scheduleData.classId} not found or doesn't belong to gym`
        );
        throw new Error('Class not found or access denied');
    }

    // Validate that the location belongs to this gym
    const location = await Location.findOne({ _id: scheduleData.locationId, gymId: gym._id, isActive: true });
    if (!location) {
        console.log(
            `scheduleService.createScheduleForOwner: Location ${scheduleData.locationId} not found or doesn't belong to gym`
        );
        throw new Error('Location not found or access denied');
    }

    // Calculate end time from class duration for conflict checking
    if (!scheduleData.startDateTime) {
        throw new Error('startDateTime is required');
    }

    if (!scheduleData.locationId) {
        throw new Error('locationId is required');
    }

    const endDateTime = new Date(new Date(scheduleData.startDateTime).getTime() + classObj.duration * 60000);

    // Check for scheduling conflicts (both direct schedules and recurring instances)
    await SchedulingEngine.checkForSchedulingConflicts(scheduleData.locationId, new Date(scheduleData.startDateTime), endDateTime);

    // Remove sensitive fields
    const { createdAt, updatedAt, ...safeScheduleData } = scheduleData;

    const newSchedule = new Schedule(safeScheduleData);
    const savedSchedule = await newSchedule.save();

    console.log(
        `scheduleService.createScheduleForOwner: Created schedule for class ${savedSchedule.classId} with id ${savedSchedule._id}`
    );
    return savedSchedule;
}

/**
 * Find all schedules for the user's gym with class, location, and instructor details
 */
async function findSchedulesByOwner(user: IUser | undefined): Promise<any[]> {
    if (!user) {
        console.log('scheduleService.findSchedulesByOwner: No user provided');
        return [];
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`scheduleService.findSchedulesByOwner: No gym found for user ${user._id}`);
        return [];
    }

    console.log(`scheduleService.findSchedulesByOwner: Looking for schedules in gym ${gym._id} for user ${user._id}`);

    // Find all classes for this gym
    const classes = await Class.find({ gymId: gym._id, isActive: true });
    const classIds = classes.map((c) => c._id);

    // Find all schedules for these classes
    const schedules = await Schedule.find({ classId: { $in: classIds } }).sort({ startDateTime: 1 });

    // For the general list view, we'll show the original recurring schedules
    // The calendar view will use findSchedulesByDateRange which expands recurring instances
    const enrichedSchedules = await Promise.all(
        schedules.map(async (schedule) => {
            // Get class details
            const classObj = classes.find((c) => c._id.toString() === schedule.classId.toString());

            // Get location details
            const location = await Location.findById(schedule.locationId);

            // Get coach details
            const coach = schedule.coachId ? await Member.findById(schedule.coachId) : null;

            return {
                ...(schedule.toObject ? schedule.toObject() : schedule),
                class: classObj
                    ? {
                          _id: classObj._id,
                          name: classObj.name,
                          description: classObj.description,
                          duration: classObj.duration,
                          category: classObj.category,
                          maxMembers: classObj.maxMembers
                      }
                    : null,
                location: location
                    ? {
                          _id: location._id,
                          name: location.name,
                          description: location.description
                      }
                    : null,
                coach: coach
                    ? {
                          _id: coach._id,
                          firstName: coach.firstName,
                          lastName: coach.lastName,
                          email: coach.email
                      }
                    : null
            };
        })
    );

    console.log(
        `scheduleService.findSchedulesByOwner: Found ${enrichedSchedules.length} schedules for gym ${gym.name}`
    );
    return enrichedSchedules;
}

/**
 * Find all active schedules for a specific gym with augmented data (location, coach, class details)
 * Available to both members and owners
 */
async function findAugmentedSchedulesByGym(gymId: string): Promise<any[]> {
    console.log(`scheduleService.findAugmentedSchedulesByGym: Looking for schedules in gym ${gymId}`);

    // Find all classes for this gym
    const classes = await Class.find({ gymId: gymId, isActive: true });
    const classIds = classes.map((c) => c._id);

    if (classIds.length === 0) {
        console.log(`scheduleService.findAugmentedSchedulesByGym: No active classes found for gym ${gymId}`);
        return [];
    }

    // Find all schedules for these classes
    const schedules = await Schedule.find({ classId: { $in: classIds } }).sort({
        isRecurring: 1,
        startDateTime: 1,
        startDate: 1
    });

    // Enrich schedules with location, coach, and class details
    const augmentedSchedules = await Promise.all(
        schedules.map(async (schedule) => {
            // Get class details
            const classObj = classes.find((c) => c._id.toString() === schedule.classId.toString());

            // Get location details
            const location = await Location.findById(schedule.locationId);

            // Get coach details
            const coach = schedule.coachId ? await Member.findById(schedule.coachId) : null;

            return {
                _id: schedule._id,
                classId: schedule.classId,
                locationId: schedule.locationId,
                coachId: schedule.coachId,
                startDateTime: schedule.startDateTime,
                endDate: schedule.endDate,
                maxAttendees: schedule.maxAttendees,
                notes: schedule.notes,
                recurringPattern: schedule.recurringPattern,
                isRecurring: schedule.isRecurring,
                createdAt: schedule.createdAt,
                updatedAt: schedule.updatedAt,
                // Augmented data
                class: classObj
                    ? {
                          _id: classObj._id,
                          name: classObj.name,
                          description: classObj.description,
                          duration: classObj.duration,
                          category: classObj.category,
                          maxMembers: classObj.maxMembers,
                          equipment: classObj.equipment
                      }
                    : null,
                location: location
                    ? {
                          _id: location._id,
                          name: location.name,
                          description: location.description,
                          maxMemberCount: location.maxMemberCount,
                      }
                    : null,
                coach: coach
                    ? {
                          _id: coach._id,
                          firstName: coach.firstName,
                          lastName: coach.lastName,
                          email: coach.email,
                      }
                    : null
            };
        })
    );

    console.log(
        `scheduleService.findAugmentedSchedulesByGym: Found ${augmentedSchedules.length} augmented schedules for gym ${gymId}`
    );
    return augmentedSchedules;
}


/**
 * Find schedules by date range for the user's gym
 */
async function findSchedulesByDateRange(user: IUser | undefined, startDate: string, endDate: string): Promise<any[]> {
    if (!user) {
        console.log('scheduleService.findSchedulesByDateRange: No user provided');
        return [];
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`scheduleService.findSchedulesByDateRange: No gym found for user ${user._id}`);
        return [];
    }

    console.log(
        `scheduleService.findSchedulesByDateRange: Looking for schedules in gym ${gym._id} between ${startDate} and ${endDate}`
    );

    // Find all classes for this gym
    const classes = await Class.find({ gymId: gym._id, isActive: true });
    const classIds = classes.map((c) => c._id);
    console.log(
        `Found ${classes.length} classes for gym ${gym._id}:`,
        classes.map((c) => ({ id: c._id, name: c.name }))
    );

    console.log('findSchedulesByDateRange: Class IDs for query', {
        classIds: classIds.map((id) => id.toString()),
        classIdsType: classIds.map((id) => typeof id)
    });

    // Find schedules in date range
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Extend end date to include the entire day (23:59:59)
    const extendedEndDateObj = new Date(endDateObj);
    extendedEndDateObj.setHours(23, 59, 59, 999);

    console.log('findSchedulesByDateRange: Date range', {
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        extendedEndDate: extendedEndDateObj.toISOString()
    });

    // Get all schedules that could potentially have instances in this date range
    const query = {
        classId: { $in: classIds.map((id) => id.toString()) },
        $or: [
            // Direct schedules in the date range (use extended end date to include full day)
            {
                isRecurring: false,
                startDateTime: { $gte: startDateObj, $lte: extendedEndDateObj }
            },
            // Recurring schedules that could generate instances in this range
            {
                isRecurring: true,
                startDateTime: { $lte: endDateObj },
                $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: startDateObj } }]
            }
        ]
    };

    console.log('findSchedulesByDateRange: Database query', {
        classIds: classIds.map((id) => id.toString()),
        startDateObj: startDateObj.toISOString(),
        endDateObj: endDateObj.toISOString(),
        query: JSON.stringify(query, null, 2)
    });

    // First, let's see what schedules exist for all classes
    const allSchedulesForClasses = await Schedule.find({ classId: { $in: classIds.map((id) => id.toString()) } });
    console.log('findSchedulesByDateRange: All schedules for all classes', {
        count: allSchedulesForClasses.length,
        schedules: allSchedulesForClasses.map((s) => ({
            id: s._id,
            isRecurring: s.isRecurring,
            startDateTime: s.startDateTime?.toISOString(),
            classId: s.classId,
            recurringPattern: s.recurringPattern,
            endDate: s.endDate?.toISOString()
        }))
    });

    // Test the query step by step
    console.log('findSchedulesByDateRange: Testing query components...');

    // Test 1: Just find recurring schedules for this class
    const recurringSchedules = await Schedule.find({
        classId: '68be2b9f7f0bac2dc28348f1',
        isRecurring: true
    });
    console.log('findSchedulesByDateRange: Recurring schedules for class', {
        count: recurringSchedules.length,
        schedules: recurringSchedules.map((s) => ({
            id: s._id,
            startDateTime: s.startDateTime?.toISOString(),
            endDate: s.endDate?.toISOString()
        }))
    });

    // Test 2: Test the date condition
    const dateTestSchedules = await Schedule.find({
        classId: '68be2b9f7f0bac2dc28348f1',
        isRecurring: true,
        startDateTime: { $lte: endDateObj }
    });
    console.log('findSchedulesByDateRange: Date condition test', {
        count: dateTestSchedules.length,
        endDateObj: endDateObj.toISOString()
    });

    const schedules = await Schedule.find(query).sort({ startDateTime: 1 });

    console.log('findSchedulesByDateRange: Found schedules from database', {
        count: schedules.length,
        schedules: schedules.map((s) => ({
            id: s._id,
            isRecurring: s.isRecurring,
            startDateTime: s.startDateTime?.toISOString(),
            classId: s.classId
        }))
    });

    // First enrich all schedules with class, location, and instructor details
    const enrichedSchedules = await Promise.all(
        schedules.map(async (schedule) => {
            // Get class details
            const classObj = classes.find((c) => c._id.toString() === schedule.classId.toString());
            console.log(
                `Schedule ${schedule._id}: classId=${schedule.classId} (type: ${typeof schedule.classId}), found class:`,
                classObj ? classObj.name : 'null'
            );

            // Get location details
            const location = await Location.findById(schedule.locationId);

            // Get coach details
            const coach = schedule.coachId ? await Member.findById(schedule.coachId) : null;

            return {
                ...(schedule.toObject ? schedule.toObject() : schedule),
                class: classObj
                    ? {
                          _id: classObj._id,
                          name: classObj.name,
                          description: classObj.description,
                          duration: classObj.duration,
                          category: classObj.category,
                          maxMembers: classObj.maxMembers
                      }
                    : null,
                location: location
                    ? {
                          _id: location._id,
                          name: location.name,
                          description: location.description
                      }
                    : null,
                coach: coach
                    ? {
                          _id: coach._id,
                          firstName: coach.firstName,
                          lastName: coach.lastName,
                          email: coach.email
                      }
                    : null
            };
        })
    );

    // Now filter and expand recurring schedules to show only active instances in date range
    const activeSchedules = [];

    for (const schedule of enrichedSchedules) {
        if (schedule.isRecurring && schedule.recurringPattern) {
            // Check if this recurring schedule has any active instances in the date range
            const activeInstances = SchedulingEngine.getActiveRecurringInstances(schedule, startDateObj, endDateObj);
            activeSchedules.push(...activeInstances);
        } else {
            // Direct schedule - already in date range
            activeSchedules.push(schedule);
        }
    }

    console.log(
        `scheduleService.findSchedulesByDateRange: Found ${activeSchedules.length} active schedules for gym ${gym.name}`
    );
    return activeSchedules;
}

/**
 * Find schedule by ID if it belongs to user's gym
 */
async function findScheduleByIdAndOwner(scheduleId: string, user: IUser | undefined): Promise<any | null> {
    if (!user) {
        console.log('scheduleService.findScheduleByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`scheduleService.findScheduleByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`scheduleService.findScheduleByIdAndOwner: Looking for schedule ${scheduleId} in gym ${gym._id}`);

    // Find the schedule
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
        console.log(`scheduleService.findScheduleByIdAndOwner: Schedule not found`);
        return null;
    }

    // Verify the class belongs to user's gym
    const classObj = await Class.findOne({ _id: schedule.classId, gymId: gym._id, isActive: true });
    if (!classObj) {
        console.log(`scheduleService.findScheduleByIdAndOwner: Schedule doesn't belong to user's gym`);
        return null;
    }

    // Enrich with class, location, and coach details
    const location = await Location.findById(schedule.locationId);
    const coach = schedule.coachId ? await Member.findById(schedule.coachId) : null;

    const enrichedSchedule = {
        ...schedule.toObject(),
        class: {
            _id: classObj._id,
            name: classObj.name,
            description: classObj.description,
            duration: classObj.duration,
            category: classObj.category,
            maxMembers: classObj.maxMembers
        },
        location: location
            ? {
                  _id: location._id,
                  name: location.name,
                  description: location.description
              }
            : null,
        coach: coach
            ? {
                  _id: coach._id,
                  firstName: coach.firstName,
                  lastName: coach.lastName,
                  email: coach.email
              }
            : null
    };

    console.log(`scheduleService.findScheduleByIdAndOwner: Found schedule for class "${classObj.name}"`);
    return enrichedSchedule;
}

/**
 * Update schedule by ID if it belongs to user's gym
 */
async function updateScheduleByIdAndOwner(
    scheduleId: string,
    user: IUser | undefined,
    updateData: Partial<ISchedule>
): Promise<ISchedule | null> {
    if (!user) {
        console.log('scheduleService.updateScheduleByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`scheduleService.updateScheduleByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Find the schedule
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
        console.log(`scheduleService.updateScheduleByIdAndOwner: Schedule not found`);
        return null;
    }

    // Verify the class belongs to user's gym
    const classObj = await Class.findOne({ _id: schedule.classId, gymId: gym._id, isActive: true });
    if (!classObj) {
        console.log(`scheduleService.updateScheduleByIdAndOwner: Schedule doesn't belong to user's gym`);
        return null;
    }

    console.log(`scheduleService.updateScheduleByIdAndOwner: Updating schedule ${scheduleId} for gym ${gym._id}`);

    // Remove fields that shouldn't be updated
    const { createdAt, updatedAt, ...safeUpdateData } = updateData;

    // Handle coachId removal explicitly
    console.log(`scheduleService.updateScheduleByIdAndOwner: Raw update data:`, safeUpdateData);

    // If coachId is explicitly undefined, we need to unset it
    const mongoUpdate: any = { $set: {} };

    Object.keys(safeUpdateData).forEach(key => {
        const value = safeUpdateData[key as keyof typeof safeUpdateData];
        if (key === 'coachId' && (value === undefined || value === null || value === '' || value === '__REMOVE__')) {
            // Explicitly unset coachId field
            if (!mongoUpdate.$unset) mongoUpdate.$unset = {};
            mongoUpdate.$unset.coachId = 1;
            console.log(`scheduleService.updateScheduleByIdAndOwner: Will unset coachId (value was: ${value})`);
        } else if (key === 'endDate' && value === undefined) {
            // Explicitly unset end date field when it is undefined
            if (!mongoUpdate.$unset) mongoUpdate.$unset = {};
            mongoUpdate.$unset[key] = 1;
            console.log(`scheduleService.updateScheduleByIdAndOwner: Will unset ${key} (value was: ${value})`);
        } else if (value !== undefined && value !== null && value !== '__REMOVE__') {
            mongoUpdate.$set[key] = value;
        }
    });

    // Clean up empty $set
    if (Object.keys(mongoUpdate.$set).length === 0) {
        delete mongoUpdate.$set;
    }

    console.log(`scheduleService.updateScheduleByIdAndOwner: MongoDB update query:`, mongoUpdate);

    // Check for conflicts if startDateTime or locationId is being updated
    if (mongoUpdate.$set && (mongoUpdate.$set.startDateTime || mongoUpdate.$set.locationId)) {
        const newStartDateTime = mongoUpdate.$set.startDateTime || schedule.startDateTime;
        const newLocationId = mongoUpdate.$set.locationId || schedule.locationId;

        if (newStartDateTime && newLocationId) {
            // Calculate end time from class duration for conflict checking
            const endDateTime = new Date(new Date(newStartDateTime).getTime() + classObj.duration * 60000);

            // Check for conflicts, but exclude the current schedule being updated
            try {
                await SchedulingEngine.checkForSchedulingConflictsExcluding(newLocationId, new Date(newStartDateTime), endDateTime, scheduleId);
            } catch (error) {
                console.log(`scheduleService.updateScheduleByIdAndOwner: Conflict detected during update: ${error}`);
                throw error;
            }
        }
    }

    const updatedSchedule = await Schedule.findByIdAndUpdate(scheduleId, mongoUpdate, {
        new: true,
        runValidators: true
    });

    if (updatedSchedule) {
        console.log(`scheduleService.updateScheduleByIdAndOwner: Successfully updated schedule`);
    }

    return updatedSchedule;
}

/**
 * Delete schedule by ID if it belongs to user's gym
 */
async function deleteScheduleByIdAndOwner(scheduleId: string, user: IUser | undefined): Promise<ISchedule | null> {
    if (!user) {
        console.log('scheduleService.deleteScheduleByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`scheduleService.deleteScheduleByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Find the schedule
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
        console.log(`scheduleService.deleteScheduleByIdAndOwner: Schedule not found`);
        return null;
    }

    // Verify the class belongs to user's gym
    const classObj = await Class.findOne({ _id: schedule.classId, gymId: gym._id, isActive: true });
    if (!classObj) {
        console.log(`scheduleService.deleteScheduleByIdAndOwner: Schedule doesn't belong to user's gym`);
        return null;
    }

    console.log(`scheduleService.deleteScheduleByIdAndOwner: Deleting schedule ${scheduleId} for gym ${gym._id}`);

    const deletedSchedule = await Schedule.findByIdAndDelete(scheduleId);

    if (deletedSchedule) {
        console.log(`scheduleService.deleteScheduleByIdAndOwner: Successfully deleted schedule`);
    }

    return deletedSchedule;
}
