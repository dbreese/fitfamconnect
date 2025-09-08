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

export const router = Router();
router.use(express.json());

// GET /schedules - Get all schedules for the current user's gym
router.get('/schedules', authenticateUser, authorizeRoles('user'), async (req: AuthenticatedRequest, res: Response) => {
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

// GET /schedules/:id - Get schedule by ID (if it belongs to user's gym)
router.get(
    '/schedules/:id',
    authenticateUser,
    authorizeRoles('user'),
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
    authorizeRoles('user'),
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
    authorizeRoles('user'),
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
    authorizeRoles('user'),
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

    // Calculate end time if not provided
    const endDateTime =
        scheduleData.endDateTime ||
        new Date(new Date(scheduleData.startDateTime!).getTime() + classObj.duration * 60000);

    // Check for scheduling conflicts
    const conflictingSchedule = await Schedule.findOne({
        locationId: scheduleData.locationId,
        startDateTime: { $lt: endDateTime },
        endDateTime: { $gt: scheduleData.startDateTime }
    });

    if (conflictingSchedule) {
        console.log(`scheduleService.createScheduleForOwner: Scheduling conflict detected`);
        throw new Error('Scheduling conflict: Another class is already scheduled at this time and location');
    }

    // Remove sensitive fields
    const { createdAt, updatedAt, ...safeScheduleData } = scheduleData;
    const newScheduleData = {
        ...safeScheduleData,
        endDateTime
    };

    const newSchedule = new Schedule(newScheduleData);
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

            // Get instructor details
            const instructor = schedule.instructorId ? await Member.findById(schedule.instructorId) : null;

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
                instructor: instructor
                    ? {
                          _id: instructor._id,
                          firstName: instructor.firstName,
                          lastName: instructor.lastName,
                          email: instructor.email
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
 * Get active recurring instances for a schedule within a date range
 */
function getActiveRecurringInstances(schedule: any, startDate: Date, endDate: Date): any[] {
    const instances = [];
    const pattern = schedule.recurringPattern;
    const originalStart = new Date(schedule.startDateTime);
    const originalEnd = schedule.endDateTime ? new Date(schedule.endDateTime) : null;

    // Calculate duration in milliseconds
    const duration = originalEnd ? originalEnd.getTime() - originalStart.getTime() : 0;

    let currentDate = new Date(originalStart);

    // Move to the start of the date range if the original date is before it
    while (currentDate < startDate) {
        currentDate = getNextRecurrenceDate(currentDate, pattern, originalStart);
    }

    // Generate instances until we exceed the end date or the recurring end date
    while (currentDate <= endDate) {
        // Check if we've exceeded the recurring end date
        if (pattern.endDate && currentDate > new Date(pattern.endDate)) {
            break;
        }

        // Create instance with adjusted times but keep original schedule ID
        const instanceStart = new Date(currentDate);
        const instanceEnd = originalEnd ? new Date(instanceStart.getTime() + duration) : null;

        instances.push({
            ...(schedule.toObject ? schedule.toObject() : schedule),
            startDateTime: instanceStart,
            endDateTime: instanceEnd,
            isRecurringInstance: true,
            // Preserve class data if it exists
            class: schedule.class || null,
            location: schedule.location || null,
            instructor: schedule.instructor || null
        });

        // Move to next occurrence
        currentDate = getNextRecurrenceDate(currentDate, pattern, originalStart);
    }

    return instances;
}

/**
 * Get the next recurrence date based on the pattern
 */
function getNextRecurrenceDate(currentDate: Date, pattern: any, originalStart: Date): Date {
    const nextDate = new Date(currentDate);

    switch (pattern.frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + pattern.interval);
            break;

        case 'weekly':
            if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
                // Find next occurrence on one of the specified days
                let found = false;
                for (let i = 0; i < 7; i++) {
                    nextDate.setDate(nextDate.getDate() + 1);
                    if (pattern.daysOfWeek.includes(nextDate.getDay())) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // If no day found in the next 7 days, go to the next week
                    nextDate.setDate(nextDate.getDate() + 7 * pattern.interval);
                }
            } else {
                nextDate.setDate(nextDate.getDate() + 7 * pattern.interval);
            }
            break;

        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + pattern.interval);
            break;

        default:
            nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
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

    // Find schedules in date range
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Get all schedules that could potentially have instances in this date range
    const schedules = await Schedule.find({
        classId: { $in: classIds },
        $or: [
            // Direct schedules in the date range
            {
                startDateTime: { $gte: startDateObj, $lte: endDateObj }
            },
            // Recurring schedules that could generate instances in this range
            {
                isRecurring: true,
                startDateTime: { $lte: endDateObj },
                $or: [
                    { 'recurringPattern.endDate': { $exists: false } },
                    { 'recurringPattern.endDate': { $gte: startDateObj } }
                ]
            }
        ]
    }).sort({ startDateTime: 1 });

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

            // Get instructor details
            const instructor = schedule.instructorId ? await Member.findById(schedule.instructorId) : null;

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
                instructor: instructor
                    ? {
                          _id: instructor._id,
                          firstName: instructor.firstName,
                          lastName: instructor.lastName,
                          email: instructor.email
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
            const activeInstances = getActiveRecurringInstances(schedule, startDateObj, endDateObj);
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

    // Enrich with class, location, and instructor details
    const location = await Location.findById(schedule.locationId);
    const instructor = schedule.instructorId ? await Member.findById(schedule.instructorId) : null;

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
        instructor: instructor
            ? {
                  _id: instructor._id,
                  firstName: instructor.firstName,
                  lastName: instructor.lastName,
                  email: instructor.email
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

    const updatedSchedule = await Schedule.findByIdAndUpdate(scheduleId, safeUpdateData, {
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
