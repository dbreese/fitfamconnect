import { Membership } from '../db/membership';
import { Member } from '../db/member';
import { Plan } from '../db/plan';
import { Charge } from '../db/charge';
import type { IMembership } from '../db/membership';
import type { IMember } from '../db/member';
import type { IPlan } from '../db/plan';

import type { ICharge } from '../db/charge';

export interface BillingChargeWithMeta extends Omit<ICharge, '_id' | 'createdAt' | 'updatedAt'> {
    memberName: string;
    planName?: string;
    type: 'recurring-plan' | 'one-time-charge' | 'pro-rated-charge';
    membershipId?: string; // Reference to the membership record
}

export interface BillingResult {
    charges: BillingChargeWithMeta[];
    summary: {
        recurringPlans: number;
        oneTimeCharges: number;
        proRatedCharges: number;
        totalCharges: number;
        totalAmount: number;
    };
    startDate: Date;
    endDate: Date;
}

export class BillingEngine {
    /**
     * Generate billing charges for a given period
     */
    static async generateBillingCharges(
        gymId: string,
        startDate: Date,
        endDate: Date
    ): Promise<BillingResult> {
        console.log(`BillingEngine: Generating charges for gym ${gymId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // Get all approved members for this gym
        const members = await Member.find({ gymId, status: 'approved' });
        console.log(`BillingEngine: Found ${members.length} approved members`);

        // Get all charges (one-time charges, recurring charges, pro-rated charges)
        const oneTimeCharges = await this.getOneTimeCharges(members, startDate, endDate);
        const recurringCharges = await this.getRecurringCharges(members, startDate, endDate);
        const proRatedCharges = await this.getProRatedCharges(members, startDate, endDate);

        const allCharges = [...oneTimeCharges, ...recurringCharges, ...proRatedCharges];
        const totalAmount = allCharges.reduce((sum, charge) => sum + charge.amount, 0);

        console.log(`BillingEngine: Generated ${allCharges.length} total charges worth ${totalAmount} cents`);

        return {
            charges: allCharges,
            summary: {
                recurringPlans: recurringCharges.length,
                oneTimeCharges: oneTimeCharges.length,
                proRatedCharges: proRatedCharges.length,
                totalCharges: allCharges.length,
                totalAmount
            },
            startDate,
            endDate
        };
    }

    /**
     * Get one-time charges that haven't been billed yet
     * Rule: isBilled=false and charge occurred before end date of billing cycle
     */
    private static async getOneTimeCharges(
        members: IMember[],
        startDate: Date,
        endDate: Date
    ): Promise<BillingChargeWithMeta[]> {
        const memberIds = members.map(m => m._id!.toString());

        // Get unbilled charges that occurred before the end of the billing period
        const unbilledCharges = await Charge.find({
            memberId: { $in: memberIds },
            isBilled: false,
            planId: { $exists: false }, // One-time charges don't have planId
            chargeDate: { $lte: endDate } // Note: No start date filter as per BILLING.md
        });

        console.log(`BillingEngine: Found ${unbilledCharges.length} unbilled one-time charges`);

        return unbilledCharges.map(charge => {
            const member = members.find(m => m._id!.toString() === charge.memberId.toString());
            return {
                memberId: charge.memberId.toString(),
                memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
                planId: charge.planId,
                productId: charge.productId,
                amount: charge.amount,
                note: charge.note || 'One-time charge',
                chargeDate: charge.chargeDate,
                isBilled: charge.isBilled,
                billedDate: charge.billedDate,
                billingId: charge.billingId,
                type: 'one-time-charge' as const
            };
        });
    }

    /**
     * Get recurring charges for active memberships
     */
    private static async getRecurringCharges(
        members: IMember[],
        startDate: Date,
        endDate: Date
    ): Promise<BillingChargeWithMeta[]> {
        const memberIds = members.map(m => m._id!.toString());

        // Get memberships that should be billed for this period (advance billing)
        // Only bill memberships that were active at the START of the billing period
        const activeMemberships = await Membership.find({
            memberId: { $in: memberIds },
            startDate: { $lte: startDate }, // Started before or on billing period start (advance billing)
            $or: [
                { endDate: { $exists: false } }, // No end date (ongoing)
                { endDate: null }, // Explicitly null
                { endDate: { $gt: startDate } } // Ends after billing period starts
            ]
        });

        console.log(`BillingEngine: Found ${activeMemberships.length} active memberships`);

        const recurringCharges: BillingChargeWithMeta[] = [];

        for (const membership of activeMemberships) {
            const plan = await Plan.findById(membership.planId);
            if (!plan || !plan.isActive) {
                console.log(`BillingEngine: Skipping membership ${membership._id} - plan not found or inactive`);
                continue;
            }

            const member = members.find(m => m._id!.toString() === membership.memberId.toString());
            if (!member) {
                console.log(`BillingEngine: Skipping membership ${membership._id} - member not found`);
                continue;
            }

            // Check if already billed for this period
            const alreadyBilled = await this.hasBeenBilledForPeriod(membership, plan, startDate, endDate);
            if (alreadyBilled) {
                console.log(`BillingEngine: Member ${member.firstName} ${member.lastName} already billed for plan ${plan.name} in this period`);
                continue;
            }

            // Check if should be billed based on plan frequency
            const shouldBill = await this.shouldBillForPeriod(membership, plan, startDate, endDate);
            if (!shouldBill) {
                console.log(`BillingEngine: Member ${member.firstName} ${member.lastName} should not be billed for plan ${plan.name} in this period`);
                continue;
            }

            recurringCharges.push({
                memberId: membership.memberId.toString(),
                memberName: `${member.firstName} ${member.lastName}`,
                planId: plan._id?.toString(),
                planName: plan.name,
                amount: plan.price,
                note: plan.name, // Carry forward the plan name
                chargeDate: startDate,
                isBilled: false,
                type: 'recurring-plan' as const,
                membershipId: membership._id?.toString()
            });
        }

        console.log(`BillingEngine: Generated ${recurringCharges.length} recurring charges`);
        return recurringCharges;
    }

    /**
     * Get pro-rated charges for memberships that started before billing period but haven't been billed
     */
    private static async getProRatedCharges(
        members: IMember[],
        startDate: Date,
        endDate: Date
    ): Promise<BillingChargeWithMeta[]> {
        const memberIds = members.map(m => m._id!.toString());

        // Find memberships that need pro-rated billing:
        // Only memberships that started MID-PERIOD and haven't been billed yet
        // Exclude memberships that started at the beginning of a billing period

        const proRateCandidates = await Membership.find({
            memberId: { $in: memberIds },
            lastBilledDate: { $exists: false }, // Never been billed
            $or: [
                // Case 1: Started during September for October billing (mid-month joins)
                {
                    startDate: {
                        $gt: new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1), // After Sept 1
                        $lt: startDate // Before Oct 1
                    }
                },
                // Case 2: Ended during the prior period (partial membership)
                {
                    endDate: {
                        $gte: new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1), // Ended during prior month
                        $lt: startDate // But before current billing
                    },
                    startDate: {
                        $lt: new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1) // Started before prior month
                    }
                }
            ]
        });

        console.log(`BillingEngine: Found ${proRateCandidates.length} memberships eligible for pro-rated billing`);

        const proRatedCharges: BillingChargeWithMeta[] = [];

        for (const membership of proRateCandidates) {
            console.log(`BillingEngine: Processing pro-rated candidate:`, {
                membershipId: membership._id,
                memberId: membership.memberId,
                planId: membership.planId,
                startDate: membership.startDate,
                endDate: membership.endDate,
                lastBilledDate: membership.lastBilledDate
            });

            const plan = await Plan.findById(membership.planId);
            if (!plan || !plan.isActive) {
                console.log(`BillingEngine: Skipping pro-rated candidate - plan not found or inactive`);
                continue;
            }

            const member = members.find(m => m._id!.toString() === membership.memberId.toString());
            if (!member) {
                console.log(`BillingEngine: Skipping pro-rated candidate - member not found`);
                continue;
            }

            // Check if this membership was active for the FULL prior period
            // If so, it should have been billed during regular billing, not pro-rated
            const priorPeriodStart = this.getPriorPeriodStart(startDate);
            const membershipStart = new Date(membership.startDate);

            // For monthly plans, check if they were active for the full month
            if (plan.recurringPeriod?.toLowerCase() === 'monthly') {
                const priorMonthStart = new Date(startDate);
                priorMonthStart.setMonth(priorMonthStart.getMonth() - 1);
                priorMonthStart.setDate(1);

                // If membership started at the beginning of the month, it should have been billed regularly
                if (membershipStart.getTime() === priorMonthStart.getTime()) {
                    console.log(`BillingEngine: Membership started at beginning of period, should have been billed regularly, not pro-rated`);
                    continue;
                }
            }

            // Calculate pro-rated amount based on how long they were active in the prior period
            const proRatedAmount = this.calculateProRatedAmount(
                membership,
                plan,
                startDate,
                endDate
            );

            console.log(`BillingEngine: Pro-rated amount calculated: ${proRatedAmount} cents`);

            if (proRatedAmount > 0) {
                console.log(`BillingEngine: Adding pro-rated charge for ${member.firstName} ${member.lastName}`);
                proRatedCharges.push({
                    memberId: membership.memberId.toString(),
                    memberName: `${member.firstName} ${member.lastName}`,
                    planId: plan._id?.toString(),
                    planName: plan.name,
                    amount: proRatedAmount,
                    note: `${plan.name} (pro-rated)`, // Plan name with pro-rated indicator
                    chargeDate: startDate,
                    isBilled: false,
                    type: 'pro-rated-charge' as const,
                    membershipId: membership._id?.toString()
                });
            } else {
                console.log(`BillingEngine: Pro-rated amount is 0, not adding charge`);
            }
        }

        console.log(`BillingEngine: Generated ${proRatedCharges.length} pro-rated charges`);
        return proRatedCharges;
    }

    /**
     * Check if membership has been billed for the current period
     */
    private static async hasBeenBilledForPeriod(
        membership: IMembership,
        plan: IPlan,
        startDate: Date,
        endDate: Date
    ): Promise<boolean> {
        if (!membership.lastBilledDate) {
            return false;
        }

        const lastBilled = new Date(membership.lastBilledDate);

        // Check based on plan frequency
        switch (plan.recurringPeriod?.toLowerCase()) {
            case 'weekly':
                // If billed within the last 6 days, don't bill again
                const sixDaysAgo = new Date(startDate);
                sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
                return lastBilled >= sixDaysAgo;

            case 'monthly':
                // If billed within the last 25 days, don't bill again
                const twentyFiveDaysAgo = new Date(startDate);
                twentyFiveDaysAgo.setDate(twentyFiveDaysAgo.getDate() - 25);
                return lastBilled >= twentyFiveDaysAgo;

            case 'quarterly':
                // If billed within the last 80 days, don't bill again
                const eightyDaysAgo = new Date(startDate);
                eightyDaysAgo.setDate(eightyDaysAgo.getDate() - 80);
                return lastBilled >= eightyDaysAgo;

            case 'yearly':
            case 'annual':
                // If billed within the last 350 days, don't bill again
                const threeFiftyDaysAgo = new Date(startDate);
                threeFiftyDaysAgo.setDate(threeFiftyDaysAgo.getDate() - 350);
                return lastBilled >= threeFiftyDaysAgo;

            default:
                // Unknown frequency, assume monthly
                const defaultThirtyDaysAgo = new Date(startDate);
                defaultThirtyDaysAgo.setDate(defaultThirtyDaysAgo.getDate() - 30);
                return lastBilled >= defaultThirtyDaysAgo;
        }
    }

    /**
     * Determine if membership should be billed for this period based on plan frequency
     */
    private static async shouldBillForPeriod(
        membership: IMembership,
        plan: IPlan,
        startDate: Date,
        endDate: Date
    ): Promise<boolean> {
        // If membership starts after the billing period, don't bill
        if (new Date(membership.startDate) > endDate) {
            return false;
        }

        // If membership ended before the billing period, don't bill
        if (membership.endDate && new Date(membership.endDate) < startDate) {
            return false;
        }

        return true;
    }

    /**
     * Calculate pro-rated amount based on days active in prior period
     */
    private static calculateProRatedAmount(
        membership: IMembership,
        plan: IPlan,
        billingStartDate: Date,
        billingEndDate: Date
    ): number {
        const membershipStart = new Date(membership.startDate);
        const membershipEnd = membership.endDate ? new Date(membership.endDate) : null;

        // Calculate the prior period based on plan frequency
        const priorPeriod = this.getPriorPeriod(plan, billingStartDate);

        // For monthly plans, use standard 30-day calculation as per BILLING.md
        let totalDaysInPeriod: number;
        let activeDaysInPeriod: number;

        if (plan.recurringPeriod?.toLowerCase() === 'monthly') {
            totalDaysInPeriod = 30; // Standard month as per BILLING.md

            // Calculate active days in the prior month (Sept 1-30 for Oct 1 billing)
            const priorMonthStart = new Date(billingStartDate);
            priorMonthStart.setMonth(priorMonthStart.getMonth() - 1);
            priorMonthStart.setDate(1); // First day of prior month (Sept 1)

            const priorMonthEnd = new Date(billingStartDate);
            priorMonthEnd.setDate(priorMonthEnd.getDate() - 1); // Day before billing start (Sept 30)

            console.log(`BillingEngine: Monthly pro-rated calculation periods:`, {
                priorMonthStart: priorMonthStart.toISOString(),
                priorMonthEnd: priorMonthEnd.toISOString(),
                membershipStart: membershipStart.toISOString(),
                membershipEnd: membershipEnd?.toISOString() || 'ongoing'
            });

            activeDaysInPeriod = this.calculateActiveDaysInPeriod(
                membershipStart,
                membershipEnd,
                priorMonthStart,
                priorMonthEnd
            );
        } else {
            // For other frequencies, use the existing logic
            activeDaysInPeriod = this.calculateActiveDaysInPeriod(
                membershipStart,
                membershipEnd,
                priorPeriod.start,
                priorPeriod.end
            );
            totalDaysInPeriod = this.getDaysBetween(priorPeriod.start, priorPeriod.end);
        }

        if (activeDaysInPeriod <= 0 || totalDaysInPeriod <= 0) {
            return 0;
        }

        // Calculate pro-rated amount: full price * (active days / total days)
        const proRatedAmount = Math.round(plan.price * (activeDaysInPeriod / totalDaysInPeriod));

        console.log(`BillingEngine: Pro-rated calculation for ${plan.name}:`, {
            membershipStart: membershipStart.toISOString(),
            membershipEnd: membershipEnd?.toISOString() || 'ongoing',
            billingStartDate: billingStartDate.toISOString(),
            priorPeriodStart: plan.recurringPeriod?.toLowerCase() === 'monthly' ?
                new Date(billingStartDate.getFullYear(), billingStartDate.getMonth() - 1, 1).toISOString() :
                'calculated',
            priorPeriodEnd: plan.recurringPeriod?.toLowerCase() === 'monthly' ?
                new Date(billingStartDate.getFullYear(), billingStartDate.getMonth(), 0).toISOString() :
                'calculated',
            fullPrice: plan.price,
            activeDays: activeDaysInPeriod,
            totalDays: totalDaysInPeriod,
            proRatedAmount,
            frequency: plan.recurringPeriod
        });

        return proRatedAmount;
    }

    /**
     * Get the start of the prior period (used for pro-rated billing queries)
     */
    private static getPriorPeriodStart(billingStartDate: Date): Date {
        // Default to monthly for pro-rated calculations
        const priorStart = new Date(billingStartDate);
        priorStart.setMonth(priorStart.getMonth() - 1);
        return priorStart;
    }

    /**
     * Get the prior period based on plan frequency
     */
    private static getPriorPeriod(plan: IPlan, billingStartDate: Date): { start: Date; end: Date } {
        const frequency = plan.recurringPeriod?.toLowerCase();

        switch (frequency) {
            case 'weekly':
                const weekStart = new Date(billingStartDate);
                weekStart.setDate(weekStart.getDate() - 7);
                return {
                    start: weekStart,
                    end: new Date(billingStartDate.getTime() - 1) // Day before billing start
                };

            case 'monthly':
                const monthStart = new Date(billingStartDate);
                monthStart.setMonth(monthStart.getMonth() - 1);
                return {
                    start: monthStart,
                    end: new Date(billingStartDate.getTime() - 1)
                };

            case 'quarterly':
                const quarterStart = new Date(billingStartDate);
                quarterStart.setMonth(quarterStart.getMonth() - 3);
                return {
                    start: quarterStart,
                    end: new Date(billingStartDate.getTime() - 1)
                };

            case 'yearly':
            case 'annual':
                const yearStart = new Date(billingStartDate);
                yearStart.setFullYear(yearStart.getFullYear() - 1);
                return {
                    start: yearStart,
                    end: new Date(billingStartDate.getTime() - 1)
                };

            default:
                // Default to monthly
                const defaultStart = new Date(billingStartDate);
                defaultStart.setMonth(defaultStart.getMonth() - 1);
                return {
                    start: defaultStart,
                    end: new Date(billingStartDate.getTime() - 1)
                };
        }
    }

    /**
     * Calculate how many days a member was active during a specific period
     * All dates are INCLUSIVE as per BILLING.md
     */
    private static calculateActiveDaysInPeriod(
        membershipStart: Date,
        membershipEnd: Date | null,
        periodStart: Date,
        periodEnd: Date
    ): number {
        // Normalize all dates to midnight for consistent comparison
        const normMembershipStart = new Date(membershipStart.getFullYear(), membershipStart.getMonth(), membershipStart.getDate());
        const normMembershipEnd = membershipEnd ? new Date(membershipEnd.getFullYear(), membershipEnd.getMonth(), membershipEnd.getDate()) : null;
        const normPeriodStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
        const normPeriodEnd = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());

        // Determine the actual active period within the given period (inclusive)
        const activeStart = normMembershipStart > normPeriodStart ? normMembershipStart : normPeriodStart;
        const activeEnd = normMembershipEnd && normMembershipEnd < normPeriodEnd ? normMembershipEnd : normPeriodEnd;

        // If membership didn't overlap with the period at all
        if (activeStart > activeEnd) {
            return 0;
        }

        return this.getDaysBetween(activeStart, activeEnd);
    }

    /**
     * Calculate days between two dates (inclusive)
     * Both start and end dates are included in the count
     */
    private static getDaysBetween(start: Date, end: Date): number {
        // Normalize dates to midnight to avoid time zone issues
        const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to make it inclusive
        return Math.max(0, diffDays);
    }

    /**
     * Get billing frequency in days
     */
    private static getBillingFrequencyDays(recurringPeriod: string): number {
        switch (recurringPeriod?.toLowerCase()) {
            case 'weekly':
                return 7;
            case 'monthly':
                return 30;
            case 'quarterly':
                return 90;
            case 'yearly':
            case 'annual':
                return 365;
            default:
                return 30; // Default to monthly
        }
    }

    /**
     * Update membership lastBilledDate after successful billing
     */
    static async updateMembershipBillingDate(membershipId: string, billingDate: Date): Promise<void> {
        await Membership.findByIdAndUpdate(membershipId, {
            lastBilledDate: billingDate
        });

        console.log(`BillingEngine: Updated lastBilledDate for membership ${membershipId}`);
    }

    /**
     * Create charge records from billing charges
     */
    static async createChargeRecords(charges: BillingChargeWithMeta[], billingId: string): Promise<number> {
        let createdCount = 0;

        for (const charge of charges) {
            // Only create new charge records for recurring and pro-rated charges
            // One-time charges already exist, just need to be marked as billed
            if (charge.type === 'one-time-charge') {
                // Mark existing charge as billed
                await Charge.findOneAndUpdate(
                    {
                        memberId: charge.memberId,
                        amount: charge.amount,
                        chargeDate: charge.chargeDate,
                        isBilled: false
                    },
                    {
                        isBilled: true,
                        billedDate: new Date(),
                        billingId
                    }
                );
            } else {
                // Create new charge record for recurring/pro-rated charges
                const newCharge = new Charge({
                    memberId: charge.memberId,
                    planId: charge.planId,
                    productId: charge.productId,
                    amount: charge.amount,
                    note: charge.note,
                    chargeDate: charge.chargeDate,
                    isBilled: true,
                    billedDate: new Date(),
                    billingId
                });

                await newCharge.save();
                createdCount++;

                // Update membership lastBilledDate
                if (charge.membershipId) {
                    await this.updateMembershipBillingDate(charge.membershipId, new Date());
                }
            }
        }

        console.log(`BillingEngine: Created ${createdCount} new charge records`);
        return createdCount;
    }
}
