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
 * Generate billing preview for a given period
 */
async function generateBillingPreview(user: IUser | undefined, startDate: Date, endDate: Date) {
    console.log(
        `billingService.generateBillingPreview: Generating preview for ${startDate} to ${endDate} by user ${user?._id}`
    );

    const gym = await getCurrentUserGym(user);

    // Get all members for this gym with approved status
    const members = await Member.find({ gymId: gym._id, status: 'approved' });
    const memberIds = members.map((m) => m._id);
    console.log(`billingService.generateBillingPreview: Found ${members.length} approved members in gym ${gym._id}`);
    console.log(
        'billingService.generateBillingPreview: Approved member IDs:',
        memberIds.map((id) => id.toString())
    );

    // Get all memberships for approved members
    const allMemberships = await Membership.find({ memberId: { $in: memberIds } });
    console.log(
        `billingService.generateBillingPreview: Found ${allMemberships.length} memberships for approved members`
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
            isRecurring: plan?.isRecurring,
            isActive: plan?.isActive,
            startDateTime: plan?.startDateTime,
            endDateTime: plan?.endDateTime
        });
    });

    // Arrears billing calculations
    console.log('billingService.generateBillingPreview: Calculating arrears billing');

    const nonRecurringCharges = [];
    for (const membership of allMemberships) {
        const plan = planMap.get(membership.planId);
        if (plan && !plan.isRecurring && plan.isActive) {
            // Check if plan period overlaps with billing period
            const planStart = new Date(plan.startDateTime);
            const planEnd = plan.endDateTime ? new Date(plan.endDateTime) : new Date();

            if (planStart <= endDate && planEnd >= startDate) {
                const member = members.find((m) => m._id.toString() === membership.memberId.toString());
                nonRecurringCharges.push({
                    type: 'non-recurring-plan',
                    memberId: membership.memberId,
                    memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
                    planId: plan._id,
                    planName: plan.name,
                    amount: plan.price,
                    description: `Non-recurring plan: ${plan.name}`,
                    date: planStart
                });
            }
        }
    }

    console.log(`billingService.generateBillingPreview: Found ${nonRecurringCharges.length} non-recurring charges`);

    // 2. 1-time charges that haven't been billed yet
    const unbilledCharges = await Charge.find({
        memberId: { $in: memberIds },
        isBilled: false
    });

    const oneTimeCharges = unbilledCharges.map((charge) => {
        const member = members.find((m) => m._id.toString() === charge.memberId.toString());
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

        console.log(`billingService.generateBillingPreview: Processing membership for recurring:`, {
            memberId: membership.memberId.toString(),
            planExists: !!plan,
            planId: plan?._id?.toString(),
            planName: plan?.name,
            isRecurring: plan?.isRecurring,
            isActive: plan?.isActive,
            recurringPeriod: plan?.recurringPeriod
        });

        // Only process recurring plans that are active
        if (plan && plan.isRecurring && plan.isActive) {
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
                const member = members.find((m) => m._id.toString() === membership.memberId.toString());
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

    const allCharges = [...nonRecurringCharges, ...oneTimeCharges, ...recurringCharges];
    const totalAmount = allCharges.reduce((sum, charge) => sum + charge.amount, 0);

    console.log(
        `billingService.generateBillingPreview: Generated ${allCharges.length} charges totaling ${totalAmount} cents`
    );

    return {
        startDate,
        endDate,
        charges: allCharges,
        totalAmount,
        summary: {
            nonRecurringPlans: nonRecurringCharges.length,
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

    // Create charge records for each item
    const createdCharges = [];
    for (const charge of charges) {
        const newCharge = new Charge({
            memberId: charge.memberId,
            planId: charge.planId || undefined,
            amount: charge.amount,
            note: charge.description,
            chargeDate: charge.date,
            isBilled: true, // Mark as billed since this is a billing run
            billedDate: new Date()
        });

        const savedCharge = await newCharge.save();
        createdCharges.push(savedCharge);
    }

    // Mark existing one-time charges as billed
    const oneTimeChargeIds = charges.filter((c) => c.type === 'one-time-charge' && c.chargeId).map((c) => c.chargeId);

    if (oneTimeChargeIds.length > 0) {
        await Charge.updateMany(
            { _id: { $in: oneTimeChargeIds } },
            {
                isBilled: true,
                billedDate: new Date()
            }
        );
        console.log(`billingService.commitBillingRun: Marked ${oneTimeChargeIds.length} existing charges as billed`);
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

// API Endpoints

/**
 * POST /billing/preview
 * Generate billing preview for given period
 */
router.post(
    '/billing/preview',
    authenticateUser,
    authorizeRoles('user'),
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
    authorizeRoles('user'),
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
    authorizeRoles('user'),
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

export { router as billingRouter };
