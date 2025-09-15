import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import type { IUser } from '../db/user';
import { Gym } from '../db/gym';
import { Member } from '../db/member';
import { Membership } from '../db/membership';
import { Plan } from '../db/plan';
import { Charge } from '../db/charge';
import { Billing, type IBilling } from '../db/billing';
import type { ServerResponse } from '../../shared/ServerResponse';

// Helper class for creating server responses
class ResponseHelper {
    static success(data: any, message: string = 'Success'): ServerResponse {
        return {
            responseCode: 200,
            body: {
                message,
                data
            }
        };
    }

    static created(data: any, message: string = 'Created'): ServerResponse {
        return {
            responseCode: 201,
            body: {
                message,
                data
            }
        };
    }

    static error(message: string, code: number = 500): ServerResponse {
        return {
            responseCode: code,
            body: {
                message
            }
        };
    }
}

export const router = Router();

/**
 * Get current user's gym
 */
async function getCurrentUserGym(user: IUser | undefined) {
    if (!user) {
        throw new Error('No user provided');
    }

    const gym = await Gym.findOne({ ownerId: user._id });
    if (!gym) {
        throw new Error('Gym not found for user');
    }

    return gym;
}

/**
 * Check if billing period overlaps with existing billing records
 */
async function checkBillingPeriodOverlap(user: IUser | undefined, startDate: Date, endDate: Date) {
    console.log(`billingService.checkBillingPeriodOverlap: Checking for overlaps for period ${startDate} to ${endDate}`);

    // Find existing billing records that overlap with the requested period
    // Two periods overlap if: start1 < end2 AND start2 < end1
    const overlappingBilling = await Billing.find({
        memberId: user!._id,
        $or: [
            // Existing billing starts before requested period ends AND existing billing ends after requested period starts
            {
                startDate: { $lt: endDate },
                endDate: { $gt: startDate }
            }
        ]
    });

    console.log(`billingService.checkBillingPeriodOverlap: Found ${overlappingBilling.length} overlapping billing records`);

    if (overlappingBilling.length > 0) {
        const overlappingPeriods = overlappingBilling.map(billing => ({
            startDate: billing.startDate,
            endDate: billing.endDate,
            billingDate: billing.billingDate
        }));

        console.log('billingService.checkBillingPeriodOverlap: Overlapping periods:', overlappingPeriods);
        return overlappingPeriods;
    }

    return null;
}

/**
 * Generate billing preview for a given period
 */
async function generateBillingPreview(user: IUser | undefined, startDate: Date, endDate: Date) {
    console.log(
        `billingService.generateBillingPreview: Generating preview for ${startDate} to ${endDate} by user ${user?._id}`
    );

    const gym = await getCurrentUserGym(user);

    // Get all members for this gym with approved status
    const allApprovedMembers = await Member.find({ gymId: gym._id, status: 'approved' });
    console.log(`billingService.generateBillingPreview: Found ${allApprovedMembers.length} approved members in gym ${gym._id}`);

    const memberIds = allApprovedMembers.map((m) => m._id);

    // Get all active memberships for approved members that are active during the billing period
    const allMemberships = await Membership.find({
        memberId: { $in: memberIds },
        startDate: { $lte: endDate }, // Membership started before or during billing period
        $or: [
            { endDate: { $exists: false } }, // No end date (ongoing)
            { endDate: null }, // Explicitly null
            { endDate: { $gte: startDate } } // End date is after billing period start
        ]
    });
    console.log(
        `billingService.generateBillingPreview: Found ${allMemberships.length} memberships for active members`
    );

    // Get all unique plan IDs from memberships
    const planIds = [...new Set(allMemberships.map((m) => m.planId))];
    console.log(`billingService.generateBillingPreview: Found ${planIds.length} unique plan IDs:`, planIds);

    // Fetch all plans for these memberships
    const plans = await Plan.find({ _id: { $in: planIds } });
    console.log(`billingService.generateBillingPreview: Found ${plans.length} plans in database`);

    // Create a map for quick plan lookup
    const planMap = new Map();
    plans.forEach((plan) => {
        planMap.set(plan._id.toString(), plan);
    });

    // Log membership details with plan information
    allMemberships.forEach((membership, index) => {
        const plan = planMap.get(membership.planId);
        console.log(`billingService.generateBillingPreview: Membership ${index + 1}:`, {
            memberId: membership.memberId.toString(),
            planId: membership.planId,
            planName: plan?.name,
            isActive: plan?.isActive,
            recurringPeriod: plan?.recurringPeriod,
            startDateTime: plan?.startDateTime,
            endDateTime: plan?.endDateTime
        });
    });

    // All plans are now recurring, so we only need to handle recurring plan billing
    console.log('billingService.generateBillingPreview: Calculating recurring plan billing');

    // 2. 1-time charges that haven't been billed yet and fall within the billing period
    const unbilledCharges = await Charge.find({
        memberId: { $in: memberIds },
        isBilled: false,
        chargeDate: {
            $gte: startDate,
            $lte: endDate
        }
    });

    const oneTimeCharges = unbilledCharges.map((charge) => {
        const member = allApprovedMembers.find((m) => m._id.toString() === charge.memberId.toString());
        return {
            type: 'one-time-charge',
            chargeId: charge._id,
            memberId: charge.memberId,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
            amount: charge.amount,
            description: charge.note || 'One-time charge',
            date: charge.chargeDate
        };
    });

    // Advance billing calculations
    console.log('billingService.generateBillingPreview: Calculating advance billing');

    const recurringCharges = [];
    for (const membership of allMemberships) {
        const plan = planMap.get(membership.planId);

        console.log(`billingService.generateBillingPreview: Processing membership for plan:`, {
            memberId: membership.memberId.toString(),
            planExists: !!plan,
            planId: plan?._id?.toString(),
            planName: plan?.name,
            isActive: plan?.isActive,
            recurringPeriod: plan?.recurringPeriod
        });

        // Only process plans that are active (all plans are now recurring)
        if (plan && plan.isActive) {
            console.log(`billingService.generateBillingPreview: Found active recurring plan: ${plan.name}`);

            // Check if the recurring plan should be active during the billing period
            const planStart = new Date(plan.startDateTime);
            const planEnd = plan.endDateTime ? new Date(plan.endDateTime) : null;

            console.log(`billingService.generateBillingPreview: Checking period overlap:`, {
                planStart: planStart.toISOString(),
                planEnd: planEnd?.toISOString() || 'No end date',
                billingStart: startDate.toISOString(),
                billingEnd: endDate.toISOString()
            });

            // For recurring plans, they should be active if:
            // 1. Plan started before or during the billing period AND
            // 2. Plan hasn't ended yet (or has no end date) OR plan ends after billing period starts
            const planActiveInPeriod = planStart <= endDate && (!planEnd || planEnd >= startDate);

            console.log(`billingService.generateBillingPreview: Plan active in period: ${planActiveInPeriod}`);

            if (planActiveInPeriod) {
                // CRITICAL: Check if member has already been billed for this plan during this billing period
                const existingBilledCharge = await Charge.findOne({
                    memberId: membership.memberId,
                    planId: plan._id,
                    isBilled: true,
                    billingId: { $exists: true },
                    chargeDate: {
                        $gte: startDate,
                        $lte: endDate
                    }
                });

                if (existingBilledCharge) {
                    console.log(`billingService.generateBillingPreview: Member ${membership.memberId} already billed for plan ${plan.name} during this period. Skipping.`);
                    continue;
                }

                // Additional check: For longer-term plans (yearly, etc.), check if they've been billed recently
                // This prevents over-billing for plans that should only be billed once per period
                const planRecurringPeriod = plan.recurringPeriod?.toLowerCase();
                if (planRecurringPeriod && (planRecurringPeriod.includes('year') || planRecurringPeriod.includes('annual'))) {
                    // For yearly plans, check if billed in the last 11 months
                    const elevenMonthsAgo = new Date();
                    elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);

                    const recentBilledCharge = await Charge.findOne({
                        memberId: membership.memberId,
                        planId: plan._id,
                        isBilled: true,
                        billingId: { $exists: true },
                        chargeDate: { $gte: elevenMonthsAgo }
                    });

                    if (recentBilledCharge) {
                        console.log(`billingService.generateBillingPreview: Member ${membership.memberId} already billed for yearly plan ${plan.name} within the last 11 months. Skipping.`);
                        continue;
                    }
                } else if (planRecurringPeriod && (planRecurringPeriod.includes('month'))) {
                    // For monthly plans, check if billed in the last 30 days
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    const recentBilledCharge = await Charge.findOne({
                        memberId: membership.memberId,
                        planId: plan._id,
                        isBilled: true,
                        billingId: { $exists: true },
                        chargeDate: { $gte: thirtyDaysAgo }
                    });

                    if (recentBilledCharge) {
                        console.log(`billingService.generateBillingPreview: Member ${membership.memberId} already billed for monthly plan ${plan.name} within the last 30 days. Skipping.`);
                        continue;
                    }
                }

                const member = allApprovedMembers.find((m) => m._id.toString() === membership.memberId.toString());
                const charge = {
                    type: 'recurring-plan',
                    memberId: membership.memberId,
                    memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
                    planId: plan._id,
                    planName: plan.name,
                    amount: plan.price,
                    description: `Recurring plan: ${plan.name} (${plan.recurringPeriod})`,
                    date: startDate // Use billing start date for recurring charges
                };

                console.log(`billingService.generateBillingPreview: Adding recurring charge:`, charge);
                recurringCharges.push(charge);
            }
        }
    }

    console.log(`billingService.generateBillingPreview: Found ${recurringCharges.length} recurring charges`);

    const allCharges = [...oneTimeCharges, ...recurringCharges];
    const totalAmount = allCharges.reduce((sum, charge) => sum + charge.amount, 0);

    console.log(
        `billingService.generateBillingPreview: Generated ${allCharges.length} charges totaling ${totalAmount} cents`
    );

    // Group charges by member and calculate subtotals
    const memberChargeGroups = new Map();

    allCharges.forEach((charge) => {
        const memberId = charge.memberId.toString();
        if (!memberChargeGroups.has(memberId)) {
            memberChargeGroups.set(memberId, {
                memberId,
                memberName: charge.memberName,
                charges: [],
                subtotal: 0
            });
        }

        const group = memberChargeGroups.get(memberId);
        group.charges.push(charge);
        group.subtotal += charge.amount;
    });

    // Convert to array and sort by member name
    const groupedCharges = Array.from(memberChargeGroups.values()).sort((a, b) =>
        a.memberName.localeCompare(b.memberName)
    );

    // Create flattened charges array for display, sorted by member
    const sortedCharges: any[] = [];
    groupedCharges.forEach((group) => {
        // Sort charges within each member group by type then description
        const sortedMemberCharges = group.charges.sort((a: any, b: any) => {
            if (a.type !== b.type) {
                // Order: recurring-plan, one-time-charge
                const typeOrder: { [key: string]: number } = {
                    'recurring-plan': 1,
                    'one-time-charge': 2
                };
                return typeOrder[a.type] - typeOrder[b.type];
            }
            return a.description.localeCompare(b.description);
        });

        sortedCharges.push(...sortedMemberCharges);
    });

    return {
        startDate,
        endDate,
        charges: sortedCharges,
        groupedCharges,
        totalAmount,
        summary: {
            oneTimeCharges: oneTimeCharges.length,
            recurringPlans: recurringCharges.length,
            totalCharges: allCharges.length
        }
    };
}

/**
 * Commit billing run - create billing record and charge records
 */
async function commitBillingRun(user: IUser | undefined, startDate: Date, endDate: Date, charges: any[]) {
    console.log(
        `billingService.commitBillingRun: Committing billing run for ${startDate} to ${endDate} by user ${user?._id}`
    );

    const gym = await getCurrentUserGym(user);

    // Create billing record
    const billingRecord = new Billing({
        memberId: user!._id,
        billingDate: new Date(),
        startDate,
        endDate
    });

    const savedBilling = await billingRecord.save();
    console.log(`billingService.commitBillingRun: Created billing record ${savedBilling._id}`);

    // Separate recurring plan charges (create new) from one-time charges (mark existing as billed)
    const recurringPlanCharges = charges.filter((c) => c.type === 'recurring-plan');
    const oneTimeCharges = charges.filter((c) => c.type === 'one-time-charge' && c.chargeId);

    console.log(`billingService.commitBillingRun: Processing ${recurringPlanCharges.length} recurring charges and ${oneTimeCharges.length} one-time charges`);

    // Create NEW charge records only for recurring plans
    const createdCharges = [];
    for (const charge of recurringPlanCharges) {
        const newCharge = new Charge({
            memberId: charge.memberId,
            planId: charge.planId || undefined,
            amount: charge.amount,
            note: charge.description,
            chargeDate: charge.date,
            isBilled: true, // Mark as billed since this is a billing run
            billedDate: new Date(),
            billingId: savedBilling._id.toString() // Link to the billing record
        });

        const savedCharge = await newCharge.save();
        createdCharges.push(savedCharge);
    }

    // Mark existing one-time charges as billed (don't create new records)
    const oneTimeChargeIds = oneTimeCharges.map((c) => c.chargeId);

    if (oneTimeChargeIds.length > 0) {
        await Charge.updateMany(
            { _id: { $in: oneTimeChargeIds } },
            {
                isBilled: true,
                billedDate: new Date(),
                billingId: savedBilling._id.toString() // Link to the billing record
            }
        );
        console.log(`billingService.commitBillingRun: Marked ${oneTimeChargeIds.length} existing one-time charges as billed`);
    }

    console.log(`billingService.commitBillingRun: Created ${createdCharges.length} new charge records`);

    return {
        billingId: savedBilling._id,
        chargesCreated: createdCharges.length,
        existingChargesBilled: oneTimeChargeIds.length
    };
}

/**
 * Get billing history for current user's gym
 */
async function getBillingHistory(user: IUser | undefined) {
    console.log(`billingService.getBillingHistory: Getting billing history for user ${user?._id}`);

    const gym = await getCurrentUserGym(user);

    const billingRecords = await Billing.find({ memberId: user!._id }).sort({ billingDate: -1 }).limit(50); // Limit to last 50 billing runs

    console.log(`billingService.getBillingHistory: Found ${billingRecords.length} billing records`);

    return billingRecords;
}

/**
 * Get billing details (charges) for a specific billing run
 */
async function getBillingDetails(user: IUser | undefined, billingId: string) {
    console.log(`billingService.getBillingDetails: Getting details for billing ${billingId} by user ${user?._id}`);

    const gym = await getCurrentUserGym(user);

    // Verify the billing record belongs to this user
    const billingRecord = await Billing.findOne({ _id: billingId, memberId: user!._id });
    if (!billingRecord) {
        console.log(`billingService.getBillingDetails: Billing record not found or access denied`);
        return null;
    }

    // Get all charges for this billing run
    const charges = await Charge.find({ billingId: billingId });
    console.log(`billingService.getBillingDetails: Found ${charges.length} charges for billing ${billingId}`);

    // Get member details for each charge
    const memberIds = [...new Set(charges.map(c => c.memberId))];
    const members = await Member.find({ _id: { $in: memberIds } });
    const memberMap = new Map(members.map(m => [m._id.toString(), m]));

    // Get plan details for charges that have planId
    const planIds = [...new Set(charges.filter(c => c.planId).map(c => c.planId))];
    const plans = await Plan.find({ _id: { $in: planIds } });
    const planMap = new Map(plans.map(p => [p._id.toString(), p]));

    // Format charges with member and plan details
    const formattedCharges = charges.map(charge => {
        const member = memberMap.get(charge.memberId.toString());
        const plan = charge.planId ? planMap.get(charge.planId.toString()) : null;

        return {
            type: plan ? 'recurring-plan' : 'one-time-charge',
            chargeId: charge._id,
            memberId: charge.memberId,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
            planId: charge.planId,
            planName: plan ? plan.name : null,
            amount: charge.amount,
            description: charge.note || (plan ? `Recurring plan: ${plan.name}` : 'One-time charge'),
            date: charge.chargeDate
        };
    });

    // Group charges by member
    const memberChargeGroups = new Map();
    formattedCharges.forEach(charge => {
        const memberId = charge.memberId.toString();
        if (!memberChargeGroups.has(memberId)) {
            memberChargeGroups.set(memberId, {
                memberId,
                memberName: charge.memberName,
                charges: [],
                subtotal: 0
            });
        }
        const group = memberChargeGroups.get(memberId);
        group.charges.push(charge);
        group.subtotal += charge.amount;
    });

    const groupedCharges = Array.from(memberChargeGroups.values()).sort((a, b) =>
        a.memberName.localeCompare(b.memberName)
    );

    const totalAmount = formattedCharges.reduce((sum, charge) => sum + charge.amount, 0);

    return {
        billingRecord,
        charges: formattedCharges,
        groupedCharges,
        totalAmount,
        summary: {
            oneTimeCharges: formattedCharges.filter(c => c.type === 'one-time-charge').length,
            recurringPlans: formattedCharges.filter(c => c.type === 'recurring-plan').length,
            totalCharges: formattedCharges.length
        }
    };
}

// API Endpoints

/**
 * POST /billing/preview
 * Generate billing preview for given period
 */
router.post(
    '/billing/preview',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('billingService.POST /billing/preview: Request received', req.body);

            const { startDate, endDate } = req.body;

            if (!startDate || !endDate) {
                return res.status(400).json(ResponseHelper.error('Start date and end date are required', 400));
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (end <= start) {
                return res.status(400).json(ResponseHelper.error('End date must be after start date', 400));
            }

            // Check for overlapping billing periods
            const overlappingPeriods = await checkBillingPeriodOverlap(req.user, start, end);
            if (overlappingPeriods) {
                const errorMessage = `Billing period overlaps with existing billing records. Overlapping periods: ${overlappingPeriods.map(p => `${p.startDate.toISOString().split('T')[0]} to ${p.endDate.toISOString().split('T')[0]}`).join(', ')}`;
                return res.status(409).json(ResponseHelper.error(errorMessage, 409));
            }

            const preview = await generateBillingPreview(req.user, start, end);

            console.log('billingService.POST /billing/preview: Response sent successfully');
            res.status(200).json(ResponseHelper.success(preview, 'Billing preview generated successfully'));
        } catch (error) {
            console.error('billingService.POST /billing/preview: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to generate billing preview', 500));
        }
    }
);

/**
 * POST /billing/commit
 * Commit billing run
 */
router.post(
    '/billing/commit',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('billingService.POST /billing/commit: Request received', req.body);

            const { startDate, endDate, charges } = req.body;

            if (!startDate || !endDate || !Array.isArray(charges)) {
                return res
                    .status(400)
                    .json(ResponseHelper.error('Start date, end date, and charges array are required', 400));
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (end <= start) {
                return res.status(400).json(ResponseHelper.error('End date must be after start date', 400));
            }

            // Check for overlapping billing periods
            const overlappingPeriods = await checkBillingPeriodOverlap(req.user, start, end);
            if (overlappingPeriods) {
                const errorMessage = `Billing period overlaps with existing billing records. Overlapping periods: ${overlappingPeriods.map(p => `${p.startDate.toISOString().split('T')[0]} to ${p.endDate.toISOString().split('T')[0]}`).join(', ')}`;
                return res.status(409).json(ResponseHelper.error(errorMessage, 409));
            }

            const result = await commitBillingRun(req.user, start, end, charges);

            console.log('billingService.POST /billing/commit: Response sent successfully');
            res.status(201).json(ResponseHelper.created(result, 'Billing run committed successfully'));
        } catch (error) {
            console.error('billingService.POST /billing/commit: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to commit billing run', 500));
        }
    }
);

/**
 * GET /billing/history
 * Get billing history
 */
router.get(
    '/billing/history',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('billingService.GET /billing/history: Request received');

            const history = await getBillingHistory(req.user);

            console.log('billingService.GET /billing/history: Response sent successfully');
            res.status(200).json(ResponseHelper.success(history, 'Billing history retrieved successfully'));
        } catch (error) {
            console.error('billingService.GET /billing/history: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to retrieve billing history', 500));
        }
    }
);

/**
 * GET /billing/details/:billingId
 * Get billing details for a specific billing run
 */
router.get(
    '/billing/details/:billingId',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { billingId } = req.params;
            console.log('billingService.GET /billing/details: Request received', { billingId });

            const details = await getBillingDetails(req.user, billingId);

            if (!details) {
                return res.status(404).json(ResponseHelper.error('Billing record not found', 404));
            }

            console.log('billingService.GET /billing/details: Response sent successfully');
            res.status(200).json(ResponseHelper.success(details, 'Billing details retrieved successfully'));
        } catch (error) {
            console.error('billingService.GET /billing/details: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to retrieve billing details', 500));
        }
    }
);

export { router as billingRouter };
