import type { IUser } from '../db/user';
import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Plan, type IPlan } from '../db/plan';
import { Gym } from '../db/gym';
import { type ServerResponse } from '../../shared/ServerResponse';

export const router = Router();
router.use(express.json());

// GET /plans - Get all plans for the current user's gym
router.get('/plans', authenticateUser, authorizeRoles('owner', 'root'), async (req: AuthenticatedRequest, res: Response) => {
    console.log('planService.getPlans: API invoked');
    const user = req.user;

    try {
        const plans = await findPlansByOwner(user);
        console.log(`planService.getPlans: Retrieved ${plans.length} plans for user ${user?._id}`);

        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Plans retrieved successfully',
                data: plans
            }
        };
        res.status(200).json(response);
        console.log('planService.getPlans: Response sent successfully');
    } catch (error) {
        console.error('planService.getPlans: Error retrieving plans:', error);
        res.status(500).json({ message: 'Error retrieving plans' });
    }
});

// GET /plans/:id - Get plan by ID (if it belongs to user's gym)
router.get('/plans/:id', authenticateUser, authorizeRoles('owner', 'root'), async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    console.log(`planService.getPlan: API invoked with id=${id}`);
    const user = req.user;

    try {
        const plan = await findPlanByIdAndOwner(id, user);
        if (!plan) {
            console.log(`planService.getPlan: Plan not found or access denied for id=${id}`);
            res.status(404).json({ message: 'Plan not found' });
            return;
        }

        console.log(`planService.getPlan: Retrieved plan name="${plan.name}" with id=${id}`);
        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Plan retrieved successfully',
                data: plan
            }
        };
        res.status(200).json(response);
        console.log('planService.getPlan: Response sent successfully');
    } catch (error) {
        console.error(`planService.getPlan: Error retrieving plan with id=${id}:`, error);
        res.status(500).json({ message: 'Error retrieving plan' });
    }
});

// POST /plans - Create new plan for user's gym
router.post('/plans', authenticateUser, authorizeRoles('owner', 'root'), async (req: AuthenticatedRequest, res: Response) => {
    console.log(`planService.createPlan: API invoked with payload=${JSON.stringify(req.body)}`);
    const user = req.user;
    const planData = req.body;

    try {
        const newPlan = await createPlanForOwner(user, planData);
        if (!newPlan) {
            console.log(`planService.createPlan: Failed to create plan - no gym found for user ${user?._id}`);
            res.status(404).json({ message: 'No gym found for user' });
            return;
        }

        console.log(`planService.createPlan: Created plan name="${newPlan.name}" with id=${newPlan._id}`);
        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Plan created successfully',
                data: newPlan
            }
        };
        res.status(201).json(response);
        console.log('planService.createPlan: Response sent successfully');
    } catch (error) {
        console.error(`planService.createPlan: Error creating plan:`, error);
        res.status(500).json({ message: 'Error creating plan' });
    }
});

// PUT /plans/:id - Update plan (if it belongs to user's gym)
router.put('/plans/:id', authenticateUser, authorizeRoles('owner', 'root'), async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    console.log(`planService.updatePlan: API invoked with id=${id} and payload=${JSON.stringify(req.body)}`);
    const user = req.user;
    const updateData = req.body;

    try {
        const updatedPlan = await updatePlanByIdAndOwner(id, user, updateData);
        if (!updatedPlan) {
            console.log(`planService.updatePlan: Plan not found or access denied for id=${id}`);
            res.status(404).json({ message: 'Plan not found' });
            return;
        }

        console.log(`planService.updatePlan: Updated plan name="${updatedPlan.name}" with id=${id}`);
        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Plan updated successfully',
                data: updatedPlan
            }
        };
        res.status(200).json(response);
        console.log('planService.updatePlan: Response sent successfully');
    } catch (error) {
        console.error(`planService.updatePlan: Error updating plan with id=${id}:`, error);
        res.status(500).json({ message: 'Error updating plan' });
    }
});

// DELETE /plans/:id - Delete plan (if it belongs to user's gym)
router.delete(
    '/plans/:id',
    authenticateUser,
    authorizeRoles('owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`planService.deletePlan: API invoked with id=${id}`);
        const user = req.user;

        try {
            const deletedPlan = await deletePlanByIdAndOwner(id, user);
            if (!deletedPlan) {
                console.log(`planService.deletePlan: Plan not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Plan not found' });
                return;
            }

            console.log(`planService.deletePlan: Deleted plan name="${deletedPlan.name}" with id=${id}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Plan deleted successfully',
                    data: deletedPlan
                }
            };
            res.status(200).json(response);
            console.log('planService.deletePlan: Response sent successfully');
        } catch (error) {
            console.error(`planService.deletePlan: Error deleting plan with id=${id}:`, error);
            res.status(500).json({ message: 'Error deleting plan' });
        }
    }
);

/**
 * Find all plans for the user's gym
 */
async function findPlansByOwner(user: IUser | undefined): Promise<IPlan[]> {
    if (!user) {
        console.log('planService.findPlansByOwner: No user provided');
        return [];
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`planService.findPlansByOwner: No gym found for user ${user._id}`);
        return [];
    }

    console.log(`planService.findPlansByOwner: Looking for plans in gym ${gym._id} for user ${user._id}`);
    const plans = await Plan.find({ gymId: gym._id, isActive: true }).sort({ name: 1 });

    console.log(`planService.findPlansByOwner: Found ${plans.length} plans for gym ${gym.name}`);
    return plans;
}

/**
 * Find plan by ID if it belongs to user's gym
 */
async function findPlanByIdAndOwner(planId: string, user: IUser | undefined): Promise<IPlan | null> {
    if (!user) {
        console.log('planService.findPlanByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`planService.findPlanByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`planService.findPlanByIdAndOwner: Looking for plan ${planId} in gym ${gym._id}`);
    const plan = await Plan.findOne({ _id: planId, gymId: gym._id, isActive: true });

    if (plan) {
        console.log(`planService.findPlanByIdAndOwner: Found plan "${plan.name}"`);
    } else {
        console.log(`planService.findPlanByIdAndOwner: Plan not found or doesn't belong to user's gym`);
    }

    return plan;
}

/**
 * Create new plan for user's gym
 */
async function createPlanForOwner(user: IUser | undefined, planData: Partial<IPlan>): Promise<IPlan | null> {
    if (!user) {
        console.log('planService.createPlanForOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`planService.createPlanForOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`planService.createPlanForOwner: Creating plan for gym ${gym._id}`);

    // Remove sensitive fields and set gymId
    const { gymId, isActive, createdAt, updatedAt, ...safePlanData } = planData;
    const newPlanData = {
        ...safePlanData,
        gymId: gym._id,
        isActive: true
    };

    const newPlan = new Plan(newPlanData);
    const savedPlan = await newPlan.save();

    console.log(`planService.createPlanForOwner: Created plan "${savedPlan.name}" with id ${savedPlan._id}`);
    return savedPlan;
}

/**
 * Update plan by ID if it belongs to user's gym
 */
async function updatePlanByIdAndOwner(
    planId: string,
    user: IUser | undefined,
    updateData: Partial<IPlan>
): Promise<IPlan | null> {
    if (!user) {
        console.log('planService.updatePlanByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`planService.updatePlanByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Verify plan belongs to user's gym
    const plan = await Plan.findOne({ _id: planId, gymId: gym._id, isActive: true });
    if (!plan) {
        console.log(`planService.updatePlanByIdAndOwner: Plan ${planId} not found or doesn't belong to user's gym`);
        return null;
    }

    console.log(`planService.updatePlanByIdAndOwner: Updating plan ${planId} for gym ${gym._id}`);

    // Remove fields that shouldn't be updated
    const { gymId, isActive, createdAt, updatedAt, ...safeUpdateData } = updateData;

    const updatedPlan = await Plan.findByIdAndUpdate(planId, safeUpdateData, { new: true, runValidators: true });

    if (updatedPlan) {
        console.log(`planService.updatePlanByIdAndOwner: Successfully updated plan "${updatedPlan.name}"`);
    }

    return updatedPlan;
}

/**
 * Delete plan by ID if it belongs to user's gym (soft delete)
 */
async function deletePlanByIdAndOwner(planId: string, user: IUser | undefined): Promise<IPlan | null> {
    if (!user) {
        console.log('planService.deletePlanByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`planService.deletePlanByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Verify plan belongs to user's gym
    const plan = await Plan.findOne({ _id: planId, gymId: gym._id, isActive: true });
    if (!plan) {
        console.log(`planService.deletePlanByIdAndOwner: Plan ${planId} not found or doesn't belong to user's gym`);
        return null;
    }

    console.log(`planService.deletePlanByIdAndOwner: Soft deleting plan ${planId} for gym ${gym._id}`);

    // Soft delete by setting isActive to false
    const deletedPlan = await Plan.findByIdAndUpdate(planId, { isActive: false }, { new: true });

    if (deletedPlan) {
        console.log(`planService.deletePlanByIdAndOwner: Successfully deleted plan "${deletedPlan.name}"`);
    }

    return deletedPlan;
}
