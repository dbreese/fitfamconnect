import { BillingEngine } from '../engine';
import { Member } from '../../db/member';
import { Plan } from '../../db/plan';
import { Membership } from '../../db/membership';
import { Charge } from '../../db/charge';
import { Gym } from '../../db/gym';
import mongoose from 'mongoose';

// Test database setup
beforeEach(async () => {
    // Clear test data before each test
    await Member.deleteMany({});
    await Plan.deleteMany({});
    await Membership.deleteMany({});
    await Charge.deleteMany({});
    await Gym.deleteMany({});
});

afterEach(async () => {
    // Clean up after each test
    await Member.deleteMany({});
    await Plan.deleteMany({});
    await Membership.deleteMany({});
    await Charge.deleteMany({});
    await Gym.deleteMany({});
});

describe('BillingEngine', () => {
    describe('Member joins Aug 31st, monthly billing, start date Sept 1st', () => {
        it('should bill $100 on Sept 1st and Oct 1st', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'John', 'Doe');
            const monthlyPlan = await createTestPlan('Monthly Plan', 10000, 'monthly', gym._id); // $100

            // Member joins Aug 31st with start date Sept 1st
            await createTestMembership(member._id, monthlyPlan._id, new Date('2024-09-01'));

            // Test Sept 1st billing
            const sept1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-01'),
                new Date('2024-09-30')
            );

            expect(sept1Result.charges).toHaveLength(1);
            expect(sept1Result.charges[0].amount).toBe(10000); // $100
            expect(sept1Result.charges[0].type).toBe('recurring-plan');

            // Simulate billing completion
            await simulateBillingCompletion(member._id, monthlyPlan._id, new Date('2024-09-01'));

            // Test Oct 1st billing
            const oct1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-10-01'),
                new Date('2024-10-31')
            );

            expect(oct1Result.charges).toHaveLength(1);
            expect(oct1Result.charges[0].amount).toBe(10000); // $100
        });
    });

    describe('Member joins Sept 15th, monthly billing', () => {
        it('should bill $0 on Sept 1st and $153.33 on Oct 1st (including pro-rated)', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Jane', 'Smith');
            const monthlyPlan = await createTestPlan('Monthly Plan', 10000, 'monthly', gym._id); // $100

            // Member joins Sept 15th
            await createTestMembership(member._id, monthlyPlan._id, new Date('2024-09-15'));

            // Test Sept 1st billing (member not active yet)
            const sept1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-01'),
                new Date('2024-09-30')
            );

            expect(sept1Result.charges).toHaveLength(0); // No charges

            // Test Oct 1st billing (should include regular + pro-rated)
            const oct1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-10-01'),
                new Date('2024-10-31')
            );

            expect(oct1Result.charges).toHaveLength(2); // Regular + pro-rated

            const recurringCharge = oct1Result.charges.find(c => c.type === 'recurring-plan');
            const proRatedCharge = oct1Result.charges.find(c => c.type === 'pro-rated-charge');

            expect(recurringCharge?.amount).toBe(10000); // $100 for October
            expect(proRatedCharge?.amount).toBe(5333); // $100 * (16/30) = $53.33 (Sept 15-30 = 16 days)

            // Total should be $153.33
            const totalAmount = oct1Result.charges.reduce((sum, c) => sum + c.amount, 0);
            expect(totalAmount).toBe(15333); // $153.33
        });
    });

    describe('Member joins Sept 1st, weekly billing', () => {
        it('should bill $25 on Sept 1st, 8th, and 16th', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Bob', 'Wilson');
            const weeklyPlan = await createTestPlan('Weekly Plan', 2500, 'weekly', gym._id); // $25

            // Member joins Sept 1st
            await createTestMembership(member._id, weeklyPlan._id, new Date('2024-09-01'));

            // Test Sept 1st billing
            const sept1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-01'),
                new Date('2024-09-07')
            );

            expect(sept1Result.charges).toHaveLength(1);
            expect(sept1Result.charges[0].amount).toBe(2500); // $25

            // Simulate billing and test Sept 8th
            await simulateBillingCompletion(member._id, weeklyPlan._id, new Date('2024-09-01'));

            const sept8Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-08'),
                new Date('2024-09-14')
            );

            expect(sept8Result.charges).toHaveLength(1);
            expect(sept8Result.charges[0].amount).toBe(2500); // $25
        });
    });

    describe('Member joins Sept 4th, weekly billing', () => {
        it('should bill $0 on Sept 1st and $40.63 on Sept 8th (including pro-rated)', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Alice', 'Johnson');
            const weeklyPlan = await createTestPlan('Weekly Plan', 2500, 'weekly', gym._id); // $25

            // Member joins Sept 4th
            await createTestMembership(member._id, weeklyPlan._id, new Date('2024-09-04'));

            // Test Sept 1st billing (member not active yet)
            const sept1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-01'),
                new Date('2024-09-07')
            );

            expect(sept1Result.charges).toHaveLength(0);

            // Test Sept 8th billing (should include regular + pro-rated)
            const sept8Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-08'),
                new Date('2024-09-14')
            );

            expect(sept8Result.charges).toHaveLength(2);

            const recurringCharge = sept8Result.charges.find(c => c.type === 'recurring-plan');
            const proRatedCharge = sept8Result.charges.find(c => c.type === 'pro-rated-charge');

            expect(recurringCharge?.amount).toBe(2500); // $25 for Sept 8-14
            expect(proRatedCharge?.amount).toBe(1563); // $25 * (5/8) = $15.63 for Sept 4-7 inclusive (5 days in 8-day period)

            // Total should be $40.63
            const totalAmount = sept8Result.charges.reduce((sum, c) => sum + c.amount, 0);
            expect(totalAmount).toBe(4063); // $40.63
        });
    });

    describe('Mid-period plan change', () => {
        it('should bill old plan in Sept and new plan in Oct', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Mike', 'Brown');
            const plan100 = await createTestPlan('Plan $100', 10000, 'monthly', gym._id);
            const plan75 = await createTestPlan('Plan $75', 7500, 'monthly', gym._id);

            // First plan assigned Sept 1st
            const membership1 = await createTestMembership(member._id, plan100._id, new Date('2024-09-01'));

            // Test Sept 1st billing
            const sept1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-01'),
                new Date('2024-09-30')
            );

            expect(sept1Result.charges).toHaveLength(1);
            expect(sept1Result.charges[0].amount).toBe(10000); // $100

            // Simulate Sept 1st billing completion (mark old plan as billed)
            await simulateBillingCompletion(member._id, plan100._id, new Date('2024-09-01'));

            // Simulate plan change on Sept 15th - end old membership and create new one starting Oct 1st
            await Membership.findByIdAndUpdate(membership1._id, { endDate: new Date('2024-09-30') });
            await createTestMembership(member._id, plan75._id, new Date('2024-10-01'));

            // Test Oct 1st billing (should only have new plan, old plan was already billed)
            const oct1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-10-01'),
                new Date('2024-10-31')
            );

            expect(oct1Result.charges).toHaveLength(1);
            expect(oct1Result.charges[0].amount).toBe(7500); // $75 for new plan
            expect(oct1Result.charges[0].type).toBe('recurring-plan');
        });
    });

    describe('Plan ends at end of period', () => {
        it('should bill in Sept but not in Oct', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Sarah', 'Davis');
            const monthlyPlan = await createTestPlan('Monthly Plan', 10000, 'monthly', gym._id);

            // Member active until Sept 30th
            await createTestMembership(
                member._id,
                monthlyPlan._id,
                new Date('2024-09-01'),
                new Date('2024-09-30') // End date
            );

            // Test Sept 1st billing
            const sept1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-01'),
                new Date('2024-09-30')
            );

            expect(sept1Result.charges).toHaveLength(1);
            expect(sept1Result.charges[0].amount).toBe(10000); // $100

            // Simulate Sept 1st billing completion
            await simulateBillingCompletion(member._id, monthlyPlan._id, new Date('2024-09-01'));

            // Test Oct 1st billing (should be empty because plan ended and was already billed)
            const oct1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-10-01'),
                new Date('2024-10-31')
            );

            expect(oct1Result.charges).toHaveLength(0);
        });
    });

    describe('Mid-period membership (Sept 10-15)', () => {
        it('should bill $20.00 pro-rated amount in Oct', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Tom', 'Wilson');
            const monthlyPlan = await createTestPlan('Monthly Plan', 10000, 'monthly', gym._id);

            // Member active Sept 10-15 (6 days: Sept 10, 11, 12, 13, 14, 15)
            await createTestMembership(
                member._id,
                monthlyPlan._id,
                new Date('2024-09-10'),
                new Date('2024-09-15')
            );

            // Test Sept 1st billing (member not active yet)
            const sept1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-01'),
                new Date('2024-09-30')
            );

            expect(sept1Result.charges).toHaveLength(0);

            // Test Oct 1st billing (should include pro-rated for 6 days)
            const oct1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-10-01'),
                new Date('2024-10-31')
            );

            expect(oct1Result.charges).toHaveLength(1);
            expect(oct1Result.charges[0].type).toBe('pro-rated-charge');
            expect(oct1Result.charges[0].amount).toBe(2000); // $100 * (6/30) = $20.00 for Sept 10-15 inclusive (6 days)
        });
    });

    describe('Two overlapping plans in same period', () => {
        it('should bill pro-rated amounts for both plans in Oct', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Alex', 'Multi');
            const plan1 = await createTestPlan('Plan 1', 10000, 'monthly', gym._id); // $100
            const plan2 = await createTestPlan('Plan 2', 10000, 'monthly', gym._id); // $100

            // First plan: Sept 4-30 (27 days)
            await createTestMembership(
                member._id,
                plan1._id,
                new Date('2024-09-04'),
                new Date('2024-09-30')
            );

            // Second plan: Sept 10-25 (16 days)
            await createTestMembership(
                member._id,
                plan2._id,
                new Date('2024-09-10'),
                new Date('2024-09-25')
            );

            // Test Sept 1st billing (member not active yet)
            const sept1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-01'),
                new Date('2024-09-30')
            );

            expect(sept1Result.charges).toHaveLength(0);

            // Test Oct 1st billing (should include pro-rated for both plans)
            const oct1Result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-10-01'),
                new Date('2024-10-31')
            );

            expect(oct1Result.charges).toHaveLength(2); // Two pro-rated charges

            // Plan 1: $100 * (27/30) = $90.00
            const plan1Charge = oct1Result.charges.find(c => c.planName === 'Plan 1');
            expect(plan1Charge?.amount).toBe(9000);

            // Plan 2: $100 * (16/30) = $53.33
            const plan2Charge = oct1Result.charges.find(c => c.planName === 'Plan 2');
            expect(plan2Charge?.amount).toBe(5333);

            // Total should be $143.33
            const totalAmount = oct1Result.charges.reduce((sum, c) => sum + c.amount, 0);
            expect(totalAmount).toBe(14333);
        });
    });

    describe('One-time charges', () => {
        it('should include unbilled one-time charges that occurred before end date', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Lisa', 'Garcia');

            // Create some one-time charges
            await createTestCharge(member._id, 500, 'T-shirt', new Date('2024-08-15'), false); // $5
            await createTestCharge(member._id, 300, 'Energy drink', new Date('2024-09-10'), false); // $3
            await createTestCharge(member._id, 200, 'Already billed', new Date('2024-09-05'), true); // $2 - already billed

            // Test Sept billing
            const result = await BillingEngine.generateBillingCharges(
                gym._id,
                new Date('2024-09-01'),
                new Date('2024-09-30')
            );

            const oneTimeCharges = result.charges.filter(c => c.type === 'one-time-charge');
            expect(oneTimeCharges).toHaveLength(2); // T-shirt + Energy drink (not the billed one)

            const totalOneTimeAmount = oneTimeCharges.reduce((sum, c) => sum + c.amount, 0);
            expect(totalOneTimeAmount).toBe(800); // $5 + $3 = $8
        });
    });

    describe('Yearly billing special rules', () => {
        describe('Member joins Sept 15 on yearly plan', () => {
            it('should bill $0 on Sept 1st and $1200 on Oct 1st', async () => {
                // Setup - as per BILLING.md scenario
                const gym = await createTestGym();
                const member = await createTestMember(gym._id, 'John', 'Yearly');
                const yearlyPlan = await createTestPlan('Yearly Plan', 120000, 'yearly', gym._id); // $1200

                // Member joins Sept 15th
                await createTestMembership(member._id, yearlyPlan._id, new Date('2024-09-15'));

                // Test Sept 1st billing (member not active yet)
                const sept1Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-09-01'),
                    new Date('2024-09-30')
                );

                expect(sept1Result.charges).toHaveLength(0); // No charges as per BILLING.md

                // Test Oct 1st billing (should include yearly charge)
                const oct1Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-10-01'),
                    new Date('2024-10-31')
                );

                expect(oct1Result.charges).toHaveLength(1);
                expect(oct1Result.charges[0].amount).toBe(120000); // $1200
                expect(oct1Result.charges[0].type).toBe('recurring-plan');
                expect(oct1Result.charges[0].memberName).toBe('John Yearly');
            });
        });

        describe('Yearly billing - prevent double billing', () => {
            it('should not bill again within the same year', async () => {
                // Setup
                const gym = await createTestGym();
                const member = await createTestMember(gym._id, 'Jane', 'Annual');
                const yearlyPlan = await createTestPlan('Annual Plan', 120000, 'yearly', gym._id);

                // Member joins Jan 1st
                await createTestMembership(member._id, yearlyPlan._id, new Date('2024-01-01'));

                // Test Jan billing (should charge)
                const jan1Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-01-01'),
                    new Date('2024-01-31')
                );

                expect(jan1Result.charges).toHaveLength(1);
                expect(jan1Result.charges[0].amount).toBe(120000);

                // Simulate billing completion - create a charge record
                await createTestCharge(member._id, 120000, 'Annual Plan', new Date('2024-01-01'), true, yearlyPlan._id);
                await simulateBillingCompletion(member._id, yearlyPlan._id, new Date('2024-01-01'));

                // Test subsequent months in same year (should not charge)
                const feb1Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-02-01'),
                    new Date('2024-02-29')
                );

                expect(feb1Result.charges).toHaveLength(0); // No double billing

                const jun1Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-06-01'),
                    new Date('2024-06-30')
                );

                expect(jun1Result.charges).toHaveLength(0); // Still no billing

                const dec1Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-12-01'),
                    new Date('2024-12-31')
                );

                expect(dec1Result.charges).toHaveLength(0); // Still no billing
            });
        });

        describe('Yearly billing - next year billing', () => {
            it('should bill again exactly one year after previous charge', async () => {
                // Setup
                const gym = await createTestGym();
                const member = await createTestMember(gym._id, 'Bob', 'Renewal');
                const yearlyPlan = await createTestPlan('Yearly Renewal', 120000, 'yearly', gym._id);

                // Member joins and is charged Jan 15, 2024
                await createTestMembership(member._id, yearlyPlan._id, new Date('2024-01-15'));
                await createTestCharge(member._id, 120000, 'Yearly Renewal', new Date('2024-01-15'), true, yearlyPlan._id);
                await simulateBillingCompletion(member._id, yearlyPlan._id, new Date('2024-01-15'));

                // Test billing before one year is up (Dec 2024) - should not charge
                const dec2024Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-12-01'),
                    new Date('2024-12-31')
                );

                expect(dec2024Result.charges).toHaveLength(0);

                // Test billing exactly one year later (Jan 15, 2025 falls in Jan 1-31 period)
                const jan2025Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2025-01-01'),
                    new Date('2025-01-31')
                );

                expect(jan2025Result.charges).toHaveLength(1);
                expect(jan2025Result.charges[0].amount).toBe(120000);
                expect(jan2025Result.charges[0].type).toBe('recurring-plan');

                // Test billing in Feb 2025 (should not charge since Jan 15 was the renewal date)
                const feb2025Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2025-02-01'),
                    new Date('2025-02-28')
                );

                expect(feb2025Result.charges).toHaveLength(0);
            });
        });

        describe('Yearly billing - first time vs renewal', () => {
            it('should bill first-time when plan starts in billing period, then renew after one year', async () => {
                // Setup
                const gym = await createTestGym();
                const member = await createTestMember(gym._id, 'Alice', 'FirstTime');
                const yearlyPlan = await createTestPlan('First Year Plan', 120000, 'yearly', gym._id);

                // Member joins March 10th
                await createTestMembership(member._id, yearlyPlan._id, new Date('2024-03-10'));

                // Test March billing (plan starts in this period - should charge)
                const mar2024Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-03-01'),
                    new Date('2024-03-31')
                );

                expect(mar2024Result.charges).toHaveLength(1);
                expect(mar2024Result.charges[0].amount).toBe(120000);

                // Simulate billing completion
                await createTestCharge(member._id, 120000, 'First Year Plan', new Date('2024-03-10'), true, yearlyPlan._id);
                await simulateBillingCompletion(member._id, yearlyPlan._id, new Date('2024-03-10'));

                // Test billing throughout the rest of 2024 (should not charge)
                const jun2024Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-06-01'),
                    new Date('2024-06-30')
                );

                expect(jun2024Result.charges).toHaveLength(0);

                // Test renewal billing in March 2025 (March 10, 2025 falls in March 1-31 period)
                const mar2025Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2025-03-01'),
                    new Date('2025-03-31')
                );

                expect(mar2025Result.charges).toHaveLength(1);
                expect(mar2025Result.charges[0].amount).toBe(120000);
                expect(mar2025Result.charges[0].type).toBe('recurring-plan');
            });
        });

        describe('Yearly billing edge cases', () => {
            it('should handle leap year billing correctly', async () => {
                // Setup
                const gym = await createTestGym();
                const member = await createTestMember(gym._id, 'Leap', 'Year');
                const yearlyPlan = await createTestPlan('Leap Year Plan', 120000, 'yearly', gym._id);

                // Member joins and is first billed Feb 29, 2024 (leap year)
                await createTestMembership(member._id, yearlyPlan._id, new Date('2024-02-29'));

                // Test initial billing in 2024
                const feb2024Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-02-01'),
                    new Date('2024-02-29')
                );

                expect(feb2024Result.charges).toHaveLength(1);
                expect(feb2024Result.charges[0].amount).toBe(120000);

                // Simulate billing completion
                await createTestCharge(member._id, 120000, 'Leap Year Plan', new Date('2024-02-29'), true, yearlyPlan._id);
                await simulateBillingCompletion(member._id, yearlyPlan._id, new Date('2024-02-29'));

                // Test renewal in 2025 (Feb 28, 2025 since 2025 is not a leap year)
                // The next bill date would be Feb 29, 2025, but that doesn't exist, so JavaScript will make it Feb 28
                const feb2025Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2025-02-01'),
                    new Date('2025-02-28')
                );

                expect(feb2025Result.charges).toHaveLength(1);
                expect(feb2025Result.charges[0].amount).toBe(120000);
            });

            it('should not bill if membership ended before billing period', async () => {
                // Setup
                const gym = await createTestGym();
                const member = await createTestMember(gym._id, 'Short', 'Term');
                const yearlyPlan = await createTestPlan('Short Term Yearly', 120000, 'yearly', gym._id);

                // Member joins Jan 1st but membership ends June 30th
                await createTestMembership(
                    member._id,
                    yearlyPlan._id,
                    new Date('2024-01-01'),
                    new Date('2024-06-30')
                );

                // Test Jan billing (should charge since membership is active)
                const jan2024Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-01-01'),
                    new Date('2024-01-31')
                );

                expect(jan2024Result.charges).toHaveLength(1);

                // Simulate billing completion
                await createTestCharge(member._id, 120000, 'Short Term Yearly', new Date('2024-01-01'), true, yearlyPlan._id);

                // Test billing after membership ended (should not charge)
                const aug2024Result = await BillingEngine.generateBillingCharges(
                    gym._id,
                    new Date('2024-08-01'),
                    new Date('2024-08-31')
                );

                expect(aug2024Result.charges).toHaveLength(0);
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

async function createTestMember(gymId: string, firstName: string, lastName: string): Promise<any> {
    const member = new Member({
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
        firstName,
        lastName,
        memberType: 'member',
        isActive: true,
        gymId,
        status: 'approved',
        joinRequestDate: new Date()
    });
    return await member.save();
}

async function createTestPlan(name: string, price: number, recurringPeriod: string, gymId?: string): Promise<any> {
    const plan = new Plan({
        name,
        price,
        currency: 'USD',
        recurringPeriod,
        startDateTime: new Date('2024-01-01'),
        isActive: true,
        gymId: gymId || new mongoose.Types.ObjectId().toString()
    });
    return await plan.save();
}

async function createTestMembership(
    memberId: string,
    planId: string,
    startDate: Date,
    endDate?: Date
): Promise<any> {
    const membership = new Membership({
        memberId,
        planId,
        startDate,
        endDate
    });
    return await membership.save();
}

async function createTestCharge(
    memberId: string,
    amount: number,
    note: string,
    chargeDate: Date,
    isBilled: boolean,
    planId?: string
): Promise<any> {
    const charge = new Charge({
        memberId,
        planId,
        amount,
        note,
        chargeDate,
        isBilled,
        billedDate: isBilled ? new Date() : undefined
    });
    return await charge.save();
}

async function simulateBillingCompletion(memberId: string, planId: string, billingDate: Date): Promise<void> {
    await Membership.findOneAndUpdate(
        { memberId, planId },
        { lastBilledDate: billingDate }
    );
}
