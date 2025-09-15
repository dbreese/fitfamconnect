import type { ServerResponse } from '@/shared/ServerResponse';
import type { IMembership } from '@/server/db/membership';
import type { IMember } from '@/server/db/member';
import { submit } from './NetworkUtil';

export const MembershipService = {
    async getMyMembers(): Promise<IMember[] | undefined> {
        console.log("MembershipService.getMyMembers: Starting to fetch gym's members");
        return await submit('GET', '/memberships')
            .then(async (result) => {
                console.log('MembershipService.getMyMembers: Received response', {
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const members = response.body.data as IMember[];
                    console.log('MembershipService.getMyMembers: Successfully fetched members', {
                        count: members?.length
                    });
                    return members;
                }
                console.log('MembershipService.getMyMembers: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.getMyMembers: Error fetching members:', error);
                return Promise.reject('Error fetching members.');
            });
    },

    async createMember(
        memberData: Omit<
            IMember,
            'gymId' | 'status' | 'approvedBy' | 'approvedAt' | 'joinRequestDate' | 'createdAt' | 'updatedAt'
        >
    ): Promise<ServerResponse | undefined> {
        console.log('MembershipService.createMember: Starting to create member', {
            email: memberData.email
        });
        return await submit('POST', '/memberships', memberData)
            .then(async (result) => {
                console.log('MembershipService.createMember: Received response', {
                    email: memberData.email,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('MembershipService.createMember: Successfully created member', {
                        email: memberData.email,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('MembershipService.createMember: Response not OK', {
                    email: memberData.email
                });
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.createMember: Error creating member:', {
                    email: memberData.email,
                    error
                });
                return Promise.reject('Error creating member.');
            });
    },

    async getMemberById(id: string): Promise<IMember | undefined> {
        console.log('MembershipService.getMemberById: Starting to fetch member', { id });
        return await submit('GET', `/memberships/${id}`)
            .then(async (result) => {
                console.log('MembershipService.getMemberById: Received response', {
                    id,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const member = response.body.data as IMember;
                    console.log('MembershipService.getMemberById: Successfully fetched member', {
                        id,
                        email: member?.email
                    });
                    return member;
                } else if (result.status === 404) {
                    console.log('MembershipService.getMemberById: Member not found', { id });
                    return undefined;
                }
                console.log('MembershipService.getMemberById: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.getMemberById: Error fetching member:', { id, error });
                return Promise.reject('Error fetching member.');
            });
    },

    async updateMember(id: string, memberData: Partial<IMember>): Promise<ServerResponse | undefined> {
        console.log('MembershipService.updateMember: Starting to update member', {
            id,
            status: memberData.status
        });
        return await submit('PUT', `/memberships/${id}`, memberData)
            .then(async (result) => {
                console.log('MembershipService.updateMember: Received response', {
                    id,
                    status: memberData.status,
                    resultStatus: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('MembershipService.updateMember: Successfully updated member', {
                        id,
                        status: memberData.status,
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('MembershipService.updateMember: Member not found', { id });
                    return undefined;
                }
                console.log('MembershipService.updateMember: Response not OK', {
                    id,
                    status: memberData.status
                });
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.updateMember: Error updating member:', {
                    id,
                    status: memberData.status,
                    error
                });
                return Promise.reject('Error updating member.');
            });
    },

    async assignPlan(memberId: string, planId: string, membershipData?: {
        startDate?: Date;
        endDate?: Date;
    }): Promise<ServerResponse | undefined> {
        console.log('MembershipService.assignPlan: Starting to assign plan', {
            memberId,
            planId,
            membershipData
        });

        const requestData = {
            planId,
            startDate: membershipData?.startDate,
            endDate: membershipData?.endDate
        };

        return await submit('POST', `/memberships/${memberId}/plans`, requestData)
            .then(async (result) => {
                console.log('MembershipService.assignPlan: Received response', {
                    memberId,
                    planId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('MembershipService.assignPlan: Successfully assigned plan', {
                        memberId,
                        planId,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('MembershipService.assignPlan: Response not OK', {
                    memberId,
                    planId
                });
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.assignPlan: Error assigning plan:', {
                    memberId,
                    planId,
                    error
                });
                return Promise.reject('Error assigning plan.');
            });
    },

    async removePlan(memberId: string, planId: string): Promise<ServerResponse | undefined> {
        console.log('MembershipService.removePlan: Starting to remove plan', {
            memberId,
            planId
        });
        return await submit('DELETE', `/memberships/${memberId}/plans/${planId}`)
            .then(async (result) => {
                console.log('MembershipService.removePlan: Received response', {
                    memberId,
                    planId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('MembershipService.removePlan: Successfully removed plan', {
                        memberId,
                        planId,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('MembershipService.removePlan: Response not OK', {
                    memberId,
                    planId
                });
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.removePlan: Error removing plan:', {
                    memberId,
                    planId,
                    error
                });
                return Promise.reject('Error removing plan.');
            });
    },

    async endMembership(memberId: string, planId: string): Promise<ServerResponse | undefined> {
        console.log('MembershipService.endMembership: Starting to end membership', {
            memberId,
            planId
        });
        return await submit('PUT', `/memberships/${memberId}/plans/${planId}/end`)
            .then(async (result) => {
                console.log('MembershipService.endMembership: Received response', {
                    memberId,
                    planId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('MembershipService.endMembership: Successfully ended membership', {
                        memberId,
                        planId,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('MembershipService.endMembership: Response not OK', {
                    memberId,
                    planId
                });
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.endMembership: Error ending membership:', {
                    memberId,
                    planId,
                    error
                });
                return Promise.reject('Error ending membership.');
            });
    }
};
