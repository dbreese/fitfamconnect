import type { ServerResponse } from '@/shared/ServerResponse';
import type { IMembership } from '@/server/db/membership';
import { submit } from './NetworkUtil';

export const MembershipService = {
    async getMyMemberships(): Promise<IMembership[] | undefined> {
        console.log("MembershipService.getMyMemberships: Starting to fetch gym's memberships");
        return await submit('GET', '/memberships')
            .then(async (result) => {
                console.log('MembershipService.getMyMemberships: Received response', {
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const memberships = response.body.data as IMembership[];
                    console.log('MembershipService.getMyMemberships: Successfully fetched memberships', {
                        count: memberships?.length
                    });
                    return memberships;
                }
                console.log('MembershipService.getMyMemberships: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.getMyMemberships: Error fetching memberships:', error);
                return Promise.reject('Error fetching memberships.');
            });
    },

    async createMembership(
        membershipData: Omit<IMembership, 'gymId' | 'gymCode' | 'status' | 'createdAt' | 'updatedAt'>
    ): Promise<ServerResponse | undefined> {
        console.log('MembershipService.createMembership: Starting to create membership', {
            memberId: membershipData.memberId
        });
        return await submit('POST', '/memberships', membershipData)
            .then(async (result) => {
                console.log('MembershipService.createMembership: Received response', {
                    memberId: membershipData.memberId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('MembershipService.createMembership: Successfully created membership', {
                        memberId: membershipData.memberId,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('MembershipService.createMembership: Response not OK', {
                    memberId: membershipData.memberId
                });
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.createMembership: Error creating membership:', {
                    memberId: membershipData.memberId,
                    error
                });
                return Promise.reject('Error creating membership.');
            });
    },

    async getMembershipById(id: string): Promise<IMembership | undefined> {
        console.log('MembershipService.getMembershipById: Starting to fetch membership', { id });
        return await submit('GET', `/memberships/${id}`)
            .then(async (result) => {
                console.log('MembershipService.getMembershipById: Received response', {
                    id,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const membership = response.body.data as IMembership;
                    console.log('MembershipService.getMembershipById: Successfully fetched membership', {
                        id,
                        memberId: membership?.memberId
                    });
                    return membership;
                } else if (result.status === 404) {
                    console.log('MembershipService.getMembershipById: Membership not found', { id });
                    return undefined;
                }
                console.log('MembershipService.getMembershipById: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.getMembershipById: Error fetching membership:', { id, error });
                return Promise.reject('Error fetching membership.');
            });
    },

    async updateMembership(id: string, membershipData: Partial<IMembership>): Promise<ServerResponse | undefined> {
        console.log('MembershipService.updateMembership: Starting to update membership', {
            id,
            status: membershipData.status
        });
        return await submit('PUT', `/memberships/${id}`, membershipData)
            .then(async (result) => {
                console.log('MembershipService.updateMembership: Received response', {
                    id,
                    status: membershipData.status,
                    resultStatus: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('MembershipService.updateMembership: Successfully updated membership', {
                        id,
                        status: membershipData.status,
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('MembershipService.updateMembership: Membership not found', { id });
                    return undefined;
                }
                console.log('MembershipService.updateMembership: Response not OK', {
                    id,
                    status: membershipData.status
                });
                return undefined;
            })
            .catch((error) => {
                console.error('MembershipService.updateMembership: Error updating membership:', {
                    id,
                    status: membershipData.status,
                    error
                });
                return Promise.reject('Error updating membership.');
            });
    }
};
