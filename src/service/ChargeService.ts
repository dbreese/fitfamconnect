import type { ServerResponse } from '@/shared/ServerResponse';
import type { ICharge } from '@/server/db/charge';
import { submit } from './NetworkUtil';

export const ChargeService = {
    async getChargesByMember(memberId: string): Promise<ICharge[] | undefined> {
        console.log('ChargeService.getChargesByMember: Starting to fetch charges for member', { memberId });
        return await submit('GET', `/charges/member/${memberId}`)
            .then(async (result) => {
                console.log('ChargeService.getChargesByMember: Received response', {
                    memberId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const charges = response.body.data as ICharge[];
                    console.log('ChargeService.getChargesByMember: Successfully fetched charges', {
                        memberId,
                        count: charges?.length
                    });
                    return charges;
                }
                console.log('ChargeService.getChargesByMember: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('ChargeService.getChargesByMember: Error fetching charges:', error);
                return Promise.reject('Error fetching charges.');
            });
    },

    async createCharge(
        chargeData: Omit<ICharge, '_id' | 'createdAt' | 'updatedAt'>
    ): Promise<ServerResponse | undefined> {
        console.log('ChargeService.createCharge: Starting to create charge', {
            memberId: chargeData.memberId,
            amount: chargeData.amount
        });
        return await submit('POST', '/charges', chargeData)
            .then(async (result) => {
                console.log('ChargeService.createCharge: Received response', {
                    memberId: chargeData.memberId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('ChargeService.createCharge: Successfully created charge', {
                        memberId: chargeData.memberId,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('ChargeService.createCharge: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('ChargeService.createCharge: Error creating charge:', error);
                return Promise.reject('Error creating charge.');
            });
    },

    async getChargeById(chargeId: string): Promise<ICharge | undefined> {
        console.log('ChargeService.getChargeById: Starting to fetch charge', { chargeId });
        return await submit('GET', `/charges/${chargeId}`)
            .then(async (result) => {
                console.log('ChargeService.getChargeById: Received response', {
                    chargeId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const charge = response.body.data as ICharge;
                    console.log('ChargeService.getChargeById: Successfully fetched charge', {
                        chargeId,
                        memberId: charge?.memberId
                    });
                    return charge;
                }
                console.log('ChargeService.getChargeById: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('ChargeService.getChargeById: Error fetching charge:', error);
                return Promise.reject('Error fetching charge.');
            });
    },

    async updateCharge(chargeId: string, chargeData: Partial<ICharge>): Promise<ServerResponse | undefined> {
        console.log('ChargeService.updateCharge: Starting to update charge', {
            chargeId,
            memberId: chargeData.memberId
        });
        return await submit('PUT', `/charges/${chargeId}`, chargeData)
            .then(async (result) => {
                console.log('ChargeService.updateCharge: Received response', {
                    chargeId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('ChargeService.updateCharge: Successfully updated charge', {
                        chargeId,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('ChargeService.updateCharge: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('ChargeService.updateCharge: Error updating charge:', error);
                return Promise.reject('Error updating charge.');
            });
    },

    async deleteCharge(chargeId: string): Promise<ServerResponse | undefined> {
        console.log('ChargeService.deleteCharge: Starting to delete charge', { chargeId });
        return await submit('DELETE', `/charges/${chargeId}`)
            .then(async (result) => {
                console.log('ChargeService.deleteCharge: Received response', {
                    chargeId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('ChargeService.deleteCharge: Successfully deleted charge', {
                        chargeId,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('ChargeService.deleteCharge: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('ChargeService.deleteCharge: Error deleting charge:', error);
                return Promise.reject('Error deleting charge.');
            });
    },

    async getUnbilledCharges(): Promise<any[] | undefined> {
        console.log('ChargeService.getUnbilledCharges: Starting to fetch unbilled charges');
        return await submit('GET', '/charges/unbilled')
            .then(async (result) => {
                console.log('ChargeService.getUnbilledCharges: Received response', {
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const charges = response.body.data as any[];
                    console.log('ChargeService.getUnbilledCharges: Successfully fetched unbilled charges', {
                        count: charges?.length
                    });
                    return charges;
                }
                console.log('ChargeService.getUnbilledCharges: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('ChargeService.getUnbilledCharges: Error fetching unbilled charges:', error);
                return Promise.reject('Error fetching unbilled charges.');
            });
    }
};
