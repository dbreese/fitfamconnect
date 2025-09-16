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
import { BillingEngine } from './engine';

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
 * Get billing history for current user's gym with statistics (owner access)
 */
async function getBillingHistory(user: IUser | undefined) {
    console.log(`billingService.getBillingHistory: Getting billing history for user ${user?._id}`);

    const gym = await getCurrentUserGym(user);

    const billingRecords = await Billing.find({ memberId: user!._id }).sort({ billingDate: -1 }).limit(50); // Limit to last 50 billing runs

    console.log(`billingService.getBillingHistory: Found ${billingRecords.length} billing records`);

    // Get statistics for each billing record
    const billingRecordsWithStats = await Promise.all(
        billingRecords.map(async (record) => {
            // Get all charges for this billing run
            const charges = await Charge.find({ billingId: record._id });

            // Calculate statistics
            const totalAmount = charges.reduce((sum, charge) => sum + charge.amount, 0);
            const recurringCharges = charges.filter(charge => charge.planId);
            const oneTimeCharges = charges.filter(charge => !charge.planId);

            const recurringAmount = recurringCharges.reduce((sum, charge) => sum + charge.amount, 0);
            const oneTimeAmount = oneTimeCharges.reduce((sum, charge) => sum + charge.amount, 0);

            return {
                ...record.toObject(),
                statistics: {
                    totalAmount,
                    totalCharges: charges.length,
                    recurringCharges: recurringCharges.length,
                    oneTimeCharges: oneTimeCharges.length,
                    recurringAmount,
                    oneTimeAmount
                }
            };
        })
    );

    return billingRecordsWithStats;
}

/**
 * Get billing history for current user as a member (member access)
 */
async function getMemberBillingHistory(user: IUser | undefined) {
    console.log(`billingService.getMemberBillingHistory: Getting billing history for member ${user?.email}`);

    if (!user?.email) {
        console.log(`billingService.getMemberBillingHistory: No user email provided`);
        return [];
    }

    // Find member records for this user
    const memberRecords = await Member.find({
        email: user.email,
        status: { $in: ['approved', 'pending'] }
    });

    console.log(`billingService.getMemberBillingHistory: Found ${memberRecords.length} member records`);

    if (memberRecords.length === 0) {
        console.log(`billingService.getMemberBillingHistory: No member records found`);
        return [];
    }

    const memberIds = memberRecords.map(member => member._id?.toString()).filter(Boolean);

    // Find billing records that contain charges for this member
    const billingRecords = await Billing.find({
        _id: {
            $in: await Charge.distinct('billingId', {
                memberId: { $in: memberIds },
                billingId: { $exists: true, $ne: null }
            })
        }
    }).sort({ billingDate: -1 }).limit(50);

    console.log(`billingService.getMemberBillingHistory: Found ${billingRecords.length} billing records`);

    // Get statistics for each billing record (only for this member's charges)
    const billingRecordsWithStats = await Promise.all(
        billingRecords.map(async (record) => {
            // Get charges for this member in this billing run
            const charges = await Charge.find({
                billingId: record._id,
                memberId: { $in: memberIds }
            });

            // Calculate statistics
            const totalAmount = charges.reduce((sum, charge) => sum + charge.amount, 0);
            const recurringCharges = charges.filter(charge => charge.planId);
            const oneTimeCharges = charges.filter(charge => !charge.planId);

            const recurringAmount = recurringCharges.reduce((sum, charge) => sum + charge.amount, 0);
            const oneTimeAmount = oneTimeCharges.reduce((sum, charge) => sum + charge.amount, 0);

            return {
                ...record.toObject(),
                statistics: {
                    totalAmount,
                    totalCharges: charges.length,
                    recurringCharges: recurringCharges.length,
                    oneTimeCharges: oneTimeCharges.length,
                    recurringAmount,
                    oneTimeAmount
                }
            };
        })
    );

    return billingRecordsWithStats;
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

    // Get all charges for this billing run, sorted by charge date
    const charges = await Charge.find({ billingId: billingId }).sort({ chargeDate: 1 }); // Sort by charge date ascending (oldest first)
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

/**
 * Get billing details for a specific billing run (member access - filtered to current user)
 */
async function getMemberBillingDetails(user: IUser | undefined, billingId: string) {
    console.log(`billingService.getMemberBillingDetails: Getting billing details for member ${user?.email}`);

    if (!user?.email) {
        console.log(`billingService.getMemberBillingDetails: No user email provided`);
        return null;
    }

    // Find member records for this user
    const memberRecords = await Member.find({
        email: user.email,
        status: { $in: ['approved', 'pending'] }
    });

    console.log(`billingService.getMemberBillingDetails: Found ${memberRecords.length} member records`);

    if (memberRecords.length === 0) {
        console.log(`billingService.getMemberBillingDetails: No member records found`);
        return null;
    }

    const memberIds = memberRecords.map(member => member._id?.toString()).filter(Boolean);

    // Verify the billing record exists and contains charges for this member
    const billingRecord = await Billing.findOne({ _id: billingId });
    if (!billingRecord) {
        console.log(`billingService.getMemberBillingDetails: Billing record not found`);
        return null;
    }

    // Get charges for this member in this billing run, sorted by charge date
    const charges = await Charge.find({
        billingId: billingId,
        memberId: { $in: memberIds }
    }).sort({ chargeDate: 1 }); // Sort by charge date ascending (oldest first)

    console.log(`billingService.getMemberBillingDetails: Found ${charges.length} charges for member in billing ${billingId}`);

    if (charges.length === 0) {
        console.log(`billingService.getMemberBillingDetails: No charges found for this member in this billing run`);
        return null;
    }

    // Get member details for each charge
    const memberIdsInCharges = [...new Set(charges.map(c => c.memberId))];
    const members = await Member.find({ _id: { $in: memberIdsInCharges } });
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

    // Group charges by member (should only be one member - the current user)
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

            const gym = await getCurrentUserGym(req.user);
            const engineResult = await BillingEngine.generateBillingCharges(gym._id.toString(), start, end);

            // Convert engine result to legacy format for compatibility
            const preview = convertEngineResultToPreview(engineResult);

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

            const gym = await getCurrentUserGym(req.user);
            const result = await commitBillingRunWithEngine(req.user, gym._id.toString(), start, end, charges);

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
 * Get billing history (owner access)
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
 * GET /billing/member-history
 * Get billing history for current user as a member
 */
router.get(
    '/billing/member-history',
    authenticateUser,
    authorizeRoles('member', 'owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('billingService.GET /billing/member-history: Request received');

            const history = await getMemberBillingHistory(req.user);

            console.log('billingService.GET /billing/member-history: Response sent successfully');
            res.status(200).json(ResponseHelper.success(history, 'Member billing history retrieved successfully'));
        } catch (error) {
            console.error('billingService.GET /billing/member-history: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to retrieve member billing history', 500));
        }
    }
);

/**
 * GET /billing/details/:billingId
 * Get billing details for a specific billing run (owner access)
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

/**
 * GET /billing/member-details/:billingId
 * Get billing details for a specific billing run (member access - filtered to current user)
 */
router.get(
    '/billing/member-details/:billingId',
    authenticateUser,
    authorizeRoles('member', 'owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { billingId } = req.params;
            console.log('billingService.GET /billing/member-details: Request received', { billingId });

            const details = await getMemberBillingDetails(req.user, billingId);

            if (!details) {
                return res.status(404).json(ResponseHelper.error('Billing record not found or no charges for this member', 404));
            }

            console.log('billingService.GET /billing/member-details: Response sent successfully');
            res.status(200).json(ResponseHelper.success(details, 'Member billing details retrieved successfully'));
        } catch (error) {
            console.error('billingService.GET /billing/member-details: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to retrieve member billing details', 500));
        }
    }
);

/**
 * Convert BillingEngine result to legacy preview format for UI compatibility
 */
function convertEngineResultToPreview(engineResult: any) {
    // Group charges by member
    const memberChargeGroups = new Map();

    engineResult.charges.forEach((charge: any) => {
        const memberId = charge.memberId;
        if (!memberChargeGroups.has(memberId)) {
            memberChargeGroups.set(memberId, {
                memberId,
                memberName: charge.memberName,
                charges: [],
                subtotal: 0
            });
        }

        const group = memberChargeGroups.get(memberId);
        group.charges.push({
            type: charge.type,
            chargeId: charge.chargeId,
            memberId: charge.memberId,
            planId: charge.planId,
            amount: charge.amount,
            description: charge.note, // Use the improved note field
            date: charge.chargeDate
        });
        group.subtotal += charge.amount;
    });

    const groupedCharges = Array.from(memberChargeGroups.values()).sort((a, b) =>
        a.memberName.localeCompare(b.memberName)
    );

    return {
        startDate: engineResult.startDate,
        endDate: engineResult.endDate,
        charges: engineResult.charges.map((c: any) => ({
            type: c.type,
            chargeId: c.chargeId,
            memberId: c.memberId,
            planId: c.planId,
            amount: c.amount,
            description: c.note, // Use the improved note field
            date: c.chargeDate
        })),
        groupedCharges,
        totalAmount: engineResult.summary.totalAmount,
        summary: {
            recurringPlans: engineResult.summary.recurringPlans,
            oneTimeCharges: engineResult.summary.oneTimeCharges,
            totalCharges: engineResult.summary.totalCharges
        }
    };
}

/**
 * Commit billing run using the new engine
 */
async function commitBillingRunWithEngine(
    user: IUser | undefined,
    gymId: string,
    startDate: Date,
    endDate: Date,
    charges: any[]
) {
    // Create billing record
    const billingRecord = new Billing({
        memberId: user!._id,
        billingDate: new Date(),
        startDate,
        endDate
    });

    const savedBilling = await billingRecord.save();
    console.log(`billingService.commitBillingRunWithEngine: Created billing record ${savedBilling._id}`);

    // Use engine to create charge records
    const createdCharges = await BillingEngine.createChargeRecords(charges, savedBilling._id.toString());

    return {
        billingId: savedBilling._id,
        chargesCreated: createdCharges,
        existingChargesBilled: charges.filter(c => c.type === 'one-time-charge').length
    };
}

export { router as billingRouter };
