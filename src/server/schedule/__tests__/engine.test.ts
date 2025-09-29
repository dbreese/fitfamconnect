import { SchedulingEngine } from '../engine';
import { Schedule } from '../../db/schedule';
import { Class } from '../../db/class';
import { Location } from '../../db/location';
import { Gym } from '../../db/gym';
import mongoose from 'mongoose';

// Test database setup
beforeEach(async () => {
    // Clear test data before each test
    await Schedule.deleteMany({});
    await Class.deleteMany({});
    await Location.deleteMany({});
    await Gym.deleteMany({});
});

afterEach(async () => {
    // Clean up after each test
    await Schedule.deleteMany({});
    await Class.deleteMany({});
    await Location.deleteMany({});
    await Gym.deleteMany({});
});

describe('SchedulingEngine', () => {
    let testLocationId: string;
    let testGymId: string;
    let testClassId: string;

    describe('validateNewSchedule - SCHEDULING.md Test Scenarios', () => {
        describe('No conflicts for non-recurring schedule', () => {
            it('should pass validation when there are no existing schedules', async () => {
                // Test Steps from SCHEDULING.md:
                // - There are no existing schedules.
                // - Schedule a 1 time class on Monday, Sept 1 at 5am.

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60); // 60 minutes

                const startDateTime = new Date('2025-09-01T12:00:00.000Z'); // Monday, Sept 1 at 5am MST
                const duration = 60; // 60 minutes

                // Should not throw any error since there are no existing schedules
                await expect(
                    SchedulingEngine.validateNewSchedule(location._id, startDateTime, duration)
                ).resolves.not.toThrow();
            });
        });

        describe('Conflict with a new 1-time schedule', () => {
            it('should detect conflict when scheduling at the same time as existing schedule', async () => {
                // Test Steps from SCHEDULING.md:
                // - Schedule a 1 time class on Monday, Sept 1 at 5am.
                // - Attempt to schedule another 1-time class at the same time.

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const startDateTime = new Date('2025-09-01T12:00:00.000Z');
                const duration = 60;

                // Create existing schedule at the same time
                await createTestSchedule(
                    testClass._id,
                    location._id,
                    startDateTime,
                    false // non-recurring
                );

                // Should throw conflict error when trying to schedule another class at same time
                await expect(
                    SchedulingEngine.validateNewSchedule(location._id, startDateTime, duration)
                ).rejects.toThrow('Scheduling conflict: Another class is already scheduled at this time and location');
            });
        });

        describe('Conflict with a new recurring schedule and a 1-time class', () => {
            it('should detect conflict between new recurring schedule and existing 1-time class', async () => {
                // Test Steps from SCHEDULING.md:
                // - Schedule a 1 time class on Monday, Sept 8 at 5am.
                // - Schedule a recurring class that starts on Monday, Sept 1 and occurs Mondays at 5am.

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const oneTimeClassDate = new Date('2025-09-08T12:00:00.000Z'); // Monday, Sept 8 at 5am
                const recurringStartDate = new Date('2025-09-01T12:00:00.000Z'); // Monday, Sept 1 at 5am
                const duration = 60;

                // Create existing one-time schedule on Sept 8
                await createTestSchedule(
                    testClass._id,
                    location._id,
                    oneTimeClassDate,
                    false // non-recurring
                );

                const recurringPattern = {
                    frequency: 'weekly' as const,
                    interval: 1,
                    daysOfWeek: [1] // Monday
                };

                // Should throw conflict error when trying to create recurring schedule
                // that would generate an instance on Sept 8 (conflicting with existing 1-time class)
                await expect(
                    SchedulingEngine.validateNewSchedule(
                        location._id,
                        recurringStartDate,
                        duration,
                        recurringPattern
                    )
                ).rejects.toThrow(/Recurring schedule conflict.*Scheduling conflict/);
            });
        });

        describe('Conflict with a new recurring schedule and an existing recurring schedule', () => {
            it('should detect conflict between two recurring schedules', async () => {
                // Test Steps from SCHEDULING.md:
                // - Schedule a recurring class that starts on Monday, Sept 1 and occurs every Monday at 5am MST.
                // - Attempt to schedule another recurring schedule that starts on Sept 8 and occurs on Mondays and Wednesdays at 5am MST.

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const firstRecurringStart = new Date('2025-09-01T12:00:00.000Z'); // Monday, Sept 1 at 5am MST
                const secondRecurringStart = new Date('2025-09-08T12:00:00.000Z'); // Monday, Sept 8 at 5am MST
                const duration = 60;

                // Create existing recurring schedule that occurs on Mondays
                await createTestSchedule(
                    testClass._id,
                    location._id,
                    firstRecurringStart,
                    true, // recurring
                    {
                        frequency: 'weekly',
                        interval: 1,
                        daysOfWeek: [1] // Monday
                    }
                );

                const newRecurringPattern = {
                    frequency: 'weekly' as const,
                    interval: 1,
                    daysOfWeek: [1, 3] // Monday and Wednesday
                };

                // Should throw conflict error when checking Monday instances
                await expect(
                    SchedulingEngine.validateNewSchedule(
                        location._id,
                        secondRecurringStart,
                        duration,
                        newRecurringPattern
                    )
                ).rejects.toThrow(/Recurring schedule conflict.*Scheduling conflict/);
            });
        });

        describe('No conflict with new recurring schedules when they are on different days', () => {
            it('should allow scheduling recurring classes on different days of the week', async () => {
                // Test Steps from SCHEDULING.md:
                // - Schedule a recurring class that starts on Monday, Sept 1 and occurs every Monday at 5am.
                // - Schedule a recurring class that starts on Tuesday, Sept 2 and occurs every Tuesday at 5am.
                // - Do the same pattern for all the rest of the days of the week

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const duration = 60;

                // Test scheduling on Monday (should pass since no conflicts)
                const mondayDateTime = new Date('2025-09-01T12:00:00.000Z'); // Monday at 5am MST
                const mondayPattern = {
                    frequency: 'weekly' as const,
                    interval: 1,
                    daysOfWeek: [1] // Monday
                };

                await expect(
                    SchedulingEngine.validateNewSchedule(
                        location._id,
                        mondayDateTime,
                        duration,
                        mondayPattern
                    )
                ).resolves.not.toThrow();

                // Test scheduling on Tuesday (should pass since different day)
                const tuesdayDateTime = new Date('2025-09-02T12:00:00.000Z'); // Tuesday at 5am MST
                const tuesdayPattern = {
                    frequency: 'weekly' as const,
                    interval: 1,
                    daysOfWeek: [2] // Tuesday
                };

                await expect(
                    SchedulingEngine.validateNewSchedule(
                        location._id,
                        tuesdayDateTime,
                        duration,
                        tuesdayPattern
                    )
                ).resolves.not.toThrow();
            });
        });

        describe('No conflicts with different locations', () => {
            it('should allow scheduling at same time in different locations', async () => {
                // From SCHEDULING.md: "Two schedules which have the same date/time are not considered conflicting if they are each for a different location."

                // Setup test data - two different locations
                const gym = await createTestGym();
                const location1 = await createTestLocation(gym._id, 'Main Floor');
                const location2 = await createTestLocation(gym._id, 'Second Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const startDateTime = new Date('2025-09-01T12:00:00.000Z');
                const duration = 60;

                // Create schedule in location1
                await createTestSchedule(
                    testClass._id,
                    location1._id,
                    startDateTime,
                    false // non-recurring
                );

                // Should allow scheduling at same time in location2 (different location)
                await expect(
                    SchedulingEngine.validateNewSchedule(location2._id, startDateTime, duration)
                ).resolves.not.toThrow();
            });
        });

        describe('Time overlap conflicts - wrapping schedule', () => {
            it('should detect conflict when new schedule wraps around existing schedule', async () => {
                // Test Steps from SCHEDULING.md:
                // - Schedule a 1-time class that starts on Monday, Sept 8 at 5:15am and is 30 minutes in length.
                // - Schedule another 1-time class that starts on Monday, Sept 8 at 5:00am and is 60 minutes in length.

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const existingStart = new Date('2025-09-08T12:15:00.000Z'); // Monday, Sept 8 at 5:15am MST
                const existingDuration = 30; // 30 minutes (ends at 5:45am MST)

                const newStart = new Date('2025-09-08T12:00:00.000Z'); // Monday, Sept 8 at 5:00am MST
                const newDuration = 60; // 60 minutes (ends at 6:00am MST, wraps around existing)

                // Create existing schedule
                await createTestSchedule(
                    testClass._id,
                    location._id,
                    existingStart,
                    false // non-recurring
                );

                // Should throw conflict error
                await expect(
                    SchedulingEngine.validateNewSchedule(location._id, newStart, newDuration)
                ).rejects.toThrow('Scheduling conflict');
            });
        });

        describe('Time overlap conflicts - contained schedule', () => {
            it('should detect conflict when new schedule is contained within existing schedule', async () => {
                // Test Steps from SCHEDULING.md:
                // - Schedule a 1-time class that starts on Monday, Sept 8 at 5:00am and is 60 minutes in length.
                // - Schedule another 1-time class that starts on Monday, Sept 8 at 5:10am and is 10 minutes in length.

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const existingStart = new Date('2025-09-08T12:00:00.000Z'); // Monday, Sept 8 at 5:00am MST
                const existingDuration = 60; // 60 minutes (ends at 6:00am MST)

                const newStart = new Date('2025-09-08T12:10:00.000Z'); // Monday, Sept 8 at 5:10am MST
                const newDuration = 10; // 10 minutes (ends at 5:20am MST, contained within existing)

                // Create existing schedule
                await createTestSchedule(
                    testClass._id,
                    location._id,
                    existingStart,
                    false // non-recurring
                );

                // Should throw conflict error
                await expect(
                    SchedulingEngine.validateNewSchedule(location._id, newStart, newDuration)
                ).rejects.toThrow('Scheduling conflict');
            });
        });

        describe('Recurring schedule conflicts with overlapping times', () => {
            it('should detect conflict with overlapping times for recurring schedules', async () => {
                // Test Steps from SCHEDULING.md:
                // - Schedule a recurring class that starts on Monday, Sept 8 at 5:15am and is 30 minutes in length and occurs every Monday.
                // - Schedule another recurring class that starts on Monday, Sept 1 at 5:00am and is 30 minutes in length.

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const existingStart = new Date('2025-09-08T12:15:00.000Z'); // Monday, Sept 8 at 5:15am MST
                const newStart = new Date('2025-09-01T12:00:00.000Z'); // Monday, Sept 1 at 5:00am MST
                const duration = 30;

                // Create existing recurring schedule
                await createTestSchedule(
                    testClass._id,
                    location._id,
                    existingStart,
                    true, // recurring
                    {
                        frequency: 'weekly',
                        interval: 1,
                        daysOfWeek: [1] // Monday
                    }
                );

                const newRecurringPattern = {
                    frequency: 'weekly' as const,
                    interval: 1,
                    daysOfWeek: [1] // Monday
                };

                // Should throw conflict error
                await expect(
                    SchedulingEngine.validateNewSchedule(
                        location._id,
                        newStart,
                        duration,
                        newRecurringPattern
                    )
                ).rejects.toThrow(/Recurring schedule conflict.*Scheduling conflict/);
            });
        });

        describe('Recurring vs 1-time conflict with overlapping times', () => {
            it('should detect conflict between recurring schedule and 1-time class with overlapping times', async () => {
                // Test Steps from SCHEDULING.md:
                // - Schedule a recurring class that starts on Monday, Sept 1 at 5:15am and is 30 minutes in length and occurs every Monday.
                // - Schedule a 1-time class that starts on Monday, Sept 8 at 5:00am and is 30 minutes in length.

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const recurringStart = new Date('2025-09-01T12:15:00.000Z'); // Monday, Sept 1 at 5:15am MST
                const oneTimeStart = new Date('2025-09-08T12:00:00.000Z'); // Monday, Sept 8 at 5:00am MST
                const duration = 30;

                // First, create the recurring schedule
                await createTestSchedule(
                    testClass._id,
                    location._id,
                    recurringStart,
                    true, // recurring
                    {
                        frequency: 'weekly',
                        interval: 1,
                        daysOfWeek: [1] // Monday
                    }
                );

                // Now try to schedule the 1-time class - should conflict
                await expect(
                    SchedulingEngine.validateNewSchedule(location._id, oneTimeStart, duration)
                ).rejects.toThrow('Scheduling conflict');
            });
        });

        describe('Partial time overlap for non-recurring classes', () => {
            it('should detect conflict with partial time overlap', async () => {
                // Test Steps from SCHEDULING.md:
                // - Schedule a 1-time class that occurs on Monday, Sept 1 at 5:15 and is 10 minutes in length.
                // - Schedule a new 1-time class that occurs on Monday, Sept 1 at 5:00 and is 16 minutes in length.

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const existingStart = new Date('2025-09-01T12:15:00.000Z'); // Monday, Sept 1 at 5:15am MST
                const existingDuration = 10; // 10 minutes (ends at 5:25am MST)

                const newStart = new Date('2025-09-01T12:00:00.000Z'); // Monday, Sept 1 at 5:00am MST
                const newDuration = 16; // 16 minutes (ends at 5:16am MST, overlaps with existing)

                // Create existing schedule
                await createTestSchedule(
                    testClass._id,
                    location._id,
                    existingStart,
                    false // non-recurring
                );

                // Should throw conflict error
                await expect(
                    SchedulingEngine.validateNewSchedule(location._id, newStart, newDuration)
                ).rejects.toThrow('Scheduling conflict');
            });
        });

        describe('Recurring schedule with end date - no conflict after end date', () => {
            it('should allow 1-time schedule after recurring schedule ends', async () => {
                // Test Steps from SCHEDULING.md:
                // - Schedule a recurring class that starts on Monday, Sept 1 at 5am and occurs every Monday. The class ends on Sept 7.
                // - Schedule a 1-time class for Monday, Sept 8 at 5am.

                // Setup test data
                const gym = await createTestGym();
                const location = await createTestLocation(gym._id, 'Main Floor');
                const testClass = await createTestClass(gym._id, 'Yoga', 60);

                const recurringStart = new Date('2025-09-01T12:00:00.000Z'); // Monday, Sept 1 at 5am MST
                const recurringEnd = new Date('2025-09-07T12:00:00.000Z'); // Sunday, Sept 7 at 5am MST (end date)
                const oneTimeStart = new Date('2025-09-08T12:00:00.000Z'); // Monday, Sept 8 at 5am MST
                const duration = 60;

                // Create recurring schedule that ends on Sept 7
                await createTestSchedule(
                    testClass._id,
                    location._id,
                    recurringStart,
                    true, // recurring
                    {
                        frequency: 'weekly',
                        interval: 1,
                        daysOfWeek: [1] // Monday
                    },
                    recurringEnd // end date
                );

                // Should not conflict since the recurring schedule ended on Sept 7
                // and the new 1-time schedule is on Sept 8
                await expect(
                    SchedulingEngine.validateNewSchedule(location._id, oneTimeStart, duration)
                ).resolves.not.toThrow();
            });
        });
    });
});

// Helper functions for testing
async function createTestGym(): Promise<any> {
    const gym = new Gym({
        name: 'Test Gym',
        gymCode: 'TEST01',
        ownerId: new mongoose.Types.ObjectId().toString(),
        isActive: true,
        billingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345'
        },
        contact: {
            email: 'test@testgym.com'
        }
    });
    return await gym.save();
}

async function createTestLocation(gymId: string, name: string): Promise<any> {
    const location = new Location({
        name,
        gymId,
        operatingHours: [
            {
                dayOfWeek: 1, // Monday
                openTime: '06:00',
                closeTime: '22:00',
                isClosed: false
            }
        ],
        subLocations: [],
        isActive: true
    });
    return await location.save();
}

async function createTestClass(gymId: string, name: string, duration: number): Promise<any> {
    const testClass = new Class({
        name,
        category: 'Fitness',
        description: 'Test class',
        duration, // minutes
        maxAttendees: 20,
        gymId,
        isActive: true
    });
    return await testClass.save();
}

async function createTestSchedule(
    classId: string,
    locationId: string,
    startDateTime: Date,
    isRecurring: boolean,
    recurringPattern?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
        daysOfWeek?: number[];
    },
    endDate?: Date
): Promise<any> {
    const schedule = new Schedule({
        classId,
        locationId,
        startDateTime,
        isRecurring,
        recurringPattern,
        endDate
    });
    return await schedule.save();
}
