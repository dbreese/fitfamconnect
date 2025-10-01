import { Membership } from '../db/membership';
import { Member } from '../db/member';
import { Plan } from '../db/plan';
import { Charge } from '../db/charge';
import { Gym } from '../db/gym';
import type { IMembership } from '../db/membership';
import type { IMember } from '../db/member';
import type { IPlan } from '../db/plan';
import type { ICharge } from '../db/charge';

export interface DailyBillingChargeWithMeta extends Omit<ICharge, '_id' | 'createdAt' | 'updatedAt'> {
    memberName: string;
    planName?: string;
    type: 'recurring-plan' | 'one-time-charge';
    membershipId?: string; // Reference to the membership record
    chargeId?: string; // Original charge ID for one-time charges
}

export interface DailyBillingResult {
    charges: DailyBillingChargeWithMeta[];
    summary: {
        recurringPlans: number;
        oneTimeCharges: number;
        totalCharges: number;
        totalAmount: number;
    };
    billingDate: Date;
}

export interface DailyBillingRangeResult {
    chargesByDate: Map<string, DailyBillingChargeWithMeta[]>;
    allCharges: DailyBillingChargeWithMeta[];
    summary: {
        recurringPlans: number;
        oneTimeCharges: number;
        totalCharges: number;
        totalAmount: number;
        daysProcessed: number;
    };
    startDate: Date;
    endDate: Date;
}

export class DailyBillingEngine {
    /**
     * Get the default start date for billing based on Gym's lastBillingRunDate
     * If no lastBillingRunDate exists, use the Gym's createdAt date
     */
    static async getDefaultStartDate(gymId: string): Promise<Date> {
        const gym = await Gym.findById(gymId);
        if (!gym) {
            throw new Error('Gym not found');
        }

        // Use lastBillingRunDate if it exists, otherwise use createdAt
        const defaultStartDate = gym.lastBillingRunDate || gym.createdAt;

        // Normalize to midnight UTC
        return new Date(Date.UTC(
            defaultStartDate.getUTCFullYear(),
            defaultStartDate.getUTCMonth(),
            defaultStartDate.getUTCDate()
        ));
    }

    /**
     * Generate billing charges for a date range (iterates day-by-day)
     * This is used for batch billing when catching up on multiple days
     */
    static async generateDailyBillingChargesForRange(
        gymId: string,
        endDate: Date,
        startDate?: Date
    ): Promise<DailyBillingRangeResult> {
        // Use default start date if not provided
        const actualStartDate = startDate || await this.getDefaultStartDate(gymId);

        console.log('generateDailyBillingChargesForRange: ', {gymId, startDate: actualStartDate, endDate});

        // Normalize dates to midnight UTC
        const normalizedStart = new Date(Date.UTC(
            actualStartDate.getUTCFullYear(),
            actualStartDate.getUTCMonth(),
            actualStartDate.getUTCDate()
        ));

        const normalizedEnd = new Date(Date.UTC(
            endDate.getUTCFullYear(),
            endDate.getUTCMonth(),
            endDate.getUTCDate()
        ));

        // Fetch members once for the entire range (optimization)
        const members = await Member.find({ gymId, status: 'approved' });

        const chargesByDate = new Map<string, DailyBillingChargeWithMeta[]>();
        const allCharges: DailyBillingChargeWithMeta[] = [];
        const processedOneTimeCharges = new Set<string>(); // Track processed one-time charges
        let daysProcessed = 0;

        // Iterate through each day in the range
        let currentDate = new Date(normalizedStart);

        while (currentDate <= normalizedEnd) {
            // Generate charges for this specific day, passing in pre-fetched members
            const dayResult = await this.generateDailyBillingCharges(gymId, new Date(currentDate), members);

            // Filter out one-time charges that have already been processed in this multi-day billing run
            const filteredCharges = dayResult.charges.filter(charge => {
                if (charge.type === 'one-time-charge' && charge.chargeId) {
                    if (processedOneTimeCharges.has(charge.chargeId)) {
                        return false; // Skip this one-time charge, already processed in this billing run
                    }
                    processedOneTimeCharges.add(charge.chargeId);
                }
                // Always include recurring charges (they can be billed multiple times)
                return true;
            });

            // Store charges by date (only if there are charges)
            const dateKey = currentDate.toISOString().split('T')[0];
            if (filteredCharges.length > 0) {
                chargesByDate.set(dateKey, filteredCharges);
            }

            // Accumulate all charges
            allCharges.push(...filteredCharges);

            daysProcessed++;

            // Move to next day
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        // Calculate totals
        const totalAmount = allCharges.reduce((sum, charge) => sum + charge.amount, 0);
        const recurringPlans = allCharges.filter(c => c.type === 'recurring-plan').length;
        const oneTimeCharges = allCharges.filter(c => c.type === 'one-time-charge').length;

        return {
            chargesByDate,
            allCharges,
            summary: {
                recurringPlans,
                oneTimeCharges,
                totalCharges: allCharges.length,
                totalAmount,
                daysProcessed
            },
            startDate: normalizedStart,
            endDate: normalizedEnd
        };
    }

    /**
     * Generate billing charges for a specific date (daily billing)
     * Private method - use generateDailyBillingChargesForRange for public API
     */
    private static async generateDailyBillingCharges(
        gymId: string,
        billingDate: Date,
        members?: IMember[]
    ): Promise<DailyBillingResult> {
        // Normalize billing date to midnight UTC
        const normalizedBillingDate = new Date(Date.UTC(
            billingDate.getUTCFullYear(),
            billingDate.getUTCMonth(),
            billingDate.getUTCDate()
        ));

        // Get all approved members for this gym (if not provided)
        const gymMembers = members || await Member.find({ gymId, status: 'approved' });

        // Get all charges (one-time charges and recurring charges)
        const oneTimeCharges = await this.getOneTimeCharges(gymMembers, normalizedBillingDate);
        const recurringCharges = await this.getRecurringCharges(gymMembers, normalizedBillingDate);

        const allCharges = [...oneTimeCharges, ...recurringCharges];
        const totalAmount = allCharges.reduce((sum, charge) => sum + charge.amount, 0);

        return {
            charges: allCharges,
            summary: {
                recurringPlans: recurringCharges.length,
                oneTimeCharges: oneTimeCharges.length,
                totalCharges: allCharges.length,
                totalAmount
            },
            billingDate: normalizedBillingDate
        };
    }

    /**
     * Get one-time charges that haven't been billed yet
     * Rule: isBilled=false and charge occurred before end of billing date
     */
    private static async getOneTimeCharges(
        members: IMember[],
        billingDate: Date
    ): Promise<DailyBillingChargeWithMeta[]> {
        const memberIds = members.map(m => m._id!.toString());

        // Get unbilled charges that occurred before or on the billing date
        const unbilledCharges = await Charge.find({
            memberId: { $in: memberIds },
            isBilled: false,
            planId: { $exists: false }, // One-time charges don't have planId
            chargeDate: { $lte: billingDate } // Occurred before or on billing date
        });

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
                type: 'one-time-charge' as const,
                chargeId: charge._id?.toString()
            };
        });
    }

    /**
     * Get recurring charges for memberships where nextBilledDate matches today
     */
    private static async getRecurringCharges(
        members: IMember[],
        billingDate: Date
    ): Promise<DailyBillingChargeWithMeta[]> {
        const memberIds = members.map(m => m._id!.toString());

        // Find memberships where nextBillDate matches the billing date
        // OR memberships that start on this date and have never been billed
        const memberships = await Membership.find({
            memberId: { $in: memberIds },
            $and: [
                // Condition 1: nextBillDate matches OR membership starts today
                {
                    $or: [
                        // Case 1: nextBillDate matches billing date
                        { nextBillDate: billingDate },
                        // Case 2: Membership starts today and has never been billed
                        {
                            startDate: billingDate,
                            lastBilledDate: { $exists: false }
                        }
                    ]
                },
                // Condition 2: Membership is still active
                {
                    $or: [
                        { endDate: { $exists: false } },
                        { endDate: null },
                        { endDate: { $gte: billingDate } }
                    ]
                }
            ]
        });

        const recurringCharges: DailyBillingChargeWithMeta[] = [];

        for (const membership of memberships) {
            const plan = await Plan.findById(membership.planId);
            if (!plan || !plan.isActive) {
                continue;
            }

            const member = members.find(m => m._id!.toString() === membership.memberId.toString());
            if (!member) {
                continue;
            }

            recurringCharges.push({
                memberId: membership.memberId.toString(),
                memberName: `${member.firstName} ${member.lastName}`,
                planId: plan._id?.toString(),
                planName: plan.name,
                amount: plan.price,
                note: plan.name,
                chargeDate: billingDate,
                isBilled: false,
                type: 'recurring-plan' as const,
                membershipId: membership._id?.toString()
            });
        }

        return recurringCharges;
    }

    /**
     * Calculate the next billing date based on the plan's recurring period
     */
    private static calculateNextBillingDate(billingDate: Date, recurringPeriod: string): Date {
        // Create a new date to avoid mutating the original
        const nextDate = new Date(billingDate.getTime());

        switch (recurringPeriod?.toLowerCase()) {
            case 'weekly':
                nextDate.setUTCDate(nextDate.getUTCDate() + 7);
                break;
            case 'monthly':
                nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
                break;
            case 'quarterly':
                nextDate.setUTCMonth(nextDate.getUTCMonth() + 3);
                break;
            case 'yearly':
            case 'annual':
                nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
                break;
            default:
                // Default to monthly if unknown
                nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
                break;
        }

        return nextDate;
    }

    /**
     * Update membership lastBilledDate and nextBillDate after successful billing
     */
    static async updateMembershipBillingDate(membershipId: string, billingDate: Date, planId?: string): Promise<void> {
        const updateData: any = {
            lastBilledDate: billingDate
        };

        // If we have a plan ID, calculate the next billing date
        if (planId) {
            const plan = await Plan.findById(planId);
            if (plan && plan.recurringPeriod) {
                updateData.nextBillDate = this.calculateNextBillingDate(billingDate, plan.recurringPeriod);
            }
        }

        await Membership.findByIdAndUpdate(membershipId, updateData);
    }

    /**
     * Create charge records from daily billing charges
     */
    static async createChargeRecords(charges: DailyBillingChargeWithMeta[], billingId: string): Promise<number> {
        let createdCount = 0;

        for (const charge of charges) {
            // Only create new charge records for recurring charges
            // One-time charges already exist, just need to be marked as billed
            if (charge.type === 'one-time-charge') {
                // Mark existing charge as billed using the charge ID
                if (charge.chargeId) {
                    await Charge.findByIdAndUpdate(
                        charge.chargeId,
                        {
                            isBilled: true,
                            billedDate: new Date(),
                            billingId
                        }
                    );
                }
            } else {
                // Create new charge record for recurring charges
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

                // Update membership lastBilledDate and nextBillDate
                if (charge.membershipId) {
                    await this.updateMembershipBillingDate(charge.membershipId, new Date(), charge.planId);
                }
            }
        }
        return createdCount;
    }
}
