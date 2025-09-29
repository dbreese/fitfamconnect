import { Schedule, type ISchedule } from '../db/schedule';
import { Class, type IClass } from '../db/class';

/**
 * Scheduling Engine - Handles schedule conflict detection and validation
 */
export class SchedulingEngine {
    /**
     * Validate a new schedule for conflicts according to SCHEDULING.md rules
     * This is the main validation function that handles both 1-time and recurring schedules
     */
    static async validateNewSchedule(
        locationId: string,
        startDateTime: Date,
        classDurationMinutes: number,
        recurringPattern?: {
            frequency: 'daily' | 'weekly' | 'monthly';
            interval: number;
            daysOfWeek?: number[];
        },
        endDate?: Date
    ): Promise<void> {
        console.log(`SchedulingEngine.validateNewSchedule: Validating new schedule`);
        console.log(`  Location: ${locationId}`);
        console.log(`  Start: ${startDateTime.toISOString()}`);
        console.log(`  Duration: ${classDurationMinutes} minutes`);
        console.log(`  Recurring: ${recurringPattern ? 'Yes' : 'No'}`);
        if (recurringPattern) {
            console.log(`  Pattern: ${recurringPattern.frequency}, interval: ${recurringPattern.interval}`);
            if (recurringPattern.daysOfWeek) {
                console.log(`  Days: ${recurringPattern.daysOfWeek.join(', ')}`);
            }
        }
        if (endDate) {
            console.log(`  End Date: ${endDate.toISOString()}`);
        }

        if (!recurringPattern) {
            // For 1-time schedules, just check this specific date/time
            const endDateTime = new Date(startDateTime.getTime() + classDurationMinutes * 60000);
            await this.checkForSchedulingConflicts(locationId, startDateTime, endDateTime);
        } else {
            // For recurring schedules, generate all instances and check each one
            await this.validateRecurringSchedule(locationId, startDateTime, classDurationMinutes, recurringPattern, endDate);
        }

        console.log(`SchedulingEngine.validateNewSchedule: Validation passed - no conflicts found`);
    }

    /**
     * Validate a recurring schedule by checking all its instances for conflicts
     */
    private static async validateRecurringSchedule(
        locationId: string,
        startDateTime: Date,
        classDurationMinutes: number,
        recurringPattern: {
            frequency: 'daily' | 'weekly' | 'monthly';
            interval: number;
            daysOfWeek?: number[];
        },
        endDate?: Date
    ): Promise<void> {
        console.log(`SchedulingEngine.validateRecurringSchedule: Validating recurring schedule`);

        // For validation, check conflicts for a reasonable period (1 year if no end date)
        const validationEndDate = endDate || new Date(startDateTime.getTime() + 365 * 24 * 60 * 60 * 1000);

        // Create a temporary schedule object to generate instances
        const tempSchedule = {
            _id: 'temp-validation',
            isRecurring: true,
            startDateTime: startDateTime,
            endDate: endDate,
            recurringPattern: recurringPattern,
            class: { duration: classDurationMinutes }
        };

        // Generate all instances for the recurring schedule
        const instances = this.getActiveRecurringInstances(tempSchedule, startDateTime, validationEndDate);

        console.log(`SchedulingEngine.validateRecurringSchedule: Generated ${instances.length} instances to validate`);

        // Check each instance for conflicts
        for (const instance of instances) {
            const instanceStart = new Date(instance.startDateTime);
            const instanceEnd = new Date(instanceStart.getTime() + classDurationMinutes * 60000);

            console.log(`SchedulingEngine.validateRecurringSchedule: Checking instance ${instanceStart.toISOString()}`);

            try {
                await this.checkForSchedulingConflicts(locationId, instanceStart, instanceEnd);
            } catch (error) {
                // Add more context to the error for recurring schedules
                const conflictDate = instanceStart.toLocaleDateString();
                const conflictTime = instanceStart.toLocaleTimeString();
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Recurring schedule conflict on ${conflictDate} at ${conflictTime}: ${errorMessage}`);
            }
        }

        console.log(`SchedulingEngine.validateRecurringSchedule: All ${instances.length} instances validated successfully`);
    }
    /**
     * Check for scheduling conflicts including recurring schedule instances
     */
    static async checkForSchedulingConflicts(
        locationId: string,
        startDateTime: Date,
        endDateTime: Date
    ): Promise<void> {
        console.log(`SchedulingEngine.checkForSchedulingConflicts: Checking conflicts for location ${locationId} from ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);

        // Check for direct schedule conflicts (non-recurring schedules)
        const directConflict = await Schedule.findOne({
            locationId: locationId,
            isRecurring: false,
            startDateTime: {
                $lt: endDateTime,
                $gte: new Date(startDateTime.getTime() - 60 * 60 * 1000) // Check 1 hour before to account for class duration
            }
        });

        if (directConflict) {
            console.log(`SchedulingEngine.checkForSchedulingConflicts: Direct conflict detected with schedule ${directConflict._id}`);
            throw new Error('Scheduling conflict: Another class is already scheduled at this time and location');
        }

        // Check for recurring schedule conflicts
        const dayStart = new Date(startDateTime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(startDateTime);
        dayEnd.setHours(23, 59, 59, 999);

        // Find all recurring schedules that could generate instances on this day
        const recurringSchedules = await Schedule.find({
            locationId: locationId,
            isRecurring: true,
            startDateTime: { $lte: dayEnd }, // Schedule started before or on this day
            $or: [
                { endDate: { $exists: false } }, // No end date
                { endDate: null }, // No end date
                { endDate: { $gte: dayStart } } // End date is after or on this day
            ]
        }).populate('classId');

        console.log(`SchedulingEngine.checkForSchedulingConflicts: Found ${recurringSchedules.length} recurring schedules to check`);

        // Check each recurring schedule for conflicts
        for (const recurringSchedule of recurringSchedules) {
            const instances = this.getActiveRecurringInstances(recurringSchedule, dayStart, dayEnd);

            for (const instance of instances) {
                if (!instance.startDateTime) continue;

                const instanceStart = new Date(instance.startDateTime);

                // Calculate instance end time from class duration
                let instanceEnd = instanceStart;
                if (instance.class && instance.class.duration) {
                    instanceEnd = new Date(instanceStart.getTime() + instance.class.duration * 60000);
                } else {
                    // Default to 60 minutes if no duration specified
                    instanceEnd = new Date(instanceStart.getTime() + 60 * 60 * 1000);
                }

                // Check if this instance conflicts with the new schedule
                const hasConflict = instanceStart < endDateTime && instanceEnd > startDateTime;

                if (hasConflict) {
                    console.log(`SchedulingEngine.checkForSchedulingConflicts: Recurring instance conflict detected`);
                    console.log(`  Instance: ${instanceStart.toISOString()} - ${instanceEnd.toISOString()}`);
                    console.log(`  New schedule: ${startDateTime.toISOString()} - ${endDateTime.toISOString()}`);
                    throw new Error('Scheduling conflict: A recurring class instance is already scheduled at this time and location');
                }
            }
        }

        console.log(`SchedulingEngine.checkForSchedulingConflicts: No conflicts found`);
    }

    /**
     * Check for scheduling conflicts including recurring schedule instances, excluding a specific schedule
     */
    static async checkForSchedulingConflictsExcluding(
        locationId: string,
        startDateTime: Date,
        endDateTime: Date,
        excludeScheduleId: string
    ): Promise<void> {
        console.log(`SchedulingEngine.checkForSchedulingConflictsExcluding: Checking conflicts for location ${locationId} from ${startDateTime.toISOString()} to ${endDateTime.toISOString()}, excluding ${excludeScheduleId}`);

        // Check for direct schedule conflicts (non-recurring schedules)
        const directConflict = await Schedule.findOne({
            _id: { $ne: excludeScheduleId }, // Exclude the current schedule
            locationId: locationId,
            isRecurring: false,
            startDateTime: {
                $lt: endDateTime,
                $gte: new Date(startDateTime.getTime() - 60 * 60 * 1000) // Check 1 hour before to account for class duration
            }
        });

        if (directConflict) {
            console.log(`SchedulingEngine.checkForSchedulingConflictsExcluding: Direct conflict detected with schedule ${directConflict._id}`);
            throw new Error('Scheduling conflict: Another class is already scheduled at this time and location');
        }

        // Check for recurring schedule conflicts
        const dayStart = new Date(startDateTime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(startDateTime);
        dayEnd.setHours(23, 59, 59, 999);

        // Find all recurring schedules that could generate instances on this day
        const recurringSchedules = await Schedule.find({
            _id: { $ne: excludeScheduleId }, // Exclude the current schedule
            locationId: locationId,
            isRecurring: true,
            startDateTime: { $lte: dayEnd }, // Schedule started before or on this day
            $or: [
                { endDate: { $exists: false } }, // No end date
                { endDate: null }, // No end date
                { endDate: { $gte: dayStart } } // End date is after or on this day
            ]
        }).populate('classId');

        console.log(`SchedulingEngine.checkForSchedulingConflictsExcluding: Found ${recurringSchedules.length} recurring schedules to check`);

        // Check each recurring schedule for conflicts
        for (const recurringSchedule of recurringSchedules) {
            const instances = this.getActiveRecurringInstances(recurringSchedule, dayStart, dayEnd);

            for (const instance of instances) {
                if (!instance.startDateTime) continue;

                const instanceStart = new Date(instance.startDateTime);

                // Calculate instance end time from class duration
                let instanceEnd = instanceStart;
                if (instance.class && instance.class.duration) {
                    instanceEnd = new Date(instanceStart.getTime() + instance.class.duration * 60000);
                } else {
                    // Default to 60 minutes if no duration specified
                    instanceEnd = new Date(instanceStart.getTime() + 60 * 60 * 1000);
                }

                // Check if this instance conflicts with the new schedule
                const hasConflict = instanceStart < endDateTime && instanceEnd > startDateTime;

                if (hasConflict) {
                    console.log(`SchedulingEngine.checkForSchedulingConflictsExcluding: Recurring instance conflict detected`);
                    console.log(`  Instance: ${instanceStart.toISOString()} - ${instanceEnd.toISOString()}`);
                    console.log(`  New schedule: ${startDateTime.toISOString()} - ${endDateTime.toISOString()}`);
                    throw new Error('Scheduling conflict: A recurring class instance is already scheduled at this time and location');
                }
            }
        }

        console.log(`SchedulingEngine.checkForSchedulingConflictsExcluding: No conflicts found`);
    }

    /**
     * Generate active recurring instances for a schedule within a date range
     */
    static getActiveRecurringInstances(schedule: any, startDate: Date, endDate: Date): any[] {
        if (!schedule.isRecurring || !schedule.recurringPattern) {
            return [];
        }

        const instances: any[] = [];
        const pattern = schedule.recurringPattern;
        const scheduleStartDateTime = new Date(schedule.startDateTime);
        const scheduleEndDate = schedule.endDate ? new Date(schedule.endDate) : null;

        // Get class data for duration calculation
        const classObj = schedule.classId || schedule.class;
        const duration = classObj && classObj.duration ? classObj.duration : 60; // Default 60 minutes

        console.log(`SchedulingEngine.getActiveRecurringInstances: Processing recurring schedule ${schedule._id}`);
        console.log(`  Pattern: ${pattern.frequency}, interval: ${pattern.interval}`);
        console.log(`  Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        console.log(`  Schedule start: ${scheduleStartDateTime.toISOString()}`);
        console.log(`  Schedule end: ${scheduleEndDate ? scheduleEndDate.toISOString() : 'No end date'}`);

        // Find the first occurrence within our date range
        let currentDate = this.findFirstOccurrence(scheduleStartDateTime, pattern, startDate, endDate);
        if (!currentDate) {
            console.log(`SchedulingEngine.getActiveRecurringInstances: No occurrences found in date range`);
            return instances;
        }

        let iterationCount = 0;
        const maxIterations = 1000; // Safety limit

        while (currentDate <= endDate && iterationCount < maxIterations) {
            iterationCount++;

            // Check if this occurrence is before the schedule's end date (if any)
            if (scheduleEndDate && currentDate > scheduleEndDate) {
                console.log(`SchedulingEngine.getActiveRecurringInstances: Occurrence ${currentDate.toISOString()} is after schedule end date`);
                break;
            }

            // For weekly schedules, check if this day is in the allowed days
            if (pattern.frequency === 'weekly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
                const dayOfWeek = currentDate.getDay();
                if (!pattern.daysOfWeek.includes(dayOfWeek)) {
                    console.log(`SchedulingEngine.getActiveRecurringInstances: Skipping ${currentDate.toISOString()} - day ${dayOfWeek} not in allowed days`);
                    currentDate = this.getNextRecurrenceDate(currentDate, pattern, scheduleStartDateTime);
                    continue;
                }
            }

            // Create instance with adjusted times but keep original schedule ID
            const instanceStart = new Date(currentDate);
            instanceStart.setHours(scheduleStartDateTime.getHours(), scheduleStartDateTime.getMinutes(), 0, 0);

            const instanceEnd = new Date(instanceStart.getTime() + duration * 60000);

            console.log(`SchedulingEngine.getActiveRecurringInstances: Generated instance ${instanceStart.toISOString()} - ${instanceEnd.toISOString()}`);

            instances.push({
                ...(schedule.toObject ? schedule.toObject() : schedule),
                startDateTime: instanceStart,
                isRecurring: false, // Individual instances are not recurring
                isRecurringInstance: true,
                // Preserve class data if it exists
                class: schedule.class || null,
                location: schedule.location || null,
                coach: schedule.coach || null
            });

            // Move to next occurrence
            currentDate = this.getNextRecurrenceDate(currentDate, pattern, scheduleStartDateTime);
        }

        console.log(`SchedulingEngine.getActiveRecurringInstances: Generated ${instances.length} instances`);
        return instances;
    }

    /**
     * Find the first occurrence of a recurring schedule within a date range
     */
    static findFirstOccurrence(scheduleStartDate: Date, pattern: any, startDate: Date, endDate: Date): Date | null {
        console.log(`SchedulingEngine.findFirstOccurrence: Finding first occurrence`);
        console.log(`  Schedule starts: ${scheduleStartDate.toISOString()}`);
        console.log(`  Search range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // If the schedule starts after our end date, no occurrences
        if (scheduleStartDate > endDate) {
            console.log(`SchedulingEngine.findFirstOccurrence: Schedule starts after search range`);
            return null;
        }

        // If the schedule starts within our range, that's our first occurrence
        if (scheduleStartDate >= startDate) {
            console.log(`SchedulingEngine.findFirstOccurrence: Schedule starts within range: ${scheduleStartDate.toISOString()}`);
            return new Date(scheduleStartDate);
        }

        // Schedule starts before our range, need to calculate first occurrence within range
        let currentDate = new Date(scheduleStartDate);
        let iterationCount = 0;
        const maxIterations = 1000; // Safety limit

        while (currentDate < startDate && iterationCount < maxIterations) {
            iterationCount++;
            currentDate = this.getNextRecurrenceDate(currentDate, pattern, scheduleStartDate);

            if (currentDate >= startDate && currentDate <= endDate) {
                console.log(`SchedulingEngine.findFirstOccurrence: Found first occurrence in range: ${currentDate.toISOString()}`);
                return currentDate;
            }
        }

        console.log(`SchedulingEngine.findFirstOccurrence: No occurrence found in range after ${iterationCount} iterations`);
        return null;
    }

    /**
     * Get the next recurrence date based on the pattern
     */
    static getNextRecurrenceDate(currentDate: Date, pattern: any, originalStart: Date): Date {
        const nextDate = new Date(currentDate);

        switch (pattern.frequency) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + pattern.interval);
                break;

            case 'weekly':
                nextDate.setDate(nextDate.getDate() + (7 * pattern.interval));
                break;

            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + pattern.interval);
                // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
                if (nextDate.getDate() !== originalStart.getDate()) {
                    nextDate.setDate(0); // Go to last day of previous month
                }
                break;

            default:
                console.warn(`SchedulingEngine.getNextRecurrenceDate: Unknown frequency: ${pattern.frequency}`);
                nextDate.setDate(nextDate.getDate() + 1); // Default to daily
        }

        return nextDate;
    }
}
