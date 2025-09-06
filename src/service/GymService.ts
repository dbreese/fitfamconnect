import type { ServerResponse } from '@/shared/ServerResponse';
import type { IGym } from '@/server/db/gym';
import { submit } from './NetworkUtil';

export const GymService = {
    async getMyGym(): Promise<IGym | undefined> {
        console.log("GymService.getMyGym: Starting to fetch user's gym");
        return await submit('GET', '/gym')
            .then(async (result) => {
                console.log('GymService.getMyGym: Received response', { status: result.status, ok: result.ok });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const gym = response.body.data as IGym;
                    console.log('GymService.getMyGym: Successfully fetched gym', { gymName: gym?.name });
                    return gym;
                } else if (result.status === 404) {
                    console.log('GymService.getMyGym: No gym found for user');
                    return undefined;
                }
                console.log('GymService.getMyGym: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('GymService.getMyGym: Error fetching gym:', error);
                return Promise.reject('Error fetching gym.');
            });
    },

    async updateMyGym(gymData: Partial<IGym>): Promise<ServerResponse | undefined> {
        console.log('GymService.updateMyGym: Starting to update gym', { gymName: gymData.name });
        return await submit('PUT', '/gym', gymData)
            .then(async (result) => {
                console.log('GymService.updateMyGym: Received response', { status: result.status, ok: result.ok });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('GymService.updateMyGym: Successfully updated gym', {
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('GymService.updateMyGym: No gym found for user');
                    return undefined;
                }
                console.log('GymService.updateMyGym: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('GymService.updateMyGym: Error updating gym:', error);
                return Promise.reject('Error updating gym.');
            });
    }
};
