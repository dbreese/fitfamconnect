import type { ServerResponse } from '@/shared/ServerResponse';
import type { IPlan } from '@/server/db/plan';
import { submit } from './NetworkUtil';

export const PlanService = {
    async getMyPlans(): Promise<IPlan[] | undefined> {
        console.log("PlanService.getMyPlans: Starting to fetch user's plans");
        return await submit('GET', '/plans')
            .then(async (result) => {
                console.log('PlanService.getMyPlans: Received response', { status: result.status, ok: result.ok });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const plans = response.body.data as IPlan[];
                    console.log('PlanService.getMyPlans: Successfully fetched plans', { count: plans?.length });
                    return plans;
                }
                console.log('PlanService.getMyPlans: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('PlanService.getMyPlans: Error fetching plans:', error);
                return Promise.reject('Error fetching plans.');
            });
    },

    async getPlanById(id: string): Promise<IPlan | undefined> {
        console.log('PlanService.getPlanById: Starting to fetch plan', { id });
        return await submit('GET', `/plans/${id}`)
            .then(async (result) => {
                console.log('PlanService.getPlanById: Received response', {
                    id,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const plan = response.body.data as IPlan;
                    console.log('PlanService.getPlanById: Successfully fetched plan', {
                        id,
                        planName: plan?.name
                    });
                    return plan;
                } else if (result.status === 404) {
                    console.log('PlanService.getPlanById: Plan not found', { id });
                    return undefined;
                }
                console.log('PlanService.getPlanById: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('PlanService.getPlanById: Error fetching plan:', { id, error });
                return Promise.reject('Error fetching plan.');
            });
    },

    async createPlan(
        planData: Omit<IPlan, 'gymId' | 'isActive' | 'createdAt' | 'updatedAt'>
    ): Promise<ServerResponse | undefined> {
        console.log('PlanService.createPlan: Starting to create plan', { planName: planData.name });
        return await submit('POST', '/plans', planData)
            .then(async (result) => {
                console.log('PlanService.createPlan: Received response', {
                    planName: planData.name,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('PlanService.createPlan: Successfully created plan', {
                        planName: planData.name,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('PlanService.createPlan: Response not OK', { planName: planData.name });
                return undefined;
            })
            .catch((error) => {
                console.error('PlanService.createPlan: Error creating plan:', { planName: planData.name, error });
                return Promise.reject('Error creating plan.');
            });
    },

    async updatePlan(id: string, planData: Partial<IPlan>): Promise<ServerResponse | undefined> {
        console.log('PlanService.updatePlan: Starting to update plan', { id, planName: planData.name });
        return await submit('PUT', `/plans/${id}`, planData)
            .then(async (result) => {
                console.log('PlanService.updatePlan: Received response', {
                    id,
                    planName: planData.name,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('PlanService.updatePlan: Successfully updated plan', {
                        id,
                        planName: planData.name,
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('PlanService.updatePlan: Plan not found', { id });
                    return undefined;
                }
                console.log('PlanService.updatePlan: Response not OK', { id, planName: planData.name });
                return undefined;
            })
            .catch((error) => {
                console.error('PlanService.updatePlan: Error updating plan:', {
                    id,
                    planName: planData.name,
                    error
                });
                return Promise.reject('Error updating plan.');
            });
    },

    async deletePlan(id: string): Promise<ServerResponse | undefined> {
        console.log('PlanService.deletePlan: Starting to delete plan', { id });
        return await submit('DELETE', `/plans/${id}`)
            .then(async (result) => {
                console.log('PlanService.deletePlan: Received response', {
                    id,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('PlanService.deletePlan: Successfully deleted plan', {
                        id,
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('PlanService.deletePlan: Plan not found', { id });
                    return undefined;
                }
                console.log('PlanService.deletePlan: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('PlanService.deletePlan: Error deleting plan:', { id, error });
                return Promise.reject('Error deleting plan.');
            });
    }
};
