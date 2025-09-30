import { Membership } from '../db/membership';
import { Member } from '../db/member';
import { Plan } from '../db/plan';
import { Charge } from '../db/charge';
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

export class DailyBillingEngine {
    /**
     * Generate billing charges for a specific date (daily billing)
     */
    static async generateDailyBillingCharges(
        gymId: string,
        billingDate: Date
    ): Promise<DailyBillingResult> {
        // Normalize billing date to midnight UTC
        const normalizedBillingDate = new Date(Date.UTC(
            billingDate.getUTCFullYear(),
            billingDate.getUTCMonth(),
            billingDate.getUTCDate()
        ));

        // Get all approved members for this gym
        const members = await Member.find({ gymId, status: 'approved' });

        // Get all charges (one-time charges and recurring charges)
        const oneTimeCharges = await this.getOneTimeCharges(members, normalizedBillingDate);
        const recurringCharges = await this.getRecurringCharges(members, normalizedBillingDate);

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

        // Find memberships where nextBilledDate matches the billing date
        // OR memberships that start on this date and have never been billed
        const memberships = await Membership.find({
            memberId: { $in: memberIds },
            $and: [
                // Condition 1: nextBilledDate matches OR membership starts today
                {
                    $or: [
                        // Case 1: nextBilledDate matches billing date
                        { nextBilledDate: billingDate },
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
     * Update membership lastBilledDate and nextBilledDate after successful billing
     */
    static async updateMembershipBillingDate(membershipId: string, billingDate: Date, planId?: string): Promise<void> {
        const updateData: any = {
            lastBilledDate: billingDate
        };

        // If we have a plan ID, calculate the next billing date
        if (planId) {
            const plan = await Plan.findById(planId);
            if (plan && plan.recurringPeriod) {
                updateData.nextBilledDate = this.calculateNextBillingDate(billingDate, plan.recurringPeriod);
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

                // Update membership lastBilledDate and nextBilledDate
                if (charge.membershipId) {
                    await this.updateMembershipBillingDate(charge.membershipId, new Date(), charge.planId);
                }
            }
        }
        return createdCount;
    }
}
