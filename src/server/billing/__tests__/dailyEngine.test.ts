import { DailyBillingEngine } from '../dailyEngine';
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

describe('DailyBillingEngine', () => {
    describe('Member joins Aug 31st, monthly billing, start date Sept 1', () => {
        it('should bill $100 on Sept 1, $0 on Sept 2 and 30, $100 on Oct 1', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'John', 'Doe');
            const monthlyPlan = await createTestPlan('Monthly Plan', 10000, 'monthly', gym._id); // $100

            // Member joins Aug 31st with start date Sept 1st
            await createTestMembership(member._id, monthlyPlan._id, new Date('2025-09-01'));

            // Test Sept 1st billing
            const sept1Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-01')
            );

            expect(sept1Result.charges).toHaveLength(1);
            expect(sept1Result.charges[0].amount).toBe(10000); // $100
            expect(sept1Result.charges[0].type).toBe('recurring-plan');

            // Simulate billing completion
            await simulateBillingCompletion(member._id, monthlyPlan._id, new Date('2025-09-01'));

            // Verify nextBilledDate was set correctly (should be Oct 1)
            let membership = await Membership.findOne({ memberId: member._id, planId: monthlyPlan._id });
            expect(membership?.nextBilledDate).toBeDefined();
            expect(membership?.nextBilledDate?.getTime()).toBe(new Date('2025-10-01').getTime());

            // Test Sept 2nd billing (should be $0)
            const sept2Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-02')
            );

            expect(sept2Result.charges).toHaveLength(0);

            // Test Sept 30th billing (should be $0)
            const sept30Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-30')
            );

            expect(sept30Result.charges).toHaveLength(0);

            // Test Oct 1st billing (should be $100)
            const oct1Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-10-01')
            );

            expect(oct1Result.charges).toHaveLength(1);
            expect(oct1Result.charges[0].amount).toBe(10000); // $100
        });
    });

    describe('Member joins Sept 1st, monthly billing', () => {
        it('should bill $100 on Sept 1, $0 on other days, $100 on Oct 1', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Jane', 'Smith');
            const monthlyPlan = await createTestPlan('Monthly Plan', 10000, 'monthly', gym._id); // $100

            // Member joins Sept 1st
            await createTestMembership(member._id, monthlyPlan._id, new Date('2025-09-01'));

            // Test Sept 1st billing
            const sept1Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-01')
            );

            expect(sept1Result.charges).toHaveLength(1);
            expect(sept1Result.charges[0].amount).toBe(10000); // $100

            // Simulate billing completion
            await simulateBillingCompletion(member._id, monthlyPlan._id, new Date('2025-09-01'));

            // Verify nextBilledDate was set correctly (should be Oct 1)
            let membership = await Membership.findOne({ memberId: member._id, planId: monthlyPlan._id });
            expect(membership?.nextBilledDate).toBeDefined();
            expect(membership?.nextBilledDate?.getTime()).toBe(new Date('2025-10-01').getTime());

            // Test Sept 2nd billing (should be $0)
            const sept2Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-02')
            );

            expect(sept2Result.charges).toHaveLength(0);

            // Test Sept 30th billing (should be $0)
            const sept30Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-30')
            );

            expect(sept30Result.charges).toHaveLength(0);

            // Test Oct 1st billing (should be $100)
            const oct1Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-10-01')
            );

            expect(oct1Result.charges).toHaveLength(1);
            expect(oct1Result.charges[0].amount).toBe(10000); // $100
        });
    });

    describe('Member joins Sept 1st, weekly billing', () => {
        it('should bill $25 on Sept 1, 8, 15, 22, 29, and Oct 6', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Bob', 'Wilson');
            const weeklyPlan = await createTestPlan('Weekly Plan', 2500, 'weekly', gym._id); // $25

            // Member joins Sept 1st
            await createTestMembership(member._id, weeklyPlan._id, new Date('2025-09-01'));

            // Test Sept 1st billing
            const sept1Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-01')
            );

            expect(sept1Result.charges).toHaveLength(1);
            expect(sept1Result.charges[0].amount).toBe(2500); // $25

            // Simulate billing and test Sept 8th
            await simulateBillingCompletion(member._id, weeklyPlan._id, new Date('2025-09-01'));

            // Verify nextBilledDate was set correctly (should be Sept 8)
            let membership = await Membership.findOne({ memberId: member._id, planId: weeklyPlan._id });
            expect(membership?.nextBilledDate).toBeDefined();
            expect(membership?.nextBilledDate?.getTime()).toBe(new Date('2025-09-08').getTime());

            const sept8Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-08')
            );

            expect(sept8Result.charges).toHaveLength(1);
            expect(sept8Result.charges[0].amount).toBe(2500); // $25

            // Simulate billing and test Sept 15th
            await simulateBillingCompletion(member._id, weeklyPlan._id, new Date('2025-09-08'));

            // Verify nextBilledDate was set correctly (should be Sept 15)
            membership = await Membership.findOne({ memberId: member._id, planId: weeklyPlan._id });
            expect(membership?.nextBilledDate).toBeDefined();
            expect(membership?.nextBilledDate?.getTime()).toBe(new Date('2025-09-15').getTime());

            const sept15Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-15')
            );

            expect(sept15Result.charges).toHaveLength(1);
            expect(sept15Result.charges[0].amount).toBe(2500); // $25

            // Simulate billing and test Sept 22nd
            await simulateBillingCompletion(member._id, weeklyPlan._id, new Date('2025-09-15'));

            // Verify nextBilledDate was set correctly (should be Sept 22)
            membership = await Membership.findOne({ memberId: member._id, planId: weeklyPlan._id });
            expect(membership?.nextBilledDate).toBeDefined();
            expect(membership?.nextBilledDate?.getTime()).toBe(new Date('2025-09-22').getTime());

            const sept22Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-22')
            );

            expect(sept22Result.charges).toHaveLength(1);
            expect(sept22Result.charges[0].amount).toBe(2500); // $25

            // Simulate billing and test Sept 29th
            await simulateBillingCompletion(member._id, weeklyPlan._id, new Date('2025-09-22'));

            // Verify nextBilledDate was set correctly (should be Sept 29)
            membership = await Membership.findOne({ memberId: member._id, planId: weeklyPlan._id });
            expect(membership?.nextBilledDate).toBeDefined();
            expect(membership?.nextBilledDate?.getTime()).toBe(new Date('2025-09-29').getTime());

            const sept29Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-29')
            );

            expect(sept29Result.charges).toHaveLength(1);
            expect(sept29Result.charges[0].amount).toBe(2500); // $25

            // Simulate billing and test Oct 6th
            await simulateBillingCompletion(member._id, weeklyPlan._id, new Date('2025-09-29'));

            // Verify nextBilledDate was set correctly (should be Oct 6)
            membership = await Membership.findOne({ memberId: member._id, planId: weeklyPlan._id });
            expect(membership?.nextBilledDate).toBeDefined();
            expect(membership?.nextBilledDate?.getTime()).toBe(new Date('2025-10-06').getTime());

            const oct6Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-10-06')
            );

            expect(oct6Result.charges).toHaveLength(1);
            expect(oct6Result.charges[0].amount).toBe(2500); // $25

            // Test that other days have $0
            const sept2Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-02')
            );

            expect(sept2Result.charges).toHaveLength(0);
        });
    });

    describe('Member joins Sept 1st, yearly billing', () => {
        it('should bill $1200 on Sept 1, $0 on Aug 31 next year, $1200 on Sept 1 next year', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Alice', 'Yearly');
            const yearlyPlan = await createTestPlan('Yearly Plan', 120000, 'yearly', gym._id); // $1200

            // Member joins Sept 1st
            await createTestMembership(member._id, yearlyPlan._id, new Date('2025-09-01'));

            // Test Sept 1st billing
            const sept1Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-01')
            );

            expect(sept1Result.charges).toHaveLength(1);
            expect(sept1Result.charges[0].amount).toBe(120000); // $1200

            // Simulate billing completion
            await simulateBillingCompletion(member._id, yearlyPlan._id, new Date('2025-09-01'));

            // Verify nextBilledDate was set correctly (should be Sept 1, 2026)
            let membership = await Membership.findOne({ memberId: member._id, planId: yearlyPlan._id });
            expect(membership?.nextBilledDate).toBeDefined();
            expect(membership?.nextBilledDate?.getTime()).toBe(new Date('2026-09-01').getTime());

            // Test Aug 31 next year (should be $0)
            const aug31Result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2026-08-31')
            );

            expect(aug31Result.charges).toHaveLength(0);

            // Test Sept 1 next year (should be $1200)
            const sept1NextYearResult = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2026-09-01')
            );

            expect(sept1NextYearResult.charges).toHaveLength(1);
            expect(sept1NextYearResult.charges[0].amount).toBe(120000); // $1200

            // Test all other days between start date and Sept 1 next year are $0
            const randomDayResult = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2026-05-15')
            );

            expect(randomDayResult.charges).toHaveLength(0);
        });
    });

    describe('One-time charges', () => {
        it('should include unbilled one-time charges that occurred before or on billing date', async () => {
            // Setup
            const gym = await createTestGym();
            const member = await createTestMember(gym._id, 'Lisa', 'Garcia');

            // Create some one-time charges
            await createTestCharge(member._id, 500, 'T-shirt', new Date('2025-09-10'), false); // $5
            await createTestCharge(member._id, 300, 'Energy drink', new Date('2025-09-15'), false); // $3
            await createTestCharge(member._id, 200, 'Already billed', new Date('2025-09-14'), true); // $2 - already billed

            // Test Sept 15 billing
            const result = await DailyBillingEngine.generateDailyBillingCharges(
                gym._id,
                new Date('2025-09-15')
            );

            const oneTimeCharges = result.charges.filter(c => c.type === 'one-time-charge');
            expect(oneTimeCharges).toHaveLength(2); // T-shirt + Energy drink (not the billed one)

            const totalOneTimeAmount = oneTimeCharges.reduce((sum, c) => sum + c.amount, 0);
            expect(totalOneTimeAmount).toBe(800); // $5 + $3 = $8
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
        startDateTime: new Date('2025-01-01'),
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
    // Use the DailyBillingEngine's updateMembershipBillingDate method
    const membership = await Membership.findOne({ memberId, planId });
    if (membership) {
        await DailyBillingEngine.updateMembershipBillingDate(membership._id!.toString(), billingDate, planId);
    }
}
