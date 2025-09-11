import { submit } from './NetworkUtil';
import type { ServerResponse } from '@/shared/ServerResponse';

export class MyGymsService {
    /**
     * Get all gyms where the current user has a membership
     */
    static async getMyGyms() {
        console.log('MyGymsService.getMyGyms: Retrieving user gym memberships');

        try {
            const response = await submit('GET', '/mygyms');

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('MyGymsService.getMyGyms: Response received', serverResponse);
                return serverResponse.body.data;
            } else {
                console.error('MyGymsService.getMyGyms: Request failed', response.status);
                return null;
            }
        } catch (error) {
            console.error('MyGymsService.getMyGyms: Error:', error);
            return null;
        }
    }

    /**
     * Lookup gym by gym code
     */
    static async lookupGym(gymCode: string) {
        console.log('MyGymsService.lookupGym: Looking up gym with code', gymCode);

        try {
            const response = await submit('POST', '/mygyms/lookup-gym', { gymCode });

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('MyGymsService.lookupGym: Response received', serverResponse);
                return serverResponse.body.data;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('MyGymsService.lookupGym: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to lookup gym');
            }
        } catch (error) {
            console.error('MyGymsService.lookupGym: Error:', error);
            throw error;
        }
    }

    /**
     * Join a gym by gym ID
     */
    static async joinGym(gymId: string) {
        console.log('MyGymsService.joinGym: Joining gym', gymId);

        try {
            const response = await submit('POST', '/mygyms/join-gym', { gymId });

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('MyGymsService.joinGym: Response received', serverResponse);
                return serverResponse.body.data;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('MyGymsService.joinGym: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to join gym');
            }
        } catch (error) {
            console.error('MyGymsService.joinGym: Error:', error);
            throw error;
        }
    }
}
